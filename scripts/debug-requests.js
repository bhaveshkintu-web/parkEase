const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const owners = await prisma.user.findMany({ where: { role: 'OWNER' } });
        console.log(`Found ${owners.length} owners.`);
        for (const o of owners) {
            const profile = await prisma.ownerProfile.findUnique({ where: { userId: o.id }, include: { locations: true } });
            console.log(`Owner: ${o.email}, Profile: ${profile ? 'YES' : 'NO'}, Locations: ${profile ? profile.locations.length : 0}`);
        }

        const requests = await prisma.bookingRequest.findMany();
        console.log(`\nFound ${requests.length} booking requests.`);
        for (const r of requests) {
            console.log(`Request: ID=${r.id}, Customer=${r.customerName}, ParkingId=${r.parkingId}, Status=${r.status}`);
        }
    } catch (e) { console.error(e); } finally { await prisma.$disconnect(); }
}
check();
