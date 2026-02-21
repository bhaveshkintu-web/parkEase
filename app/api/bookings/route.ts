import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { calculatePricing, generateConfirmationCode } from "@/lib/utils/booking-utils";
import { getGeneralSettings } from "@/lib/actions/settings-actions";

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
      promoCode, // New field
    } = body;

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    // Prisma Transaction for Atomic Booking
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Fetch all necessary data
      const location = await tx.parkingLocation.findUnique({
        where: { id: locationId },
        include: {
          pricingRules: true,
          owner: {
            include: { wallet: true }
          }
        },
      });

      if (!location) throw new Error("Location not found");

      // Check for promotion
      let promotion = null;
      if (promoCode) {
        promotion = await tx.promotion.findUnique({
          where: { code: promoCode.toUpperCase() },
        });

        if (promotion && (!promotion.isActive || promotion.validUntil < new Date())) {
          throw new Error("Invalid or expired promo code");
        }
      }

      // Check for commission rule (simplistic: find first active)
      const commissionRule = await tx.commissionRule.findFirst({
        where: { isActive: true },
      });

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

      const settings = await getGeneralSettings();

      // 2. Calculate final pricing with Promotion and Commission
      const pricing = calculatePricing(
        location.pricePerDay,
        location.pricingRules,
        checkIn,
        checkOut,
        promotion,
        commissionRule,
        settings.taxRate,
        settings.serviceFee
      );

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

      // 4. Handle Promotion Usage
      if (promotion) {
        await tx.promotion.update({
          where: { id: promotion.id },
          data: { usedCount: { increment: 1 } }
        });
      }

      // 5. Update Owner Wallet and Create Transaction
      const ownerProfileId = location.ownerId;
      const ownerWallet = location.owner.wallet;

      if (ownerWallet) {
        // a. Credit Wallet
        await tx.wallet.update({
          where: { id: ownerWallet.id },
          data: { balance: { increment: pricing.ownerEarnings } }
        });

        // b. Create Transaction
        await tx.walletTransaction.create({
          data: {
            walletId: ownerWallet.id,
            type: "CREDIT",
            amount: pricing.ownerEarnings,
            description: `Earnings for booking ${newBooking.confirmationCode}`,
            status: "SUCCESS",
            reference: newBooking.id,
          }
        });
      }

      // 6. Create ParkingSession
      await tx.parkingSession.create({
        data: {
          bookingId: newBooking.id,
          locationId: locationId,
          status: "RESERVED",
        },
      });

      // 7. Update Location Analytics
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

      // 8. Update availableSpots
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        location: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to Reservation type expected by frontend
    const reservations = bookings.map(b => {
      const loc = b.location;

      const mappedLocation = {
        ...loc,
        airport: loc.airportCode || "Unknown",
        coordinates: { lat: loc.latitude || 0, lng: loc.longitude || 0 },
        distance: "N/A",
        securityFeatures: [], // Missing in DB for now
        originalPrice: loc.originalPrice || loc.pricePerDay * 1.2, // Fallback if missing
      };

      return {
        id: b.id,
        userId: b.userId,
        locationId: b.locationId,
        location: mappedLocation,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        guestInfo: {
          firstName: b.guestFirstName,
          lastName: b.guestLastName,
          email: b.guestEmail,
          phone: b.guestPhone,
        },
        vehicleInfo: {
          make: b.vehicleMake,
          model: b.vehicleModel,
          color: b.vehicleColor,
          licensePlate: b.vehiclePlate,
        },
        totalPrice: b.totalPrice,
        taxes: b.taxes,
        fees: b.fees,
        status: b.status.toLowerCase(),
        confirmationCode: b.confirmationCode,
        qrCode: b.qrCode || b.confirmationCode,
        createdAt: b.createdAt,
        modificationHistory: [],
        cancellationEligibility: {
          eligible: true,
          refundAmount: b.totalPrice,
          deadline: new Date(new Date(b.checkIn).getTime() - 24 * 60 * 60 * 1000),
        },
      };
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
