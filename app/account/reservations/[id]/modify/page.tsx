"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBookingDetails, updateBookingVehicle, updateBookingDates } from "@/lib/actions/booking-actions";
import { validatePromoCode } from "@/lib/actions/promotion-actions";
import { getGeneralSettings } from "@/lib/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, Car, Save, Clock, AlertCircle, Lock, X, CreditCard, Calendar, Settings2, PlusCircle, Info, ShieldCheck, CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, calculateQuote } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import { StripeElementsWrapper } from "@/components/stripe-elements-wrapper";
import { isStripeConfigured } from "@/lib/stripe";
import { MockCardForm } from "@/components/mock-card-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { createPaymentIntentAction, chargeSavedCardAction } from "@/lib/actions/stripe-actions";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";


const isStripeActive = isStripeConfigured();

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
  const { isAuthenticated } = useAuth();


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

  const [isModifiable, setIsModifiable] = React.useState(true);
  const [modificationGap, setModificationGap] = React.useState(120);
  const [minBookingDuration, setMinBookingDuration] = React.useState(120);
  const [taxRate, setTaxRate] = React.useState(12);
  const [serviceFee, setServiceFee] = React.useState(5.99);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [showMinDurationWarning, setShowMinDurationWarning] = React.useState(false);

  // Saved Payment Methods State
  const [paymentMethods, setPaymentMethods] = React.useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = React.useState<string>("new_card");
  const [isLoadingMethods, setIsLoadingMethods] = React.useState(false);

  // Promotion State
  const [promotion, setPromotion] = React.useState<any>(null);

  // Mock Card state removed in favor of MockCardForm

  // Card formatting removed in favor of card-utils

  React.useEffect(() => {
    async function loadBooking() {
      setIsLoading(true);
      const [response, settings] = await Promise.all([
        getBookingDetails(id),
        getGeneralSettings()
      ]);

      if (settings) {
        setModificationGap(settings.modificationGapMinutes);
        setMinBookingDuration(settings.minBookingDuration);
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

  // Load promotion if it exists on the reservation
  React.useEffect(() => {
    if (reservation?.promoCode && originalPrice > 0) {
      async function loadPromotion() {
        try {
          // Validate existing promo code to get its details (percentage, value etc)
          // We pass true for skipValidation because it was already applied to this booking
          const result = await validatePromoCode(reservation.promoCode, originalPrice, undefined, true);
          if (result.valid && result.promotion) {
            setPromotion(result.promotion);
          }
        } catch (error) {
          console.error("Error loading original promotion:", error);
        }
      }
      loadPromotion();
    }
  }, [reservation?.promoCode, originalPrice]);

  // Recalculate quote when dates change
  React.useEffect(() => {
    if (!reservation || !formData.checkIn || !formData.checkOut) return;

    try {
      const newCheckIn = new Date(formData.checkIn);
      const newCheckOut = new Date(formData.checkOut);

      if (isNaN(newCheckIn.getTime()) || isNaN(newCheckOut.getTime())) return;

      // ENFORCE MINIMUM DURATION
      const minDurationMs = minBookingDuration * 60 * 1000;
      const actualDurationMs = newCheckOut.getTime() - newCheckIn.getTime();

      if (actualDurationMs < minDurationMs) {
        const correctedCheckOut = new Date(newCheckIn.getTime() + minDurationMs);
        setFormData(prev => ({
          ...prev,
          checkOut: formatForInput(correctedCheckOut)
        }));
        setShowMinDurationWarning(true);
        // Hide warning after 5 seconds
        setTimeout(() => setShowMinDurationWarning(false), 5000);
        return; // The next effect cycle will handle the quote recalculation
      }

      if (newCheckOut <= newCheckIn) return;

      // Pass promotion to calculateQuote if available
      const newQuote = calculateQuote(reservation.location, newCheckIn, newCheckOut, taxRate, serviceFee, promotion);
      setQuote(newQuote);

      // Reset payment state if price changes
      setShowPayment(false);

    } catch (error) {
      console.error("Quote calculation error:", error);
    }
  }, [formData.checkIn, formData.checkOut, reservation, promotion]);

  const priceDifference = quote ? quote.totalPrice - originalPrice : 0;
  const needsPayment = priceDifference > 0.01;
  const isReduction = priceDifference < -0.01;
  const refundEligibleAmount = isReduction ? Math.abs(priceDifference) : 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Safety check for min duration
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const minDurationMs = minBookingDuration * 60 * 1000;

    if (checkOutDate.getTime() - checkInDate.getTime() < minDurationMs) {
      toast({
        title: "Invalid Duration",
        description: `Reservations must be at least ${minBookingDuration} minutes long.`,
        variant: "destructive",
      });
      return;
    }

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
      // 1. If payment is needed and not yet authorized/completed, show payment UI
      if (needsPayment && !showPayment) {
        setShowPayment(true);
        setIsSaving(false);
        return;
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
            isExtension: needsPayment,
            isReduction: isReduction,
            promoCode: reservation?.promoCode || null,
            promoDiscount: quote.discount || 0,
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

    if (!selectedMethodId || selectedMethodId === "new_card") {
      toast({
        title: "Invalid Selection",
        description: "Please select a valid saved card.",
        variant: "destructive",
      });
      return;
    }

    setIsPaymentSubmitting(true);
    try {
      // 1. Charge the saved card via server action directly
      const chargeResult = await chargeSavedCardAction({
        amount: quote.totalPrice - reservation.totalPrice, // Charge the difference
        paymentMethodId: selectedMethodId,
        locationId: reservation.locationId,
        bookingId: id,
        checkIn: new Date(formData.checkIn).toISOString(),
        checkOut: new Date(formData.checkOut).toISOString(),
      });

      if (!chargeResult.success) {
        throw new Error(chargeResult.error);
      }

      // 2. If charge succeeds, update the booking dates
      const dateResponse = await updateBookingDates(
        id,
        new Date(formData.checkIn),
        new Date(formData.checkOut),
        {
          totalPrice: quote.totalPrice,
          taxes: quote.taxes,
          fees: quote.fees,
          isExtension: needsPayment,
          promoCode: reservation?.promoCode || null,
          promoDiscount: quote.discount || 0,
          paymentMethodId: selectedMethodId,
          transactionId: chargeResult.paymentIntentId as string, // Real ID from Stripe
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
    <>
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
                  <div className="relative">
                    <Input
                      id="checkOut"
                      type="datetime-local"
                      value={formData.checkOut}
                      onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                      required
                      className={cn(showMinDurationWarning && "border-amber-500 ring-2 ring-amber-500/20")}
                    />
                  </div>
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
              <CardContent className="space-y-4">
                {isReduction && (
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    <CreditCard className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-900 leading-tight">Refund Eligible</p>
                      <p className="text-[10px] text-emerald-700/80 leading-relaxed font-medium">
                        You've reduced your stay! You are eligible for a refund of <span className="font-bold text-emerald-600">{formatCurrency(refundEligibleAmount)}</span>.
                        This will be processed as a refund request.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Price:</span>
                  <span>{formatCurrency(originalPrice)}</span>
                </div>

                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      Discount ({reservation.promoCode}):
                    </span>
                    <span className="text-green-600">-{formatCurrency(quote.discount)}</span>
                  </div>
                )}

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

          {showPayment && (
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
                    <div className="space-y-4 mb-8">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5" /> 
                          <span>Your Saved Cards</span>
                        </div>
                        <span className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 tracking-widest">SECURE</span>
                      </label>

                      <RadioGroup
                        value={selectedMethodId}
                        onValueChange={setSelectedMethodId}
                        className="grid gap-3"
                      >
                        {paymentMethods.map((method) => (
                          <div
                            key={method.id}
                            onClick={() => {
                              setSelectedMethodId(method.id);
                            }}
                            className={cn(
                              "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                              selectedMethodId === method.id 
                                ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/5 scale-[1.01]" 
                                : "border-border/50 bg-card hover:border-primary/20 hover:bg-slate-50/50"
                            )}
                          >
                            <div className="flex items-center gap-5">
                              <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                              <div className={cn(
                                "w-14 h-9 rounded-lg flex items-center justify-center text-[10px] font-black text-white uppercase shadow-inner relative overflow-hidden",
                                method.brand === 'visa' ? "bg-[#1A1F71]" :
                                method.brand === 'mastercard' ? "bg-[#EB001B]" : "bg-slate-800"
                              )}>
                                {method.brand}
                                <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4" />
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-sm tracking-tight capitalize">•••• {method.last4}</p>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Expires {method.expiryMonth}/{method.expiryYear}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              selectedMethodId === method.id ? "border-primary bg-primary" : "border-border"
                            )}>
                              {selectedMethodId === method.id && <Check className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        ))}

                        <div
                          onClick={() => setSelectedMethodId("new_card")}
                          className={cn(
                            "flex items-center gap-5 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
                            selectedMethodId === "new_card" 
                              ? "border-primary bg-primary/[0.03] scale-[1.01]" 
                              : "border-border/60 bg-slate-50/20 hover:border-primary/40 hover:bg-slate-50/50"
                          )}
                        >
                          <div className="w-14 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                             <PlusCircle className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1">
                            <RadioGroupItem value="new_card" id="new_card" className="sr-only" />
                            <p className="font-black text-slate-800 text-sm tracking-tight">Use a new card / another method</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Select your preferred payment option below</p>
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            selectedMethodId === "new_card" ? "border-primary bg-primary" : "border-border"
                          )}>
                            {selectedMethodId === "new_card" && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                )}

                {/* Demo Mode UI or Stripe Elements */}
                {(selectedMethodId === "new_card" || paymentMethods.length === 0) ? (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    {paymentMethods.length > 0 && <div className="border-t pt-4" />}

                    {!isStripeActive ? (
                      <MockCardForm
                        onSuccess={handlePaymentSuccess}
                        amount={priceDifference}
                        isSubmitting={isPaymentSubmitting}
                        setIsSubmitting={setIsPaymentSubmitting}
                        agreedToTerms={agreedToTerms}
                        setAgreedToTerms={setAgreedToTerms}
                      />
                    ) : (
                      <StripeElementsWrapper 
                        mode="payment"
                        amount={Math.round(priceDifference * 100)}
                        currency="usd"
                        setupFutureUsage={isAuthenticated ? "off_session" : undefined}
                      >

                        <StripePaymentForm
                          amount={priceDifference}
                          onPaymentSuccess={handlePaymentSuccess}
                          onPaymentError={(err) => toast({ title: "Payment Error", description: err, variant: "destructive" })}
                          isSubmitting={isPaymentSubmitting}
                          setIsSubmitting={setIsPaymentSubmitting}
                          agreedToTerms={agreedToTerms}
                          setAgreedToTerms={setAgreedToTerms}
                          onCreateIntent={async () => {
                            const result = await createPaymentIntentAction({
                              amount: priceDifference,
                              locationId: reservation.locationId,
                              locationName: reservation.location.name,
                              checkIn: formData.checkIn,
                              checkOut: formData.checkOut,
                              guestEmail: reservation.guestEmail,
                            });
                            if (!result.success) throw new Error(result.error);
                            return result.clientSecret!;
                          }}
                        />
                      </StripeElementsWrapper>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 py-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className={cn(
                      "flex items-start gap-4 p-5 rounded-2xl border-2 transition-colors",
                      agreedToTerms ? "border-primary/20 bg-primary/5 shadow-inner" : "border-border/50 bg-slate-50/50"
                    )}>
                      <div className="pt-0.5">
                        <Checkbox
                          id="terms-saved"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                          className="w-5 h-5 rounded-md"
                        />
                      </div>
                      <Label htmlFor="terms-saved" className="flex-1 block text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
                        <span>
                          I agree to the{" "}
                          <Link href="/terms" target="_blank" className="text-primary hover:underline font-bold">
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/cancellation-policy" target="_blank" className="text-primary hover:underline font-bold">
                            Cancellation Policy
                          </Link>
                          . I understand my reservation is subject to availability.
                        </span>
                      </Label>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSavedCardSubmit}
                      className={cn(
                        "w-full h-16 text-xl font-black uppercase tracking-[0.2em] shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-2xl group",
                        agreedToTerms
                          ? "bg-slate-950 text-white shadow-primary/20 hover:shadow-primary/30"
                          : "opacity-40 grayscale"
                      )}
                      disabled={isPaymentSubmitting || !agreedToTerms}
                    >
                      {isPaymentSubmitting ? (
                        <div className="flex items-center gap-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="animate-pulse">Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full relative">
                          <span className="drop-shadow-sm truncate px-8 leading-none">
                            Pay {formatCurrency(priceDifference)} & Save Changes
                          </span>
                          <Lock className="absolute right-4 h-6 w-6 opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all scale-90 group-hover:scale-100" />
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 mt-8">
            <Link href={`/account/reservations/${id}`}>
              <Button variant="outline" type="button" className="rounded-xl px-8">
                Cancel
              </Button>
            </Link>
            {!showPayment && (
              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSaving || !isModifiable}
                className="rounded-xl px-8 font-bold"
              >
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

      {/* Floating Min Duration Notification */}
      {showMinDurationWarning && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-full md:slide-in-from-right-full duration-500">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-[0_20px_50px_rgba(245,158,11,0.15)] flex items-center gap-4 max-w-sm border-l-8 border-l-amber-500">
            <div className="bg-amber-500 p-2.5 rounded-xl text-white shadow-lg shadow-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-black text-amber-900 dark:text-amber-100 text-sm tracking-tight">Duration Adjusted</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 font-medium leading-tight mt-0.5">
                Your stay was automatically adjusted to meet the <strong>{minBookingDuration} minute</strong> minimum requirement.
              </p>
            </div>
            <button
              onClick={() => setShowMinDurationWarning(false)}
              className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors p-1 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
