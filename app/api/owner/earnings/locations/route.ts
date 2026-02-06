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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const userId = session.user.id;
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: { 
        locations: true,
        wallet: true
      }
    });

    if (!ownerProfile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const walletId = ownerProfile.wallet?.id;

    // Filter condition for bookings
    const bookingWhere: any = {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      payment: { status: { in: ["SUCCESS", "COMPLETED"] } }
    };

    if (startDate || endDate) {
      bookingWhere.createdAt = {};
      if (startDate) bookingWhere.createdAt.gte = new Date(startDate);
      if (endDate) bookingWhere.createdAt.lte = new Date(endDate);
    }

    const locationPerformance = await Promise.all(ownerProfile.locations.map(async (loc) => {
      const bookings = await prisma.booking.findMany({
        where: {
          locationId: loc.id,
          ...bookingWhere
        },
        select: {
          id: true,
          totalPrice: true
        }
      });

      const grossRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
      
      // Get commission for these specific bookings from wallet transactions
      const commissionTxs = walletId ? await prisma.walletTransaction.aggregate({
        where: {
          walletId,
          type: "COMMISSION",
          status: "COMPLETED",
          reference: { in: bookings.map(b => b.id) }
        },
        _sum: {
          amount: true
        }
      }) : { _sum: { amount: 0 } };

      const commission = Math.abs(commissionTxs._sum.amount || 0);

      // Occupancy Rate calculation: (Currently booked spots / total spots)
      // For simplicity, we use the average occupancy over the period or just the current state?
      // The requirement says "using totalSpots vs booked slots".
      const currentlyBooked = await prisma.booking.count({
        where: {
          locationId: loc.id,
          status: "CONFIRMED",
          checkIn: { lte: new Date() },
          checkOut: { gte: new Date() }
        }
      });

      const occupancyRate = loc.totalSpots > 0 ? (currentlyBooked / loc.totalSpots) * 100 : 0;
      const avgBookingValue = bookings.length > 0 ? grossRevenue / bookings.length : 0;

      return {
        id: loc.id,
        name: loc.name,
        bookingsCount: bookings.length,
        grossRevenue,
        commission,
        netEarnings: grossRevenue - commission,
        occupancyRate: parseFloat(occupancyRate.toFixed(2)),
        avgBookingValue: parseFloat(avgBookingValue.toFixed(2))
      };
    }));

    return NextResponse.json(locationPerformance);
  } catch (error) {
    console.error("[OWNER_EARNINGS_LOCATIONS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
