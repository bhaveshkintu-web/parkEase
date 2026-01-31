import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const watchmanUser = await prisma.user.findUnique({
        where: { email: 'vidhipatel5044@gmail.com' }
    });

    const ownerProfile = await prisma.ownerProfile.findFirst({
        where: { user: { email: 'vidhikumaripatel.it22@scet.ac.in' } }
    });

    if (!watchmanUser || !ownerProfile) {
        console.error('Watchman user or Owner profile not found');
        return;
    }

    const existingWatchman = await prisma.watchman.findUnique({
        where: { userId: watchmanUser.id }
    });

    if (!existingWatchman) {
        const newWatchman = await prisma.watchman.create({
            data: {
                userId: watchmanUser.id,
                ownerId: ownerProfile.id,
                status: 'active'
            }
        });
        console.log('Created Watchman profile:', newWatchman.id);
    } else {
        console.log('Watchman profile already exists:', existingWatchman.id);
        if (existingWatchman.ownerId !== ownerProfile.id) {
            await prisma.watchman.update({
                where: { id: existingWatchman.id },
                data: { ownerId: ownerProfile.id }
            });
            console.log('Updated Watchman owner to:', ownerProfile.id);
        }
    }

    // Ensure "surat" location is assigned to this owner
    const location = await prisma.parkingLocation.findFirst({
        where: { name: 'surat' }
    });

    if (location) {
        if (location.ownerId !== ownerProfile.id) {
            await prisma.parkingLocation.update({
                where: { id: location.id },
                data: { ownerId: ownerProfile.id }
            });
            console.log('Assigned location "surat" to owner:', ownerProfile.id);
        } else {
            console.log('Location "surat" is already assigned to the correct owner.');
        }
    } else {
        console.log('Location "surat" not found');
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
