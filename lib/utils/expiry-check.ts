import { prisma } from "@/lib/prisma";
import { sendSessionExpiryWarning } from "@/lib/notifications";

export async function runExpiryCheck(logger: (msg: string) => void = console.log) {
    const now = new Date();
    logger(`Checking for bookings expiring soon (Now: ${now.toISOString()})`);

    const warningWindowStart = now;
    const warningWindowEnd = new Date(now.getTime() + 45 * 60 * 1000); // Expanded to 45 mins for safety

    logger(`Searching for checkOut between ${now.toISOString()} and ${warningWindowEnd.toISOString()}`);

    const stats = {
        notified: 0,
        markedOverstay: 0,
        errors: 0
    };

    try {
        const allCheckedInCount = await prisma.parkingSession.count({
            where: { status: "checked_in" }
        });
        logger(`Diagnostic: Found ${allCheckedInCount} total active sessions.`);

        const sessions = await prisma.parkingSession.findMany({
            where: { status: "checked_in" },
            include: { booking: true }
        });

        // Debug output for sessions near the window
        sessions.forEach(s => {
            const co = new Date(s.booking.checkOut);
            const inWindow = co > warningWindowStart && co < warningWindowEnd;
            const statusMatch = ["CONFIRMED", "PENDING", "WAITING_OVERSTAY_PAYMENT"].includes(s.booking.status);
            const unsent = s.expiryWarningSentAt === null;

            if (inWindow || s.booking.guestEmail.includes("gmail.com")) {
                logger(`Checking Booking ${s.bookingId}: InWindow=${inWindow}, StatusMatch=${statusMatch}, Unsent=${unsent}`);
                logger(`  - CheckOut: ${co.toISOString()}, Status: ${s.booking.status}, WarningSent: ${s.expiryWarningSentAt}`);
            }
        });

        const expiringBookings = await prisma.booking.findMany({
            where: {
                status: {
                    in: ["CONFIRMED", "PENDING", "WAITING_OVERSTAY_PAYMENT"]
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

        logger(`Found ${expiringBookings.length} bookings to notify.`);

        for (const booking of expiringBookings) {
            try {
                logger(`Triggering notification for booking ${booking.id}...`);
                const result = await sendSessionExpiryWarning(booking.id);
                if (result.success) {
                    await prisma.parkingSession.update({
                        where: { bookingId: booking.id },
                        data: { expiryWarningSentAt: new Date() }
                    });
                    logger(`✅ Notification successfully sent and recorded for booking ${booking.id}`);
                    stats.notified++;
                } else {
                    logger(`❌ Notification failed for booking ${booking.id}: ${result.error}`);
                    stats.errors++;
                }
            } catch (err: any) {
                logger(`❌ Critical error notifying booking ${booking.id}: ${err.message}`);
                stats.errors++;
            }
        }

        // Overstay Check
        const overstayingBookings = await prisma.booking.findMany({
            where: {
                status: {
                    in: ["CONFIRMED", "PENDING", "WAITING_OVERSTAY_PAYMENT"]
                },
                checkOut: { lt: now },
                parkingSession: {
                    status: "checked_in"
                }
            }
        });

        if (overstayingBookings.length > 0) {
            logger(`Found ${overstayingBookings.length} new overstaying bookings.`);
        }

        for (const booking of overstayingBookings) {
            try {
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: "OVERSTAY" as any }
                });
                logger(`Booking ${booking.id} marked as OVERSTAY`);
                stats.markedOverstay++;
            } catch (err: any) {
                logger(`Failed to mark booking ${booking.id} as OVERSTAY: ${err.message}`);
                stats.errors++;
            }
        }

    } catch (error: any) {
        logger(`CRITICAL ERROR in runExpiryCheck: ${error.message}`);
        throw error;
    }

    return stats;
}
