import { NextRequest, NextResponse } from "next/server";
import { createPaymentIntent } from "@/lib/stripe";
import { getAuthUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  console.log(">>> [API] POST /api/stripe/create-payment-intent initiated");
  
  try {
    // Verify user is authenticated
    let userId;
    try {
      userId = await getAuthUserId();
      console.log(">>> [API] Authenticated user:", userId);
    } catch (authError: any) {
      console.error(">>> [API] Auth failed:", authError.message);
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error(">>> [API] Failed to parse JSON body");
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { amount, locationId, locationName, checkIn, checkOut, guestEmail } = body;
    console.log(">>> [API] Request params:", { amount, locationId, locationName });

    // Check for missing or placeholder keys
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const isMock = !secretKey || secretKey.includes("YOUR_SECRET_KEY");
    
    if (isMock) {
      console.warn(">>> [API] Stripe API keys are not configured. Running in MOCK MODE.");
    }

    if (!amount || !locationId) {
      console.error(">>> [API] Missing required fields for PaymentIntent");
      return NextResponse.json(
        { success: false, error: "Missing required fields (amount or locationId)" },
        { status: 400 }
      );
    }

    // Amount should be in cents (e.g., $35.77 = 3577)
    const amountInCents = Math.round(amount * 100);
    console.log(">>> [API] Creating intent for cents:", amountInCents);

    const result = await createPaymentIntent(amountInCents, {
      locationId,
      locationName: locationName || "Parking Location",
      checkIn: checkIn || "",
      checkOut: checkOut || "",
      guestEmail: guestEmail || "",
    });

    if (!result.success) {
      console.error(">>> [API] Stripe createPaymentIntent failed:", result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(">>> [API] PaymentIntent created successfully:", result.paymentIntentId);

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (error: any) {
    console.error(">>> [API] UNEXPECTED ERROR:", error);
    
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
