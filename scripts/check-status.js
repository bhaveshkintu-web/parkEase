
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatuses() {
  try {
    const locations = await prisma.parkingLocation.findMany({
      select: {
        id: true,
        name: true,
        status: true
      }
    });
    console.log('Current Parking Location Statuses:');
    console.table(locations);
    
    // Check if we can find any PENDING locations
    // Note: This might fail if the DB doesn't have the PENDING enum yet
    try {
      const pending = await prisma.parkingLocation.findMany({
        where: { status: 'PENDING' }
      });
      console.log('PENDING count:', pending.length);
    } catch (e) {
      console.log('Failed to query PENDING status. Database schema might not be updated yet.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatuses();
