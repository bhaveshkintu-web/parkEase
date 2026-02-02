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
