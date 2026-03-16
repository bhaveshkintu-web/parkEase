"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FinanceService } from "@/lib/finance-service";

export async function markOverstayAsPaidAction(bookingId: string, paymentMethod: string = "CASH") {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { parkingSession: true }
        });

        if (!booking) return { success: false, error: "Booking not found" };
        if (!booking.parkingSession) return { success: false, error: "No parking session found" };

        const overstayCharge = (booking.parkingSession as any).overstayCharge || 0;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update ParkingSession
            await (tx.parkingSession as any).update({
                where: { id: booking.parkingSession!.id },
                data: {
                    paymentStatus: "PAID",
                }
            });

            // 2. Update Booking
            await (tx.booking as any).update({
                where: { id: bookingId },
                data: {
                    status: "OVERSTAY" as any,
                    totalPrice: { increment: (overstayCharge as any) },
                }
            });

            // 3. Create Payment Record
            await (tx.payment as any).create({
                data: {
                    bookingId: bookingId,
                    amount: overstayCharge,
                    currency: "USD",
                    provider: paymentMethod,
                    transactionId: `overstay_${Date.now()}`,
                    status: "SUCCESS",
                    type: "OVERSTAY" as any,
                }
            });

            // NEW: Record extra earnings for overstay
            await FinanceService.recordExtraEarnings(bookingId, overstayCharge, 'OVERSTAY', tx);

            // NEW: Settle remaining earnings (the original booking amount)
            await FinanceService.creditEarnings(bookingId, tx);

            return { success: true };
        });

        revalidatePath(`/watchman/sessions`);
        revalidatePath(`/watchman/scan`);

        console.log("[Overstay] Overstay marked as paid for booking:", bookingId);

        return result;
    } catch (error: any) {
        console.error("[Overstay Error] Failed in markOverstayAsPaid:", error);
        return { success: false, error: error.message };
    }
}

export async function sendOverstayLinkAction(bookingId: string, overstayCharge: number) {
    try {
        const { sendOverstayPaymentEmail } = await import("@/lib/notifications");
        console.log("[Overstay] Sending overstay link to booking:", bookingId, "Amount:", overstayCharge);
        const result = await sendOverstayPaymentEmail(bookingId, overstayCharge);
        return result;
    } catch (error: any) {
        console.error("[Overstay Error] Failed to send overstay link:", bookingId, error);
        return { success: false, error: error.message };
    }
}

export async function payOverstayAction(bookingId: string, amount: number, paymentIntentId: string) {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { parkingSession: true }
        });

        if (!booking) return { success: false, error: "Booking not found" };
        if (!booking.parkingSession) return { success: false, error: "No parking session found" };

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update ParkingSession
            await (tx.parkingSession as any).update({
                where: { id: booking.parkingSession!.id },
                data: {
                    paymentStatus: "PAID",
                }
            });

            // 2. Update Booking
            await (tx.booking as any).update({
                where: { id: bookingId },
                data: {
                    status: "OVERSTAY" as any,
                    totalPrice: { increment: amount },
                    overstayPaymentId: paymentIntentId,
                }
            });

            // 3. Create Payment Record
            await (tx.payment as any).create({
                data: {
                    bookingId: bookingId,
                    amount: amount,
                    currency: "USD",
                    provider: "STRIPE",
                    transactionId: paymentIntentId,
                    status: "SUCCESS",
                    type: "OVERSTAY" as any,
                }
            });

            // NEW: Record extra earnings for overstay
            await FinanceService.recordExtraEarnings(bookingId, amount, 'OVERSTAY', tx);

            // NEW: Settle remaining earnings (the original booking amount)
            await FinanceService.creditEarnings(bookingId, tx);

            return { success: true };
        });

        revalidatePath(`/watchman/sessions`);
        revalidatePath(`/watchman/scan`);
        revalidatePath(`/pay-overstay/${bookingId}`);

        console.log("[Overstay] Overstay payment successful for booking:", bookingId, "Amount:", amount);

        return result;
    } catch (error: any) {
        console.error("[Overstay Error] Failed to pay overstay:", bookingId, error);
        return { success: false, error: error.message };
    }
}

export async function getOverstaySessionAction(bookingId: string) {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                location: true,
                parkingSession: true,
                payments: true
            }
        });

        if (!booking) return { success: false, error: "Booking not found" };
 
        console.log(`[Overstay Action] ✅ Fetched overstay session for booking ${bookingId}`);
        return { success: true, data: booking };
    } catch (error: any) {
        console.error(`[Overstay Action Error] Failed to fetch overstay session for ${bookingId}:`, error);
        return { success: false, error: error.message };
    }
}
