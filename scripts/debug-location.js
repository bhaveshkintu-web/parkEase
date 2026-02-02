
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugLocation() {
  try {
    const locations = await prisma.parkingLocation.findMany({
      include: {
        owner: true
      },
      take: 5
    });
    
    console.log('--- DEBUG PARKING LOCATIONS ---');
    locations.forEach(loc => {
      console.log(`ID: ${loc.id}, Name: ${loc.name}, Status: "${loc.status}"`);
    });
    
    // Check for any record with 'pending' (lowercase) or 'PENDING'
    const allLocations = await prisma.parkingLocation.findMany();
    const statuses = [...new Set(allLocations.map(l => l.status))];
    console.log('Unique statuses in DB:', statuses);

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLocation();
