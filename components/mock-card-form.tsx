"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Lock, Loader2, ShieldCheck, Check, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateLuhn, formatCardNumber, detectCardBrand, validateExpiry } from "@/lib/card-utils";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export interface MockCardFormProps {
  onSuccess: (paymentIntentId: string, details?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
  }) => void;
  amount?: number;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  agreedToTerms?: boolean;
  setAgreedToTerms?: (value: boolean) => void;
  showWallet?: boolean;
}

type PaymentTab = "card" | "wallet";

const BrandIcons = () => (
  <div className="flex items-center gap-1.5 opacity-80">
    {/* Visual Card Icons Badge as seen in Image 1 */}
    <div className="w-6 h-4 bg-[#1A1F71] rounded-sm flex items-center justify-center text-[6px] text-white font-bold italic">VISA</div>
    <div className="w-6 h-4 bg-[#EB001B] rounded-sm flex items-center justify-center -space-x-1">
        <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F00] opacity-80" />
    </div>
    <div className="w-6 h-4 bg-[#0070D1] rounded-sm flex items-center justify-center text-[5px] text-white font-black">AMEX</div>
    <div className="w-6 h-4 bg-[#0070D1] rounded-sm flex items-center justify-center px-0.5">
        <div className="w-full h-full bg-white rounded-[1px] flex items-center justify-center text-[#0070D1] text-[4px] font-bold">DISC</div>
    </div>
  </div>
);

