"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculatePricing } from "@/lib/utils/booking-utils";
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
          airport: loc.airportCode ? (require("@/lib/data").airports.find((a: any) => a.code === loc.airportCode)?.name || loc.airportCode) : "General",
          latitude: loc.latitude,
          longitude: loc.longitude,
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

    await prisma.parkingLocation.delete({
      where: { id },
    });

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

    const updatedLocation = await prisma.parkingLocation.update({
      where: { id },
      data: {
        ...rest,
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

