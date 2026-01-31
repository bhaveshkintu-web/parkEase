import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: 'vidhipatel5044@gmail.com' },
                { email: 'vmpatel9144@gmail.com' }
            ]
        },
        include: {
            watchmanProfile: true,
            ownerProfile: true
        }
    });

    if (user) {
        console.log(`User: ${user.email}, Role: ${user.role}`);
        console.log('Watchman Profile:', !!user.watchmanProfile);
        console.log('Owner Profile:', !!user.ownerProfile);
        if (user.watchmanProfile) {
            console.log('Watchman Owner ID:', user.watchmanProfile.ownerId);
        }
    } else {
        console.log('User not found');
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
