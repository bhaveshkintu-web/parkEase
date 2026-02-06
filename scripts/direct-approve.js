
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDirectTest() {
  try {
    const pending = await prisma.withdrawalRequest.findFirst({
      where: { status: 'PENDING' }
    });

    if (!pending) {
      console.log('No pending withdrawals found in DB.');
      return;
    }

    console.log(`Found pending withdrawal: ${pending.id} ($${pending.amount})`);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawalRequest.update({
        where: { id: pending.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date()
        }
      });
      console.log('DB Update Successful.');
      
      // Test notification service logic manually here (simplified)
      const wallet = await tx.wallet.findUnique({
        where: { id: updated.walletId },
        include: { owner: true }
      });
      
      if (wallet && wallet.owner) {
        await tx.notification.create({
          data: {
            userId: wallet.owner.userId,
            title: 'Withdrawal Approved',
            message: `Your request for $${updated.amount} has been approved.`,
            type: 'WITHDRAWAL_PROCESSED',
            status: 'UNREAD'
          }
        });
        console.log('Notification DB creation Successful.');
      }
    });

    console.log('Test completed successfully. Withdrawal is now APPROVED.');

  } catch (error) {
    console.error('SIMULATION ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runDirectTest();
