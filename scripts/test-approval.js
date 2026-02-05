const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApproval() {
    try {
        // Get a pending request
        const requests = await prisma.$queryRawUnsafe('SELECT * FROM "BookingRequest" WHERE status = $1 LIMIT 1', 'PENDING');

        if (requests.length === 0) {
            console.log('No pending requests found');
            return;
        }

        const request = requests[0];
        console.log('Testing approval for request:', request.id);
        console.log('Customer:', request.customerName);
        console.log('Vehicle:', request.vehiclePlate);
        console.log('Parking ID:', request.parkingId);

        // Try to create a booking with the same data
        const confCode = `PKE-TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        console.log('\nAttempting to create booking...');
        const booking = await prisma.booking.create({
            data: {
                userId: request.requestedById || null,
                locationId: request.parkingId,
                checkIn: new Date(request.requestedStart),
                checkOut: new Date(request.requestedEnd),
                guestFirstName: (request.customerName || "Guest").split(' ')[0],
                guestLastName: (request.customerName || "User").split(' ').slice(1).join(' ') || "User",
                guestEmail: request.customerEmail || "guest@example.com",
                guestPhone: request.customerPhone || "",
                vehicleMake: request.vehicleMake || "Unknown",
                vehicleModel: request.vehicleModel || request.vehicleType || "Sedan",
                vehicleColor: request.vehicleColor || "Unknown",
                vehiclePlate: request.vehiclePlate,
                totalPrice: Number(request.estimatedAmount) || 0,
                taxes: (Number(request.estimatedAmount) || 0) * 0.1,
                fees: 2.99,
                status: "CONFIRMED",
                confirmationCode: confCode,
            }
        });

        console.log('✓ Booking created successfully:', booking.id);

        // Create parking session
        const session = await prisma.parkingSession.create({
            data: {
                bookingId: booking.id,
                locationId: request.parkingId,
                status: "RESERVED",
            }
        });

        console.log('✓ Parking session created:', session.id);

        // Update request status
        await prisma.$executeRawUnsafe(
            'UPDATE "BookingRequest" SET status = $1 WHERE id = $2',
            'APPROVED',
            request.id
        );

        console.log('✓ Request status updated to APPROVED');
        console.log('\n✅ Full approval workflow completed successfully!');

    } catch (e) {
        console.error('❌ Error during approval test:');
        console.error('Message:', e.message);
        console.error('Code:', e.code);
        console.error('Meta:', e.meta);
        console.error('\nFull error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testApproval();
