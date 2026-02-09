import { NextResponse } from "next/server";
import { notifyOwnerOfNewBooking } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Find a recent booking
    const booking = await prisma.booking.findFirst({
      orderBy: { createdAt: "desc" },
      include: { location: { include: { owner: true } } }
    });

    if (!booking) {
      return NextResponse.json({ message: "No bookings found to test." }, { status: 404 });
    }

    console.log(`Testing notification for booking: ${booking.id}`);
    console.log(`Confirmation Code: ${booking.confirmationCode}`);
    
    const notification = await notifyOwnerOfNewBooking(booking.id);
    
    return NextResponse.json({ 
      success: true, 
      message: "Notification test triggered. Check server logs.",
      bookingId: booking.id,
      notification 
    });
  } catch (error: any) {
    console.error("Test failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
