const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const request = await prisma.$queryRawUnsafe('SELECT * FROM "BookingRequest" WHERE "customerName" = $1', 'Ajay');
        if (request.length > 0) {
            const r = request[0];
            console.log('Keys:', Object.keys(r));
            console.log('requestedStart:', r.requestedStart, typeof r.requestedStart);
            console.log('requestedEnd:', r.requestedEnd, typeof r.requestedEnd);
            console.log('parkingId:', r.parkingId);
            console.log('requestedById:', r.requestedById);
        } else {
            console.log('No request found for Ajay');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
