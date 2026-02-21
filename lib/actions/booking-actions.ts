"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { BookingStatus } from "@prisma/client";
import { calculatePricing, generateConfirmationCode } from "../utils/booking-utils";
import { getGeneralSettings } from "./settings-actions";
import { notifyOwnerOfNewBooking, sendReservationReceipt } from "@/lib/notifications";

/**
 * Retrieves all bookings for the authenticated user.
 */
export async function getUserBookings() {
  try {
    const userId = await getAuthUserId();

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        location: true,
      },
      orderBy: {
        checkIn: "desc",
      },
    });

    return { success: true, data: bookings };
  } catch (error) {
    console.error("Failed to fetch user bookings:", error);
    return { success: false, error: "Failed to fetch reservations" };
  }
}

/**
 * Retrieves detailed information for a specific booking.
 */
export async function getBookingDetails(bookingId: string) {
  try {
    const userId = await getAuthUserId();
    console.log(`[getBookingDetails] Searching. ID: ${bookingId}, AuthUser: ${userId}`);

    if (!bookingId || bookingId === 'undefined') {
      console.error("[getBookingDetails] Invalid booking ID provided");
      return { success: false, error: "Invalid reservation ID" };
    }

    let booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        location: {
          include: {
            owner: {
              include: {
                user: {
                  select: {
                    phone: true,
                    email: true,
                  },
                },
              },
            },
            // Commented out due to Prisma client out of sync
            // shuttleInfo: true,
            // cancellationPolicy: true,
          },
        },
        payments: true,
        parkingSession: true,
        refunds: true,
      },
    });

    if (!booking) {
      console.log(`[getBookingDetails] Not found by ID, trying confirmation code: ${bookingId}`);
      booking = await prisma.booking.findUnique({
        where: { confirmationCode: bookingId },
        include: {
          location: {
            include: {
              owner: {
                include: {
                  user: {
                    select: {
                      phone: true,
                      email: true,
                    },
                  },
                },
              },
              // Commented out due to Prisma client out of sync
              // shuttleInfo: true,
              // cancellationPolicy: true,
            },
          },
          payments: true,
          parkingSession: true,
          refunds: true,
        },
      });
    }

    if (!booking) {
      console.log(`[getBookingDetails] No booking found for ID: ${bookingId}`);
      return { success: false, error: "Reservation not found" };
    }

    if (booking.userId !== userId) {
      console.warn(`[getBookingDetails] Unauthorized access attempt. Booking owner: ${booking.userId}, Request user: ${userId}`);
      return { success: false, error: "You do not have permission to view this reservation" };
    }

    console.log(`[getBookingDetails] Successfully fetched booking: ${booking.confirmationCode}`);
    return { success: true, data: booking };
  } catch (error: any) {
    console.error("[getBookingDetails] CRITICAL ERROR:", error);
    return { success: false, error: `System error fetching reservation: ${error.message}` };
  }
}

/**
 * Creates a new booking.
 */
