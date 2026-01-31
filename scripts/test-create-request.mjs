import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const watchman = await prisma.user.findFirst({
        where: { role: 'WATCHMAN' }
    });

    const location = await prisma.parkingLocation.findFirst();

    if (!watchman || !location) {
        console.error('Watchman or Location not found');
        return;
    }

    try {
        const newRequest = await prisma.bookingRequest.create({
            data: {
                customerName: "Test Customer",
                vehiclePlate: "TEST-123",
                vehicleType: "sedan",
                parkingId: location.id,
                parkingName: location.name,
                requestType: "WALK_IN",
                requestedStart: new Date(),
                requestedEnd: new Date(Date.now() + 7200000),
                estimatedAmount: 10.00,
                requestedBy: watchman.id,
                status: "PENDING"
            }
        });
        console.log('Success:', newRequest.id);
    } catch (error) {
        console.error('Error in script:', error);
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
