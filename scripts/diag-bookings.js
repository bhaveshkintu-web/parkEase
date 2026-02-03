const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true }
        });
        console.log('USERS:', JSON.stringify(users, null, 2));

        const owners = await prisma.ownerProfile.findMany({
            include: { locations: true }
        });
        console.log('OWNERS:', JSON.stringify(owners, null, 2));

        const requests = await prisma.$queryRawUnsafe('SELECT * FROM "BookingRequest"');
        console.log('REQUESTS:', JSON.stringify(requests, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
