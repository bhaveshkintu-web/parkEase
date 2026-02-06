
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWithdrawals() {
  try {
    const counts = await prisma.withdrawalRequest.groupBy({
      by: ['status'],
      _count: true
    });
    console.log('Withdrawal Status Counts:');
    console.log(JSON.stringify(counts, null, 2));

    const latest = await prisma.withdrawalRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      take: 5,
      include: {
        wallet: {
          include: {
            owner: {
              select: { businessName: true }
            }
          }
        }
      }
    });
    console.log('\nLatest Withdrawals:');
    latest.forEach(w => {
      console.log(`ID: ${w.id}, Owner: ${w.wallet.owner.businessName}, Amount: ${w.amount}, Status: ${w.status}, Bank: ${w.bankName}`);
    });

  } catch (error) {
    console.error('Error checking withdrawals:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWithdrawals();
