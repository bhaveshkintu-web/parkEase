
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. Create User
    const email = 'vidhipatel5044@gmail.com';
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password: hashedPassword,
            firstName: 'Vidhi',
            lastName: 'Patel',
            role: 'OWNER', // Giving OWNER role so they can see more features
            emailVerified: true,
            status: 'ACTIVE'
        },
    });
    console.log('Created User:', user.email);

    // 2. Create Owner Profile
    const ownerProfile = await prisma.ownerProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            userId: user.id,
            businessName: "Patel Parking Solutions",
            businessType: "company",
            street: "123 Business Way",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            country: "USA",
            status: "approved",
            verificationStatus: "verified"
        }
    });
    console.log('Created Owner Profile for:', user.email);

    // 3. Create Parking Location
    const location = await prisma.parkingLocation.create({
        data: {
            ownerId: ownerProfile.id,
            name: "JFK Airport Long Term Parking",
            address: "123 Airport Rd",
            city: "New York",
            state: "NY",
            country: "USA",
            zipCode: "11430",
            airportCode: "JFK",
            latitude: 40.6413,
            longitude: -73.7781,
            description: "Secure long-term parking near JFK with 24/7 shuttle service.",
            pricePerDay: 25.00,
            originalPrice: 35.00,
            amenities: ["CCTV", "24/7 Access", "Shuttle", "Fenced"],
            images: ["/airports/jfk.jpg"],
            availableSpots: 120,
            totalSpots: 200,
            status: "ACTIVE"
        }
    });
    console.log('Created Parking Location:', location.name);

    // 4. Create a Booking
    await prisma.booking.create({
        data: {
            locationId: location.id,
            userId: user.id,
            checkIn: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
            checkOut: new Date(new Date().setDate(new Date().getDate() + 4)), // 3 days later
            guestFirstName: "John",
            guestLastName: "Doe",
            guestEmail: "john@example.com",
            guestPhone: "555-0199",
            vehicleMake: "Toyota",
            vehicleModel: "Camry",
            vehicleColor: "Silver",
            vehiclePlate: "ABC-123",
            totalPrice: 82.50, // 3 * 25 + tax/fees approximate
            taxes: 5.50,
            fees: 2.00,
            status: "CONFIRMED",
            confirmationCode: "RES-" + Math.random().toString(36).substring(7).toUpperCase()
        }
    });
    console.log('Created Sample Booking');

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
