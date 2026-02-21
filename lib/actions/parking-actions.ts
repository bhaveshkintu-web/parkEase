"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculatePricing } from "@/lib/utils/booking-utils";
import { getGeneralSettings } from "@/lib/actions/settings-actions";
import { ownerLocationSchema, type OwnerLocationInput } from "@/lib/validations";

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
  airport: string;
  latitude: number;
  longitude: number;
  selfPark: boolean;
  open24Hours: boolean;
  cancellationPolicy: any;
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

    const settings = await getGeneralSettings();

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
          airport: loc.airportCode ? (require("@/lib/data").airports.find((a: any) => a.code === loc.airportCode)?.name || loc.airportCode) : "General",
          latitude: loc.latitude,
          longitude: loc.longitude,
          selfPark: loc.selfPark,
          open24Hours: loc.open24Hours,
          cancellationPolicy: loc.cancellationPolicy,
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

    const checkIn = ci ? new Date(ci) : new Date();
    const checkOut = co ? new Date(co) : new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);

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

    const availability = {
      totalSpots: location.totalSpots,
      availableSpots: location.totalSpots - overlappingBookings,
      isAvailable: location.totalSpots - overlappingBookings > 0
    };

    const settings = await getGeneralSettings();
    const pricing = calculatePricing(location.pricePerDay, location.pricingRules, checkIn, checkOut, null, null, settings.taxRate, settings.serviceFee);

    return {
      success: true,
      data: {
        ...location,
        reviewCount,
        rating,
        availability,
        availableSpots: availability.availableSpots,
        pricing,
        airport: location.airportCode
          ? (require("@/lib/data").airports.find((a: any) => a.code === location.airportCode)?.name || location.airportCode)
          : "General",
        distance: (() => {
          if (!location.airportCode || !location.latitude || !location.longitude) return "Contact for details";
          const airport = require("@/lib/data").destinations.find((d: any) => d.code === location.airportCode);
          if (!airport) return "Near terminal";

          const { calculateDistance, formatDistance } = require("@/lib/utils/geo-utils");
          const dist = calculateDistance(
            airport.coordinates.lat,
            airport.coordinates.lng,
            location.latitude,
            location.longitude
          );
          return formatDistance(dist);
        })()
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

/**

 * Fetches all parking locations belonging to a specific owner.
 */
export async function getOwnerLocations(userId: string) {
  try {
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile) {
      return { success: false, error: "Owner profile not found" };
    }

    // Auto-fix any incorrect availability data (one-time logic during fetch)
    await syncAllLocationsAvailability();

    const locations = await prisma.parkingLocation.findMany({
      where: { ownerId: ownerProfile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        analytics: true,
        reviews: true,
      }
    });

    return { success: true, data: locations };
  } catch (error) {
    console.error("Failed to fetch owner locations:", error);
    return { success: false, error: "Internal server error" };
  }
}


/**
 * Updates the status of a parking location.
 */
export async function updateLocationStatus(id: string, status: string) {
  try {
    const currentLocation = await prisma.parkingLocation.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!currentLocation) {
      return { success: false, error: "Location not found" };
    }

    const newStatus = status.toUpperCase();

    // Prevent owners from activating a location that is still PENDING admin approval
    if (currentLocation.status === "PENDING" && newStatus === "ACTIVE") {
      return { success: false, error: "Cannot activate location until it is approved by an admin." };
    }

    const updated = await prisma.parkingLocation.update({
      where: { id },
      data: { status: newStatus as any },
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update location status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Deletes a parking location.
 */
export async function deleteLocation(id: string) {
  try {
    // Check for associated bookings before deletion
    const bookingCount = await prisma.booking.count({
      where: { locationId: id },
    });

    if (bookingCount > 0) {
      return {
        success: false,
        error: "Cannot delete location with existing bookings. Try deactivating it instead."
      };
    }
    // await prisma.parkingLocation.update({
    //   where: { id },
    // });
    // 2. Perform deletion in a transaction to handle foreign key constraints
    await prisma.$transaction([
      prisma.locationAnalytics.deleteMany({ where: { locationId: id } }),
      prisma.pricingRule.deleteMany({ where: { locationId: id } }),
      prisma.watchmanShift.deleteMany({ where: { locationId: id } }),
      prisma.review.deleteMany({ where: { locationId: id } }),
      prisma.parkingSession.deleteMany({ where: { locationId: id } }),
      prisma.savedLocation.deleteMany({ where: { locationId: id } }),
      prisma.bookingRequest.deleteMany({ where: { parkingId: id } }),
      prisma.parkingLocation.delete({ where: { id } }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete location:", error);
    return { success: false, error: "Failed to delete location" };
  }
}


/**
 * Updates an existing parking location.
 */
export async function updateParkingLocation(id: string, data: OwnerLocationInput) {
  try {
    const result = ownerLocationSchema.safeParse(data);

    if (!result.success) {
      return {
        success: false,
        error: "Validation failed",
        details: result.error.flatten().fieldErrors
      };
    }

    const { cancellationPolicy, cancellationDeadline, ...rest } = result.data;

    const current = await prisma.parkingLocation.findUnique({
      where: { id },
      select: { totalSpots: true, availableSpots: true }
    });

    if (!current) return { success: false, error: "Location not found" };

    const newTotalSpots = rest.totalSpots;
    let newAvailableSpots = current.availableSpots;

    // If total spots changed, recalculate available spots based on existing occupancy
    if (newTotalSpots !== current.totalSpots) {
      const occupiedSpots = Math.max(0, current.totalSpots - current.availableSpots);
      newAvailableSpots = Math.max(0, newTotalSpots - occupiedSpots);
    }

    const updatedLocation = await prisma.parkingLocation.update({
      where: { id },
      data: {
        ...rest,
        availableSpots: newAvailableSpots,
        cancellationPolicy: {
          type: cancellationPolicy,
          hours: parseInt(cancellationDeadline) || 0,
          deadline: cancellationPolicy === "strict" ? "No refunds" : `${cancellationDeadline} hours before check-in`,
          description: cancellationPolicy === "free"
            ? `Free cancellation up to ${cancellationDeadline} hours before check-in`
            : cancellationPolicy === "moderate"
              ? `50% refund up to ${cancellationDeadline} hours before check-in`
              : "Non-refundable"
        },
        updatedAt: new Date(),
      },
    });

    revalidatePath("/owner/locations");
    revalidatePath(`/owner/locations/${id}`);

    return { success: true, data: updatedLocation };
  } catch (error) {
    console.error("Failed to update location:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update location"
    };
  }
}

/**
 * Updates only the images of a parking location.
 */
export async function updateLocationImages(id: string, images: string[]) {
  try {
    const updatedLocation = await prisma.parkingLocation.update({
      where: { id },
      data: {
        images,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/owner/locations");
    revalidatePath(`/owner/locations/${id}`);
    revalidatePath("/parking");

    return { success: true, data: updatedLocation };
  } catch (error) {
    console.error("Failed to update location images:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update location images"
    };
  }
}

/**
 * Utility to fix existing incorrect availability data across all locations.
 * Performs a deep recalculation based on currently active/reserved bookings.
 */
export async function syncAllLocationsAvailability() {
  try {
    const locations = await prisma.parkingLocation.findMany({
      select: { id: true, totalSpots: true }
    });

    const now = new Date();
    let fixedCount = 0;

    for (const location of locations) {
      // Recalculate actually occupied/reserved spots
      // A spot is "occupied" if there is an overlapping booking that is CONFIRMED or PENDING
      // and NOT yet completed/cancelled.
      const occupiedCount = await prisma.booking.count({
        where: {
          locationId: location.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          // We consider it occupied if it overlaps with "now" or is in the future but already reserved
          // More accurately, we check how many are active right now
          AND: [
            { checkIn: { lte: now } },
            { checkOut: { gte: now } }
          ]
        }
      });

      const actualAvailable = Math.max(0, location.totalSpots - occupiedCount);

      await prisma.parkingLocation.update({
        where: { id: location.id },
        data: { availableSpots: actualAvailable }
      });
      fixedCount++;
    }

    console.log(`✅ Sanity check complete: Synchronized availability for ${fixedCount} locations.`);
    return { success: true, fixedCount };
  } catch (error) {
    console.error("Failed to sync location availability:", error);
    return { success: false, error: "Failed to perform sanity check" };
  }
}

