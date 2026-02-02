const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  try {
    const bookings = await prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        confirmationCode: true
      }
    });
    fs.writeFileSync('scripts/booking-ids.json', JSON.stringify(bookings, null, 2));
    console.log('Saved 10 booking IDs to scripts/booking-ids.json');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
