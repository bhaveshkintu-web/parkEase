import Stripe from "stripe";

// Initialize Stripe with the secret key
// The secret key should only be used server-side
const secretKey = process.env.STRIPE_SECRET_KEY;
const isMockMode = !secretKey || secretKey.includes("YOUR_SECRET_KEY");

export const stripe = !isMockMode 
  ? new Stripe(secretKey!, {
      apiVersion: "2026-01-28.clover" as any,
      typescript: true,
    })
  : null;

/**
 * Creates a PaymentIntent for a booking
 */
export async function createPaymentIntent(
  amount: number, // Amount in cents
  metadata: {
    locationId: string;
    locationName: string;
    checkIn: string;
    checkOut: string;
    guestEmail: string;
  }
) {
  try {
    if (isMockMode) {
      console.log("Stripe Mock Mode: Simulating PaymentIntent creation");
      return {
        success: true,
        clientSecret: "mock_client_secret_parkease_demo_" + Math.random().toString(36).substring(7),
        paymentIntentId: "pi_mock_" + Math.random().toString(36).substring(7),
        isMock: true,
      };
    }

    const paymentIntent = await stripe!.paymentIntents.create({
      amount: Math.round(amount), // Stripe expects amount in cents
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        locationId: metadata.locationId,
        locationName: metadata.locationName,
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        guestEmail: metadata.guestEmail,
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error("Failed to create PaymentIntent:", error);
    return {
      success: false,
      error: error.message || "Failed to create payment intent",
    };
  }
}

/**
 * Retrieves a PaymentIntent by ID
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    if (isMockMode) {
      return {
        success: true,
        status: "succeeded",
        amount: 1000,
      };
    }
    const paymentIntent = await stripe!.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    };
  } catch (error: any) {
    console.error("Failed to retrieve PaymentIntent:", error);
    return {
      success: false,
      error: error.message || "Failed to retrieve payment intent",
    };
  }
}
