import Stripe from "stripe";

// Stripe client initialization (lazy)
let stripeInstance: Stripe | null = null;

export function getStripe() {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const isMock = !key || key.toLowerCase().includes("your_secret_key");

  if (isMock) {
    console.warn("[Stripe Service Warning] Running in MOCK MODE (Secret Key is missing or placeholder)");
    return null;
  }

  stripeInstance = new Stripe(key!, {
    apiVersion: "2024-12-18.acacia" as any,
    typescript: true,
  });

  console.log("[Stripe Service] ✅ Initialized successfully");
  return stripeInstance;
}

// Deprecated: use getStripe() instead
export const stripe = null;

export function isStripeConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

  const hasSecret = !!(secretKey && !secretKey.toLowerCase().includes("your_secret_key"));
  const hasPublishable = !!(publishableKey &&
    !publishableKey.toLowerCase().includes("your_publishable_key") &&
    publishableKey.startsWith("pk_") &&
    publishableKey.length > 20);

  return hasSecret && hasPublishable;
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
}

function checkIsMockMode() {
  return !isStripeConfigured();
}

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
    const stripeConfigured = isStripeConfigured();
    const isMock = !stripeConfigured || amount < 50; // Stripe minimum is 50 cents ($0.50)

    if (isMock) {
      console.log(`[Stripe Service] Mock Mode: Simulating PaymentIntent creation for amount ${amount} cents`);
      return {
        success: true,
        clientSecret: "mock_client_secret_" + Math.random().toString(36).substring(7),
        paymentIntentId: "pi_mock_" + Math.random().toString(36).substring(7),
        isMock: true,
      };
    }

    const stripeClient = getStripe();
    if (!stripeClient) throw new Error("Stripe keys not configured properly");

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount), // Stripe expects amount in cents
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        locationId: metadata.locationId,
        locationName: metadata.locationName,
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        guestEmail: metadata.guestEmail,
      },
    });

    console.log(`[Stripe Service] ✅ PaymentIntent created: ${paymentIntent.id}`);
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error("[Stripe Service Error] Failed to create PaymentIntent:", error);
    return {
      success: false,
      error: error.message || "Failed to create payment intent",
    };
  }
}

/**
 * Creates a SetupIntent for saving a card
 */
export async function createSetupIntent(userId: string) {
  try {
    const isMock = checkIsMockMode();
    if (isMock) {
      console.log("[Stripe Service] Mock Mode: Simulating SetupIntent creation");
      return {
        success: true,
        clientSecret: "seti_mock_secret_" + Math.random().toString(36).substring(7),
        setupIntentId: "seti_mock_" + Math.random().toString(36).substring(7),
        isMock: true,
      };
    }

    const stripeClient = getStripe();
    if (!stripeClient) throw new Error("Stripe keys not configured properly");

    const setupIntent = await stripeClient.setupIntents.create({
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { userId },
    });

    console.log(`[Stripe Service] ✅ SetupIntent created: ${setupIntent.id}`);
    return {
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  } catch (error: any) {
    console.error("[Stripe Service Error] Failed to create SetupIntent:", error);
    return {
      success: false,
      error: error.message || "Failed to create setup intent",
    };
  }
}

/**
 * Retrieves a PaymentMethod by ID
 */
export async function getPaymentMethod(paymentMethodId: string) {
  try {
    const isMock = checkIsMockMode();
    if (isMock) {
      return {
        success: true,
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2028,
      };
    }
    const stripeClient = getStripe();
    if (!stripeClient) throw new Error("Stripe secret key is missing");
    const paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId);
    return {
      success: true,
      brand: paymentMethod.card?.brand || "unknown",
      last4: paymentMethod.card?.last4 || "****",
      expMonth: paymentMethod.card?.exp_month,
      expYear: paymentMethod.card?.exp_year,
    };
  } catch (error: any) {
    console.error("Failed to retrieve PaymentMethod:", error);
    return {
      success: false,
      error: error.message || "Failed to retrieve payment method",
    };
  }
}

/**
 * Retrieves a PaymentIntent by ID
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    const isMock = checkIsMockMode();
    if (isMock) {
      return {
        success: true,
        status: "succeeded",
        amount: 1000,
      };
    }
    const stripeClient = getStripe();
    if (!stripeClient) throw new Error("Stripe secret key is missing");
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
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
