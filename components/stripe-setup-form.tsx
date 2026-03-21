"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle, ShieldCheck, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StripeSetupFormProps {
  onSuccess: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export function StripeSetupForm({
  onSuccess,
  isSubmitting,
  setIsSubmitting,
}: StripeSetupFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isReady) {
      console.warn("StripeSetupForm: Submission attempted before fields were ready.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Small delay to ensure everything is mounted
      await new Promise(r => setTimeout(r, 100));

      // In Mock Mode, the clientSecret will be a mock string
      // stripe.confirmSetup will fail if it's not a real secret
      // We check if we are in mock mode by looking at the secret prefix elsewhere, 
      // but here we can just try/catch or check the string.

      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account/payments`,
        },
        redirect: "if_required",
      });

      if (setupError) {
        console.error("Stripe confirmSetup error:", setupError);
        setError(setupError.message || "Failed to save card. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (setupIntent && setupIntent.status === "succeeded") {
        // Now hit our API to save the payment method ID to DB
        const res = await fetch("/api/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method,
            brand: "card", // We'll fetch the real brand on the server side
            last4: "****",
            expiryMonth: 1,
            expiryYear: 2030,
            cardholderName: "Card Holder", // Can be extended
            setAsDefault: true,
            isStripeSetup: true,
          }),
        });

        if (res.ok) {
          toast({
            title: "Card Saved",
            description: "Your payment method has been saved securely.",
          });
          onSuccess();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to save card details to account.");
        }
      }
    } catch (err: any) {
      console.error("StripeSetupForm unexpected error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!stripe || !elements ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-bold">Initializing Connection...</p>
        </div>
      ) : (
        <div className={cn("transition-all duration-500", !isReady && "opacity-0 h-0 overflow-hidden")}>
          <PaymentElement
            options={{ layout: "tabs" }}
            onReady={() => setIsReady(true)}
            onChange={(e) => {
              if (e.complete) setError(null);
            }}
          />
        </div>
      )}

      {!isReady && stripe && elements && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-bold">Loading Secure Fields...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/5 p-4 text-sm text-destructive border border-destructive/10 animate-in zoom-in-95 duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="space-y-4 pt-4">
        <Button
          type="submit"
          className="w-full h-14 font-black text-lg shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] rounded-xl group"
          disabled={!stripe || isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="uppercase tracking-widest">Saving...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full relative">
              <span className="uppercase tracking-widest font-black">
                Save Card Securely
              </span>
              <Lock className="absolute right-0 h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-2">
          <div className="flex items-center gap-1.5 grayscale opacity-60">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Encrypted Storage</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-60">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Secure Connection</span>
          </div>
        </div>
      </div>
    </form>
  );
}
