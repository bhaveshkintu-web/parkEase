
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApprovals() {
  try {
    const approvals = await prisma.parkingApproval.findMany({
      include: {
        owner: {
          include: {
            user: true
          }
        }
      }
    });
    console.log('--- PARKING APPROVALS ---');
    console.table(approvals.map(a => ({
      id: a.id,
      owner: a.owner.businessName,
      status: a.status
    })));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovals();
