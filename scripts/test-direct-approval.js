const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDirectApproval() {
    try {
        // Get the first pending request
        const requests = await prisma.$queryRawUnsafe(
            'SELECT * FROM "BookingRequest" WHERE status = $1 ORDER BY "requestedAt" DESC LIMIT 1',
            'PENDING'
        );

        if (requests.length === 0) {
            console.log('No pending requests found');
            return;
        }

        const request = requests[0];
        console.log('Found request:', request.id);
        console.log('Customer:', request.customerName);
        console.log('Vehicle:', request.vehiclePlate);
        console.log('Parking ID:', request.parkingId);
        console.log('Requested By ID:', request.requestedById);

        // Test creating a booking directly
        const bookingId = `b_test_${Date.now()}`;
        const confCode = `PKE-TEST${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        console.log('\nAttempting to create booking with ID:', bookingId);

        await prisma.$executeRaw`
        INSERT INTO "Booking" (
            "id", "userId", "locationId", "checkIn", "checkOut", 
            "guestFirstName", "guestLastName", "guestEmail", "guestPhone", 
            "vehicleMake", "vehicleModel", "vehicleColor", "vehiclePlate", 
            "totalPrice", "taxes", "fees", "status", "confirmationCode", "createdAt", "updatedAt"
        ) VALUES (
            ${bookingId}, 
            ${request.requestedById}, 
            ${request.parkingId}, 
            ${new Date(request.requestedStart)}, 
            ${new Date(request.requestedEnd)},
            ${(request.customerName || "Guest").split(' ')[0]}, 
            ${(request.customerName || "User").split(' ').slice(1).join(' ') || "User"}, 
            ${request.customerEmail || "guest@example.com"}, 
            ${request.customerPhone || ""},
            ${request.vehicleMake || "Unknown"}, 
            ${request.vehicleModel || request.vehicleType || "Sedan"}, 
            ${request.vehicleColor || "Unknown"}, 
            ${request.vehiclePlate},
            ${Number(request.estimatedAmount) || 0}, 
            ${(Number(request.estimatedAmount) || 0) * 0.12}, 
            ${5.99}, 
            ${"CONFIRMED"}::"BookingStatus", 
            ${confCode}, 
            NOW(), 
            NOW()
        )
    `;

        console.log('✅ Booking created successfully!');
        console.log('Booking ID:', bookingId);
        console.log('Confirmation Code:', confCode);

        // Update the request status
        await prisma.$executeRaw`
        UPDATE "BookingRequest" 
        SET status = ${"APPROVED"}::"BookingRequestStatus",
            "processedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${request.id}
    `;

        console.log('✅ Request status updated to APPROVED');

        // Update available spots
        await prisma.$executeRaw`
        UPDATE "ParkingLocation" 
        SET "availableSpots" = "availableSpots" - 1, 
            "updatedAt" = NOW()
        WHERE id = ${request.parkingId}
    `;

        console.log('✅ Available spots decremented');
        console.log('\n🎉 FULL APPROVAL WORKFLOW COMPLETED SUCCESSFULLY!');

    } catch (e) {
        console.error('\n❌ ERROR:', e.message);
        console.error('Code:', e.code);
        if (e.meta) {
            console.error('Meta:', JSON.stringify(e.meta, null, 2));
        }
        console.error('\nFull error:');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testDirectApproval();
