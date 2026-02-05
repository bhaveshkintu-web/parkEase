import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const rows = await prisma.$queryRawUnsafe('SELECT * FROM "BookingRequest" LIMIT 1');
        if (Array.isArray(rows) && rows.length > 0) {
            console.log('START_COLS');
            Object.keys(rows[0]).forEach(k => console.log('COL:', k));
            console.log('END_COLS');
        } else {
            console.log('No booking requests found.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
