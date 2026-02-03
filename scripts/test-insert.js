const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const id = `test_${Math.random().toString(36).substring(2, 11)}`;
        const result = await prisma.$executeRawUnsafe(`
        INSERT INTO "BookingRequest" (
            "id", "customerName", "customerPhone", "customerEmail", "vehiclePlate", "vehicleType", 
            "parkingId", "parkingName", "requestType", "requestedStart", "requestedEnd", 
            "estimatedAmount", "notes", "requestedBy", "status", "requestedAt", "priority"
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 
            $9::"BookingRequestType", 
            $10, $11, 
            $12, $13, $14, 
            $15::"BookingRequestStatus", 
            NOW(), 
            $16::"BookingRequestPriority"
        )
    `,
            id, "Test User", "1234567890", null, "TESTPLATE", "sedan",
            "test_parking_id", "Test Parking", "WALK_IN",
            new Date(), new Date(Date.now() + 7200000),
            10.0, "Test notes", "test_user_id", "PENDING", "NORMAL"
        );
        console.log('Insert successful:', result);
    } catch (e) {
        console.error('Insert failed:', e.message);
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
