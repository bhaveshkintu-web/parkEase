"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, CreditCard, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateLuhn, formatCardNumber, detectCardBrand, validateExpiry } from "@/lib/card-utils";
import { StripeElementsWrapper } from "@/components/stripe-elements-wrapper";
import { StripeSetupForm } from "@/components/stripe-setup-form";


const BrandIcon = ({ brand }: { brand: string }) => {
  const content = () => {
    switch (brand) {
      case "visa":
        return <div className="text-[#1A1F71] font-black italic text-base select-none">VISA</div>;
      case "mastercard":
        return (
          <div className="flex -space-x-1.5 select-none">
            <div className="w-4 h-4 rounded-full bg-[#EB001B] opacity-90" />
            <div className="w-4 h-4 rounded-full bg-[#FF5F00] opacity-90" />
          </div>
        );
      case "amex":
        return (
          <div className="bg-[#0070D1] text-white px-1 rounded-sm text-[9px] font-black tracking-tighter select-none leading-tight">
            AMEX
          </div>
        );
      case "discover":
        return <div className="text-[#FF6600] font-black italic text-[10px] select-none">DISCOVER</div>;
      default:
        return <CreditCard className="w-5 h-5 text-muted-foreground/40" />;
    }
  };

  return (
    <div className="w-12 flex items-center justify-center">
      {content()}
    </div>
  );
};

import { isStripeConfigured } from "@/lib/stripe";
import { MockCardForm } from "@/components/mock-card-form";

export default function AddPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSecret, setIsFetchingSecret] = useState(true);
  const isStripeActive = isStripeConfigured();

  useEffect(() => {
    async function initSetup() {
      // Small delay for UX
      await new Promise(r => setTimeout(r, 800));

      const { createSetupIntentAction } = await import("@/lib/actions/stripe-actions");
      const res = await createSetupIntentAction();
      if (res.success && res.clientSecret) {
        setClientSecret(res.clientSecret);
      } else {
        // Only show error if we are supposed to be active
        if (isStripeActive) {
          toast({
            title: "Stripe Error",
            description: res.error || "Failed to initialize secure payment setup.",
            variant: "destructive",
          });
        }
      }
      setIsFetchingSecret(false);
    }
    initSetup();
  }, [toast, isStripeActive]);

  const handleMockSuccess = async (mockId: string, details?: any) => {
    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId: mockId,
          brand: details?.brand || "visa",
          last4: details?.last4 || "4242",
          expiryMonth: details?.expiryMonth || 12,
          expiryYear: details?.expiryYear || 2028,
          cardholderName: details?.cardholderName || "Demo User",
          setAsDefault: true,
          isStripeSetup: false,
        }),
      });

      if (res.ok) {
        toast({
          title: "Demo Card Saved",
          description: "Simulation: Your payment method has been saved to your account.",
        });
        router.push("/account/payments");
      } else {
        throw new Error("Failed to save demo card");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/account/payments" className="group">
          <Button variant="ghost" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Payments
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Left: Info */}
        <div className="flex-1 space-y-6">
          <div className="sticky top-8">
            <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">New Payment Method</h1>
            <p className="text-muted-foreground mb-12">Securely add your card for upcoming bookings.</p>

            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-3 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-bold">Encrypted & Secure Storage</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                We use industry-standard bank-level security. Your full card number is never stored on our servers.
              </p>
            </div>

            {/* Portal target for MockCardForm Preview */}
            <div id="card-preview-portal" className="mt-12 group" />
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex-1">
          <Card className="border-0 shadow-none bg-transparent">
            {isFetchingSecret ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Initializing Secure Connection...</p>
              </div>
            ) : isStripeActive && clientSecret ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <StripeElementsWrapper clientSecret={clientSecret}>
                  <StripeSetupForm
                    onSuccess={() => router.push("/account/payments")}
                    isSubmitting={isSubmitting}
                    setIsSubmitting={setIsSubmitting}
                  />
                </StripeElementsWrapper>
              </div>
            ) : !isStripeActive ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <MockCardForm
                  onSuccess={handleMockSuccess}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                  showWallet={false}
                  previewPortalId="card-preview-portal"
                />
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed rounded-2xl text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="font-bold">Setup Failed</h3>
                <p className="text-sm text-muted-foreground">We couldn't initialize the payment provider. Please check your connection and try again.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
