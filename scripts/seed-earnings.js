const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding test data for Owner Earnings...');

  // 1. Get an existing owner
  let owner = await prisma.ownerProfile.findFirst({
    include: { wallet: true }
  });

  if (!owner) {
    // Create one if not exists (need a user first)
    const user = await prisma.user.create({
      data: {
        email: `test_owner_${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'Owner',
        password: 'hashed_password',
        role: 'OWNER',
        status: 'ACTIVE'
      }
    });
    owner = await prisma.ownerProfile.create({
      data: {
        userId: user.id,
        businessName: 'Premium Parking Hub',
        businessType: 'CORPORATE',
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED'
      }
    });
  }

  // 2. Ensure wallet exists
  if (!owner.wallet) {
    owner.wallet = await prisma.wallet.create({
      data: {
        ownerId: owner.id,
        balance: 1000,
        currency: 'USD'
      }
    });
  }

  // 3. Create Multiple Locations
  const loc1 = await prisma.parkingLocation.create({
    data: {
      ownerId: owner.id,
      name: 'Downtown Plaza Parking',
      address: '456 Market St',
      city: 'San Francisco',
      country: 'USA',
      latitude: 37.7897,
      longitude: -122.4009,
      pricePerDay: 25,
      totalSpots: 100,
      availableSpots: 80,
      status: 'ACTIVE'
    }
  });

  const loc2 = await prisma.parkingLocation.create({
    data: {
      ownerId: owner.id,
      name: 'Airport Short Term',
      address: '789 Sky Way',
      city: 'South San Francisco',
      country: 'USA',
      latitude: 37.6213,
      longitude: -122.3790,
      pricePerDay: 40,
      totalSpots: 50,
      availableSpots: 30,
      status: 'ACTIVE'
    }
  });

  // 4. Create Multiple Commission Rules
  // Rule 1: High Priority (20% for large bookings > $100)
  await prisma.commissionRule.create({
    data: {
      name: 'High Value Booking Rule',
      type: 'PERCENTAGE',
      value: 20,
      appliesTo: 'ALL',
      minBookingValue: 100,
      priority: 10,
      isActive: true
    }
  });

  // Rule 2: Base Rule (10% standard)
  await prisma.commissionRule.create({
    data: {
      name: 'Standard Commission',
      type: 'PERCENTAGE',
      value: 10,
      appliesTo: 'ALL',
      priority: 5,
      isActive: true
    }
  });

  // 5. Create Multiple Bookings & Transactions
  // Booking 1: $120 (Should hit High Priority 20% = $24 commission)
  const b1 = await prisma.booking.create({
    data: {
      locationId: loc1.id,
      guestFirstName: 'John',
      guestLastName: 'Doe',
      guestEmail: 'john@example.com',
      guestPhone: '1234567890',
      vehicleMake: 'Tesla',
      vehicleModel: '3',
      vehicleColor: 'Black',
      vehiclePlate: 'TEST1',
      totalPrice: 120,
      taxes: 12,
      fees: 5,
      status: 'COMPLETED',
      confirmationCode: `CONF-${Date.now()}-1`,
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000)
    }
  });

  // Manual transaction record for B1
  await prisma.walletTransaction.createMany({
    data: [
      {
        walletId: owner.wallet.id,
        type: 'CREDIT',
        amount: 120,
        description: `Booking ${b1.confirmationCode}`,
        status: 'COMPLETED',
        reference: b1.id
      },
      {
        walletId: owner.wallet.id,
        type: 'COMMISSION',
        amount: -24,
        description: `Commission for ${b1.confirmationCode}`,
        status: 'COMPLETED',
        reference: b1.id
      }
    ]
  });

  // Booking 2: $50 (Should hit Standard 10% = $5 commission)
  const b2 = await prisma.booking.create({
    data: {
      locationId: loc2.id,
      guestFirstName: 'Jane',
      guestLastName: 'Smith',
      guestEmail: 'jane@example.com',
      guestPhone: '9876543210',
      vehicleMake: 'BMW',
      vehicleModel: 'X5',
      vehicleColor: 'White',
      vehiclePlate: 'TEST2',
      totalPrice: 50,
      taxes: 5,
      fees: 2,
      status: 'COMPLETED',
      confirmationCode: `CONF-${Date.now()}-2`,
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000)
    }
  });

  await prisma.walletTransaction.createMany({
    data: [
      {
        walletId: owner.wallet.id,
        type: 'CREDIT',
        amount: 50,
        description: `Booking ${b2.confirmationCode}`,
        status: 'COMPLETED',
        reference: b2.id
      },
      {
        walletId: owner.wallet.id,
        type: 'COMMISSION',
        amount: -5,
        description: `Commission for ${b2.confirmationCode}`,
        status: 'COMPLETED',
        reference: b2.id
      }
    ]
  });

  // 6. Create Withdrawal Requests
  await prisma.withdrawalRequest.create({
    data: {
      walletId: owner.wallet.id,
      amount: 200,
      accountName: 'Premium Parking',
      accountNumber: '1234567890',
      bankName: 'Chase',
      status: 'PENDING'
    }
  });

  console.log('Test data seeded successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
