const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing Prisma findMany...');
        // We use raw query because we know Prisma client might be out of sync
        const requests = await prisma.$queryRawUnsafe(`
        SELECT * FROM "BookingRequest" 
        ORDER BY "requestedAt" DESC
    `);
        console.log('Raw Found:', requests.length);
        console.log('Sample request:', JSON.stringify(requests[0], null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
