const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookingId = process.argv[2];
  if (!bookingId) {
    console.error('Please provide a booking ID');
    return;
  }

  console.log(`--- Fetching Details for ${bookingId} ---`);
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        location: {
          include: {
            owner: {
              include: {
                user: {
                  select: {
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        payment: true,
        parkingSession: true,
        refunds: true,
      },
    });

    if (!booking) {
      console.log('Booking not found');
      return;
    }

    console.log('Successfully fetched booking details');
    // Check if everything is serializable
    const serialized = JSON.stringify(booking);
    console.log('Successfully serialized booking details');
  } catch (error) {
    console.error('Error fetching booking details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
