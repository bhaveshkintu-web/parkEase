"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { isSameDay } from "date-fns";
import { getGracePeriod } from "./settings-actions";

// Fallback for SpotStatus if prisma generate hasn't run yet
enum SpotStatusLocal {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

// Try to use SpotStatus from @prisma/client, fallback to local
const SpotStatus = (require("@prisma/client").SpotStatus || SpotStatusLocal) as typeof SpotStatusLocal;

/**
 * Pure function to generate a sequence of spot identifiers.
 * Detects numeric suffix and increments it.
 */
export async function generateSpotIdentifiers(firstId: string, total: number): Promise<string[]> {
  if (total <= 0) return [];

  const match = firstId.match(/^(.*?)(\d+)$/);
  if (!match) {
    // Fallback: append numbers if no numeric suffix found
    return Array.from({ length: total }, (_, i) => `${firstId}${i + 1}`);
  }

  const prefix = match[1];
  const startNumStr = match[2];
  const startNum = parseInt(startNumStr, 10);
  const padLen = startNumStr.length;

  return Array.from({ length: total }, (_, i) => {
    const currentNum = startNum + i;
    const currentNumStr = currentNum.toString().padStart(padLen, '0');
    return `${prefix}${currentNumStr}`;
  });
}

/**
 * Creates multiple spots for a location.
 */
export async function createSpotsForLocation(locationId: string, identifiers: string[], tx?: Prisma.TransactionClient) {
  const db = tx || prisma;

  const data = identifiers.map(id => ({
    locationId,
    identifier: id,
    status: SpotStatus.ACTIVE,
  }));

  return await (db as any).parkingSpot.createMany({
    data,
    skipDuplicates: true, // Safety check
  });
}

/**
 * Fetches all spots for a location with their current availability status.
 */
export async function getSpotsForLocation(locationId: string, date: Date = new Date()) {
  try {
    const spots = await (prisma as any).parkingSpot.findMany({
      where: {
        locationId,
        OR: [
          { status: "ACTIVE" },
          {
            bookings: {
              some: {
                status: { in: ["CONFIRMED", "PENDING"] as any },
                checkOut: { gt: date },
              }
            }
          }
        ]
      },
      include: {
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "PENDING"] as any },
            // Fetch any booking that is either active now OR starts in the future
            checkOut: { gt: date },
          },
          orderBy: { checkIn: "asc" },
          take: 2, // Take current + next
          select: {
            id: true,
            guestFirstName: true,
            guestLastName: true,
            checkIn: true,
            checkOut: true,
            status: true,
          }
        },
      },
    });

    // Natural sorting: A1, A2, A10 instead of A1, A10, A2
    const sortedSpots = spots.sort((a: any, b: any) =>
      a.identifier.localeCompare(b.identifier, undefined, { numeric: true, sensitivity: 'base' })
    );

    console.log(`[Spot Action] ✅ Found ${sortedSpots.length} spots for location ${locationId}`);
    return {
      success: true,
      data: sortedSpots.map((s: any) => {
        // Find which booking is actually active at the selected date
        const currentBooking = s.bookings.find((b: any) =>
          new Date(b.checkIn) <= date && new Date(b.checkOut) > date
        );

        // Find the first booking that starts AFTER the selected date but on the SAME day
        const upcomingBooking = s.bookings.find((b: any) => {
          const checkIn = new Date(b.checkIn);
          return checkIn > date && isSameDay(checkIn, date);
        });

        return {
          ...s,
          isOccupied: !!currentBooking,
          currentBooking: currentBooking || null,
          upcomingBooking: upcomingBooking || null
        };
      })
    };
  } catch (error) {
    console.error(`[Spot Action Error] Failed to fetch spots for location ${locationId}:`, error);
    return { success: false, error: "Failed to load spots" };
  }
}

/**
 * Allocates a free spot for a booking window.
 * MUST be called within a transaction to be safe.
 */
