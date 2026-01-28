"use server";

import { prisma } from "@/lib/prisma";
import { calculatePricing } from "@/lib/utils/booking-utils";

/**
 * Common shape for location search results
 */
export type ParkingLocationSearchResult = {
  id: string;
  name: string;
  address: string;
  city: string;
  airportCode: string | null;
  pricePerDay: number;
  originalPrice: number | null;
  amenities: string[];
  images: string[];
  shuttle: boolean;
  covered: boolean;
  valet: boolean;
  rating: number;
  reviewCount: number;
  pricing: any;
  availableSpots: number;
};

/**
 * Logic to fetch locations with Way.com style filtering and stats.
 */
export async function getParkingLocations(searchParams?: {
  city?: string;
  airportCode?: string;
  checkIn?: string;
  checkOut?: string;
}) {
  try {
    const { city, airportCode, checkIn: ci, checkOut: co } = searchParams || {};
    
    // Default dates if none provided (next 24 hours) for general listing
    const checkIn = ci ? new Date(ci) : new Date();
    const checkOut = co ? new Date(co) : new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);

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

    const locationsWithStats: ParkingLocationSearchResult[] = locations
      .filter((loc) => loc.totalSpots - loc._count.bookings > 0)
      .map((loc) => {
        const reviewCount = loc.reviews.length;
        const rating = reviewCount > 0 
          ? Number((loc.reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviewCount).toFixed(1))
          : 0;

        const pricing = calculatePricing(loc.pricePerDay, loc.pricingRules, checkIn, checkOut);

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

    return { success: true, data: locationsWithStats };
  } catch (error) {
    console.error("Failed to fetch parking locations:", error);
    return { success: false, error: "Failed to fetch parking locations" };
  }
}

/**
 * Retrieves a single parking location by ID with detailed stats.
 */
export async function getParkingLocationById(id: string, searchParams?: { checkIn?: string; checkOut?: string }) {
  try {
    const { checkIn: ci, checkOut: co } = searchParams || {};

    const location = await prisma.parkingLocation.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        pricingRules: true,
        analytics: true,
      },
    });

    if (!location) return { success: false, error: "Location not found" };

    const reviewCount = location.reviews.length;
    const rating = reviewCount > 0 
      ? Number((location.reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviewCount).toFixed(1))
      : 0;

    let availability = null;
    let pricing = null;

    if (ci && co) {
      const checkIn = new Date(ci);
      const checkOut = new Date(co);

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

      pricing = calculatePricing(location.pricePerDay, location.pricingRules, checkIn, checkOut);
    }

    return { 
      success: true, 
      data: {
        ...location,
        reviewCount,
        rating,
        availability,
        pricing
      } 
    };
  } catch (error) {
    console.error("Failed to fetch location details:", error);
    return { success: false, error: "Failed to fetch location details" };
  }
}

/**
 * Retrieves nearby parking locations based on airport code.
 */
export async function getNearbyParkingLocations(airportCode: string, excludeId: string) {
  try {
    const locations = await prisma.parkingLocation.findMany({
      where: {
        airportCode,
        id: { not: excludeId },
        status: "ACTIVE",
      },
      take: 3,
      include: {
        reviews: true,
      },
    });

    const locationsWithStats = locations.map(loc => {
      const reviewCount = loc.reviews.length;
      const rating = reviewCount > 0 
        ? Number((loc.reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviewCount).toFixed(1))
        : 0;
      
      return {
        ...loc,
        reviewCount,
        rating,
      };
    });

    return { success: true, data: locationsWithStats };
  } catch (error) {
    console.error("Failed to fetch nearby locations:", error);
    return { success: false, error: "Failed to fetch nearby locations" };
  }
}

