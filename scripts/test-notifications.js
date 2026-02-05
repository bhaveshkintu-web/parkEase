const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.notification.count();
    console.log('Notification count:', count);
  } catch (error) {
    console.error('Prisma Notification table check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
