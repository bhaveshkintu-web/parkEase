const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Recent Bookings ---');
  try {
    const bookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        confirmationCode: true,
        userId: true,
        locationId: true,
        createdAt: true
      }
    });
    console.log(JSON.stringify(bookings, null, 2));
  } catch (error) {
    console.error('Error fetching bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
