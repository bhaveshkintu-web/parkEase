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
    console.log("[Stripe Action] Init createPaymentIntentAction for location:", data.locationId);
    let userId = null;
    try {
      userId = await getAuthUserId();
    } catch (e) {
      // allow unauthenticated 
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
 
    console.log(`[Stripe Action] ✅ Payment intent created: ${result.success ? 'Success' : 'Failed'}`);
    return result;
  } catch (error: any) {
    console.error("[Stripe Action Error] createPaymentIntentAction error:", error);

    // Specifically handle database connection issues
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      return {
        success: false,
        error: "Database Connection Error: The server cannot reach the database. Please ensure your database is running."
      };
    }

    if (error.message === "UNAUTHORIZED") {
      return { success: false, error: "Please log in to continue" };
    }
    return { success: false, error: error.message || "Failed to initiate payment" };
  }
}

export async function createSetupIntentAction() {
  try {
    console.log("[Stripe Action] Init createSetupIntentAction");
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, error: "Please log in to continue" };
    }

    const { createSetupIntent } = await import("@/lib/stripe");
    const result = await createSetupIntent(userId);
 
    console.log(`[Stripe Action] ✅ Setup intent created for user ${userId}`);
    return result;
  } catch (error: any) {
    console.error("[Stripe Action Error] createSetupIntentAction error:", error);
    return { success: false, error: error.message || "Failed to initiate setup intent" };
  }
}
