const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const notifications = await prisma.notification.findMany({
      where: { type: 'NEW_BOOKING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: true }
    });
    console.log("Found notifications:", JSON.stringify(notifications, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
