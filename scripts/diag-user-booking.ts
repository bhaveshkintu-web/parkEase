import { prisma } from "../lib/prisma";

async function main() {
    const userEmail = "vidhipatel5044@gmail.com";
    const now = new Date();
    console.log(`Current Script Time (Local): ${now.toString()}`);
    console.log(`Current Script Time (ISO): ${now.toISOString()}`);

    const latestBooking = await prisma.booking.findFirst({
        where: { guestEmail: userEmail },
        orderBy: { createdAt: 'desc' },
        include: { parkingSession: true }
    });

    if (!latestBooking) {
        console.log("No booking found for this email.");
        return;
    }

    console.log("--- Latest Booking Details ---");
    console.log(`ID: ${latestBooking.id}`);
    console.log(`Confirmation Code: ${latestBooking.confirmationCode}`);
    console.log(`Guest Email: ${latestBooking.guestEmail}`);
    console.log(`Status: ${latestBooking.status}`);
    console.log(`Check-In: ${latestBooking.checkIn.toISOString()}`);
    console.log(`Check-Out: ${latestBooking.checkOut.toISOString()}`);

    if (latestBooking.parkingSession) {
        console.log("--- Parking Session ---");
        console.log(`Status: ${latestBooking.parkingSession.status}`);
        console.log(`Expiry Warning Sent At: ${latestBooking.parkingSession.expiryWarningSentAt}`);
    } else {
        console.log("No parking session linked to this booking.");
    }

    // Calculate window matching logic
    const warningWindowEnd = new Date(now.getTime() + 45 * 60 * 1000);
    const co = new Date(latestBooking.checkOut);
    const inWindow = co > now && co < warningWindowEnd;

    console.log("--- Diagnostic Check ---");
    console.log(`In Warning Window? ${inWindow}`);
    console.log(`  (Window: ${now.toISOString()} to ${warningWindowEnd.toISOString()})`);
    console.log(`Status Match? ${["CONFIRMED", "PENDING", "WAITING_OVERSTAY_PAYMENT"].includes(latestBooking.status)}`);
    console.log(`Session Active? ${latestBooking.parkingSession?.status === "checked_in"}`);
    console.log(`Warning Unsent? ${latestBooking.parkingSession?.expiryWarningSentAt === null}`);

    // Also list all bookings for this user that might be relevant
    const otherBookings = await prisma.booking.findMany({
        where: {
            guestEmail: userEmail,
            checkOut: {
                gt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // last 2 hours
                lt: new Date(now.getTime() + 2 * 60 * 60 * 1000)  // next 2 hours
            }
        },
        include: { parkingSession: true }
    });

    console.log(`\nFound ${otherBookings.length} bookings near current time for this user.`);
    otherBookings.forEach(b => {
        console.log(`- Booking ${b.id}: co=${b.checkOut.toISOString()}, status=${b.status}, session=${b.parkingSession?.status || 'NONE'}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
