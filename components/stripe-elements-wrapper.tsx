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

interface StripeElementsWrapperProps {
  children: ReactNode;
  clientSecret: string | null;
}

export function StripeElementsWrapper({ children, clientSecret }: StripeElementsWrapperProps) {
  // If no secret or no valid stripe object, just render children (likely in mock mode or loading)
  if (!clientSecret || !stripePromise) {
    if (process.env.NODE_ENV === "development" && !isConfigured && clientSecret) {
      console.warn("StripeElementsWrapper: Rendering in mock/fallback mode because NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is invalid or missing.");
    }
    return <>{children}</>;
  }

  return (
    <Elements
      key={clientSecret} // Force re-mount when secret changes
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#10b981', // emerald-500
            colorBackground: '#ffffff',
            colorText: '#0f172a', // slate-900
            colorDanger: '#ef4444',
            fontFamily: 'Geist, system-ui, sans-serif',
            borderRadius: '12px',
          },
          rules: {
            '.Input': {
              border: '2px solid #e2e8f0', // border-slate-200
              boxShadow: 'none',
              transition: 'all 0.2s ease',
            },
            '.Input:focus': {
              border: '2px solid #10b981',
              boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)',
            },
            '.Label': {
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b', // slate-500
              marginBottom: '8px',
            }
          }
        }
      }}
    >
      {children}
    </Elements>
  );
}
