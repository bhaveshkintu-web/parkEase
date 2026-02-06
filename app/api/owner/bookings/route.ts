import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the owner profile and include all locations and their bookings
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: {
        locations: {
          include: {
            bookings: {
              include: {
                location: true
              }
            },
          }
        },
      }
    });

    if (!ownerProfile) {
      return NextResponse.json([]);
    }

    // Flatten all bookings from all locations
    const allBookings = ownerProfile.locations.flatMap(l => l.bookings);

    // Map to Reservation type expected by frontend
    const reservations = allBookings.map(b => {
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

    // Sort by newest first by default
    reservations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("[OWNER_BOOKINGS]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
