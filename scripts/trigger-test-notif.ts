import { prisma } from "../lib/prisma";
import { runExpiryCheck } from "../lib/utils/expiry-check";

async function main() {
    console.log("=== Notification Test Diagnostic ===");

    // 1. Find a target booking for testing
    const userEmail = "vidhipatel5044@gmail.com";
    console.log(`Target User: ${userEmail}`);

    const booking = await prisma.booking.findFirst({
        where: { guestEmail: userEmail },
        orderBy: { createdAt: 'desc' }
    });

    if (!booking) {
        console.error("No booking found for test user. Please create one.");
        return;
    }

    console.log(`Found Booking: ${booking.id} (${booking.confirmationCode})`);
    console.log(`Original Status: ${booking.status}`);
    console.log(`Original CheckOut: ${booking.checkOut.toISOString()}`);

    // 2. Ensure ParkingSession exists and is checked_in
    let session = await prisma.parkingSession.findUnique({
        where: { bookingId: booking.id }
    });

    if (!session) {
        console.log("Creating mock parking session (checked_in)...");
        session = await prisma.parkingSession.create({
            data: {
                bookingId: booking.id,
                status: "checked_in",
                checkInTime: new Date(),
                locationId: booking.locationId
            }
        });
    } else {
        console.log("Updating existing session to checked_in and resetting warning flag...");
        await prisma.parkingSession.update({
            where: { id: session.id },
            data: {
                status: "checked_in",
                expiryWarningSentAt: null
            }
        });
    }

    // 3. Set checkOut to be in exactly 30 minutes
    const targetCheckOut = new Date(Date.now() + 30 * 60 * 1000);
    console.log(`Adjusting CheckOut to: ${targetCheckOut.toISOString()} (30 mins from now)`);

    await prisma.booking.update({
        where: { id: booking.id },
        data: {
            status: "CONFIRMED",
            checkOut: targetCheckOut
        }
    });

    // 4. Run the expiry check
    console.log("--- Running Expiry Check ---");
    const stats = await runExpiryCheck((msg) => console.log(`[ExpiryCheck Log] ${msg}`));

    console.log("----------------------------");
    console.log("Stats Result:", stats);

    if (stats.notified > 0) {
        console.log("SUCCESS: Notification logic was triggered!");
    } else {
        console.log("FAILURE: No notification sent. Check logs for why.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
