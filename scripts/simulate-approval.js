
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateApproval() {
  try {
    const pending = await prisma.withdrawalRequest.findFirst({
      where: { status: 'PENDING' }
    });

    if (!pending) {
      console.log('No pending withdrawals found to simulate approval.');
      return;
    }

    console.log(`Found pending withdrawal: ${pending.id} for $${pending.amount}`);

    const updated = await prisma.withdrawalRequest.update({
      where: { id: pending.id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        adminNotes: 'Simulated approval'
      }
    });

    console.log('Update successful:', updated.status);

  } catch (error) {
    console.error('Error simulating approval:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateApproval();
