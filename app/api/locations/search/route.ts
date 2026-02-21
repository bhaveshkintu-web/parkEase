import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePricing } from "@/lib/utils/booking-utils";
import { getGeneralSettings } from "@/lib/actions/settings-actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const airportCode = searchParams.get("airportCode");
    const checkInStr = searchParams.get("checkIn");
    const checkOutStr = searchParams.get("checkOut");

    if (!checkInStr || !checkOutStr) {
      return NextResponse.json({ error: "Check-in and check-out dates are required" }, { status: 400 });
    }

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    const settings = await getGeneralSettings();

    // 1. Fetch search matching active locations
    const locations = await prisma.parkingLocation.findMany({
      where: {
        status: "ACTIVE",
        OR: city || airportCode ? [
          city ? { city: { contains: city, mode: "insensitive" } } : {},
          airportCode ? { airportCode: { equals: airportCode, mode: "insensitive" } } : {},
        ] : undefined,
      },
      include: {
        reviews: true,
        pricingRules: true,
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ["CONFIRMED", "PENDING"] },
                AND: [
                  { checkIn: { lt: checkOut } },
                  { checkOut: { gt: checkIn } },
                ],
              },
            },
          },
        },
      },
    });

    // 2. Filter and calculate stats
    const results = locations
      .filter((loc) => loc.totalSpots - loc._count.bookings > 0)
      .map((loc) => {
        const reviewCount = loc.reviews.length;
        const rating = reviewCount > 0
          ? Number((loc.reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviewCount).toFixed(1))
          : 0;

        const pricing = calculatePricing(loc.pricePerDay, loc.pricingRules, checkIn, checkOut, null, null, settings.taxRate, settings.serviceFee);

        return {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          airportCode: loc.airportCode,
          pricePerDay: loc.pricePerDay,
          originalPrice: loc.originalPrice,
          amenities: loc.amenities,
          images: loc.images,
          shuttle: loc.shuttle,
          covered: loc.covered,
          valet: loc.valet,
          rating,
          reviewCount,
          pricing,
          availableSpots: loc.totalSpots - loc._count.bookings,
        };
      });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
