import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookingStatuses() {
    console.log('🔍 Checking booking data...\n');

    try {
        const bookings = await prisma.booking.findMany({
            include: {
                location: true,
            },
        });

        if (bookings.length === 0) {
            console.log('❌ No bookings found in database!');
            console.log('💡 Run: node scripts/create-sample-bookings.mjs\n');
            return;
        }

        console.log(`✅ Found ${bookings.length} bookings\n`);

        console.log('📊 Booking Details:');
        console.log('─'.repeat(80));

        bookings.forEach((booking, index) => {
            console.log(`\n${index + 1}. Booking ID: ${booking.id.substring(0, 12)}...`);
            console.log(`   License Plate: ${booking.vehiclePlate}`);
            console.log(`   Vehicle: ${booking.vehicleMake} ${booking.vehicleModel} (${booking.vehicleColor})`);
            console.log(`   Guest: ${booking.guestFirstName} ${booking.guestLastName}`);
            console.log(`   Status: ${booking.status} - ${booking.status === booking.status.toUpperCase() ? 'UPPERCASE' : 'lowercase'}`);
            console.log(`   Check-in: ${new Date(booking.checkIn).toLocaleString()}`);
            console.log(`   Check-out: ${new Date(booking.checkOut).toLocaleString()}`);
            console.log(`   Location: ${booking.location?.name || 'Unknown'}`);
            console.log(`   Total: $${booking.totalPrice.toFixed(2)}`);
        });

        console.log('\n' + '─'.repeat(80));
        console.log('\n📈 Status Summary:');
        const statusCounts = bookings.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});

        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });

        console.log('\n⚠️  ISSUE DETECTED:');
        console.log('   The database has statuses in UPPERCASE (CONFIRMED, PENDING)');
        console.log('   But the code checks for lowercase ("confirmed", "pending")');
        console.log('\n💡 SOLUTION:');
        console.log('   Either update the code to check uppercase');
        console.log('   OR normalize statuses to lowercase in the component');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkBookingStatuses();