export async function createBooking(data: any) {
  try {
    let userId = null;
    try {
      userId = await getAuthUserId();
      console.log(`[createBooking] Session User ID detected: ${userId}`);

      // Crucial Fix: Validate that the userId actually exists in the database
      // This prevents the P2003 Foreign Key constraint violation if the session is stale
      if (userId) {
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        });

        if (!userExists) {
          console.warn(`[createBooking] User ${userId} not found in database. Falling back to Guest Booking.`);
          userId = null;
        }
      }
    } catch (authError) {
      console.log("[createBooking] No authenticated session, proceeding as Guest.");
      userId = null;
    }

    // 1. Validation
    const {
      locationId, checkIn, checkOut,
      guestFirstName, guestLastName, guestEmail, guestPhone,
      vehicleMake, vehicleModel, vehicleColor, vehiclePlate,
      paymentMethodId, promoCode
    } = data;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      return { success: false, error: "Check-out must be after check-in" };
    }

    // 2. Prisma Transaction for Atomic Booking
    const result = await prisma.$transaction(async (tx) => {
      // a. Fetch location and validate
      const location = await tx.parkingLocation.findUnique({
        where: { id: locationId },
        include: {
          pricingRules: true,
          owner: {
            include: { wallet: true }
          }
        }
      });

      if (!location) throw new Error("Parking location not found");
      if (location.status !== "ACTIVE") throw new Error("Location not active");

      // b. Check for overlapping bookings
      const overlappingCount = await tx.booking.count({
        where: {
          locationId,
          status: { in: ["CONFIRMED", "PENDING"] },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
      });

      if (location.totalSpots - overlappingCount <= 0) {
        throw new Error("No spots available for the selected dates");
      }

      // c. Handle Promotion
      let promotion = null;
      if (promoCode) {
        promotion = await tx.promotion.findUnique({
          where: { code: promoCode.toUpperCase() },
        });

        if (promotion && (!promotion.isActive || promotion.validUntil < new Date())) {
          throw new Error("Invalid or expired promo code");
        }
      }

      // d. Handle Commission Rule
      const commissionRule = await tx.commissionRule.findFirst({
        where: { isActive: true },
      });

      const settings = await getGeneralSettings();

      // e. Calculate Pricing (Server-side source of truth)
      const pricing = calculatePricing(
        location.pricePerDay,
        location.pricingRules,
        checkInDate,
        checkOutDate,
        promotion,
        commissionRule,
        settings.taxRate,
        settings.serviceFee
      );

      const confirmationCode = generateConfirmationCode();

      // f. Create Booking
      const booking = await tx.booking.create({
        data: {
          userId,
          locationId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestFirstName,
          guestLastName,
          guestEmail,
          guestPhone,
          vehicleMake,
          vehicleModel,
          vehicleColor,
          vehiclePlate,
          totalPrice: pricing.total,
          taxes: pricing.taxes,
          fees: pricing.fees,
          ownerEarnings: pricing.ownerEarnings,
          status: BookingStatus.PENDING,
          confirmationCode,
        },
      });

      // g. Handle Promotion Usage
      if (promotion) {
        await tx.promotion.update({
          where: { id: promotion.id },
          data: { usedCount: { increment: 1 } }
        });
      }

      // i. Create Payment Record
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: pricing.total,
          currency: "USD",
          provider: "STRIPE",
          transactionId: data.paymentIntentId || `txn_saved_${Math.random().toString(36).substring(2, 15)}`,
          status: "SUCCESS",
          paymentMethodId: paymentMethodId || null,
        }
      });

      // j. Create Parking Session
      await tx.parkingSession.create({
        data: {
          bookingId: booking.id,
          locationId: locationId,
          status: "RESERVED",
        },
      });

      // k. Update Analytics
      await tx.locationAnalytics.upsert({
        where: { locationId },
        create: {
          locationId,
          totalBookings: 1,
          revenue: pricing.total,
        },
        update: {
          totalBookings: { increment: 1 },
          revenue: { increment: pricing.total },
        }
      });

      // l. Decrement available spots (simple field update)
      await tx.parkingLocation.update({
        where: { id: locationId },
        data: { availableSpots: { decrement: 1 } }
      });

      return booking;
    });

    revalidatePath("/account/reservations");
    revalidatePath(`/parking/${locationId}`);

    // Notify owner of new booking (fire and forget)
    notifyOwnerOfNewBooking(result.id).catch(err =>
      console.error("Failed to notify owner of new booking:", err)
    );

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to create booking action:", error);
    return { success: false, error: error.message || "Failed to create reservation" };
  }
}

/**
 * Cancels a booking and initiates a refund request.
 */
/**
 * Cancels a booking and initiates a refund request based on policy.
 */
