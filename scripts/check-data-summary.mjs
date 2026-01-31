import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const ownerCount = await prisma.ownerProfile.count();
    const locationCount = await prisma.parkingLocation.count();

    console.log(`Owners: ${ownerCount}`);
    console.log(`Locations: ${locationCount}`);

    if (ownerCount > 0) {
        const firstOwner = await prisma.ownerProfile.findFirst({
            include: { user: true }
        });
        console.log('First Owner ID:', firstOwner.id);
        console.log('First Owner Email:', firstOwner.user.email);
    }

    if (locationCount > 0) {
        const firstLocation = await prisma.parkingLocation.findFirst();
        console.log('First Location ID:', firstLocation.id);
        console.log('First Location Owner ID:', firstLocation.ownerId);
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
