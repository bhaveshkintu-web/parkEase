const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- OWNER EARNINGS VERIFICATION ---');

  // Find an owner with locations and bookings (likely the seeded one)
  const owners = await prisma.ownerProfile.findMany({
    include: {
      wallet: true,
      locations: {
        include: {
          bookings: {
            where: { status: 'COMPLETED' },
            include: { payments: true }
          }
        }
      }
    },
    orderBy: {
      locations: { _count: 'desc' }
    },
    take: 1
  });

  const owner = owners[0];

  if (!owner) {
    console.log('No owner profile found to verify. Please create some data first.');
    return;
  }

  console.log(`Verifying Owner: ${owner.businessName}`);
  console.log(`Wallet Balance: ${owner.wallet?.balance || 0}`);

  // Manual calculation check
  let totalGross = 0;
  let totalCommission = 0;

  for (const loc of owner.locations) {
    for (const booking of loc.bookings) {
      const successfulPayments = booking.payments?.filter(p => p.status === 'SUCCESS' || p.status === 'COMPLETED') || [];
      if (successfulPayments.length > 0) {
        totalGross += successfulPayments.reduce((sum, p) => sum + p.amount, 0);

        // Check for commission transactions
        const commTx = await prisma.walletTransaction.findFirst({
          where: {
            walletId: owner.wallet.id,
            type: 'COMMISSION',
            reference: booking.id
          }
        });

        if (commTx) {
          totalCommission += Math.abs(commTx.amount);
        } else {
          console.warn(`Missing commission transaction for booking ${booking.confirmationCode}`);
        }
      }
    }
  }

  const calculatedNet = totalGross - totalCommission;
  console.log(`- Calculated Gross: ${totalGross}`);
  console.log(`- Calculated Commission: ${totalCommission}`);
  console.log(`- Calculated Net: ${calculatedNet}`);

  // Check if wallet history matches available balance
  const txSum = await prisma.walletTransaction.aggregate({
    where: { walletId: owner.wallet.id, status: 'COMPLETED' },
    _sum: { amount: true }
  });

  console.log(`- Transaction Sum: ${txSum._sum.amount}`);
  console.log(`- Wallet Balance: ${owner.wallet.balance}`);

  if (Math.abs(txSum._sum.amount - owner.wallet.balance) < 0.01) {
    console.log('✅ Wallet balance matches transaction history.');
  } else {
    console.log('❌ Wallet balance mismatch detected!');
  }

  process.exit(0);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