export async function cancelBooking(bookingId: string, reason: string) {
  try {
    const userId = await getAuthUserId();

    // Verify ownership and get locationId with policy
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        location: {
          select: {
            id: true,
            cancellationPolicy: true,
            availableSpots: true,
            totalSpots: true,
          }
        }
      }
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (booking.status === "CANCELLED") {
      return { success: false, error: "Booking is already cancelled" };
    }

    // --- Cancellation Policy Logic ---
    const now = new Date();
    const checkIn = new Date(booking.checkIn);
    const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    const policy = booking.location?.cancellationPolicy as any;
    let policyType = "standard";

    // Default policy if missing (fallback)
    if (!policy) {
      // If no policy set, assume user gets full refund if > 24h
      if (hoursUntilCheckIn >= 24) {
        refundAmount = booking.totalPrice;
      } else {
        return { success: false, error: "The cancellation deadline for this reservation has passed. Cancellation is no longer permitted." };
      }
    } else {
      const deadlineHours = parseInt(policy.hours) || 24;

      if (policy.type === "strict") {
        return { success: false, error: "This reservation is non-refundable and cannot be cancelled." };
      }

      if (hoursUntilCheckIn < deadlineHours) {
        return { success: false, error: `The cancellation period (${deadlineHours} hours before check-in) has passed. Cancellation is no longer permitted.` };
      }

      switch (policy.type) {
        case "free":
          refundAmount = booking.totalPrice;
          break;
        case "moderate":
          refundAmount = booking.totalPrice * 0.5;
          break;
        default:
          refundAmount = 0;
      }
      policyType = policy.type;
    }

    // Round to 2 decimals
    refundAmount = Math.round(refundAmount * 100) / 100;

    // Update booking status, create refund request, and restore spot in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      // Status logic:
      // If it's a guaranteed free cancellation, we might want to Auto-Approve (if system allows)
      // or set to PENDING but with approvedAmount pre-filled.
      // For this system, we'll keep it PENDING so Admin reviews it, but we set the expected amount.

      await tx.refundRequest.create({
        data: {
          bookingId,
          amount: refundAmount, // Calculated amount eligible for refund
          reason: `${reason} (Policy: ${policyType}, Eligible: ${hoursUntilCheckIn.toFixed(1)}h before)`,
          description: `Cancellation Policy: ${policyType?.toUpperCase()}. \nHours before check-in: ${hoursUntilCheckIn.toFixed(1)}. \nOriginal Price: ${booking.totalPrice}`,
          status: "PENDING",
          approvedAmount: refundAmount, // Suggest this amount to admin
        },
      });

      // Restore available spot (only if within bounds)
      if (booking.location && booking.location.availableSpots < booking.location.totalSpots) {
        await tx.parkingLocation.update({
          where: { id: booking.locationId },
          data: {
            availableSpots: {
              increment: 1
            }
          }
        });
      }

      return updatedBooking;
    });

    revalidatePath("/account/reservations");
    revalidatePath(`/account/reservations/${bookingId}`);
    revalidatePath(`/parking/${booking.locationId}`);

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return { success: false, error: "Failed to cancel reservation" };
  }
}

/**
 * Updates vehicle info for a booking (Production level code would handle modification limits)
 */
export async function updateBookingVehicle(bookingId: string, vehicleInfo: {
  make: string;
  model: string;
  color: string;
  plate: string;
}) {
  try {
    const userId = await getAuthUserId();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true },
    });

    if (!booking || booking.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        vehicleMake: vehicleInfo.make,
        vehicleModel: vehicleInfo.model,
        vehicleColor: vehicleInfo.color,
        vehiclePlate: vehicleInfo.plate,
      },
    });

    revalidatePath(`/account/reservations/${bookingId}`);
    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error("Failed to update booking vehicle:", error);
    return { success: false, error: "Failed to update vehicle information" };
  }
}

/**
 * Submits a review for a completed booking.
 */
