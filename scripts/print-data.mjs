import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    for (const user of users) {
        console.log(`User: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    }

    const owners = await prisma.ownerProfile.findMany();
    for (const owner of owners) {
        console.log(`Owner: ${owner.businessName} (ID: ${owner.id}, UserID: ${owner.userId})`);
    }

    const watchmen = await prisma.watchman.findMany();
    for (const wm of watchmen) {
        console.log(`Watchman: ID: ${wm.id}, UserID: ${wm.userId}, OwnerID: ${wm.ownerId}`);
    }

    const locations = await prisma.parkingLocation.findMany();
    for (const loc of locations) {
        console.log(`Location: ${loc.name} (ID: ${loc.id}, OwnerID: ${loc.ownerId})`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
