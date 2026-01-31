import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    const owners = await prisma.ownerProfile.findMany({ include: { user: true } });
    const locations = await prisma.parkingLocation.findMany({ include: { owner: { include: { user: true } } } });
    const watchmen = await prisma.watchman.findMany({ include: { user: true, owner: true } });

    console.log('--- USERS ---');
    users.forEach(u => console.log(`${u.id} | ${u.email} | ${u.role}`));

    console.log('\n--- OWNERS ---');
    owners.forEach(o => console.log(`${o.id} | ${o.businessName} | User: ${o.user.email}`));

    console.log('\n--- LOCATIONS ---');
    locations.forEach(l => console.log(`${l.id} | ${l.name} | Owner: ${l.owner.user.email} (${l.owner.id})`));

    console.log('\n--- WATCHMEN ---');
    watchmen.forEach(w => console.log(`${w.id} | User: ${w.user.email} | Owner: ${w.ownerId}`));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
