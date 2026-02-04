const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { email: { contains: 'vidhi' } }
        });
        console.log('User:', JSON.stringify(user, null, 2));

        if (user) {
            const profile = await prisma.$queryRawUnsafe('SELECT * FROM "OwnerProfile" WHERE "userId" = $1', user.id);
            console.log('Profile:', JSON.stringify(profile, null, 2));

            if (profile.length > 0) {
                const locations = await prisma.$queryRawUnsafe('SELECT id, name FROM "ParkingLocation" WHERE "ownerId" = $1', profile[0].id);
                console.log('Locations:', JSON.stringify(locations, null, 2));
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
