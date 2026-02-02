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
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

import { validateLuhn, formatCardNumber, detectCardBrand, validateExpiry } from "@/lib/card-utils";


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

export default function AddPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardTouched, setCardTouched] = useState<Record<string, boolean>>({});
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardBrand = detectCardBrand(cardNumber);

  useEffect(() => {
    async function fetchSavedCards() {
      try {
        const res = await fetch("/api/payment-methods");
        if (res.ok) {
          const data = await res.json();
          setSavedCards(data);
        }
      } catch (e) {
        console.error("Failed to fetch saved cards", e);
      }
    }
    fetchSavedCards();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const cleanedNumber = cardNumber.replace(/\D/g, "");

    // Card Number Validation
    if (!cleanedNumber) newErrors.cardNumber = "Card number is required";
    else if (cleanedNumber.length < 13 || cleanedNumber.length > 19) newErrors.cardNumber = "Invalid length";
    else if (!validateLuhn(cleanedNumber)) newErrors.cardNumber = "Invalid card number (Luhn check failed)";
    
    // Duplicate check
    const last4 = cleanedNumber.slice(-4);
    const isDuplicate = savedCards.some(card => 
      card.last4 === last4 && 
      card.brand.toLowerCase() === cardBrand.toLowerCase() &&
      card.expiryMonth === Number(expiryMonth) &&
      card.expiryYear === Number(expiryYear)
    );

    if (isDuplicate) {
      newErrors.cardNumber = "This card is already saved in your account";
    }

    // Expiry Validation
    if (!expiryMonth) newErrors.expiry = "Month is required";
    if (!expiryYear) newErrors.expiry = "Year is required";
    if (expiryMonth && expiryYear && !validateExpiry(expiryMonth, expiryYear)) {
      newErrors.expiry = "Card has expired";
    }

    // CVV Validation
    const expectedCvvLength = cardBrand === "amex" ? 4 : 3;
    if (!cvv) {
      newErrors.cvv = "CVV is required";
    } else if (cvv.length !== expectedCvvLength) {
      newErrors.cvv = `CVV must be ${expectedCvvLength} digits`;
    }

    // Name Validation
    if (!cardholderName.trim()) {
      newErrors.cardholderName = "Cardholder name is required";
    } else if (cardholderName.trim().length < 2) {
      newErrors.cardholderName = "Name is too short";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const cleanedNumber = cardNumber.replace(/\s/g, "");
      
      const payload = {
        cardToken: "tok_mock_" + Math.random().toString(36).substring(7), // Tokenized representation
        brand: cardBrand,
        last4: cleanedNumber.slice(-4),
        expiryMonth: Number(expiryMonth),
        expiryYear: Number(expiryYear),
        cardholderName,
        setAsDefault: isDefault,
      };

      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to add card");

      toast({
        title: "Success",
        description: "Your card was saved securely.",
      });

      router.push("/account/payments");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
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
        {/* Left: Card Preview */}
        <div className="flex-1 space-y-6">
          <div className="sticky top-8">
            <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">New Payment Method</h1>
            <p className="text-muted-foreground mb-12">Securely add your card for upcoming bookings.</p>
            
            {/* Interactive Card Preview */}
            <div className={cn(
              "aspect-[1.58/1] w-full max-w-sm rounded-[24px] p-8 text-white relative overflow-hidden shadow-2xl transition-all duration-500 transform hover:scale-[1.02]",
              cardBrand === 'visa' ? "bg-gradient-to-br from-[#1A1F71] to-[#2E3B4E]" :
              cardBrand === 'mastercard' ? "bg-gradient-to-br from-[#EB001B] to-[#FF5F00]" :
              cardBrand === 'amex' ? "bg-gradient-to-br from-[#0070D1] to-[#00AEEF]" :
              cardBrand === 'discover' ? "bg-gradient-to-br from-[#FF6600] to-[#FFAB00]" :
              "bg-gradient-to-br from-slate-800 to-slate-900"
            )}>
              {/* Card Chip */}
              <div className="w-12 h-10 rounded-lg bg-gradient-to-br from-yellow-200 to-yellow-500/50 mb-10 opacity-80" />
              
              <div className="space-y-8">
                <div className="font-mono text-2xl tracking-[0.25em] h-8 flex items-center">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Card Holder</p>
                    <p className="font-bold text-sm tracking-widest truncate max-w-[180px]">
                      {cardholderName || "YOUR NAME"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Expires</p>
                    <p className="font-bold text-sm">
                      {expiryMonth ? String(expiryMonth).padStart(2, '0') : "MM"}/{expiryYear ? expiryYear.toString().slice(-2) : "YY"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Brand Logo */}
              <div className="absolute top-8 right-8 text-2xl font-black italic uppercase opacity-90 drop-shadow-md">
                {cardBrand === 'card' ? <CreditCard className="w-10 h-10" /> : cardBrand}
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
            </div>

            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-3 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-bold">Encrypted & Secure Storage</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                We use industry-standard bank-level security. Your full card number is never stored on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex-1">
          <Card className="border-0 shadow-none bg-transparent">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cardholderName" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  placeholder="Card Holder Name"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  onBlur={() => setTouched({ ...touched, cardholderName: true })}
                  className={cn("h-14 rounded-xl border-2 focus-visible:ring-0 focus-visible:border-primary transition-all font-bold", errors.cardholderName && touched.cardholderName && "border-destructive")}
                />
                {errors.cardholderName && touched.cardholderName && <p className="text-xs font-bold text-destructive">{errors.cardholderName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Card Number</Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    onBlur={() => setTouched({ ...touched, cardNumber: true })}
                    maxLength={cardBrand === 'amex' ? 17 : 19}
                    className={cn("h-14 rounded-xl border-2 pl-20 focus-visible:ring-0 focus-visible:border-primary transition-all font-mono text-lg", (errors.cardNumber && touched.cardNumber) && "border-destructive")}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <BrandIcon brand={cardBrand} />
                  </div>
                </div>
                {errors.cardNumber && touched.cardNumber && <p className="text-xs font-bold text-destructive">{errors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Month</Label>
                  <Select value={expiryMonth} onValueChange={(v) => {
                    setExpiryMonth(v);
                    setTouched({ ...touched, expiryMonth: true });
                  }}>
                    <SelectTrigger className={cn("h-14 rounded-xl border-2 font-bold", errors.expiry && touched.expiryMonth && "border-destructive")}>
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {months.map((month) => (
                        <SelectItem key={month} value={String(month)} className="font-bold">
                          {String(month).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Year</Label>
                  <Select value={expiryYear} onValueChange={(v) => {
                    setExpiryYear(v);
                    setTouched({ ...touched, expiryYear: true });
                  }}>
                    <SelectTrigger className={cn("h-14 rounded-xl border-2 font-bold", errors.expiry && touched.expiryYear && "border-destructive")}>
                      <SelectValue placeholder="YY" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {years.map((year) => (
                        <SelectItem key={year} value={String(year)} className="font-bold">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvv" className="text-xs font-black uppercase tracking-widest text-muted-foreground">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder={cardBrand === "amex" ? "1234" : "123"}
                    type="text"
                    inputMode="numeric"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, cardBrand === "amex" ? 4 : 3))}
                    maxLength={cardBrand === "amex" ? 4 : 3}
                    className={cn("h-14 rounded-xl border-2 font-bold", errors.cvv && touched.cvv && "border-destructive")}
                    onBlur={() => setTouched({ ...touched, cvv: true })}
                  />
                  {errors.cvv && touched.cvv && <p className="text-xs font-bold text-destructive">{errors.cvv}</p>}
                </div>
              </div>

              {(errors.expiry) && (touched.expiryMonth || touched.expiryYear) && (
                <p className="text-xs font-bold text-destructive mt-[-10px]">{errors.expiry}</p>
              )}

              <div className="flex items-center space-x-3 bg-muted/20 p-4 rounded-xl border border-border/50">
                <Checkbox
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked === true)}
                  className="rounded-md h-5 w-5 border-2"
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="isDefault" className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Set as default
                  </label>
                  <p className="text-xs text-muted-foreground">Used automatically for future bookings.</p>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Saving Card...
                    </>
                  ) : (
                    "Save Payment Method"
                  )}
                </Button>
                <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground/60">
                   <Lock className="w-3 h-3" />
                   <span className="text-[10px] font-bold uppercase tracking-tighter">Secure 256-bit SSL encrypted connection</span>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
