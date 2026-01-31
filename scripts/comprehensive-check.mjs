import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            watchmanProfile: true,
            ownerProfile: true
        }
    });

    const owners = await prisma.ownerProfile.findMany();
    const locations = await prisma.parkingLocation.findMany();

    console.log('Users:', JSON.stringify(users, null, 2));
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
