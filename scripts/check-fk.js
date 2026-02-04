const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        // Get pending requests
        const requests = await prisma.$queryRawUnsafe('SELECT id, "customerName", "parkingId", "parkingName", status FROM "BookingRequest" LIMIT 10');
        console.log('BookingRequests:');
        requests.forEach(r => {
            console.log(`  - ${r.customerName}: parkingId="${r.parkingId}", status=${r.status}`);
        });

        // Get all parking locations
        const locations = await prisma.$queryRawUnsafe('SELECT id, name FROM "ParkingLocation"');
        console.log('\nParkingLocations:');
        locations.forEach(l => {
            console.log(`  - ID: "${l.id}", Name: ${l.name}`);
        });

        // Check for mismatches
        const requestParkingIds = [...new Set(requests.map(r => r.parkingId))];
        const locationIds = locations.map(l => l.id);

        console.log('\n--- Analysis ---');
        console.log('Unique parking IDs in requests:', requestParkingIds);
        console.log('Parking IDs in locations:', locationIds);

        const missing = requestParkingIds.filter(id => !locationIds.includes(id));
        if (missing.length > 0) {
            console.log('\n❌ PROBLEM: These parking IDs from requests do NOT exist:');
            console.log(missing);
        } else {
            console.log('\n✓ All parking IDs are valid');
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