export async function allocateSpotForBooking(
  locationId: string,
  checkIn: Date,
  checkOut: Date,
  tx: Prisma.TransactionClient
) {
  const gracePeriodMinutes = await getGracePeriod();
  const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
  const now = new Date();

  // Fetch all active spots and their future/current bookings
  const spots = await (tx as any).parkingSpot.findMany({
    where: {
      locationId,
      status: "ACTIVE",
    },
    include: {
      bookings: {
        where: {
          OR: [
            { parkingSession: { status: "checked_in" } },
            {
              status: { in: ["CONFIRMED", "PENDING"] },
              checkOut: { gt: new Date(now.getTime() - gracePeriodMs) }
            }
          ]
        },
        orderBy: { checkIn: "asc" }
      }
    },
    orderBy: { identifier: "asc" },
  });

  // Filter out spots that conflict with the requested window
  const validSpots = spots.filter((spot: any) => {
    const hasConflict = spot.bookings.some((booking: any) => {
      const bCheckIn = new Date(booking.checkIn);
      const bCheckOut = new Date(booking.checkOut);
      const isCheckedIn = booking.parkingSession?.status === "checked_in";

      // If it's physically checked in, it conflicts if our checkIn is before they leave
      if (isCheckedIn) {
        return checkIn < bCheckOut;
      }

      // Standard overlap check (with grace period logic from original query)
      const overlaps = bCheckOut > checkIn &&
        bCheckIn < checkOut &&
        bCheckIn > new Date(now.getTime() - gracePeriodMs);
      return overlaps;
    });
    return !hasConflict;
  });

  if (validSpots.length === 0) {
    console.log("[Spot Allocation Warning] Spot allocation failed. No valid spots found for dates.");
    return null;
  }

  // Preference 1: Completely empty spots (no active/future bookings)
  const emptySpots = validSpots.filter((s: any) => s.bookings.length === 0);
  if (emptySpots.length > 0) {
    console.log("[Spot Allocation] Successfully allocated spot ID:", emptySpots[0].identifier);
    return emptySpots[0];
  }

  // If it's a FUTURE booking (not today), we strictly require an empty spot.
  // We do not use "gap logic" for future reservations to keep the calendar clean.
  const isToday = isSameDay(checkIn, now);
  if (!isToday) {
    console.log("[Spot Allocation Warning] Spot allocation failed. No completely empty spot for future booking.");
    return null;
  }

  // Preference 2: Maximize the tightest gap (Fallback for TODAY's bookings only)
  // We calculate the gap before check-in and the gap after check-out.
  // We rank spots by `Math.min(gapBefore, gapAfter)` to ensure maximum "free space".

  const spotsWithGaps = validSpots.map((spot: any) => {
    let gapBeforeMinutes = Infinity;
    let gapAfterMinutes = Infinity;

    // 1. Calculate gap BEFORE checkIn
    // Find all bookings that end before or at the requested checkIn
    const priorBookings = spot.bookings.filter((b: any) => new Date(b.checkOut) <= checkIn);
    if (priorBookings.length > 0) {
      // Find the LATEST checkOut among prior bookings
      const latestPriorCheckOut = new Date(Math.max(...priorBookings.map((b: any) => new Date(b.checkOut).getTime())));
      gapBeforeMinutes = (checkIn.getTime() - latestPriorCheckOut.getTime()) / (1000 * 60);
    }

    // 2. Calculate gap AFTER checkOut
    // Find all bookings that start at or after the requested checkOut
    const futureBookings = spot.bookings.filter((b: any) => new Date(b.checkIn) >= checkOut);
    if (futureBookings.length > 0) {
      // Find the EARLIEST checkIn among future bookings
      const earliestFutureCheckIn = new Date(Math.min(...futureBookings.map((b: any) => new Date(b.checkIn).getTime())));
      gapAfterMinutes = (earliestFutureCheckIn.getTime() - checkOut.getTime()) / (1000 * 60);
    }

    // 3. Find the tightest constraint (the minimum gap on either side)
    const minGap = Math.min(gapBeforeMinutes, gapAfterMinutes);

    return { spot, minGap };
  });

  // Sort descending by minGap: the highest minGap offers the most safety margin
  spotsWithGaps.sort((a: any, b: any) => b.minGap - a.minGap);

  console.log("[Spot Allocation] Successfully allocated spot ID:", spotsWithGaps[0].spot.identifier, "with gap:", spotsWithGaps[0].minGap, "minutes.");
  return spotsWithGaps[0].spot;
}

/**
 * DRY RUN: Checks if a spot can be allocated for a booking window.
 * Used by the frontend to provide early feedback.
 */
