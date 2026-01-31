const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('--- OWNER LEADS ---');
    const leads = await prisma.ownerLead.findMany();
    console.log(`Found ${leads.length} leads.`);
    leads.forEach(l => console.log(`- ${l.fullName} (${l.email}): ${l.status}`));

    console.log('\n--- PENDING OWNER PROFILES ---');
    const pendingOwners = await prisma.ownerProfile.findMany({
      where: { status: 'pending' },
      include: { user: true }
    });
    console.log(`Found ${pendingOwners.length} pending owner profiles.`);
    pendingOwners.forEach(o => console.log(`- ${o.businessName} (${o.user.email}): ${o.status}`));

  } catch (error) {
    console.error('Error querying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
