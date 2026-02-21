const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRawSQLApproval() {
    try {
        // Get a pending request
        const requests = await prisma.$queryRawUnsafe('SELECT * FROM "BookingRequest" WHERE status = $1 LIMIT 1', 'PENDING');

        if (requests.length === 0) {
            console.log('No pending requests found');
            return;
        }

        const request = requests[0];
        console.log('Testing approval for:', request.customerName, '-', request.vehiclePlate);

        const bookingId = `b_test_${Date.now()}`;
        const sessionId = `s_test_${Date.now()}`;
        const confCode = `PKE-TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        console.log('\n1. Creating booking...');
        await prisma.$executeRaw`
        INSERT INTO "Booking" (
            "id", "userId", "locationId", "checkIn", "checkOut", 
            "guestFirstName", "guestLastName", "guestEmail", "guestPhone", 
            "vehicleMake", "vehicleModel", "vehicleColor", "vehiclePlate", 
            "totalPrice", "taxes", "fees", "status", "confirmationCode", "createdAt", "updatedAt"
        ) VALUES (
            ${bookingId}, 
            ${request.requestedById || null}, 
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
        console.log('✓ Booking created:', bookingId);

        console.log('\n2. Creating parking session...');
        await prisma.$executeRaw`
        INSERT INTO "ParkingSession" (
            "id", "bookingId", "locationId", "status", "createdAt", "updatedAt"
        ) VALUES (
            ${sessionId},
            ${bookingId},
            ${request.parkingId},
            ${"RESERVED"}::"ParkingSessionStatus",
            NOW(),
            NOW()
        )
    `;
        console.log('✓ Session created:', sessionId);

        console.log('\n3. Updating available spots...');
        await prisma.$executeRaw`
        UPDATE "ParkingLocation" 
        SET "availableSpots" = "availableSpots" - 1, "updatedAt" = NOW()
        WHERE id = ${request.parkingId}
    `;
        console.log('✓ Spots updated');

        console.log('\n4. Updating request status...');
        await prisma.$executeRaw`
        UPDATE "BookingRequest" 
        SET status = ${"APPROVED"}::"BookingRequestStatus",
            "processedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${request.id}
    `;
        console.log('✓ Request approved');

        console.log('\n✅ FULL APPROVAL WORKFLOW SUCCESSFUL!');
        console.log('Confirmation Code:', confCode);

    } catch (e) {
        console.error('\n❌ Error:', e.message);
        console.error('Code:', e.code);
        if (e.meta) console.error('Meta:', e.meta);
    } finally {
        await prisma.$disconnect();
    }
}

testRawSQLApproval();