export async function checkSpotAvailability(
  locationId: string, 
  checkIn: Date, 
  checkOut: Date
) {
  try {
    const gracePeriodMinutes = await getGracePeriod();
    const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
    const now = new Date();

    // Fetch all active spots and their future/current bookings
    const spots = await (prisma as any).parkingSpot.findMany({
      where: {
        locationId,
        status: "ACTIVE",
      },
      include: {
        bookings: {
          where: {
            OR: [
              { parkingSession: { status: "checked_in" } },
              {
                status: { in: ["CONFIRMED", "PENDING"] },
                checkOut: { gt: new Date(now.getTime() - gracePeriodMs) }
              }
            ]
          },
          orderBy: { checkIn: "asc" }
        }
      },
      orderBy: { identifier: "asc" },
    });

    // Filter out spots that conflict with the requested window
    const validSpots = spots.filter((spot: any) => {
      const hasConflict = spot.bookings.some((booking: any) => {
        const bCheckIn = new Date(booking.checkIn);
        const bCheckOut = new Date(booking.checkOut);
        const isCheckedIn = booking.parkingSession?.status === "checked_in";

        if (isCheckedIn) {
          return checkIn < bCheckOut;
        }

        const overlaps = bCheckOut > checkIn &&
          bCheckIn < checkOut &&
          bCheckIn > new Date(now.getTime() - gracePeriodMs);
        return overlaps;
      });
      return !hasConflict;
    });

    if (validSpots.length === 0) {
      return { 
        isAvailable: false, 
        message: "No spots available for these times.",
        availableCount: 0 
      };
    }

    // 1. Pristine Check (Empty spots)
    const emptySpots = validSpots.filter((s: any) => s.bookings.length === 0);
    if (emptySpots.length > 0) {
      console.log("[Spot Availability] Spots available:", emptySpots.length);
      return { 
        isAvailable: true, 
        message: `${emptySpots.length} spots available`,
        availableCount: emptySpots.length 
      };
    }

    // 2. Future vs Today check
    const isToday = isSameDay(checkIn, now);
    if (!isToday) {
      return { 
        isAvailable: false, 
        message: "Future bookings require a completely empty spot. All spots have upcoming reservations.",
        availableCount: 0
      };
    }

    // 3. Today's Gap Fallback
    console.log("[Spot Availability] Spots available (gap fallback):", validSpots.length);
    return { 
      isAvailable: true, 
      message: `${validSpots.length} spots available`,
      availableCount: validSpots.length 
    };

  } catch (error) {
    console.error("Availability check failed:", error);
    return { isAvailable: false, message: "Failed to check availability.", availableCount: 0 };
  }
}

/**
 * Updates spot identifiers in bulk.
 */
export async function updateSpotIdentifiers(locationId: string, spots: { id?: string, identifier: string }[]) {
  try {
    return await prisma.$transaction(async (tx) => {
      for (const spot of spots) {
        if (spot.id) {
          // Update existing
          await (tx as any).parkingSpot.update({
            where: { id: spot.id },
            data: { identifier: spot.identifier }
          });
        } else {
          // Create new
          await (tx as any).parkingSpot.create({
            data: {
              locationId,
              identifier: spot.identifier,
            }
          });
        }
      }
      revalidatePath(`/owner/locations/${locationId}`);
      console.log(`[Spot Action] ✅ Spot identifiers updated for location ${locationId}`);
      return { success: true };
    });
  } catch (error) {
    console.error(`[Spot Action Error] Failed to update spot identifiers for ${locationId}:`, error);
    return { success: false, error: "Failed to update spots. Make sure identifiers are unique." };
  }
}

/**
 * Updates the active/inactive status of a spot.
 */
export async function updateSpotStatus(spotId: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const spot = await (prisma as any).parkingSpot.update({
      where: { id: spotId },
      data: { status }
    });

    revalidatePath(`/owner/locations/${spot.locationId}`);
    console.log(`[Spot Action] ✅ Spot ${spotId} status updated to ${status}`);
    return { success: true };
  } catch (error) {
    console.error(`[Spot Action Error] Failed to update spot status for ${spotId}:`, error);
    return { success: false, error: "Failed to update spot status" };
  }
}

/**
 * One-time migration for existing locations.
 */
export async function migrateExistingLocations() {
  try {
    const locations = await prisma.parkingLocation.findMany({
      where: {
        spots: { none: {} } as any,
        totalSpots: { gt: 0 }
      },
      select: { id: true, totalSpots: true, name: true }
    });

    console.log(`Starting migration for ${locations.length} locations...`);

    let count = 0;
    for (const loc of locations) {
      const identifiers = await generateSpotIdentifiers("A1", loc.totalSpots);
      await createSpotsForLocation(loc.id, identifiers);
      count++;
      console.log(`Migrated ${count}/${locations.length}: ${loc.name}`);
    }

    console.log(`[Spot Action] ✅ Migration complete: ${count} locations migrated.`);
    return { success: true, migratedCount: count };
  } catch (error) {
    console.error(`[Spot Action Error] Spot migration failed:`, error);
    return { success: false, error: "Migration failed" };
  }
}
