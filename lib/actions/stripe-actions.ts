"use server";

import { createPaymentIntent as stripeCreateIntent } from "@/lib/stripe";
import { getAuthUserId } from "@/lib/auth";

export async function createPaymentIntentAction(data: {
  amount: number;
  locationId: string;
  locationName?: string;
  checkIn?: string;
  checkOut?: string;
  guestEmail?: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, error: "Please log in to continue" };
    }

    if (!data.amount || !data.locationId) {
      return { success: false, error: "Missing required fields" };
    }

    // Amount should be in cents (e.g., $35.77 = 3577)
    const amountInCents = Math.round(data.amount * 100);

    const result = await stripeCreateIntent(amountInCents, {
      locationId: data.locationId,
      locationName: data.locationName || "Parking Location",
      checkIn: data.checkIn || "",
      checkOut: data.checkOut || "",
      guestEmail: data.guestEmail || "",
    });

    return result;
  } catch (error: any) {
    console.error("Server Action createPaymentIntentAction error:", error);
    if (error.message === "UNAUTHORIZED") {
      return { success: false, error: "Please log in to continue" };
    }
    return { success: false, error: error.message || "Failed to initiate payment" };
  }
}
