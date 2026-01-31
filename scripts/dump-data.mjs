import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    const owners = await prisma.ownerProfile.findMany({ include: { user: true } });
    const locations = await prisma.parkingLocation.findMany({ include: { owner: { include: { user: true } } } });
    const watchmen = await prisma.watchman.findMany({ include: { user: true, owner: true } });

    let out = '--- USERS ---\n';
    users.forEach(u => out += `${u.id} | ${u.email} | ${u.role}\n`);

    out += '\n--- OWNERS ---\n';
    owners.forEach(o => out += `${o.id} | ${o.businessName} | User: ${o.user.email}\n`);

    out += '\n--- LOCATIONS ---\n';
    locations.forEach(l => out += `${l.id} | ${l.name} | Owner: ${l.owner.user.email} (${l.owner.id})\n`);

    out += '\n--- WATCHMEN ---\n';
    watchmen.forEach(w => out += `${w.id} | User: ${w.user.email} | Owner: ${w.ownerId}\n`);

    fs.writeFileSync('data-dump.txt', out);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
