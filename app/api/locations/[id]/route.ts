import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePricing } from "@/lib/utils/booking-utils";
import { getGeneralSettings } from "@/lib/actions/settings-actions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const checkInStr = searchParams.get("checkIn");
    const checkOutStr = searchParams.get("checkOut");

    const location = await prisma.parkingLocation.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            user: {
              select: { firstName: true, lastName: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        pricingRules: true,
        analytics: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const reviewCount = location.reviews.length;
    const rating = reviewCount > 0
      ? Number((location.reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviewCount).toFixed(1))
      : 0;

    let availability = null;
    let pricing = null;

    if (checkInStr && checkOutStr) {
      const checkIn = new Date(checkInStr);
      const checkOut = new Date(checkOutStr);

      const overlappingBookings = await prisma.booking.count({
        where: {
          locationId: id,
          status: { in: ["CONFIRMED", "PENDING"] },
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
          ],
        },
      });

      availability = {
        totalSpots: location.totalSpots,
        availableSpots: location.totalSpots - overlappingBookings,
        isAvailable: location.totalSpots - overlappingBookings > 0
      };

      const settings = await getGeneralSettings();
      pricing = calculatePricing(location.pricePerDay, location.pricingRules, checkIn, checkOut, null, null, settings.taxRate, settings.serviceFee);
    }

    return NextResponse.json({
      ...location,
      rating,
      reviewCount,
      availability,
      pricing
    });
  } catch (error) {
    console.error("Location Details API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
