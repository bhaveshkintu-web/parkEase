"use server";

import { createPaymentIntent as stripeCreateIntent, chargeSavedCard as stripeChargeSavedCard } from "@/lib/stripe";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      userId: userId || undefined,
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

/**
 * PRODUCTION-LEVEL Action to charge a saved card
 */
export async function chargeSavedCardAction(data: {
  amount: number;
  paymentMethodId: string;
  locationId: string;
  locationName?: string;
  checkIn?: string;
  checkOut?: string;
  bookingId?: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // 1. Get/Create User's Stripe Customer ID
    const { getOrCreateStripeCustomer } = await import("@/lib/stripe");
    const stripeCustomerId = await getOrCreateStripeCustomer(userId);
    
    if (!stripeCustomerId) {
      return { success: false, error: "Failed to establish a payment profile. Please contact support." };
    }

    // Re-fetch email for metadata
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
       return { success: false, error: "User account not found." };
    }

    // 2. Fetch the actual Stripe Payment Method ID from our database
    const dbPaymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: data.paymentMethodId }
    });

    if (!dbPaymentMethod || !(dbPaymentMethod as any).stripeMethodId) {
      // Fallback: if stripeMethodId is missing, try using the provided ID directly
      // (in case the frontend already sent a pm_... ID)
      if (!data.paymentMethodId.startsWith("pm_")) {
        return { success: false, error: "Invalid payment method selected." };
      }
    }

    const finalStripePmId = (dbPaymentMethod as any)?.stripeMethodId || data.paymentMethodId;

    // 3. Perform server-side confirmed charge
    const amountInCents = Math.round(data.amount * 100);
    const result = await stripeChargeSavedCard(
      amountInCents,
      stripeCustomerId,
      finalStripePmId,
      {
        userId,
        locationId: data.locationId,
        locationName: data.locationName,
        bookingId: data.bookingId,
        email: user.email!,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        type: data.bookingId ? "extension" : "initial", // Helpful for webhook
      }
    );

    if (result.requiresAction) {
       return {
         success: false,
         requiresAction: true,
         clientSecret: result.clientSecret,
         paymentIntentId: result.paymentIntentId,
         error: "Authentication required by your bank"
       };
    }

    return result;
  } catch (error: any) {
    console.error("[Stripe Action Error] chargeSavedCardAction error:", error);
    return { success: false, error: error.message || "Failed to process saved card payment" };
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