export async function submitReview(bookingId: string, reviewData: {
  rating: number;
  title: string;
  content: string;
}) {
  try {
    const userId = await getAuthUserId();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: true },
    });

    if (!booking || booking.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Production check: Only allow reviews for past/completed bookings
    const now = new Date();
    if (new Date(booking.checkOut) > now && booking.status !== "COMPLETED") {
      return { success: false, error: "You can only review completed stays" };
    }

    const review = await prisma.review.create({
      data: {
        userId,
        locationId: booking.locationId,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
      },
    });

    revalidatePath(`/account/reservations/${bookingId}`);
    return { success: true, data: review };
  } catch (error) {
    console.error("Failed to submit review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}

/**
 * Updates booking dates.
 * Production logic would include availability checks and price recalculation.
 */
export async function updateBookingDates(
  bookingId: string,
  checkIn: Date,
  checkOut: Date,
  pricingData?: {
    totalPrice: number;
    taxes: number;
    fees: number;
    isExtension: boolean;
    isReduction?: boolean;
    paymentMethodId?: string;
    transactionId?: string;
  }
) {
  try {
    const userId = await getAuthUserId();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        location: {
          include: {
            owner: {
              include: { wallet: true }
            }
          }
        },
        payments: true
      },
    });

    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.userId !== userId) return { success: false, error: "Unauthorized" };

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the booking dates and pricing if provided
      const updateData: any = {
        checkIn,
        checkOut,
      };

      if (pricingData) {
        updateData.totalPrice = pricingData.totalPrice;
        updateData.taxes = pricingData.taxes;
        updateData.fees = pricingData.fees;

        // Calculate differences
        const priceDifference = pricingData.totalPrice - booking.totalPrice;

        // Recalculate owner earnings based on new subtotal
        const subtotal = pricingData.totalPrice - pricingData.taxes - pricingData.fees;
        const ownerEarnings = subtotal * 0.85; // Assuming 15% commission
        updateData.ownerEarnings = ownerEarnings;

        // 2. CASE A: It's an extension (Price Increased)
        if (pricingData.isExtension && priceDifference > 0) {
          await tx.payment.create({
            data: {
              bookingId: booking.id,
              amount: priceDifference,
              currency: "USD",
              provider: "STRIPE",
              transactionId: pricingData.transactionId || (pricingData.paymentMethodId
                ? `txn_saved_${Math.random().toString(36).substring(2, 12)}`
                : `txn_mod_${Math.random().toString(36).substring(2, 10)}`),
              status: "SUCCESS",
              paymentMethodId: pricingData.paymentMethodId || null,
            }
          });

          // Update Owner Wallet for extra earnings
          // @ts-ignore - Prisma type inclusion issue in IDE
          const ownerWallet = booking.location?.owner?.wallet;
          const extraEarnings = ownerEarnings - Number(booking.ownerEarnings || 0);

          if (ownerWallet && extraEarnings > 0) {
            await tx.wallet.update({
              where: { id: ownerWallet.id },
              data: { balance: { increment: extraEarnings } }
            });

            await tx.walletTransaction.create({
              data: {
                walletId: ownerWallet.id,
                type: "CREDIT",
                amount: extraEarnings,
                description: `Extra earnings for modified booking ${booking.confirmationCode}`,
                status: "SUCCESS",
                reference: booking.id,
              }
            });
          }
        }
        // 2. CASE B: It's a reduction (Price Decreased)
        else if (priceDifference < 0) {
          const refundAmount = Math.abs(priceDifference);

          // Create Refund Request for administrative processing
          await tx.refundRequest.create({
            data: {
              bookingId: booking.id,
              amount: refundAmount,
              reason: "Reservation duration reduced by customer",
              description: `Modification from ${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()} to ${checkIn.toLocaleDateString()} - ${checkOut.toLocaleDateString()}. Original: ${booking.totalPrice}, New: ${pricingData.totalPrice}`,
              status: "PENDING",
              approvedAmount: refundAmount,
            }
          });

          // Deduct from Owner Wallet
          // @ts-ignore
          const ownerWallet = booking.location?.owner?.wallet;
          const earningsDeduction = Number(booking.ownerEarnings || 0) - ownerEarnings;

          if (ownerWallet && earningsDeduction > 0) {
            await tx.wallet.update({
              where: { id: ownerWallet.id },
              data: { balance: { decrement: earningsDeduction } }
            });

            await tx.walletTransaction.create({
              data: {
                walletId: ownerWallet.id,
                type: "REFUND",
                amount: earningsDeduction,
                description: `Earnings deduction due to reduction/modification of booking ${booking.confirmationCode}`,
                status: "SUCCESS",
                reference: booking.id,
              }
            });
          }
        }
      }

      return await tx.booking.update({
        where: { id: bookingId },
        data: updateData,
      });
    });

    revalidatePath(`/account/reservations/${bookingId}`);
    revalidatePath("/account/reservations");

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to update booking dates:", error);
    return { success: false, error: "Failed to update reservation dates" };
  }
}

/**
 * Retrieves a booking by its confirmation code.
 */
