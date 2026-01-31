import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const requests = await prisma.$queryRawUnsafe('SELECT id FROM "BookingRequest"');
    console.log('--- START IDs ---');
    for (const r of requests) {
        console.log('ID:[' + r.id + ']');
    }
    console.log('--- END IDs ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
