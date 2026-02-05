const { prisma } = require('../lib/prisma');

async function test() {
    try {
        console.log('Testing Prisma findMany...');
        const requests = await prisma.bookingRequest.findMany({
            orderBy: {
                requestedAt: 'desc'
            }
        });
        console.log('Found:', requests.length);
    } catch (err) {
        console.error('Prisma failed:', err.message);
        console.log('Testing Raw Query Fallback...');
        try {
            const rawRequests = await prisma.$queryRawUnsafe(`
        SELECT * FROM "BookingRequest" 
        ORDER BY "requestedAt" DESC
      `);
            console.log('Raw Found:', rawRequests.length);
        } catch (rawErr) {
            console.error('Raw failed:', rawErr.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

test();
