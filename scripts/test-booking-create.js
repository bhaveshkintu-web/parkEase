const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'error', 'warn'] });

async function testBookingCreate() {
    try {
        const confCode = `PKE-TEST123`;

        console.log('Attempting to create booking with Prisma...\n');
        const booking = await prisma.booking.create({
            data: {
                userId: "cml6833ve0000u1bwj8lqmwhi",
                locationId: "1",
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                guestFirstName: "Test",
                guestLastName: "User",
                guestEmail: "test@example.com",
                guestPhone: "1234567890",
                vehicleMake: "Toyota",
                vehicleModel: "Camry",
                vehicleColor: "Blue",
                vehiclePlate: "TEST123",
                totalPrice: 10.0,
                taxes: 1.0,
                fees: 2.99,
                status: "CONFIRMED",
                confirmationCode: confCode,
            }
        });

        console.log('✓ Booking created:', booking.id);

    } catch (e) {
        console.error('❌ Prisma create failed:');
        console.error('Message:', e.message);
        console.error('Code:', e.code);
        if (e.meta) console.error('Meta:', JSON.stringify(e.meta, null, 2));

        console.log('\n\nTrying raw SQL instead...\n');

        try {
            const bookingId = `b_test_${Date.now()}`;
            await prisma.$executeRaw`
        INSERT INTO "Booking" (
          "id", "userId", "locationId", "checkIn", "checkOut", 
          "guestFirstName", "guestLastName", "guestEmail", "guestPhone", 
          "vehicleMake", "vehicleModel", "vehicleColor", "vehiclePlate", 
          "totalPrice", "taxes", "fees", "status", "confirmationCode", "createdAt", "updatedAt"
        ) VALUES (
          ${bookingId}, ${"cml6833ve0000u1bwj8lqmwhi"}, ${"1"}, 
          ${new Date()}, ${new Date(Date.now() + 86400000)},
          ${"Test"}, ${"User"}, ${"test@example.com"}, ${"1234567890"},
          ${"Toyota"}, ${"Camry"}, ${"Blue"}, ${"TEST123"},
          ${10.0}, ${1.0}, ${2.99}, 
          ${"CONFIRMED"}::"BookingStatus", 
          ${"PKE-TEST123"}, 
          NOW(), NOW()
        )
      `;

            console.log('✓ Raw SQL insert successful!');

        } catch (rawErr) {
            console.error('❌ Raw SQL also failed:', rawErr.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testBookingCreate();
