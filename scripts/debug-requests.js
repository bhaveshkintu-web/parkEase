const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const requests = await prisma.$queryRawUnsafe('SELECT * FROM "BookingRequest" ORDER BY "requestedAt" DESC LIMIT 10');
        console.log('Recent BookingRequests:', JSON.stringify(requests, null, 2));

        const bookings = await prisma.booking.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
        console.log('Recent Bookings:', JSON.stringify(bookings, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
