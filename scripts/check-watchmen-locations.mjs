import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const watchmen = await prisma.watchman.findMany({
        include: {
            user: true,
            owner: true
        }
    });

    const locations = await prisma.parkingLocation.findMany({
        include: {
            owner: true
        }
    });

    console.log('Watchmen:', JSON.stringify(watchmen.map(w => ({ id: w.id, ownerId: w.ownerId, email: w.user.email })), null, 2));
    console.log('Locations:', JSON.stringify(locations.map(l => ({ id: l.id, name: l.name, ownerId: l.ownerId })), null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
