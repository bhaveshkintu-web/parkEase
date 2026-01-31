import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSampleBookings() {
    console.log('🎯 Creating sample bookings for testing...\n');

    try {
        // Find watchman user
        const watchman = await prisma.user.findUnique({
            where: { email: 'vidhipatel5044@gmail.com' },
        });

        if (!watchman) {
            console.log('❌ Watchman user not found!');
            return;
        }

        console.log(`✅ Found watchman: ${watchman.email}\n`);

        // Find or create a parking location
        let location = await prisma.parkingLocation.findFirst();

        if (!location) {
            console.log('📍 No parking location found. Creating one...');

            // First create an owner profile
            const ownerUser = await prisma.user.create({
                data: {
                    email: 'owner@parkease.com',
                    password: '$2a$10$YourHashedPasswordHere',
                    firstName: 'John',
                    lastName: 'Owner',
                    role: 'OWNER',
                    emailVerified: true,
                    status: 'ACTIVE',
                },
            });

            const ownerProfile = await prisma.ownerProfile.create({
                data: {
                    userId: ownerUser.id,
                    businessName: 'Downtown Parking LLC',
                    businessType: 'Parking',
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA',
                    status: 'approved',
                    verificationStatus: 'verified',
                },
            });

            location = await prisma.parkingLocation.create({
                data: {
                    ownerId: ownerProfile.id,
                    name: 'Downtown Parking Center',
                    address: '123 Main Street',
                    city: 'New York',
                    state: 'NY',
                    country: 'USA',
                    zipCode: '10001',
                    latitude: 40.7128,
                    longitude: -74.0060,
                    description: 'Convenient downtown parking',
                    pricePerDay: 25.00,
                    originalPrice: 30.00,
                    amenities: ['24/7 Security', 'Covered', 'EV Charging'],
                    images: [],
                    shuttle: true,
                    covered: true,
                    selfPark: true,
                    valet: false,
                    open24Hours: true,
                    availableSpots: 45,
                    totalSpots: 50,
                    status: 'ACTIVE',
                },
            });

            console.log(`✅ Created parking location: ${location.name}\n`);
        } else {
            console.log(`✅ Using existing location: ${location.name}\n`);
        }

        // Create some sample bookings for today
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const bookingsToCreate = [
            {
                checkIn: today,
                checkOut: new Date(today.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
                guestFirstName: 'Alice',
                guestLastName: 'Johnson',
                guestEmail: 'alice@example.com',
                guestPhone: '+1-555-1234',
                vehicleMake: 'Toyota',
                vehicleModel: 'Camry',
                vehicleColor: 'Silver',
                vehiclePlate: 'ABC-1234',
                totalPrice: 20.00,
                taxes: 2.00,
                fees: 1.50,
                status: 'CONFIRMED',
            },
            {
                checkIn: today,
                checkOut: tomorrow,
                guestFirstName: 'Bob',
                guestLastName: 'Smith',
                guestEmail: 'bob@example.com',
                guestPhone: '+1-555-5678',
                vehicleMake: 'Honda',
                vehicleModel: 'Civic',
                vehicleColor: 'Blue',
                vehiclePlate: 'XYZ-9876',
                totalPrice: 25.00,
                taxes: 2.50,
                fees: 1.75,
                status: 'PENDING',
            },
            {
                checkIn: today,
                checkOut: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 hours from now
                guestFirstName: 'Charlie',
                guestLastName: 'Brown',
                guestEmail: 'charlie@example.com',
                guestPhone: '+1-555-9012',
                vehicleMake: 'Ford',
                vehicleModel: 'F-150',
                vehicleColor: 'Black',
                vehiclePlate: 'DEF-4567',
                totalPrice: 30.00,
                taxes: 3.00,
                fees: 2.00,
                status: 'CONFIRMED',
            },
        ];

        console.log('📝 Creating bookings...');

        for (const bookingData of bookingsToCreate) {
            const booking = await prisma.booking.create({
                data: {
                    userId: watchman.id,
                    locationId: location.id,
                    ...bookingData,
                    confirmationCode: `PK${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    qrCode: `QR${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
                },
            });
            console.log(`   ✅ Created booking: ${booking.vehiclePlate} (${booking.status})`);
        }

        console.log('\n✨ Sample bookings created successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Location: ${location.name}`);
        console.log(`   - Total bookings: ${bookingsToCreate.length}`);
        console.log(`   - Confirmed: ${bookingsToCreate.filter(b => b.status === 'CONFIRMED').length}`);
        console.log(`   - Pending: ${bookingsToCreate.filter(b => b.status === 'PENDING').length}`);
        console.log('\n🎉 Now refresh your browser to see the bookings!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

createSampleBookings();
