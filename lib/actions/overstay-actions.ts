"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

            return { success: true };
        });

        revalidatePath(`/watchman/sessions`);
        revalidatePath(`/watchman/scan`);

        return result;
    } catch (error: any) {
        console.error("Failed to mark overstay as paid:", error);
        return { success: false, error: error.message };
    }
}

export async function sendOverstayLinkAction(bookingId: string, overstayCharge: number) {
    try {
        const { sendOverstayPaymentEmail } = await import("@/lib/notifications");
        const result = await sendOverstayPaymentEmail(bookingId, overstayCharge);
        return result;
    } catch (error: any) {
        console.error("Failed to send overstay link:", error);
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

            return { success: true };
        });

        revalidatePath(`/watchman/sessions`);
        revalidatePath(`/watchman/scan`);
        revalidatePath(`/pay-overstay/${bookingId}`);

        return result;
    } catch (error: any) {
        console.error("Failed to pay overstay:", error);
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

        return { success: true, data: booking };
    } catch (error: any) {
        console.error("Failed to fetch overstay session:", error);
        return { success: false, error: error.message };
    }
}