export async function getBookingByConfirmationCode(code: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { confirmationCode: code },
      include: {
        location: {
          include: {
            owner: {
              include: {
                user: {
                  select: {
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    return { success: true, data: booking };
  } catch (error) {
    console.error("Failed to fetch booking by code:", error);
    return { success: false, error: "Failed to fetch reservation details" };
  }
}

/**
 * Sends an email receipt for a booking.
 */
export async function sendEmailReceipt(bookingId: string, customEmail?: string) {
  try {
    return await sendReservationReceipt(bookingId, customEmail);
  } catch (error) {
    console.error("Failed to trigger email receipt:", error);
    return { success: false, error: "Failed to send email" };
  }
}

/**
 * Approves a pending booking.
 */
export async function approveBooking(bookingId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch booking with location and owner info
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          location: {
            include: {
              owner: {
                include: { wallet: true }
              }
            }
          }
        }
      });

      if (!booking) throw new Error("Booking not found");
      if (booking.status !== "PENDING") throw new Error("Booking is not in pending status");

      // 2. Update Booking Status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });

      // 3. Update Owner Wallet
      const ownerWallet = booking.location.owner.wallet;
      const ownerEarnings = (booking as any).ownerEarnings;

      if (ownerWallet && ownerEarnings) {
        await tx.wallet.update({
          where: { id: ownerWallet.id },
          data: { balance: { increment: ownerEarnings } }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: ownerWallet.id,
            type: "CREDIT",
            amount: ownerEarnings,
            description: `Earnings for booking ${booking.confirmationCode} (Approved)`,
            status: "SUCCESS",
            reference: booking.id,
          }
        });
      }

      return updatedBooking;
    });

    revalidatePath("/owner/bookings");
    revalidatePath("/account/reservations");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to approve booking:", error);
    return { success: false, error: error.message || "Failed to approve reservation" };
  }
}

/**
 * Rejects a pending booking.
 */
export async function rejectBooking(bookingId: string, reason: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { location: true }
      });

      if (!booking) throw new Error("Booking not found");
      if (booking.status !== "PENDING") throw new Error("Booking is not in pending status");

      // 1. Update status to REJECTED
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "REJECTED" as any,
          rejectionReason: reason
        } as any,
      });

      // 2. Restore available spot (only if within bounds)
      if (booking.location && booking.location.availableSpots < booking.location.totalSpots) {
        await tx.parkingLocation.update({
          where: { id: booking.locationId },
          data: { availableSpots: { increment: 1 } }
        });
      }

      return updatedBooking;
    });

    revalidatePath("/owner/bookings");
    revalidatePath("/account/reservations");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to reject booking:", error);
    return { success: false, error: error.message || "Failed to reject reservation" };
  }
}

/**
 * Automatically cleans up expired bookings that never checked in (NO-SHOWS).
 * Reverts the available spot count and updates statuses.
 * Applies a 2-hour grace period after the scheduled check-out time.
 */
export async function cleanupExpiredBookings() {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Find sessions that are RESERVED/PENDING but their checkout time was > 2 hours ago
    const expiredSessions = await prisma.parkingSession.findMany({
      where: {
        status: { in: ["RESERVED", "PENDING", "reserved", "pending"] },
        booking: {
          checkOut: { lt: twoHoursAgo },
          status: { notIn: ["CANCELLED", "COMPLETED", "REJECTED"] }
        }
      },
      include: {
        booking: true,
        location: {
          select: { id: true, availableSpots: true, totalSpots: true }
        }
      }
    });

    if (expiredSessions.length === 0) {
      return { success: true, processed: 0 };
    }

    const results = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const session of expiredSessions) {
        // 1. Update Session status
        await tx.parkingSession.update({
          where: { id: session.id },
          data: { status: "NO_SHOW" }
        });

        // 2. Update Booking status
        await tx.booking.update({
          where: { id: session.bookingId },
          data: { status: "EXPIRED" as any } // Mark as EXPIRED instead of COMPLETED
        });

        // 3. Release the spot
        if (session.location && session.location.availableSpots < session.location.totalSpots) {
          await tx.parkingLocation.update({
            where: { id: session.locationId },
            data: { availableSpots: { increment: 1 } }
          });
        }
        count++;
      }
      return count;
    });

    revalidatePath("/owner/bookings");
    revalidatePath("/owner/dashboard");

    return { success: true, processed: results };
  } catch (error) {
    console.error("CLEANUP_EXPIRED_BOOKINGS_ERROR:", error);
    return { success: false, error: "Failed to cleanup expired bookings" };
  }
}
