import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const owners = await prisma.ownerProfile.findMany({
        include: {
            user: true
        }
    });

    const locations = await prisma.parkingLocation.findMany({
        include: {
            owner: true
        }
    });

    console.log('Owners:', JSON.stringify(owners, null, 2));
    console.log('Locations:', JSON.stringify(locations, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
