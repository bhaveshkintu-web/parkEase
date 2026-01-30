
"use server";

import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation, sendBookingReceipt } from "@/lib/mailer";

export async function emailBookingDetails(bookingId: string) {
  try {
    const userId = await getAuthUserId();
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: true }
    });

    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.userId !== userId) return { success: false, error: "Unauthorized" };

    // Use guest email or fallback to user email if we fetch user
    // ideally we use the email entered during booking
    const emailToSend = booking.guestEmail;

    await sendBookingConfirmation(emailToSend, booking);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to email booking details:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function emailBookingReceipt(bookingId: string) {
  try {
    const userId = await getAuthUserId();
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: true }
    });

    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.userId !== userId) return { success: false, error: "Unauthorized" };

    const emailToSend = booking.guestEmail;

    await sendBookingReceipt(emailToSend, booking);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to email booking receipt:", error);
    return { success: false, error: "Failed to send receipt" };
  }
}
