const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const reqs = await prisma.$queryRawUnsafe('SELECT id, "parkingId", status FROM "BookingRequest"');
        console.log('Requests:', JSON.stringify(reqs, null, 2));

        const locations = await prisma.$queryRawUnsafe('SELECT id, name, "ownerId" FROM "ParkingLocation"');
        console.log('Locations:', JSON.stringify(locations, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
