"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function extendBookingAction(bookingId: string, additionalMinutes: number, amount: number, paymentIntentId: string) {
    try {
        let userId = null;
        try {
            userId = await getAuthUserId();
        } catch (e) {
            // Allow public extension
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                location: true,
                parkingSession: true
            }
        });

        if (!booking) return { success: false, error: "Booking not found" };
        // Note: Ownership check is intentionally skipped here because this action
        // can be triggered via a public link (e.g., from email). The booking ID itself
        // acts as the access token. Ownership is only enforced on internal account pages.

        const newCheckOut = new Date(booking.checkOut.getTime() + additionalMinutes * 60000);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Booking
            const updatedBooking = await (tx.booking as any).update({
                where: { id: bookingId },
                data: {
                    checkOut: newCheckOut,
                    totalPrice: { increment: amount },
                    extensionPaymentId: paymentIntentId,
                }
            });

            // 2. Create Payment Record
            await tx.payment.create({
                data: {
                    bookingId: bookingId,
                    amount: amount,
                    currency: "USD",
                    provider: "STRIPE",
                    transactionId: paymentIntentId,
                    status: "SUCCESS",
                    type: "EXTENSION" as any, // If type enum exists, else just string
                }
            });

            // 3. Log activity or update analytics if needed
            await tx.locationAnalytics.update({
                where: { locationId: booking.locationId },
                data: {
                    revenue: { increment: amount }
                }
            });

            return updatedBooking;
        });

        revalidatePath(`/account/reservations/${bookingId}`);
        revalidatePath(`/extend-parking/${bookingId}`);

        return { success: true, data: result };
    } catch (error: any) {
        console.error("Extension failed:", error);
        return { success: false, error: error.message || "Failed to extend booking" };
    }
}
