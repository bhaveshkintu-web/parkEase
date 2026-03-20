"use client";

import { ReactNode } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { isStripeConfigured, getStripePublishableKey } from "@/lib/stripe";

// Initialize Stripe only if valid keys are present
const isConfigured = isStripeConfigured();
const stripePk = getStripePublishableKey();

if (process.env.NODE_ENV === "development" && stripePk) {
  console.log(`[Stripe] Publishable Key detected (length: ${stripePk.length}, configured: ${isConfigured})`);
}

const stripePromise = isConfigured ? loadStripe(stripePk) : null;

const appearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#10b981",
    colorBackground: "#ffffff",
    colorText: "#0f172a",
    colorDanger: "#ef4444",
    fontFamily: "Geist, system-ui, sans-serif",
    borderRadius: "12px",
  },
  rules: {
    ".Input": {
      border: "2px solid #e2e8f0",
      boxShadow: "none",
      transition: "all 0.2s ease",
    },
    ".Input:focus": {
      border: "2px solid #10b981",
      boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.1)",
    },
    ".Label": {
      fontSize: "12px",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#64748b",
      marginBottom: "8px",
    },
  },
};

// --- Legacy mode: pass clientSecret (used by extend, overstay, modify) ---
interface LegacyProps {
  children: ReactNode;
  clientSecret: string;
  mode?: never;
  amount?: never;
  currency?: never;
}

// --- Deferred mode: pass mode/amount/currency (used by checkout new-card flow) ---
interface DeferredProps {
  children: ReactNode;
  clientSecret?: never;
  mode: "payment" | "setup";
  amount: number; // in cents
  currency: string;
  setupFutureUsage?: "off_session" | "on_session";
}


type StripeElementsWrapperProps = LegacyProps | DeferredProps;

export function StripeElementsWrapper(props: StripeElementsWrapperProps) {
  if (!stripePromise) {
    // Mock mode or unconfigured — just render children directly
    if (process.env.NODE_ENV === "development") {
      console.warn("StripeElementsWrapper: Stripe not configured, rendering in mock/fallback mode.");
    }
    return <>{props.children}</>;
  }

  // Deferred mode (checkout new-card flow)
  if (props.mode) {
    return (
      <Elements
        key={`deferred-${props.mode}-${props.amount}`}
        stripe={stripePromise}
        options={{
          mode: props.mode,
          amount: props.amount,
          currency: props.currency,
          setup_future_usage: props.setupFutureUsage,
          appearance,
          loader: "auto",
        }}
      >

        {props.children}
      </Elements>
    );
  }

  // Legacy mode (extend, overstay, modify — clientSecret already exists)
  return (
    <Elements
      key={props.clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance,
        loader: "auto",
      }}
    >
      {props.children}
    </Elements>
  );
}
