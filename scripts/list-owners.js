const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  const owners = await prisma.ownerProfile.findMany({ select: { businessName: true } });
  console.log('Owners:', JSON.stringify(owners, null, 2));
  process.exit(0);
}
list();
