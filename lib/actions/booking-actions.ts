"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { BookingStatus } from "@prisma/client";
import { calculatePricing, generateConfirmationCode } from "../utils/booking-utils";
import { notifyOwnerOfNewBooking } from "@/lib/notifications";

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
        payment: true,
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
          payment: true,
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

      // e. Calculate Pricing (Server-side source of truth)
      const pricing = calculatePricing(
        location.pricePerDay,
        location.pricingRules,
        checkInDate,
        checkOutDate,
        promotion,
        commissionRule
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
      // If no policy set, assume user gets full refund if > 24h (safe fallback) or 0 (strict)
      // Choosing to return 0 to be safe and let admin decide, but marking as 'manual review'
      refundAmount = 0;
    } else {
      const deadlineHours = policy.hours || 24; // Default to 24 if parsing failed

      switch (policy.type) {
        case "free":
          if (hoursUntilCheckIn >= deadlineHours) {
            refundAmount = booking.totalPrice;
          } else {
            refundAmount = 0; // Past deadline
          }
          break;
        case "moderate":
          if (hoursUntilCheckIn >= deadlineHours) {
            refundAmount = booking.totalPrice * 0.5;
          } else {
            refundAmount = 0;
          }
          break;
        case "strict":
          refundAmount = 0;
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

      // Restore available spot
      await tx.parkingLocation.update({
        where: { id: booking.locationId },
        data: {
          availableSpots: {
            increment: 1
          }
        }
      });

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
export async function updateBookingDates(bookingId: string, checkIn: Date, checkOut: Date) {
  try {
    const userId = await getAuthUserId();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: true },
    });

    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.userId !== userId) return { success: false, error: "Unauthorized" };

    // Update the booking dates
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkIn,
        checkOut,
        // In a real app, we would also update the totalPrice here
      },
    });

    revalidatePath(`/account/reservations/${bookingId}`);
    revalidatePath("/account/reservations");

    return { success: true, data: updatedBooking };
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

      // 2. Restore available spot
      await tx.parkingLocation.update({
        where: { id: booking.locationId },
        data: { availableSpots: { increment: 1 } }
      });

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
