const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// <<<<<<< HEAD
async function main() {
  console.log("Checking for pending records...");

  const pendingProfiles = await prisma.ownerProfile.count({
    where: { status: 'pending' }
  });
  console.log(`Pending OwnerProfiles (Dashboard uses this): ${pendingProfiles}`);

  const totalLeads = await prisma.ownerLead.count();
  console.log(`Total OwnerLeads (Approvals page uses this): ${totalLeads}`);

  const pendingLeads = await prisma.ownerLead.count({
    where: { status: 'pending' }
  });
  console.log(`Pending OwnerLeads: ${pendingLeads}`);

  if (pendingProfiles > 0) {
    console.log("\nSample Pending Profile:");
    const profile = await prisma.ownerProfile.findFirst({
      where: { status: 'pending' },
      include: { user: true }
    });
    console.log(JSON.stringify(profile, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
// =======
// async function checkData() {
//   try {
//     console.log('--- OWNER LEADS ---');
//     const leads = await prisma.ownerLead.findMany();
//     console.log(`Found ${leads.length} leads.`);
//     leads.forEach(l => console.log(`- ${l.fullName} (${l.email}): ${l.status}`));

//     console.log('\n--- PENDING OWNER PROFILES ---');
//     const pendingOwners = await prisma.ownerProfile.findMany({
//       where: { status: 'pending' },
//       include: { user: true }
//     });
//     console.log(`Found ${pendingOwners.length} pending owner profiles.`);
//     pendingOwners.forEach(o => console.log(`- ${o.businessName} (${o.user.email}): ${o.status}`));

//   } catch (error) {
//     console.error('Error querying data:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// checkData();
// // >>>>>>> main