export function MockCardForm({
  onSuccess,
  amount,
  isSubmitting,
  setIsSubmitting,
  agreedToTerms = true,
  setAgreedToTerms,
  showWallet = true,
}: MockCardFormProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");

  // Card Fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // MM / YY format
  const [cvv, setCvv] = useState("");
  const [country, setCountry] = useState("India");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const cardBrand = detectCardBrand(cardNumber);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (activeTab === "card") {
      const cleanedNumber = cardNumber.replace(/\D/g, "");
      if (!cleanedNumber) newErrors.cardNumber = "Required";
      else if (cleanedNumber.length < 13 || cleanedNumber.length > 19) newErrors.cardNumber = "Invalid length";
      else if (!validateLuhn(cleanedNumber)) newErrors.cardNumber = "Invalid number";

      if (!expiry) newErrors.expiry = "Required";
      else {
        const [m, y] = expiry.split("/").map(s => s.trim());
        if (!m || !y || m.length !== 2 || y.length !== 2) newErrors.expiry = "Invalid format";
        else {
            const fullYear = parseInt("20" + y);
            if (!validateExpiry(m, fullYear.toString())) newErrors.expiry = "Expired";
        }
      }

      if (!cvv) newErrors.cvv = "Required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.substring(0, 4);
    
    if (value.length > 2) {
      value = value.substring(0, 2) + " / " + value.substring(2);
    }
    setExpiry(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ cardNumber: true, expiry: true, cvv: true });

    if (!validate() && activeTab !== "wallet") return;

    setIsSubmitting(true);
    setTimeout(() => {
      const isCard = activeTab === "card";
      const mockId = (isCard ? "pm_mock_" : "pi_mock_") + Math.random().toString(36).substring(7);
      
      const [m, y] = expiry.split("/").map(s => s.trim());

      if (isCard) {
        onSuccess(mockId, {
          brand: cardBrand || "visa",
          last4: cardNumber.replace(/\s/g, "").slice(-4) || "4242",
          expiryMonth: parseInt(m) || 12,
          expiryYear: parseInt("20" + y) || 2028,
          cardholderName: cardName || "Demo User",
        });
      } else {
        onSuccess(mockId);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Premium Header - Matching StripePaymentForm */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
            Secure Payment
          </h3>
          <div className="flex gap-1.5 opacity-60">
            <Lock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-50 p-2 px-3 border border-emerald-100">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-tighter italic">Unified Secure Payment</span>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
        <p className="font-bold flex items-center gap-2 text-amber-900 text-xs uppercase tracking-wider">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Stripe Demo Mode (USA)
        </p>
        <p className="mt-1 opacity-80 text-xs text-amber-700">
          Simulation active for amounts under $0.50 or missing keys. Real cards will not be charged.
        </p>
      </div>

      {/* Tabs - Matching Checkout Layout */}
      {showWallet && (
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
          {(["card", "wallet"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                activeTab === tab
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/5"
              )}
            >
              {tab === "card" && <CreditCard className="w-3.5 h-3.5" />}
              {tab === "wallet" && <Wallet className="w-3.5 h-3.5" />}
              <span>{tab}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {activeTab === "card" && (
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between px-1">
                <span>Card Number</span>
              </Label>
              <div className="relative group">
                <Input
                  placeholder="1234 1234 1234 1234"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className={cn(
                    "h-14 rounded-xl border-2 transition-all focus:ring-0 focus:border-primary text-base font-mono",
                    (errors.cardNumber && touched.cardNumber) ? "border-destructive bg-destructive/5" : "border-border/50 bg-card"
                  )}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-60">
                    <BrandIcons />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Expiration Date</Label>
                <Input
                  placeholder="MM / YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  className={cn(
                    "h-14 rounded-xl border-2 transition-all focus:ring-0 focus:border-primary text-base text-center font-mono",
                    (errors.expiry && touched.expiry) ? "border-destructive bg-destructive/5" : "border-border/50 bg-card"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Security Code</Label>
                <div className="relative group">
                  <Input
                    placeholder="CVC"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                    className={cn(
                      "h-14 rounded-xl border-2 transition-all focus:ring-0 focus:border-primary text-base text-center font-mono",
                      (errors.cvv && touched.cvv) ? "border-destructive bg-destructive/5" : "border-border/50 bg-card"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M18 15h2"/><path d="M14 15h.01"/></svg>
                  </div>
                </div>
              </div>
            </div>
            </div>
        )}

        {activeTab === "wallet" && (
            <div className="py-12 space-y-8 text-center animate-in zoom-in-95 duration-500 bg-slate-50/50 rounded-2xl border-2 border-dashed border-border/50">
                <div className="flex flex-col items-center gap-5 px-8">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !agreedToTerms}
                    className={cn(
                      "h-14 w-full max-w-[280px] bg-black rounded-xl flex items-center justify-center text-white font-bold hover:bg-black/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg",
                      !agreedToTerms && "grayscale opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Pay with Apple Pay"}
                  </Button>
                  <div className="flex items-center gap-4 w-full max-w-[280px]">
                    <div className="h-px bg-border/50 flex-1" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">OR</span>
                    <div className="h-px bg-border/50 flex-1" />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !agreedToTerms}
                    className={cn(
                      "h-14 w-full max-w-[280px] bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-800 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md",
                      !agreedToTerms && "grayscale opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-lg">
                        <span className="text-blue-600">G</span>Pay
                      </div>
                    )}
                  </Button>
                </div>
            </div>
        )}

        {/* Shared Bottom Section */}
        <div className="space-y-5 pt-4">
          {/* Agreement Checkbox */}
          <div className="space-y-4">
             {/* Terms checkbox */}
             <div className={cn(
                "flex items-start gap-4 p-5 rounded-2xl border-2 transition-colors",
                agreedToTerms ? "border-primary/20 bg-primary/5 shadow-inner" : "border-border/50 bg-slate-50/50"
              )}>
                <div className="pt-0.5">
                  <Checkbox
                    id="mock-terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms && setAgreedToTerms(checked as boolean)}
                    className="w-5 h-5 rounded-md"
                  />
                </div>
                <Label htmlFor="mock-terms" className="flex-1 block text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="text-primary hover:underline font-bold">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/cancellation-policy" target="_blank" className="text-primary hover:underline font-bold">
                      Cancellation Policy
                    </Link>
                    . I understand my booking is subject to availability.
                  </span>
                </Label>
              </div>
          </div>

          <Button
            type={activeTab === "card" ? "submit" : "button"}
            onClick={activeTab === "wallet" ? handleSubmit : undefined}
            disabled={isSubmitting || !agreedToTerms}
            className={cn(
              "w-full h-16 font-black text-xl shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-2xl group uppercase tracking-[0.2em]",
              agreedToTerms
                ? "bg-slate-950 text-white shadow-primary/20 hover:shadow-primary/30"
                : "opacity-40 grayscale"
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="animate-pulse">Processing Payment...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full relative">
                <span className="drop-shadow-sm truncate px-8 leading-none">
                  PAY {amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : ""} & BOOK NOW
                </span>
                <Lock className="absolute right-4 h-6 w-6 opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all scale-90 group-hover:scale-100" />
              </div>
            )}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-2">
            <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-100 opacity-60">
              <ShieldCheck className="h-4 w-4 text-primary group-hover:animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PCI Compliant</span>
            </div>
            <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-100 opacity-60">
              <Check className="h-4 w-4 text-primary group-hover:scale-125 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-100 opacity-60">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Certified Secure</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
