import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const watchman = await prisma.watchman.findFirst();
    if (!watchman) return;

    const requests = await prisma.$queryRawUnsafe(`
      SELECT br.*, 
      json_build_object('id', pl.id, 'name', pl.name, 'address', pl.address, 'city', pl.city) as parking,
      json_build_object('id', u.id, 'firstName', u."firstName", 'lastName', u."lastName", 'email', u.email) as requester
      FROM "BookingRequest" br
      JOIN "ParkingLocation" pl ON br."parkingId" = pl.id
      JOIN "User" u ON br."requestedBy" = u.id
      WHERE pl."ownerId" = $1
      ORDER BY br.priority DESC, br."createdAt" DESC
  `, watchman.ownerId);

    console.log('--- DATA SAMPLE ---');
    console.log(JSON.stringify(requests[0], null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
