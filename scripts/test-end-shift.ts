import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'vidhipatel5044@gmail.com' },
        include: { watchmanProfile: true }
    });

    if (!user || !user.watchmanProfile) {
        console.log('Watchman profile not found');
        return;
    }

    const activeShift = await prisma.watchmanShift.findFirst({
        where: {
            watchmanId: user.watchmanProfile.id,
            status: 'ACTIVE'
        }
    });

    if (!activeShift) {
        console.log('No active shift found to end.');
        return;
    }

    console.log('Found active shift:', activeShift.id);

    // Try to update it to COMPLETED
    const updated = await prisma.watchmanShift.update({
        where: { id: activeShift.id },
        data: {
            status: 'COMPLETED',
            actualEnd: new Date()
        }
    });

    console.log('Success! Shift updated to COMPLETED:', updated.id);
}

main().catch(e => console.error('FAILED:', e)).finally(() => prisma.$disconnect());
