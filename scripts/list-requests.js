const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const requests = await prisma.$queryRawUnsafe(`SELECT id, "parkingId", "parkingName", "status" FROM "BookingRequest" LIMIT 10`);
        console.log('Booking Requests in DB:');
        requests.forEach(r => console.log(`- ID: ${r.id}, ParkingID: ${r.parkingId}, Name: ${r.parkingName}, Status: ${r.status}`));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
