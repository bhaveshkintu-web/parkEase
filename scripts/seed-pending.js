
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPending() {
  try {
    // 1. Get an owner to associate the location with
    const owner = await prisma.ownerProfile.findFirst();
    if (!owner) {
      console.error('No owner found in database. Please register an owner first.');
      return;
    }

    console.log(`Using owner: ${owner.businessName} (ID: ${owner.id})`);

    // 2. Create a pending location
    // Note: This uses 'PENDING' but since db push failed, we'll try to use a string 
    // that Prisma client will map to the internal representation.
    // However, if the enum PENDING doesn't exist in DB, this will fail.
    
    try {
      const newLoc = await prisma.parkingLocation.create({
        data: {
          ownerId: owner.id,
          name: "Test Pending Airport Parking",
          address: "123 Approval Lane",
          city: "Los Angeles",
          country: "USA",
          latitude: 34.0522,
          longitude: -118.2437,
          pricePerDay: 15.99,
          availableSpots: 50,
          totalSpots: 50,
          status: "PENDING", // If this fails, we know for sure the enum is missing in DB
        }
      });
      console.log(`✅ Created pending location: ${newLoc.name} (ID: ${newLoc.id})`);
    } catch (dbError) {
      console.error('❌ Failed to create PENDING location:', dbError.message);
      console.log('\nThis confirms that the PENDING status is missing from your database schema.');
      console.log('You MUST run npx prisma db push after stopping your dev server.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPending();
