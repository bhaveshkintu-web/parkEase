"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { isSameDay } from "date-fns";
import { getGracePeriod } from "./settings-actions";
import { notifyCustomerSpotUpdated } from "../notifications";

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

export async function getSpotsForLocation(locationId: string, date: Date = new Date()) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const spots = await (prisma as any).parkingSpot.findMany({
      where: {
        locationId,
      },
      include: {
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "PENDING"] as any },
            checkOut: { gt: startOfDay },
            checkIn: { lt: endOfDay },
          },
          orderBy: { checkIn: "asc" },
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
        // Find which booking is actually active EXACTLY at the selected datetime
        const currentBooking = s.bookings.find((b: any) =>
          new Date(b.checkIn) <= date && new Date(b.checkOut) > date
        );

        // Find the first booking that starts AFTER the selected datetime but on the SAME day
        const upcomingBooking = s.bookings.find((b: any) => {
          const checkIn = new Date(b.checkIn);
          return checkIn > date && isSameDay(checkIn, date);
        });

        // All bookings for this specific spot on this specific day
        const allDailyBookings = s.bookings.filter((b: any) => {
          const bIn = new Date(b.checkIn);
          const bOut = new Date(b.checkOut);
          // Overlaps with the 24h window of the selected date
          return bOut > startOfDay && bIn < endOfDay;
        });

        return {
          ...s,
          isOccupied: !!currentBooking,
          currentBooking: currentBooking || null,
          upcomingBooking: upcomingBooking || null,
          allDailyBookings
        };
      })
    };
  } catch (error) {
    console.error(`[Spot Action Error] Failed to fetch spots for location ${locationId}:`, error);
    return { success: false, error: "Failed to load spots" };
  }
}

/**
 * Toggles the status of a parking spot between ACTIVE and INACTIVE.
 */
export async function toggleSpotStatus(spotId: string, currentStatus: string) {
  try {
    const isActivating = currentStatus === "INACTIVE";
    const newStatus = isActivating ? "ACTIVE" : "INACTIVE";
    
    // Safety check: Don't allow deactivation if there are current or future bookings
    if (!isActivating) {
      const activeOrFutureBookings = await prisma.booking.count({
        where: {
          spotId,
          status: { in: ["CONFIRMED", "PENDING"] as any },
          checkOut: { gt: new Date() }
        }
      });

      if (activeOrFutureBookings > 0) {
        return { 
          success: false, 
          error: "This spot cannot be deactivated because it has active or scheduled future bookings. Please reassign or cancel those bookings first."
        };
      }
    }

    const spot = await prisma.parkingSpot.update({
      where: { id: spotId },
      data: { status: newStatus as any },
    });

    revalidatePath(`/owner/locations/${spot.locationId}`);
    return { success: true, status: spot.status };
  } catch (error) {
    console.error("Failed to toggle spot status:", error);
    return { success: false, error: "Failed to update status" };
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
          status: { in: ["CONFIRMED", "PENDING"] },
          checkOut: { gt: new Date(now.getTime() - gracePeriodMs) }
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

  // Preference 2: Maximize the tightest gap (Safety margin)
  // We calculate the gap before check-in and the gap after check-out.
  // We rank spots by `Math.min(gapBefore, gapAfter)` to ensure maximum "free space".
  const spotsWithGaps = validSpots.map((spot: any) => {
    let gapBeforeMinutes = Infinity;
    let gapAfterMinutes = Infinity;

    // 1. Calculate gap BEFORE checkIn (from the most recent booking that ends before our checkIn)
    const priorBookings = spot.bookings.filter((b: any) => new Date(b.checkOut) <= checkIn);
    if (priorBookings.length > 0) {
      // The bookings are already sorted by checkIn, but we want the one closest to our start
      const latestPriorCheckOut = new Date(Math.max(...priorBookings.map((b: any) => new Date(b.checkOut).getTime())));
      gapBeforeMinutes = (checkIn.getTime() - latestPriorCheckOut.getTime()) / (1000 * 60);
    }

    // 2. Calculate gap AFTER checkOut (until the next booking that starts after our checkOut)
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
            status: { in: ["CONFIRMED", "PENDING"] },
            checkOut: { gt: new Date(now.getTime() - gracePeriodMs) }
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
        message: `${emptySpots.length} empty spots available`,
        availableCount: emptySpots.length,
        availableSpots: emptySpots.map((s: any) => ({
          id: s.id,
          identifier: s.identifier,
        })),
      };
    }

    // 2. Overlap availability (Gaps)
    // Future bookings are now allowed to share spots!
    return { 
      isAvailable: true, 
      message: `${validSpots.length} spots available with safe gaps`,
      availableCount: validSpots.length,
      availableSpots: validSpots.map((s: any) => ({
        id: s.id,
        identifier: s.identifier,
      })),
    };

  } catch (error) {
    console.error("Availability check failed:", error);
    return { isAvailable: false, message: "Failed to check availability.", availableCount: 0 };
  }
}

// update allocated spot
export async function updateAllocatedSpot(
  bookingId: string,
  spotId: string
) {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const gracePeriodMinutes = await getGracePeriod();
      const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
      const now = new Date();

      // 1. Get booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }
      // 2. Get spot
      const spot = await tx.parkingSpot.findUnique({
        where: { id: spotId },
        include: {
          bookings: {
            where: {
              status: { in: ["CONFIRMED", "PENDING"] },
              checkOut: { gt: new Date(now.getTime() - gracePeriodMs) },
            },
          },
        },
      });

      if (!spot) {
        throw new Error("Spot not found");
      }

      // 3. Location check
      if (spot.locationId !== booking.locationId) {
        throw new Error("Invalid spot for this location");
      }

      // 4. Conflict check
      const hasConflict = spot.bookings.some((b: any) => {
        if (b.id === bookingId) return false;
        const bCheckIn = new Date(b.checkIn);
        const bCheckOut = new Date(b.checkOut);
        return (
          bCheckOut > booking.checkIn &&
          bCheckIn < booking.checkOut
        );
      });

      if (hasConflict) {
        throw new Error("Spot not available for selected time");
      }

      // 5. Update booking
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          spotId: spot.id,
          spotIdentifier: spot.identifier,
        },
      });

      return updatedBooking;
    });

    // AFTER transaction commit
    await notifyCustomerSpotUpdated(updated.id);

    // Revalidate UI
    revalidatePath("/owner/bookings");

    return {
      success: true,
      message: "Spot updated successfully",
      data: updated,
    };
  } catch (error: any) {
    console.error("Update spot failed:", error);

    return {
      success: false,
      error: error.message || "Failed to update spot",
    };
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
