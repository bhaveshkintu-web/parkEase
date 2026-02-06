
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullSimulate() {
  try {
    const pending = await prisma.withdrawalRequest.findFirst({
      where: { status: 'PENDING' }
    });

    if (!pending) {
      console.log('No pending withdrawals found.');
      return;
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: pending.id },
      include: { wallet: { include: { owner: true } } }
    });

    console.log(`Simulating full approval for ${withdrawal.id}`);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          adminNotes: 'Simulated full flow'
        }
      });

      console.log('1. Withdrawal status updated to APPROVED');

      // Attempt notification
      const notif = await tx.notification.create({
        data: {
          userId: withdrawal.wallet.owner.userId,
          title: 'Withdrawal Approved',
          message: 'Test message',
          type: 'WITHDRAWAL_PROCESSED', // This might fail if enum is missing
          status: 'UNREAD'
        }
      });

      console.log('2. Notification created successfully');
      return updated;
    });

    console.log('Full simulation successful!');

  } catch (error) {
    console.error('SIMULATION FAILED:', error);
    if (error.code === 'P2002' || error.code === 'P2003' || error.code === 'P2009' || error.code === 'P2010') {
        console.error('This looks like a database schema/enum mismatch.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

fullSimulate();
