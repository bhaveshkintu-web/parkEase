import { prisma } from "../lib/prisma";

async function main() {
    const activeSessions = await prisma.parkingSession.findMany({
        where: { status: "checked_in" },
        include: { booking: true }
    });

    console.log(`Found ${activeSessions.length} active sessions.`);
    for (const session of activeSessions) {
        const co = new Date(session.booking.checkOut);
        const diffMins = (co.getTime() - Date.now()) / (60 * 1000);
        console.log(`Booking ${session.bookingId}:`);
        console.log(`  - Email: ${session.booking.guestEmail}`);
        console.log(`  - CheckOut: ${co.toISOString()} (In ${diffMins.toFixed(1)} mins)`);
        console.log(`  - Warning Sent: ${session.expiryWarningSentAt}`);
        console.log(`  - Booking Status: ${session.booking.status}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
