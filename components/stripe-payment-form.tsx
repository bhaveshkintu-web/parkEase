"use client";

import { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertCircle, ShieldCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StripePaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  clientSecret: string;
  amount: number;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (value: boolean) => void;
}

export function StripePaymentForm({
  onPaymentSuccess,
  onPaymentError,
  clientSecret,
  amount,
  isSubmitting,
  setIsSubmitting,
  agreedToTerms,
  setAgreedToTerms,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<string>("unknown");
  
  // Track completeness of each field
  const [validation, setValidation] = useState({
    number: false,
    expiry: false,
    cvc: false,
  });

  const isFormComplete = validation.number && validation.expiry && validation.cvc;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !isFormComplete || !agreedToTerms) return;

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardNumberElement,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || "Payment failed. Please try again.");
        onPaymentError(stripeError.message || "Payment failed");
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onPaymentSuccess(paymentIntent.id);
      } else {
        setError("Payment was not completed. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      onPaymentError(err.message || "Payment failed");
      setIsSubmitting(false);
    }
  };

  const elementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "hsl(var(--foreground))",
        fontFamily: 'Geist, system-ui, -apple-system, sans-serif',
        fontWeight: "400",
        "::placeholder": {
          color: "hsl(var(--muted-foreground))",
        },
      },
      invalid: {
        color: "hsl(var(--destructive))",
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
            Payment Method
          </h3>
          <div className="flex gap-1.5">
            <div className="h-5 w-8 rounded bg-blue-600 flex items-center justify-center text-[8px] font-black text-white shadow-sm">VISA</div>
            <div className="h-5 w-8 rounded bg-orange-500 flex items-center justify-center text-[8px] font-black text-white shadow-sm">MC</div>
            <div className="h-5 w-8 rounded bg-[#2E3B4E] flex items-center justify-center text-[8px] font-black text-[#D4AF37] shadow-sm">AMEX</div>
          </div>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/5 p-2 px-3 border border-primary/10">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary">Credit / Debit Card</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Card Number Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="card-number" className="text-xs font-bold text-muted-foreground uppercase">
              Card Number
            </Label>
            {validation.number && <Check className="h-3 w-3 text-emerald-500" />}
          </div>
          <div className={cn(
            "relative flex items-center rounded-xl border-2 border-border bg-background px-4 py-3.5 transition-all duration-200",
            "focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]",
            error && "border-destructive/50 focus-within:border-destructive/50 focus-within:shadow-[0_0_0_4px_rgba(239,68,68,0.1)]"
          )}>
            <div className="flex-1">
              <CardNumberElement 
                id="card-number"
                options={{
                  ...elementOptions,
                  placeholder: "4242 4242 4242 4242",
                }} 
                onChange={(e) => {
                  setValidation(prev => ({ ...prev, number: e.complete }));
                  if (e.brand) setBrand(e.brand);
                  if (e.error) setError(e.error.message);
                  else setError(null);
                }}
              />
            </div>
            <div className="ml-2 flex items-center">
              {brand !== "unknown" ? (
                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 italic">
                  {brand}
                </span>
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground/30" />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Expiry */}
          <div className="space-y-2">
            <Label htmlFor="card-expiry" className="text-xs font-bold text-muted-foreground uppercase">
              Expires
            </Label>
            <div className={cn(
              "rounded-xl border-2 border-border bg-background px-4 py-3.5 transition-all duration-200",
              "focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
            )}>
              <CardExpiryElement 
                id="card-expiry"
                options={{
                  ...elementOptions,
                  placeholder: "12 / 28",
                }}
                onChange={(e) => setValidation(prev => ({ ...prev, expiry: e.complete }))}
              />
            </div>
          </div>

          {/* CVC */}
          <div className="space-y-2">
            <Label htmlFor="card-cvc" className="text-xs font-bold text-muted-foreground uppercase">
              CVV / CVC / CSC
            </Label>
            <div className={cn(
              "rounded-xl border-2 border-border bg-background px-4 py-3.5 transition-all duration-200",
              "focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
            )}>
              <CardCvcElement 
                id="card-cvc"
                options={{
                  ...elementOptions,
                  placeholder: "123",
                }}
                onChange={(e) => setValidation(prev => ({ ...prev, cvc: e.complete }))}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/5 p-4 text-sm text-destructive border border-destructive/10 animate-in zoom-in-95 duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Security & Button Section */}
      <div className="space-y-4 pt-2">
        {/* Terms Checkbox - Shared placement */}
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-slate-50/50">
          <div className="mt-0.5">
            <input
              type="checkbox"
              id="stripe-terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
          <Label htmlFor="stripe-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer font-medium italic">
            I agree to the Terms of Service & Cancellation Policy. I understand that my reservation is subject to availability.
          </Label>
        </div>

        <Button
          type="submit"
          className={cn(
            "w-full h-14 font-black text-lg shadow-xl shadow-primary/20 transition-all duration-300",
            "hover:scale-[1.01] active:scale-[0.98] rounded-xl group",
            (!isFormComplete || !agreedToTerms) && "opacity-60 grayscale-[0.5]"
          )}
          variant={(!isFormComplete || !agreedToTerms) ? "secondary" : "default"}
          disabled={!stripe || !isFormComplete || isSubmitting || !agreedToTerms}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="uppercase tracking-widest">Processing...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full relative">
              <span className="uppercase tracking-widest font-black">
                Pay {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)} & Book Now
              </span>
              <Lock className="absolute right-0 h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </Button>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-2">
          <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">PCI Compliant</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
            <Lock className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Certified Secure</span>
          </div>
        </div>
      </div>
      
      {/* Test Mode Tip */}
      {!isFormComplete && (
        <p className="text-[10px] text-center text-muted-foreground/60 italic">
          Tip: Use <code className="bg-muted px-1 rounded">4242 4242...</code> for testing in Demo/Test mode.
        </p>
      )}
    </form>
  );
}
