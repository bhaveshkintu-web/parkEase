"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBookingDetails, updateBookingVehicle, updateBookingDates } from "@/lib/actions/booking-actions";
import { getGeneralSettings } from "@/lib/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, Car, Save, Clock, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, calculateQuote } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { createPaymentIntentAction } from "@/lib/actions/stripe-actions";
import { CreditCard, Plus } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && !stripePublishableKey.includes("YOUR_PUBLISHABLE_KEY");
const stripePromise = isStripeConfigured ? loadStripe(stripePublishableKey) : null;

const MockBrandIcon = ({ brand }: { brand: string }) => {
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

// Helper to format date for datetime-local input (correctly localized)
function formatForInput(date: Date | string) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export default function ModifyReservationPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = React.use(params instanceof Promise ? params : Promise.resolve(params));
  const id = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [reservation, setReservation] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    make: "",
    model: "",
    color: "",
    plate: "",
    checkIn: "",
    checkOut: "",
  });

  const [quote, setQuote] = React.useState<any>(null);
  const [originalPrice, setOriginalPrice] = React.useState(0);
  const [showPayment, setShowPayment] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [isModifiable, setIsModifiable] = React.useState(true);
  const [modificationGap, setModificationGap] = React.useState(120);
  const [taxRate, setTaxRate] = React.useState(12);
  const [serviceFee, setServiceFee] = React.useState(5.99);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  // Saved Payment Methods State
  const [paymentMethods, setPaymentMethods] = React.useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = React.useState<string>("new_card");
  const [isLoadingMethods, setIsLoadingMethods] = React.useState(false);

  // Mock Payment State for Demo Mode
  const [mockCardName, setMockCardName] = React.useState("");
  const [mockCardNumber, setMockCardNumber] = React.useState("");
  const [mockExpiryMonth, setMockExpiryMonth] = React.useState("");
  const [mockExpiryYear, setMockExpiryYear] = React.useState("");
  const [mockCvv, setMockCvv] = React.useState("");
  const [mockCardBrand, setMockCardBrand] = React.useState("unknown");
  const [mockCardTouched, setMockCardTouched] = React.useState<Record<string, boolean>>({});

  // Brand detection for mock card
  React.useEffect(() => {
    const raw = mockCardNumber.replace(/\s/g, "");
    if (raw.startsWith("4")) setMockCardBrand("visa");
    else if (raw.startsWith("5")) setMockCardBrand("mastercard");
    else if (raw.startsWith("3")) setMockCardBrand("amex");
    else setMockCardBrand("unknown");
  }, [mockCardNumber]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  React.useEffect(() => {
    async function loadBooking() {
      setIsLoading(true);
      const [response, settings] = await Promise.all([
        getBookingDetails(id),
        getGeneralSettings()
      ]);

      if (settings) {
        setModificationGap(settings.modificationGapMinutes);
        setTaxRate(settings.taxRate);
        setServiceFee(settings.serviceFee);
      }

      if (response.success && response.data) {
        setReservation(response.data);
        setFormData({
          make: response.data.vehicleMake,
          model: response.data.vehicleModel,
          color: response.data.vehicleColor,
          plate: response.data.vehiclePlate,
          checkIn: formatForInput(response.data.checkIn),
          checkOut: formatForInput(response.data.checkOut),
        });
        setOriginalPrice(response.data.totalPrice);

        // Check if 2-hour deadline has already passed
        const checkInTime = new Date(response.data.checkIn).getTime();
        const now = new Date().getTime();
        const minutesUntilCheckIn = (checkInTime - now) / (1000 * 60);
        if (minutesUntilCheckIn < settings.modificationGapMinutes) {
          setIsModifiable(false);
        }
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load reservation",
          variant: "destructive",
        });
        router.push("/account/reservations");
      }
      setIsLoading(false);
    }
    loadBooking();
  }, [id, toast, router]);

  // Load saved payment methods
  React.useEffect(() => {
    async function loadPaymentMethods() {
      setIsLoadingMethods(true);
      try {
        const response = await fetch("/api/payment-methods");
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data);
          // Auto-select default card if it exists
          const defaultCard = data.find((m: any) => m.isDefault);
          if (defaultCard) {
            setSelectedMethodId(defaultCard.id);
          } else if (data.length > 0) {
            setSelectedMethodId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading payment methods:", error);
      } finally {
        setIsLoadingMethods(false);
      }
    }
    loadPaymentMethods();
  }, []);

  // Recalculate quote when dates change
  React.useEffect(() => {
    if (!reservation || !formData.checkIn || !formData.checkOut) return;

    try {
      const newCheckIn = new Date(formData.checkIn);
      const newCheckOut = new Date(formData.checkOut);

      if (isNaN(newCheckIn.getTime()) || isNaN(newCheckOut.getTime())) return;
      if (newCheckOut <= newCheckIn) return;

      const newQuote = calculateQuote(reservation.location, newCheckIn, newCheckOut, taxRate, serviceFee);
      setQuote(newQuote);

      // Reset payment state if price changes
      setClientSecret(null);
      setShowPayment(false);

    } catch (error) {
      console.error("Quote calculation error:", error);
    }
  }, [formData.checkIn, formData.checkOut, reservation]);

  const priceDifference = quote ? Math.max(0, quote.totalPrice - originalPrice) : 0;
  const needsPayment = priceDifference > 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Safety check for 2-hour deadline
    if (!isModifiable) {
      toast({
        title: "Deadline Passed",
        description: `Modifications can only be performed at least ${modificationGap} minutes before check-in.`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. If payment is needed and not yet completed, set up Stripe
      if (needsPayment && !showPayment && !clientSecret) {
        const paymentResponse = await createPaymentIntentAction({
          amount: priceDifference,
          locationId: reservation.locationId,
          locationName: reservation.location.name,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guestEmail: reservation.guestEmail,
        });

        if (paymentResponse.success && paymentResponse.clientSecret) {
          setClientSecret(paymentResponse.clientSecret);
          setShowPayment(true);
          setIsSaving(false);
          return;
        } else {
          throw new Error(paymentResponse.error || "Failed to initialize payment");
        }
      }

      // 2. Update Vehicle Info (Always update)
      const vehicleResponse = await updateBookingVehicle(id, {
        make: formData.make,
        model: formData.model,
        color: formData.color,
        plate: formData.plate,
      });

      if (!vehicleResponse.success) throw new Error(vehicleResponse.error);

      // 3. Update Dates (If they changed)
      const originalCheckIn = new Date(reservation.checkIn).getTime();
      const originalCheckOut = new Date(reservation.checkOut).getTime();
      const newCheckIn = new Date(formData.checkIn).getTime();
      const newCheckOut = new Date(formData.checkOut).getTime();

      if (newCheckIn !== originalCheckIn || newCheckOut !== originalCheckOut) {
        const dateResponse = await updateBookingDates(
          id,
          new Date(formData.checkIn),
          new Date(formData.checkOut),
          // Pass new pricing details to record them
          {
            totalPrice: quote.totalPrice,
            taxes: quote.taxes,
            fees: quote.fees,
            isExtension: needsPayment
          }
        );
        if (!dateResponse.success) throw new Error(dateResponse.error);
      }

      toast({
        title: "Reservation Updated",
        description: "Your changes have been saved successfully.",
      });
      router.push(`/account/reservations/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update reservation",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavedCardSubmit = async () => {
    if (!agreedToTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the terms and conditions.",
        variant: "destructive",
      });
      return;
    }

    setIsPaymentSubmitting(true);
    try {
      // For saved cards, we directly call updateBookingDates with the method ID
      // The server will handle charging the saved card if it's integrated with Stripe
      // For now, we simulate success or use the provided action logic

      const isMockPayment = selectedMethodId === "new_card" && !isStripeConfigured;

      const dateResponse = await updateBookingDates(
        id,
        new Date(formData.checkIn),
        new Date(formData.checkOut),
        {
          totalPrice: quote.totalPrice,
          taxes: quote.taxes,
          fees: quote.fees,
          isExtension: needsPayment,
          paymentMethodId: isMockPayment ? undefined : selectedMethodId,
          transactionId: isMockPayment ? `pi_mock_${Math.random().toString(36).substring(7)}` : undefined,
        }
      );

      if (dateResponse.success) {
        toast({
          title: "Reservation Updated",
          description: "Your changes have been saved successfully using your saved card.",
        });
        router.push(`/account/reservations/${id}`);
      } else {
        throw new Error(dateResponse.error);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment with saved card.",
        variant: "destructive",
      });
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    // Once Stripe payment is successful, proceed with saving the rest
    await handleSubmit();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading reservation details...</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Reservation not found</h2>
        <Link href="/account/reservations">
          <Button variant="outline">Back to Reservations</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link href={`/account/reservations/${id}`}>
        <Button variant="ghost" className="mb-2">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Details
        </Button>
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Modify Reservation</h1>
        <p className="text-muted-foreground">
          Update your vehicle details or reservation period for your booking at {reservation?.location?.name}
        </p>
        {!isModifiable && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm mt-4">
            <AlertCircle className="w-4 h-4" />
            <p>Modifications can only be performed at least {modificationGap} minutes before check-in.</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Vehicle Information
            </CardTitle>
            <CardDescription>
              Ensure your vehicle details are correct for entry into the parking facility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Vehicle Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g. Toyota"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Vehicle Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. Camry"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Vehicle Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g. Silver"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">License Plate</Label>
                <Input
                  id="plate"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  placeholder="ABC-1234"
                  required
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Reservation Dates
            </CardTitle>
            <CardDescription>
              Modify your check-in and check-out times. Note: Price changes may apply in a production environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check-in</Label>
                <Input
                  id="checkIn"
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check-out</Label>
                <Input
                  id="checkOut"
                  type="datetime-local"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800">
                <strong>Current Dates:</strong> {formatDate(new Date(reservation.checkIn))} to {formatDate(new Date(reservation.checkOut))}
              </p>
            </div>
          </CardContent>
        </Card>

        {quote && (
          <Card className={cn(
            "border-b-4",
            needsPayment ? "border-amber-500 bg-amber-50/30" : "border-green-500 bg-green-50/30"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className={cn("w-4 h-4", needsPayment ? "text-amber-600" : "text-green-600")} />
                Price Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original Price:</span>
                <span>{formatCurrency(originalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Total:</span>
                <span className="font-semibold">{formatCurrency(quote.totalPrice)}</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="font-bold">
                  {needsPayment ? "Amount Due Now:" : "Price Difference:"}
                </span>
                <span className={cn(
                  "text-lg font-bold",
                  needsPayment ? "text-amber-600" : "text-green-600"
                )}>
                  {needsPayment ? formatCurrency(priceDifference) : "No Charge"}
                </span>
              </div>
              {needsPayment && (
                <p className="text-[10px] text-amber-700 mt-2 italic" id="extension-disclaimer">
                  * Extensions require payment for the additional duration before changes are saved.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {showPayment && clientSecret && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Payment Required</CardTitle>
              <CardDescription>
                Please complete the payment of {formatCurrency(priceDifference)} to confirm your changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* YOUR SAVED CARDS Section */}
              {paymentMethods.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Your Saved Cards
                  </h3>

                  <RadioGroup
                    value={selectedMethodId}
                    onValueChange={setSelectedMethodId}
                    className="grid gap-3"
                  >
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer",
                          selectedMethodId === method.id
                            ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                            : "border-border bg-background hover:border-muted-foreground/30"
                        )}
                        onClick={() => setSelectedMethodId(method.id)}
                      >
                        <div className="flex items-center gap-4">
                          <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                          <div className="h-10 w-14 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-500 border border-slate-200 shadow-inner">
                            {method.brand}
                          </div>
                          <div>
                            <p className="font-bold text-sm">•••• •••• •••• {method.last4}</p>
                            <p className="text-xs text-muted-foreground">Expires {method.expiryMonth}/{method.expiryYear}</p>
                          </div>
                        </div>
                        {method.isDefault && (
                          <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    ))}

                    <div
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer",
                        selectedMethodId === "new_card"
                          ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                          : "border-border bg-background hover:border-muted-foreground/30"
                      )}
                      onClick={() => setSelectedMethodId("new_card")}
                    >
                      <div className="flex items-center gap-4">
                        <RadioGroupItem value="new_card" id="new_card" className="sr-only" />
                        <div className="h-10 w-14 rounded-lg bg-slate-50 flex items-center justify-center text-primary border border-slate-200">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Use a new card</p>
                          <p className="text-xs text-muted-foreground">Enter card details below</p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Demo Mode UI or Stripe Elements */}
              {(selectedMethodId === "new_card" || paymentMethods.length === 0) ? (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                  {paymentMethods.length > 0 && <div className="border-t pt-4" />}

                  {!isStripeConfigured ? (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200 mb-2">
                        <p className="font-bold flex items-center gap-2 text-amber-900">
                          <AlertCircle className="h-4 w-4" />
                          Stripe Demo Mode
                        </p>
                        <p className="mt-1 opacity-80 text-xs text-amber-700">
                          Simulation active. Please enter any valid-format card details to continue.
                        </p>
                      </div>

                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="mockCardName" className="text-xs font-bold uppercase text-muted-foreground">Cardholder Name</Label>
                          <Input
                            id="mockCardName"
                            placeholder="John Doe"
                            value={mockCardName}
                            onChange={(e) => setMockCardName(e.target.value)}
                            onBlur={() => setMockCardTouched({ ...mockCardTouched, cardName: true })}
                            className={cn("h-12 rounded-xl border-2")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="mockCardNumber" className="text-xs font-bold uppercase text-muted-foreground">Card Number</Label>
                          <div className="relative">
                            <Input
                              id="mockCardNumber"
                              placeholder="0000 0000 0000 0000"
                              value={mockCardNumber}
                              onChange={(e) => setMockCardNumber(formatCardNumber(e.target.value))}
                              onBlur={() => setMockCardTouched({ ...mockCardTouched, cardNumber: true })}
                              maxLength={mockCardBrand === 'amex' ? 17 : 19}
                              className={cn("h-12 rounded-xl border-2 pl-20 font-mono")}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                              <MockBrandIcon brand={mockCardBrand} />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Expiry Date</Label>
                            <div className="flex gap-2">
                              <select
                                value={mockExpiryMonth}
                                onChange={(e) => setMockExpiryMonth(e.target.value)}
                                className={cn("flex h-12 w-full rounded-xl border-2 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary")}
                              >
                                <option value="">Month</option>
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                              <select
                                value={mockExpiryYear}
                                onChange={(e) => setMockExpiryYear(e.target.value)}
                                className={cn("flex h-12 w-full rounded-xl border-2 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary")}
                              >
                                <option value="">Year</option>
                                {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i)).map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="mockCvv" className="text-xs font-bold uppercase text-muted-foreground">CVV</Label>
                            <Input
                              id="mockCvv"
                              placeholder="123"
                              value={mockCvv}
                              onChange={(e) => setMockCvv(e.target.value.replace(/\D/g, "").substring(0, mockCardBrand === 'amex' ? 4 : 3))}
                              className={cn("h-12 rounded-xl border-2")}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-slate-50/50 mt-4">
                        <Checkbox
                          id="terms-demo"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        />
                        <Label htmlFor="terms-demo" className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
                          I agree to the{" "}
                          <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/cancellation-policy" target="_blank" className="text-primary hover:underline font-medium">
                            Policy
                          </Link>
                          . I understand that my reservation is subject to availability.
                        </Label>
                      </div>

                      <Button
                        type="button"
                        onClick={handleSavedCardSubmit}
                        className={cn(
                          "w-full h-14 font-black text-lg transition-all duration-300",
                          "hover:scale-[1.01] active:scale-[0.98] rounded-xl group mt-4"
                        )}
                        disabled={isPaymentSubmitting || !agreedToTerms || !mockCardName || mockCardNumber.length < 15 || !mockExpiryMonth || !mockExpiryYear || mockCvv.length < 3}
                      >
                        {isPaymentSubmitting ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="uppercase tracking-widest">Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-full relative">
                            <span className="uppercase tracking-widest font-black">
                              Pay {formatCurrency(priceDifference)} & Save Changes
                            </span>
                            <Lock className="absolute right-0 h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <StripePaymentForm
                        clientSecret={clientSecret}
                        amount={priceDifference}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={(err) => {
                          toast({
                            title: "Payment Error",
                            description: err,
                            variant: "destructive",
                          });
                        }}
                        isSubmitting={isPaymentSubmitting}
                        setIsSubmitting={setIsPaymentSubmitting}
                        agreedToTerms={agreedToTerms}
                        setAgreedToTerms={setAgreedToTerms}
                      />
                    </Elements>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-slate-50/50">
                    <Checkbox
                      id="terms-saved"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms-saved" className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/cancellation-policy" target="_blank" className="text-primary hover:underline font-medium">
                        Policy
                      </Link>
                      . I understand that my reservation is subject to availability.
                    </Label>
                  </div>

                  <Button
                    type="button"
                    onClick={handleSavedCardSubmit}
                    className={cn(
                      "w-full h-14 font-black text-lg transition-all duration-300",
                      "hover:scale-[1.01] active:scale-[0.98] rounded-xl group"
                    )}
                    disabled={isPaymentSubmitting || !agreedToTerms}
                  >
                    {isPaymentSubmitting ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="uppercase tracking-widest">Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full relative">
                        <span className="uppercase tracking-widest font-black">
                          Pay {formatCurrency(priceDifference)} & Save Changes
                        </span>
                        <Lock className="absolute right-0 h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Link href={`/account/reservations/${id}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          {!showPayment && (
            <Button type="button" onClick={() => handleSubmit()} disabled={isSaving || !isModifiable}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {needsPayment ? "Pay & Save Changes" : "Save Changes"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
