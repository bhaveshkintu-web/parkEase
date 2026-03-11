"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
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
  previewPortalId?: string;
}

type PaymentTab = "card" | "wallet";

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

const CardPreview = ({
  name,
  number,
  month,
  year,
  brand,
  cvv,
  focused
}: {
  name: string;
  number: string;
  month: string;
  year: string;
  brand: string;
  cvv: string;
  focused: string | null;
}) => {
  const isBack = focused === "cvv";

  return (
    <div className="[perspective:1000px] w-full max-w-[340px] h-48 select-none group/card">
      <div className={cn(
        "relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] shadow-2xl rounded-2xl",
        isBack ? "[transform:rotateY(180deg)]" : ""
      )}>
        {/* Front of Card */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-2xl p-6 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full -ml-20 -mb-20 blur-2xl" />

          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-10 bg-gradient-to-br from-amber-200 to-amber-400 rounded-lg shadow-inner opacity-80" />
            <div className="h-8 flex items-center bg-white/10 px-3 rounded-lg backdrop-blur-md border border-white/10">
              <BrandIcon brand={brand} />
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="text-xl font-mono tracking-[0.2em] drop-shadow-lg text-center py-2 bg-white/5 rounded-lg border border-white/5">
              {number || "•••• •••• •••• ••••"}
            </div>

            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-widest text-white/40 font-black">Card Holder</p>
                <p className="text-sm font-bold tracking-wider uppercase truncate max-w-[180px]">
                  {name || "Your Name"}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[8px] uppercase tracking-widest text-white/40 font-black">Expires</p>
                <p className="text-sm font-bold font-mono">
                  {month || "MM"}/{year ? year.slice(-2) : "YY"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back of Card */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white [transform:rotateY(180deg)] overflow-hidden shadow-xl border border-white/5">
          <div className="w-full h-10 bg-black/80 mt-6" />
          <div className="p-6">
            <div className="bg-slate-100/10 h-10 rounded flex items-center justify-end px-4 border border-white/20 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-20">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="w-2 h-0.5 bg-white" />)}
              </div>
              <span className="text-slate-900 bg-white px-2 py-0.5 rounded font-mono font-bold text-sm italic shadow-inner">
                {cvv || "•••"}
              </span>
            </div>
            <p className="text-[7px] text-white/40 mt-4 leading-tight">
              This card simulation is for demonstration purposes only. Do not enter real financial data unless using the production Stripe environment. PCI compliant testing active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export function MockCardForm({
  onSuccess,
  amount,
  isSubmitting,
  setIsSubmitting,
  agreedToTerms = true,
  setAgreedToTerms,
  showWallet = true,
  previewPortalId
}: MockCardFormProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");

  // Card Fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

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

      if (!expiryMonth || !expiryYear) newErrors.expiry = "Required";
      else if (!validateExpiry(expiryMonth, expiryYear)) newErrors.expiry = "Expired";

      if (!cvv) newErrors.cvv = "Required";
      if (!cardName.trim()) newErrors.cardName = "Required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ cardName: true, cardNumber: true, expiry: true, cvv: true });

    if (!validate() && activeTab !== "wallet") return;

    setIsSubmitting(true);
    setTimeout(() => {
      const mockId = "pi_mock_" + Math.random().toString(36).substring(7);
      if (activeTab === "card") {
        onSuccess(mockId, {
          brand: cardBrand || "visa",
          last4: cardNumber.replace(/\s/g, "").slice(-4) || "4242",
          expiryMonth: parseInt(expiryMonth) || 12,
          expiryYear: parseInt(expiryYear) || 2028,
          cardholderName: cardName || "Demo User",
        });
      } else {
        onSuccess(mockId);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
        <p className="font-bold flex items-center gap-2 text-amber-900 text-xs uppercase tracking-wider">
          <AlertCircle className="h-4 w-4" />
          Stripe Demo Mode (USA)
        </p>
        <p className="mt-1 opacity-80 text-xs text-amber-700">
          Simulation active for US market. Instant payment methods only.
        </p>
      </div>

      {/* Tabs */}
      {showWallet && (
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
          {(["card", "wallet"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all",
                activeTab === tab
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/5"
              )}
            >
              {tab === "card" && <CreditCard className="w-3.5 h-3.5" />}
              {tab === "wallet" && <Wallet className="w-3.5 h-3.5" />}
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>
      )}

        <form onSubmit={handleSubmit} className="flex-1 w-full space-y-6">
          <div className={cn(
            "flex flex-col gap-8 items-center",
            (activeTab === "card" && !previewPortalId) ? "md:flex-row" : "items-start"
          )}>
            {activeTab === "card" && !previewPortalId && (
              <div className="w-full md:w-[340px] shrink-0 md:sticky md:top-8 animate-in fade-in slide-in-from-left-4 duration-500">
                <CardPreview
                  name={cardName}
                  number={cardNumber}
                  month={expiryMonth}
                  year={expiryYear}
                  brand={cardBrand}
                  cvv={cvv}
                  focused={focused}
                />
              </div>
            )}

            {activeTab === "card" && previewPortalId && typeof document !== "undefined" && document.getElementById(previewPortalId) && (
              createPortal(
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <CardPreview
                    name={cardName}
                    number={cardNumber}
                    month={expiryMonth}
                    year={expiryYear}
                    brand={cardBrand}
                    cvv={cvv}
                    focused={focused}
                  />
                </div>,
                document.getElementById(previewPortalId)!
              )
            )}

            <div className="flex-1 w-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          {activeTab === "card" && (
            <div className="grid gap-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  <span>Cardholder Name</span>
                  {errors.cardName && touched.cardName && <span className="text-[10px] text-destructive lowercase italic normal-case tracking-normal">{errors.cardName}</span>}
                </Label>
                <Input
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  className={cn("h-14 rounded-xl border-2 transition-all focus:ring-0 focus:border-primary", (errors.cardName && touched.cardName) ? "border-destructive bg-destructive/5" : "border-border/50")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  <span>Card Number</span>
                  {errors.cardNumber && touched.cardNumber && <span className="text-[10px] text-destructive lowercase italic normal-case tracking-normal">{errors.cardNumber}</span>}
                </Label>
                <div className="relative group">
                  <Input
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    onFocus={() => setFocused("number")}
                    onBlur={() => setFocused(null)}
                    maxLength={19}
                    className={cn("h-14 rounded-xl border-2 pl-14 font-mono transition-all focus:ring-0 focus:border-primary", (errors.cardNumber && touched.cardNumber) ? "border-destructive bg-destructive/5" : "border-border/50")}
                  />
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-80 group-focus-within:opacity-100 transition-opacity">
                    <BrandIcon brand={cardBrand} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expiry Date</Label>
                  <div className="flex gap-2">
                    <select
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      onFocus={() => setFocused("expiry")}
                      onBlur={() => setFocused(null)}
                      className={cn("flex h-14 w-full rounded-xl border-2 bg-background px-3 transition-all cursor-pointer focus:border-primary outline-none", (errors.expiry && touched.expiry) ? "border-destructive bg-destructive/5" : "border-border/50")}
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                      onFocus={() => setFocused("expiry")}
                      onBlur={() => setFocused(null)}
                      className={cn("flex h-14 w-full rounded-xl border-2 bg-background px-3 transition-all cursor-pointer focus:border-primary outline-none", (errors.expiry && touched.expiry) ? "border-destructive bg-destructive/5" : "border-border/50")}
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() + i)).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                    <span>CVV</span>
                    {errors.cvv && touched.cvv && <span className="text-[10px] text-destructive lowercase italic normal-case tracking-normal">{errors.cvv}</span>}
                  </Label>
                  <Input
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                    onFocus={() => setFocused("cvv")}
                    onBlur={() => setFocused(null)}
                    className={cn("h-14 rounded-xl border-2 text-center font-mono transition-all focus:ring-0 focus:border-primary", (errors.cvv && touched.cvv) ? "border-destructive bg-destructive/5" : "border-border/50")}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "wallet" && showWallet && (
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
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-8 leading-relaxed">
                Click above to simulate a native <br /> digital wallet secure checkout.
              </p>
            </div>
          )}
            </div>
          </div>

          {/* Shared Actions (Full Width) */}
      <div className="space-y-5 pt-4">
        {/* Agreement Checkbox */}
        {setAgreedToTerms && (
          <div className={cn(
            "flex items-start gap-4 p-5 rounded-2xl border-2 transition-colors",
            agreedToTerms ? "border-primary/20 bg-primary/5 shadow-inner" : "border-border/50 bg-slate-50/50"
          )}>
            <div className="pt-0.5">
              <Checkbox
                id="mock-terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="w-5 h-5 rounded-md"
              />
            </div>
            <Label htmlFor="mock-terms" className="flex-1 block text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-primary hover:underline font-bold">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/cancellation-policy" target="_blank" className="text-primary hover:underline font-bold">
                  Cancellation Policy
                </Link>
                . I understand my booking is subject to availability.
              </span>
            </Label>
          </div>
        )}

        {activeTab === "card" && (
          <Button
            type="submit"
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
                <span className="drop-shadow-sm truncate px-8">
                  {amount ? `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}` : "Confirm & Pay"}
                </span>
                <Lock className="absolute right-4 h-6 w-6 opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all scale-90 group-hover:scale-100" />
              </div>
            )}
          </Button>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-2">
          <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-100 opacity-60">
            <ShieldCheck className="h-4 w-4 text-primary group-hover:animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PCI Compliant</span>
          </div>
          <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-100 opacity-60">
            <Check className="h-4 w-4 text-primary group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">USA Secure Layer</span>
          </div>
        </div>
        </div>
      </form>
    </div>
  );
}
