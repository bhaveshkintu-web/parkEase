import { prisma } from "@/lib/prisma";
import { sendSessionExpiryWarning } from "@/lib/notifications";
import { getGeneralSettings } from "../actions/settings-actions";

export async function runExpiryCheck() {
    const now = new Date();
    console.log(`[Expiry Job] Checking for bookings expiring soon (Now: ${now.toISOString()})`);

    const warningWindowStart = now;
    const warningWindowEnd = new Date(now.getTime() + 45 * 60 * 1000); // Expanded to 45 mins for safety

    console.log(`[Expiry Job] Searching for checkOut between ${now.toISOString()} and ${warningWindowEnd.toISOString()}`);

    const stats = {
        notified: 0,
        markedOverstay: 0,
        errors: 0
    };

    try {
        const allCheckedInCount = await prisma.parkingSession.count({
            where: { status: "checked_in" }
        });
        console.log(`[Expiry Job] Diagnostic: Found ${allCheckedInCount} total active sessions.`);

        const sessions = await prisma.parkingSession.findMany({
            where: { status: "checked_in" },
            include: { booking: true }
        });

        // Debug output for sessions near the window
        sessions.forEach(s => {
            const co = new Date(s.booking.checkOut);
            const inWindow = co > warningWindowStart && co < warningWindowEnd;
            // Robust check: Include EXPIRED if it was accidentally marked by cleanup during a late check-in
            const statusMatch = ["CONFIRMED", "PENDING", "WAITING_OVERSTAY_PAYMENT", "EXPIRED"].includes(s.booking.status);
            const unsent = s.expiryWarningSentAt === null;

            if (inWindow || s.booking.guestEmail.includes("gmail.com")) {
                console.log(`[Expiry Job] Checking Booking ${s.bookingId}: InWindow=${inWindow}, StatusMatch=${statusMatch}, Unsent=${unsent}`);
                console.log(`[Expiry Job]   - CheckOut: ${co.toISOString()}, Status: ${s.booking.status}, WarningSent: ${s.expiryWarningSentAt}`);
            }
        });

        const expiringBookings = await prisma.booking.findMany({
            where: {
                status: {
                    in: ["CONFIRMED", "PENDING", "WAITING_OVERSTAY_PAYMENT", "EXPIRED"]
                },
                checkOut: {
                    gt: warningWindowStart,
                    lt: warningWindowEnd,
                },
                parkingSession: {
                    expiryWarningSentAt: null,
                    status: "checked_in",
                }
            },
            include: {
                parkingSession: true,
            }
        });

        console.log(`[Expiry Job] Found ${expiringBookings.length} bookings to notify.`);

        for (const booking of expiringBookings) {
            try {
                console.log(`[Expiry Job] Triggering notification for booking ${booking.id}...`);
                const result = await sendSessionExpiryWarning(booking.id);
                if (result.success) {
                    await prisma.parkingSession.update({
                        where: { bookingId: booking.id },
                        data: { expiryWarningSentAt: new Date() }
                    });
                    console.log(`[Expiry Job] ✅ Notification successfully sent and recorded for booking ${booking.id}`);
                    stats.notified++;
                } else {
                    console.log(`[Expiry Job] ❌ Notification failed for booking ${booking.id}: ${result.error}`);
                    stats.errors++;
                }
            } catch (err: any) {
                console.log(`[Expiry Job] ❌ Critical error notifying booking ${booking.id}: ${err.message}`);
                stats.errors++;
            }
        }

        // Overstay Check
        const settings = await getGeneralSettings();
        const gracePeriodMinutes = settings.gracePeriodMinutes ?? 30;
        const nowMinusGrace = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);

        console.log(`[Expiry Job] Applying grace period of ${gracePeriodMinutes} mins for overstay check. (Before ${nowMinusGrace.toISOString()})`);

        const overstayingBookings = await prisma.booking.findMany({
            where: {
                status: {
                    in: ["CONFIRMED", "PENDING", "WAITING_OVERSTAY_PAYMENT"]
                },
                checkOut: { lt: nowMinusGrace },
                parkingSession: {
                    status: "checked_in"
                }
            }
        });

        if (overstayingBookings.length > 0) {
            console.log(`[Expiry Job] Found ${overstayingBookings.length} new overstaying bookings past grace period.`);
        }

        for (const booking of overstayingBookings) {
            try {
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: "OVERSTAY" as any }
                });
                console.log(`[Expiry Job] Booking ${booking.id} marked as OVERSTAY`);
                stats.markedOverstay++;
            } catch (err: any) {
                console.log(`[Expiry Job] Failed to mark booking ${booking.id} as OVERSTAY: ${err.message}`);
                stats.errors++;
            }
        }

    } catch (error: any) {
        console.log(`[Expiry Job] CRITICAL ERROR in runExpiryCheck: ${error.message}`);
        throw error;
    }

    return stats;
}
