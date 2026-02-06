
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'OWNER' },
      take: 5,
      select: { email: true, id: true }
    });
    console.log('Owner Users:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error finding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findUsers();
