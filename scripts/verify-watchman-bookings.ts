import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const watchmanUserId = 'cml6833ve0000u1bwj8lqmwhi'; // Vidhi Patel

    console.log(`Checking bookings for watchman user ${watchmanUserId}...`);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    try {
        const watchman = await (prisma.watchman as any).findUnique({
            where: { userId: watchmanUserId },
            include: {
                shifts: {
                    where: {
                        scheduledStart: { gte: now, lt: tomorrow }
                    },
                    select: { locationId: true }
                },
                assignedLocations: {
                    select: { id: true }
                }
            }
        });

        if (!watchman) {
            console.log('Watchman not found');
            return;
        }

        const shiftLocationIds = (watchman.shifts || []).map((s: any) => s.locationId);
        const assignedLocationIds = (watchman.assignedLocations || []).map((l: any) => l.id);
        const locationIds = Array.from(new Set([...shiftLocationIds, ...assignedLocationIds]));

        console.log(`Watchman Location IDs: ${locationIds}`);

        const bookings = await prisma.booking.findMany({
            where: {
                locationId: { in: locationIds },
                OR: [
                    { checkIn: { gte: now, lt: tomorrow } },
                    { checkOut: { gte: now, lt: tomorrow } }
                ],
                status: { not: 'CANCELLED' }
            },
            include: {
                parkingSession: true
            }
        });

        console.log(`Found ${bookings.length} bookings for today:`);
        bookings.forEach(b => {
            console.log(`- ID: ${b.id}, Plate: ${b.vehiclePlate}, Status: ${b.status}, Session: ${b.parkingSession?.status || 'none'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
