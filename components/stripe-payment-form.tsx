import { useState, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertCircle, ShieldCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

interface StripePaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  /** Legacy mode: clientSecret already exists (extend, overstay, modify). */
  clientSecret?: string;
  /** Deferred mode: called on submit to create the PaymentIntent. Returns clientSecret. */
  onCreateIntent?: () => Promise<string>;
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
  onCreateIntent,
  amount,
  isSubmitting,
  setIsSubmitting,
  agreedToTerms,
  setAgreedToTerms,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Safety timeout: if onReady hasn't fired after 6s, assume it's ready.
  // This can happen when Stripe's iframe loads but the event is delayed
  // (e.g., on slower connections or certain regional configurations).
  useEffect(() => {
    if (isReady) return;
    const timeout = setTimeout(() => {
      console.warn("[StripePaymentForm] onReady not fired after 6s — forcing ready state.");
      setIsReady(true);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [isReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !agreedToTerms) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // ── DEFERRED MODE (checkout new-card flow) ────────────────────────────
      // No clientSecret exists yet. We validate the card details locally first,
      // then create the PaymentIntent on the server, then confirm — all in one
      // step. This means NO Stripe entry is created until the customer clicks Pay.
      if (onCreateIntent) {
        // 1. Validate card fields locally (no network call to Stripe yet)
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setError(submitError.message || "Card validation failed.");
          onPaymentError(submitError.message || "Card validation failed");
          setIsSubmitting(false);
          return;
        }

        // 2. Create PaymentIntent on our server (THIS is when Stripe entry appears)
        let secret: string;
        try {
          secret = await onCreateIntent();
        } catch (err: any) {
          setError(err.message || "Failed to initialize payment. Please try again.");
          onPaymentError(err.message || "Failed to initialize payment");
          setIsSubmitting(false);
          return;
        }

        // 3. Confirm payment with the newly created secret
        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret: secret,
          confirmParams: { 
            return_url: `${window.location.origin}/checkout/success`,
            payment_method_data: {
              billing_details: {
                address: {
                  country: 'US'
                }
              }
            }
          },
          redirect: "if_required",
        });


        if (confirmError) {
          setError(confirmError.message || "Payment failed. Please try again.");
          onPaymentError(confirmError.message || "Payment failed");
          setIsSubmitting(false);
          return;
        }

        if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
          onPaymentSuccess(paymentIntent.id);
        } else {
          setError("Payment was not completed. Please try again.");
          setIsSubmitting(false);
        }
        return;
      }

      // ── LEGACY MODE (extend, overstay, modify — clientSecret already exists) ─
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          payment_method_data: {
            billing_details: {
              address: {
                country: 'US'
              }
            }
          }
        },
        redirect: "if_required",
      });


      if (stripeError) {
        setError(stripeError.message || "Payment failed. Please try again.");
        onPaymentError(stripeError.message || "Payment failed");
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onPaymentSuccess(paymentIntent.id);
      } else if (paymentIntent && paymentIntent.status === "processing") {
        // Typically for ACH or slower methods
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
            Secure Payment
          </h3>
          <div className="flex gap-1.5 opacity-60">
            <Lock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/5 p-2 px-3 border border-primary/10">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary uppercase tracking-tighter">Unified Secure Payment</span>
        </div>
      </div>

        <div className="space-y-4">
          {!stripe || !elements ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-bold">Initializing Connection...</p>
            </div>
          ) : (
            // IMPORTANT: The PaymentElement MUST always have real dimensions in the DOM.
            // Using h-0/overflow-hidden collapses the Stripe iframe to zero size,
            // which prevents Stripe's SDK from firing the `onReady` event.
            // We use a relative container with a spinner overlay instead.
            <div className="relative">
              {!isReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center py-12 space-y-4 z-10 bg-background/80">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Loading Payment Options...</p>
                </div>
              )}
              <div className={cn("transition-opacity duration-500", !isReady && "opacity-0")}>
                <PaymentElement
                  options={{
                    layout: "tabs",
                    terms: { card: "never" },
                    fields: {
                      billingDetails: {
                        address: { country: "never" },
                      },
                    },
                  }}
                  onReady={() => setIsReady(true)}
                  onChange={(e) => {
                    if (e.complete) setError(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/5 p-4 text-sm text-destructive border border-destructive/10 animate-in zoom-in-95 duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Security & Button Section */}
      <div className="space-y-4 pt-2">

        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-slate-50/50">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          />
          <Label htmlFor="terms" className="flex-1 block text-sm text-muted-foreground leading-relaxed cursor-pointer">
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/cancellation-policy" target="_blank" className="text-primary hover:underline font-medium">
                Cancellation Policy
              </Link>
              . I understand that my reservation is subject to availability.
            </span>
          </Label>
        </div>

        <Button
          type="submit"
          className={cn(
            "w-full h-14 font-black text-lg shadow-xl shadow-primary/20 transition-all duration-300",
            "hover:scale-[1.01] active:scale-[0.98] rounded-xl group",
            (!isReady || !agreedToTerms) && "opacity-60 grayscale-[0.5]"
          )}
          variant={(!isReady || !agreedToTerms) ? "secondary" : "default"}
          disabled={!stripe || !isReady || isSubmitting || !agreedToTerms}
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
    </form>
  );
}
