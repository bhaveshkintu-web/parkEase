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

  const mode = key!.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`[Stripe Service] ✅ Initialized successfully in ${mode} mode`);
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

/**
 * Returns true if the configured key is a live key
 */
export function isLiveMode() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return !!(key && key.startsWith("sk_live_"));
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
    userId?: string;
    bookingId?: string; // Optional: if we pre-create the booking
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

    let customerId = undefined;
    if (metadata.userId) {
      try {
        customerId = await getOrCreateStripeCustomer(metadata.userId);
      } catch (e) {
        console.warn("[Stripe Service] Failed to sync customer for PaymentIntent, proceeding as guest-like", e);
      }
    }

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount), // Stripe expects amount in cents
      currency: "usd",
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        integration_type: "production_v1",
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
 * Charges a saved payment method (Off-Session)
 * This is the production-level replacement for mock saved card logic
 */
export async function chargeSavedCard(
  amount: number,
  customerId: string,
  paymentMethodId: string,
  metadata: any
) {
  try {
    const isMock = checkIsMockMode() || 
                   paymentMethodId.startsWith("pm_mock_") || 
                   paymentMethodId.startsWith("pi_mock_") ||
                   customerId?.startsWith("cus_mock_");

    if (isMock) {
      console.log(`[Stripe Service] Mock Mode: Simulating Saved Card Charge for ${paymentMethodId}`);
      return {
        success: true,
        paymentIntentId: "pi_mock_saved_" + Math.random().toString(36).substring(7),
        status: "succeeded",
        isMock: true
      };
    }

    const stripeClient = getStripe();
    if (!stripeClient) throw new Error("Stripe keys not configured properly");

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount),
      currency: "usd",
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        ...metadata,
        charge_type: "saved_card_off_session",
      },
    });

    console.log(`[Stripe Service] ✅ Saved card charged successfully: ${paymentIntent.id}`);
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error: any) {
    console.error("[Stripe Service Error] Saved card charge failed:", error);
    
    if (error.code === "authentication_required") {
       return {
         success: false,
         error: "Authentication required by card issuer",
         requiresAction: true,
         paymentIntentId: error.raw.payment_intent.id,
         clientSecret: error.raw.payment_intent.client_secret
       };
    }

    return {
      success: false,
      error: error.message || "Failed to charge saved card",
    };
  }
}

/**
 * Ensures a user has a Stripe Customer ID, both in Stripe and in our DB.
 */
export async function getOrCreateStripeCustomer(userId: string) {
  const isMock = checkIsMockMode();
  if (isMock) return "cus_mock_" + Math.random().toString(36).substring(7);

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true, firstName: true, lastName: true }
  });

  if (!user) throw new Error("User not found for Stripe customer creation");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripeClient = getStripe();
  if (!stripeClient) throw new Error("Stripe not configured");

  // 1. Search Stripe by email to avoid duplicates
  const customers = await stripeClient.customers.list({ email: user.email!, limit: 1 });
  let customerId = "";

  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    console.log(`[Stripe Service] Found existing customer ${customerId} for ${user.email}`);
  } else {
    // 2. Create new customer
    const customer = await stripeClient.customers.create({
      email: user.email!,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
      metadata: { userId: user.id }
    });
    customerId = customer.id;
    console.log(`[Stripe Service] Created new customer ${customerId} for ${user.email}`);
  }

  // 3. Update DB
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId }
  });

  return customerId;
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

    // CRITICAL: Ensure we have a customer ID before creating the SetupIntent
    const customerId = await getOrCreateStripeCustomer(userId);

    const setupIntent = await stripeClient.setupIntents.create({
      customer: customerId!,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { userId },
    });

    console.log(`[Stripe Service] ✅ SetupIntent created for customer ${customerId}: ${setupIntent.id}`);
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
