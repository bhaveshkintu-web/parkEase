import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupBookingRequests() {
    console.log('🔧 Setting up Booking Requests table...\n');

    try {
        // Check if we can connect
        await prisma.$connect();
        console.log('✅ Connected to database\n');

        // Try to create a test booking request
        console.log('📝 Creating test booking request...');

        // Get first user (watchman)
        const watchman = await prisma.user.findFirst({
            where: {
                role: 'WATCHMAN'
            }
        });

        if (!watchman) {
            console.log('⚠️  No watchman user found!');
            console.log('💡 Please create a watchman user first.\n');
            return;
        }

        // Get first parking location
        const location = await prisma.parkingLocation.findFirst();

        if (!location) {
            console.log('⚠️  No parking location found!');
            console.log('💡 Please create a parking location first.\n');
            return;
        }

        console.log(`✅ Found watchman: ${watchman.email}`);
        console.log(`✅ Found location: ${location.name}\n`);

        // Create a test booking request
        const testRequest = await prisma.bookingRequest.create({
            data: {
                customerName: 'Test Customer',
                customerPhone: '+1-555-TEST',
                customerEmail: 'test@example.com',
                vehiclePlate: 'TEST-123',
                vehicleType: 'SEDAN',
                vehicleMake: 'Toyota',
                vehicleModel: 'Camry',
                parkingId: location.id,
                parkingName: location.name,
                requestType: 'WALK_IN',
                requestedStart: new Date(),
                requestedEnd: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
                estimatedAmount: 10.00,
                status: 'PENDING',
                priority: 'NORMAL',
                requestedBy: watchman.id,
                notes: 'Test booking request created by setup script',
            },
        });

        console.log('✅ Test booking request created!');
        console.log(`   ID: ${testRequest.id}`);
        console.log(`   Customer: ${testRequest.customerName}`);
        console.log(`   Vehicle: ${testRequest.vehiclePlate}`);
        console.log(`   Status: ${testRequest.status}\n`);

        // Fetch all booking requests
        const allRequests = await prisma.bookingRequest.findMany();
        console.log(`📊 Total booking requests in database: ${allRequests.length}\n`);

        console.log('🎉 Setup complete! The BookingRequest table is working correctly.');
        console.log('\n💡 Next steps:');
        console.log('   1. Run: npm run dev');
        console.log('   2. Navigate to: localhost:3000/watchman/bookings');
        console.log('   3. Test creating new requests');
        console.log('   4. Test approve/reject functionality\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.message.includes('Unknown arg `requestType`') ||
            error.message.includes('Invalid `prisma.bookingRequest`')) {
            console.log('\n⚠️  The BookingRequest table doesn\'t exist yet!');
            console.log('\n📝 Solution:');
            console.log('   1. Close Prisma Studio if it\'s running');
            console.log('   2. Run: npx prisma db push');
            console.log('   3. Run: npx prisma generate');
            console.log('   4. Run this script again: node scripts/setup-booking-requests.mjs\n');
        } else {
            console.error(error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

setupBookingRequests();
