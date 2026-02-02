const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

