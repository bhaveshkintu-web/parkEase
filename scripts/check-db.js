const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const counts = {
    users: await prisma.user.count(),
    owners: await prisma.ownerProfile.count(),
    locations: await prisma.parkingLocation.count(),
    bookings: await prisma.booking.count({ where: { status: 'COMPLETED' } }),
    wallets: await prisma.wallet.count(),
    transactions: await prisma.walletTransaction.count(),
    commissions: await prisma.commissionRule.count()
  };
  console.log('Database Counts:', JSON.stringify(counts, null, 2));
  process.exit(0);
}
check();
