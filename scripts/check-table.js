const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'BookingRequest'
      );
    `);
        console.log('BookingRequest table exists:', result[0].exists);
    } catch (e) {
        console.error('Error checking table:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
