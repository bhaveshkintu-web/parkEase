"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Pre-flight check: Returns how many minutes max the customer can extend before
 * hitting an overlapping booking for the same spot/location.
 * Returns null if there is no upcoming booking conflict.
 */
export async function checkExtensionOverlapAction(bookingId: string) {
    try {
        const booking = await (prisma.booking as any).findUnique({
            where: { id: bookingId },
            select: { checkOut: true, locationId: true, spotId: true, spotIdentifier: true }
        });
        if (!booking) return { success: false, error: "Booking not found" };

        const currentCheckOut = new Date(booking.checkOut);

        // Find the next booking at this location that starts after the current checkout
        // If a spot is assigned, narrow to that spot; otherwise check the whole location
        const nextBooking = await (prisma.booking as any).findFirst({
            where: {
                id: { not: bookingId },
                locationId: (booking as any).locationId,
                ...((booking as any).spotId ? { spotId: (booking as any).spotId } : {}),
                checkIn: { gt: currentCheckOut },
                status: { in: ["CONFIRMED", "PENDING"] as any },
            },
            orderBy: { checkIn: "asc" },
            select: { checkIn: true, guestFirstName: true, guestLastName: true, confirmationCode: true }
        });

        if (!nextBooking) {
            return { success: true, hasOverlap: false, maxAllowedMinutes: null };
        }

        const nextCheckIn = new Date(nextBooking.checkIn);
        const gapMs = nextCheckIn.getTime() - currentCheckOut.getTime();
        const maxAllowedMinutes = Math.floor(gapMs / 60000);

        return {
            success: true,
            hasOverlap: true,
            maxAllowedMinutes,
            nextBookingCheckIn: nextBooking.checkIn,
            nextGuestName: `${nextBooking.guestFirstName} ${nextBooking.guestLastName}`,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function extendBookingAction(bookingId: string, additionalMinutes: number, amount: number, paymentIntentId: string) {
    try {
        let userId = null;
        try {
            userId = await getAuthUserId();
        } catch (e) {
            // Allow public extension
        }

        const booking = await (prisma.booking as any).findUnique({
            where: { id: bookingId },
            include: {
                location: true,
                parkingSession: true
            }
        });

        if (!booking) return { success: false, error: "Booking not found" };
        // Note: Ownership check is intentionally skipped here because this action
        // can be triggered via a public link (e.g., from email). The booking ID itself
        // acts as the access token. Ownership is only enforced on internal account pages.

        const newCheckOut = new Date(booking.checkOut.getTime() + additionalMinutes * 60000);

        // ── Overlap guard ──────────────────────────────────────────────────────────
        // Before committing, verify no other booking at the same location (or same spot)
        // starts before the new checkout time.
        const conflictingBooking = await (prisma.booking as any).findFirst({
            where: {
                id: { not: bookingId },
                locationId: (booking as any).locationId,
                ...((booking as any).spotId ? { spotId: (booking as any).spotId } : {}),
                checkIn: {
                    gt: (booking as any).checkOut,  // starts after the CURRENT checkout
                    lt: newCheckOut,       // starts before the NEW checkout
                },
                status: { in: ["CONFIRMED", "PENDING"] as any },
            },
            orderBy: { checkIn: "asc" },
            select: { checkIn: true, confirmationCode: true }
        });

        if (conflictingBooking) {
            const gapMs = new Date(conflictingBooking.checkIn).getTime() - booking.checkOut.getTime();
            const maxMinutes = Math.floor(gapMs / 60000);
            return {
                success: false,
                error: `OVERLAP_CONFLICT`,
                maxAllowedMinutes: maxMinutes,
                conflictAt: conflictingBooking.checkIn,
            };
        }
        // ──────────────────────────────────────────────────────────────────────────

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Booking
            const updatedBooking = await (tx.booking as any).update({
                where: { id: bookingId },
                data: {
                    checkOut: newCheckOut,
                    totalPrice: { increment: amount },
                    extensionPaymentId: paymentIntentId,
                }
            });

            // 2. Create Payment Record
            await tx.payment.create({
                data: {
                    bookingId: bookingId,
                    amount: amount,
                    currency: "USD",
                    provider: "STRIPE",
                    transactionId: paymentIntentId,
                    status: "SUCCESS",
                    type: "EXTENSION" as any,
                }
            });

            // 3. Update analytics
            await tx.locationAnalytics.update({
                where: { locationId: booking.locationId },
                data: {
                    revenue: { increment: amount }
                }
            });

            return updatedBooking;
        });

        revalidatePath(`/account/reservations/${bookingId}`);
        revalidatePath(`/extend-parking/${bookingId}`);

        return { success: true, data: result };
    } catch (error: any) {
        console.error("Extension failed:", error);
        return { success: false, error: error.message || "Failed to extend booking" };
    }
}
