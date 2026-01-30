"use server";

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { BookingStatus } from "@prisma/client";

/**
 * Marks a vehicle as checked out and notifies the user to leave a review.
 */
export async function checkOutVehicle(sessionId: string, watchmanId: string) {
  try {
    const session = await prisma.parkingSession.update({
      where: { id: sessionId },
      data: {
        status: "CHECKED_OUT",
        checkOutTime: new Date(),
        checkOutBy: watchmanId,
      },
      include: {
        booking: {
          include: {
            location: true,
            user: true,
          },
        },
      },
    });

    if (session.booking) {
      // 1. Update booking status if not already completed
      await prisma.booking.update({
        where: { id: session.bookingId! },
        data: { status: BookingStatus.COMPLETED },
      });

      // 2. Notify User to leave a review
      await createNotification({
        userId: session.booking.userId,
        title: "Hope you enjoyed your stay!",
        message: `How was your experience at "${session.booking.location.name}"? Please leave a review.`,
        type: "success",
        link: `/account/reservations/${session.bookingId}/review`,
      });
    }

    return { success: true, data: session };
  } catch (error) {
    console.error("Failed to check out vehicle:", error);
    return { success: false, error: "Failed to process check-out" };
  }
}
