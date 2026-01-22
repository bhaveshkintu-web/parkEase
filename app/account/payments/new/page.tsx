"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, CreditCard, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

function formatCardNumber(value: string) {
  const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || "";
  const parts = [];

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  return parts.length ? parts.join(" ") : value;
}

function detectCardBrand(number: string): string {
  const cleaned = number.replace(/\s/g, "");
  if (cleaned.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return "Mastercard";
  if (/^3[47]/.test(cleaned)) return "American Express";
  if (/^6(?:011|5)/.test(cleaned)) return "Discover";
  return "Card";
}

export default function AddPaymentPage() {
  const router = useRouter();
  const { addPayment } = useDataStore();
  const { toast } = useToast();

  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardBrand = detectCardBrand(cardNumber);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const cleanedNumber = cardNumber.replace(/\s/g, "");

    if (cleanedNumber.length < 13 || cleanedNumber.length > 19) {
      newErrors.cardNumber = "Please enter a valid card number";
    }
    if (!expiryMonth) newErrors.expiryMonth = "Required";
    if (!expiryYear) newErrors.expiryYear = "Required";
    if (cvv.length < 3) newErrors.cvv = "Invalid CVV";
    if (cardholderName.length < 2) newErrors.cardholderName = "Cardholder name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate card validation delay
    await new Promise((r) => setTimeout(r, 1000));

    const cleanedNumber = cardNumber.replace(/\s/g, "");

    await addPayment({
      type: "card",
      last4: cleanedNumber.slice(-4),
      brand: cardBrand,
      expiryMonth: Number(expiryMonth),
      expiryYear: Number(expiryYear),
      cardholderName,
      isDefault,
    });

    setIsSubmitting(false);

    toast({
      title: "Payment method added",
      description: "Your card has been saved securely.",
    });

    router.push("/account/payments");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/account/payments">
        <Button variant="ghost" className="mb-2">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Payment Methods
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Add Payment Method</h1>
        <p className="text-muted-foreground">Add a new card for faster checkout</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Card Information
          </CardTitle>
          <CardDescription>Your card details are encrypted and stored securely</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Card preview */}
            <div className="bg-gradient-to-br from-primary to-primary/70 rounded-xl p-6 text-primary-foreground">
              <div className="flex justify-between items-start mb-8">
                <div className="text-lg font-semibold">{cardBrand}</div>
                <CreditCard className="w-8 h-8" />
              </div>
              <div className="font-mono text-xl tracking-wider mb-4">
                {cardNumber || "0000 0000 0000 0000"}
              </div>
              <div className="flex justify-between">
                <div>
                  <div className="text-xs opacity-70">Cardholder</div>
                  <div className="font-medium">{cardholderName || "YOUR NAME"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Expires</div>
                  <div className="font-medium">
                    {expiryMonth?.padStart(2, "0") || "MM"}/{expiryYear?.slice(-2) || "YY"}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                className={errors.cardNumber ? "border-destructive" : ""}
              />
              {errors.cardNumber && <p className="text-sm text-destructive">{errors.cardNumber}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Month</Label>
                <Select value={expiryMonth} onValueChange={setExpiryMonth}>
                  <SelectTrigger className={errors.expiryMonth ? "border-destructive" : ""}>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={String(month)}>
                        {String(month).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryYear">Year</Label>
                <Select value={expiryYear} onValueChange={setExpiryYear}>
                  <SelectTrigger className={errors.expiryYear ? "border-destructive" : ""}>
                    <SelectValue placeholder="YY" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  className={errors.cvv ? "border-destructive" : ""}
                />
                {errors.cvv && <p className="text-sm text-destructive">{errors.cvv}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                className={errors.cardholderName ? "border-destructive" : ""}
              />
              {errors.cardholderName && <p className="text-sm text-destructive">{errors.cardholderName}</p>}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <label htmlFor="isDefault" className="text-sm text-muted-foreground">
                Set as my default payment method
              </label>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Lock className="w-4 h-4" />
              <span>Your card information is encrypted and stored securely using industry-standard encryption.</span>
            </div>
          </CardContent>

          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Card...
                </>
              ) : (
                "Add Card"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
