
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApproval() {
  const withdrawalId = 'cmlarudnu009lk1khcewa8hn';
  const status = 'APPROVED';
  
  try {
    console.log(`Starting approval test for ID: ${withdrawalId}`);
    
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!withdrawal) {
      console.error('Withdrawal not found!');
      return;
    }

    console.log(`Current status: ${withdrawal.status}`);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: status,
          processedAt: new Date()
        }
      });
      
      console.log('Update successful within transaction.');
      return updated;
    });

    console.log('Transaction committed successfully.');
    console.log('New Status:', result.status);

  } catch (error) {
    console.error('ERROR during approval simulation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApproval();
