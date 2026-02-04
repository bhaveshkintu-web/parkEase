const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const owners = await prisma.user.findMany({
            where: { role: 'OWNER' },
            include: { ownerProfile: { include: { locations: true } } }
        });
        for (const owner of owners) {
            console.log(`Owner: ${owner.firstName} ${owner.lastName} (${owner.id})`);
            if (owner.ownerProfile && owner.ownerProfile.locations) {
                owner.ownerProfile.locations.forEach(loc => {
                    console.log(` - Location: ${loc.name} (ID: ${loc.id})`);
                });
            } else {
                console.log(' - No profile or locations');
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
