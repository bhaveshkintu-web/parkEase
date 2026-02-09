import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'vidhipatel5044@gmail.com' },
        include: { watchmanProfile: true }
    });

    if (!user || !user.watchmanProfile) {
        console.log('Watchman not found');
        return;
    }

    const shifts = await prisma.watchmanShift.findMany({
        where: { watchmanId: user.watchmanProfile.id },
        include: { location: true }
    });

    console.log('Shifts for Vidhi:', JSON.stringify(shifts, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
