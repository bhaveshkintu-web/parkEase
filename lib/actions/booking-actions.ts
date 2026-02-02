"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { BookingStatus } from "@prisma/client";

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

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
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
        payment: true,
        parkingSession: true,
        refunds: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.userId !== userId) {
      return { success: false, error: "Unauthorized access to booking" };
    }

    return { success: true, data: booking };
  } catch (error) {
    console.error("Failed to fetch booking details:", error);
    return { success: false, error: "Failed to fetch reservation details" };
  }
}

/**
 * Creates a new booking.
 */
export async function createBooking(data: any) {
  try {
    const userId = await getAuthUserId();

    // 1. Validation
    const { 
      locationId, checkIn, checkOut, 
      guestFirstName, guestLastName, guestEmail, guestPhone,
      vehicleMake, vehicleModel, vehicleColor, vehiclePlate 
    } = data;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      return { success: false, error: "Check-out must be after check-in" };
    }

    // 2. Fetch location and validate
    const location = await prisma.parkingLocation.findUnique({
      where: { id: locationId },
      include: { analytics: true }
    });

    if (!location) {
      return { success: false, error: "Parking location not found" };
    }

    if (location.status !== "ACTIVE") {
      return { success: false, error: "This location is currently not accepting bookings" };
    }

    if (location.availableSpots <= 0) {
      return { success: false, error: "No spots available for the selected dates" };
    }

    // 3. Calculate Prices (Server-side source of truth)
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const basePrice = location.pricePerDay * days;
    const taxes = basePrice * 0.0925; // 9.25% tax
    const fees = 2.99; // Service fee
    const totalPrice = basePrice + taxes + fees;

    const confirmationCode = `RES-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // 4. Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Create Booking
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
          totalPrice,
          taxes,
          fees,
          status: BookingStatus.CONFIRMED,
          confirmationCode,
        },
      });

      // b. Decrement available spots
      await tx.parkingLocation.update({
        where: { id: locationId },
        data: {
          availableSpots: {
            decrement: 1
          }
        }
      });

      // c. Create Payment
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalPrice,
          currency: "USD",
          provider: "STRIPE",
          transactionId: data.paymentIntentId || `txn_backup_${Math.random().toString(36).substring(2, 15)}`,
          status: "SUCCESS",
        }
      });

      // d. Update Analytics
      await tx.locationAnalytics.upsert({
        where: { locationId },
        create: {
          locationId,
          totalBookings: 1,
          revenue: totalPrice,
        },
        update: {
          totalBookings: { increment: 1 },
          revenue: { increment: totalPrice },
        }
      });

      return booking;
    });

    revalidatePath("/account/reservations");
    revalidatePath(`/parking/${locationId}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to create booking:", error);
    if (error.message === "UNAUTHORIZED") {
      return { success: false, error: "Please log in to complete your booking" };
    }
    return { success: false, error: "Failed to create reservation. Please try again." };
  }
}

/**
 * Cancels a booking and initiates a refund request.
 */
export async function cancelBooking(bookingId: string, reason: string) {
  try {
    const userId = await getAuthUserId();

    // Verify ownership and get locationId
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, status: true, totalPrice: true, locationId: true },
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

    // Update booking status, create refund request, and restore spot in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.refundRequest.create({
        data: {
          bookingId,
          amount: booking.totalPrice, // Default to full refund for now
          reason,
          status: "PENDING",
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
    const { sendReservationReceipt } = await import("@/lib/notifications");
    return await sendReservationReceipt(bookingId, customEmail);
  } catch (error) {
    console.error("Failed to trigger email receipt:", error);
    return { success: false, error: "Failed to send email" };
  }
}
