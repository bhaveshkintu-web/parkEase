import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const requests = await prisma.$queryRaw`SELECT id, "customerName", status FROM "BookingRequest"`;
    console.log('Current Booking Requests in DB:');
    console.log(JSON.stringify(requests, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
