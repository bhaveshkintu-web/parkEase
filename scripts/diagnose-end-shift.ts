import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Find Vidhi's user
    const user = await prisma.user.findUnique({
        where: { email: 'vidhipatel5044@gmail.com' },
        include: { watchmanProfile: true }
    });

    if (!user || !user.watchmanProfile) {
        console.log('❌ Watchman profile not found');
        return;
    }

    console.log('✅ User found:', user.email, 'Role:', user.role);
    console.log('✅ Watchman ID:', user.watchmanProfile.id);

    // Find active shift
    const activeShift = await prisma.watchmanShift.findFirst({
        where: {
            watchmanId: user.watchmanProfile.id,
            status: 'ACTIVE'
        },
        include: {
            location: true
        }
    });

    if (!activeShift) {
        console.log('❌ No active shift found');

        // Check all shifts
        const allShifts = await prisma.watchmanShift.findMany({
            where: { watchmanId: user.watchmanProfile.id },
            orderBy: { scheduledStart: 'desc' },
            take: 5
        });

        console.log('\n📋 Last 5 shifts:');
        allShifts.forEach(s => {
            console.log(`  - ${s.id}: ${s.status} (${s.scheduledStart} to ${s.scheduledEnd})`);
        });
        return;
    }

    console.log('\n✅ Active shift found:');
    console.log('  ID:', activeShift.id);
    console.log('  Location:', activeShift.location?.name);
    console.log('  Status:', activeShift.status);
    console.log('  Started:', activeShift.actualStart);

    // Now try to update it
    console.log('\n🔄 Attempting to end shift...');
    try {
        const updated = await prisma.watchmanShift.update({
            where: { id: activeShift.id },
            data: {
                status: 'COMPLETED',
                actualEnd: new Date()
            }
        });
        console.log('✅ SUCCESS! Shift ended:', updated.id);
        console.log('   New status:', updated.status);
        console.log('   Ended at:', updated.actualEnd);
    } catch (error: any) {
        console.error('❌ FAILED to end shift!');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);
    }
}

main()
    .catch(e => {
        console.error('Script error:', e);
    })
    .finally(() => prisma.$disconnect());
