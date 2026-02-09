import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'vidhipatel5044@gmail.com' },
        include: {
            watchmanProfile: {
                include: {
                    assignedLocations: true
                }
            }
        }
    });

    if (!user || !user.watchmanProfile) {
        console.log('Watchman profile not found');
        return;
    }

    console.log('Assigned Locations:', JSON.stringify(user.watchmanProfile.assignedLocations, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
