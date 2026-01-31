import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
        }
    });

    const owners = await prisma.ownerProfile.findMany({
        select: {
            id: true,
            businessName: true,
            userId: true
        }
    });

    const watchmen = await prisma.watchman.findMany({
        select: {
            id: true,
            userId: true,
            ownerId: true
        }
    });

    const locations = await prisma.parkingLocation.findMany({
        select: {
            id: true,
            name: true,
            ownerId: true
        }
    });

    console.log('Users:', users);
    console.log('Owners:', owners);
    console.log('Watchmen:', watchmen);
    console.log('Locations:', locations);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
