import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const requestId = 'cml6i3sbr0013u1p8tqmf6gms';
    const ownerUserId = 'cml68u8cq0000u1m8wzu6tvbo'; // Valid Owner user ID

    console.log(`Manually approving request ${requestId}...`);

    try {
        const existingRequest = await (prisma.bookingRequest as any).findUnique({
            where: { id: requestId },
        });

        if (!existingRequest) {
            console.error('Request not found');
            return;
        }

        const confCode = `PKE-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

        await prisma.$transaction(async (tx) => {
            // 1. Update Request
            await (tx.bookingRequest as any).update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    processedById: ownerUserId,
                    processedAt: new Date(),
                }
            });

            // 2. Create Booking
            const newBooking = await (tx.booking as any).create({
                data: {
                    userId: existingRequest.requestedById,
                    locationId: existingRequest.parkingId,
                    checkIn: new Date(existingRequest.requestedStart),
                    checkOut: new Date(existingRequest.requestedEnd),
                    guestFirstName: existingRequest.customerName.split(' ')[0] || "Guest",
                    guestLastName: existingRequest.customerName.split(' ').slice(1).join(' ') || "User",
                    guestEmail: existingRequest.customerEmail || "guest@example.com",
                    guestPhone: existingRequest.customerPhone || "",
                    vehicleMake: existingRequest.vehicleMake || "Unknown",
                    vehicleModel: existingRequest.vehicleModel || existingRequest.vehicleType,
                    vehicleColor: existingRequest.vehicleColor || "Unknown",
                    vehiclePlate: existingRequest.vehiclePlate,
                    totalPrice: existingRequest.estimatedAmount,
                    taxes: existingRequest.estimatedAmount * 0.12,
                    fees: 5.99,
                    status: "CONFIRMED",
                    confirmationCode: confCode,
                }
            });

            // 3. Create Session
            await (tx.parkingSession as any).create({
                data: {
                    bookingId: newBooking.id,
                    locationId: existingRequest.parkingId,
                    status: "RESERVED",
                }
            });

            // 4. Update spots
            await (tx.parkingLocation as any).update({
                where: { id: existingRequest.parkingId },
                data: { availableSpots: { decrement: 1 } }
            });

            console.log('Successfully approved and created booking:', newBooking.id);
        });

    } catch (e) {
        console.error('Transaction failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
