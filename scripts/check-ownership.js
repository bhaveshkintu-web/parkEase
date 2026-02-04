const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const locations = await prisma.parkingLocation.findMany();
        for (const l of locations) {
            const owner = await prisma.ownerProfile.findUnique({ where: { id: l.ownerId }, include: { user: true } });
            console.log(`Location: ${l.name} (ID: ${l.id}), Owner: ${owner ? owner.user.email : 'UNKNOWN'}`);
        }
    } catch (e) { console.error(e); } finally { await prisma.$disconnect(); }
}
check();
