import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePricing, generateConfirmationCode } from "@/lib/utils/booking-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      locationId,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      vehiclePlate,
    } = body;

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    // Prisma Transaction for Atomic Booking
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Re-validate availability with a lock (simulated via serializable or manual check in transaction)
      const location = await tx.parkingLocation.findUnique({
        where: { id: locationId },
        include: { pricingRules: true },
      });

      if (!location) throw new Error("Location not found");

      const overlappingCount = await tx.booking.count({
        where: {
          locationId,
          status: { in: ["CONFIRMED", "PENDING"] },
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
          ],
        },
      });

      if (location.totalSpots - overlappingCount <= 0) {
        throw new Error("Sold Out: No spots available for selected dates");
      }

      // 2. Calculate final pricing
      const pricing = calculatePricing(location.pricePerDay, location.pricingRules, checkIn, checkOut);

      // 3. Create Booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          locationId,
          checkIn,
          checkOut,
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
          status: "CONFIRMED",
          confirmationCode: generateConfirmationCode(),
        },
      });

      // 4. Create ParkingSession
      await tx.parkingSession.create({
        data: {
          bookingId: newBooking.id,
          locationId: locationId,
          status: "RESERVED",
        },
      });

      // 5. Update Location Analytics
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
        },
      });

      // 6. Update availableSpots (de-normalized field for quick checks)
      await tx.parkingLocation.update({
        where: { id: locationId },
        data: { availableSpots: { decrement: 1 } }
      });

      return newBooking;
    });

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Booking Creation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create booking" }, { status: 400 });
  }
}
