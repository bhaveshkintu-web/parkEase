import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const booking = await prisma.$transaction(async (tx) => {
      const existingBooking = await tx.booking.findUnique({
        where: { id },
        include: { location: true }
      });

      if (!existingBooking) throw new Error("Booking not found");
      if (existingBooking.status === "CANCELLED") throw new Error("Booking already cancelled");

      // Enforce Cancellation Policy
      const now = new Date();
      const checkIn = new Date(existingBooking.checkIn);
      const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
      const policy = (existingBooking.location as any)?.cancellationPolicy;

      if (policy) {
        const deadlineHours = parseInt(policy.hours) || 24;
        if (policy.type === "strict") {
          throw new Error("This reservation is non-refundable and cannot be cancelled.");
        }
        if (hoursUntilCheckIn < deadlineHours) {
          throw new Error(`The cancellation period (${deadlineHours} hours before check-in) has passed.`);
        }
      } else {
        // Fallback for missing policy (24h default)
        if (hoursUntilCheckIn < 24) {
          throw new Error("The cancellation deadline for this reservation has passed.");
        }
      }

      // 1. Update Booking Status
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED" }
      });

      // 2. Update Session Status
      await tx.parkingSession.updateMany({
        where: { bookingId: id },
        data: { status: "CANCELLED" }
      });

      // 3. Restore Spot
      await tx.parkingLocation.update({
        where: { id: existingBooking.locationId },
        data: { availableSpots: { increment: 1 } }
      });

      // 4. Update Analytics (Revenue Reduction)
      await tx.locationAnalytics.update({
        where: { locationId: existingBooking.locationId },
        data: {
          revenue: { decrement: existingBooking.totalPrice }
        }
      });

      return updatedBooking;
    });

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Cancellation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel booking" }, { status: 400 });
  }
}
