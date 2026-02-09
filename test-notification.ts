import { notifyOwnerOfNewBooking } from "./lib/notifications";
import { prisma } from "./lib/prisma";

async function testNotification() {
  try {
    // Find a recent booking
    const booking = await prisma.booking.findFirst({
      orderBy: { createdAt: "desc" },
      include: { location: { include: { owner: true } } }
    });

    if (!booking) {
      console.log("No bookings found to test.");
      return;
    }

    console.log(`Testing notification for booking: ${booking.id}`);
    console.log(`Confirmation Code: ${booking.confirmationCode}`);
    
    await notifyOwnerOfNewBooking(booking.id);
    console.log("Test execution completed.");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotification();
