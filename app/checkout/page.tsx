"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Navbar } from "@/components/navbar";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { useBooking } from "@/lib/booking-context";
import { formatCurrency, formatDate, formatTime, calculateQuote } from "@/lib/data";
import { createBooking } from "@/lib/actions/booking-actions";
import { useToast } from "@/hooks/use-toast";
import { createPaymentIntentAction } from "@/lib/actions/stripe-actions";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { validateLuhn, formatCardNumber, detectCardBrand, validateExpiry } from "@/lib/card-utils";
import { getVehicles } from "@/lib/actions/vehicle-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChevronLeft,
  User as UserIcon,
  Car as CarIcon,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Lock as LockIcon,
  Tag,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";

// Load Stripe outside of component to avoid recreating on every render
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && !stripePublishableKey.includes("YOUR_PUBLISHABLE_KEY");
const stripePromise = isStripeConfigured ? loadStripe(stripePublishableKey) : null;

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

function CheckoutContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { location: contextLocation, checkIn, checkOut } = useBooking();
  const { user, isAuthenticated } = useAuth();

  const [bookingLocation, setBookingLocation] = useState<any>(contextLocation);
  const [isLoading, setIsLoading] = useState(!contextLocation);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saved Cards
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Guest Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Vehicle Info
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Mock Card Info for Demo Mode
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [cardTouched, setCardTouched] = useState<Record<string, boolean>>({});
  const cardBrand = detectCardBrand(cardNumber);

  const validateCardForm = () => {
    const newErrors: Record<string, string> = {};
    const cleanedNumber = cardNumber.replace(/\D/g, "");

    if (!cleanedNumber) newErrors.cardNumber = "Card number is required";
    else if (cleanedNumber.length < 13 || cleanedNumber.length > 19) newErrors.cardNumber = "Invalid length";
    else if (!validateLuhn(cleanedNumber)) newErrors.cardNumber = "Invalid card number";

    if (!expiryMonth || !expiryYear) newErrors.expiry = "Expiry date is required";
    else if (!validateExpiry(expiryMonth, expiryYear)) newErrors.expiry = "Card has expired";

    if (!cvv) newErrors.cvv = "CVV is required";
    else if (cardBrand === 'amex' ? cvv.length !== 4 : cvv.length !== 3) newErrors.cvv = "Invalid CVV";

    if (!cardName.trim()) newErrors.cardName = "Cardholder name is required";

    setCardErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (!contextLocation) {
      toast({
        title: "No location selected",
        description: "Please select a parking location first.",
        variant: "destructive",
      });
      router.push("/parking");
      return;
    }
    setIsLoading(false);
  }, [contextLocation, router, toast]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Auto-fill Guest Info if empty
      if (!firstName && user.firstName) setFirstName(user.firstName);
      if (!lastName && user.lastName) setLastName(user.lastName);
      if (!email && user.email) setEmail(user.email);
      if (!phone && user.phone) setPhone(user.phone);

      const fetchSavedCards = async () => {
        try {
          const res = await fetch("/api/payment-methods");
          if (res.ok) {
            const data = await res.json();
            setSavedCards(data);
            if (data.length > 0) {
              const defaultCard = data.find((c: any) => c.isDefault) || data[0];
              setSelectedCardId(defaultCard?.id || null);
              setUseNewCard(false);
            }
          }
        } catch (error) {
          console.error("Failed to fetch saved cards", error);
        }
      };
      
      const fetchVehicles = async () => {
         try {
             const vehicles = await getVehicles();
             
             if (vehicles && vehicles.length > 0) {
                 // getVehicles sorts by default first, then newest.
                 const topVehicle = vehicles[0];
                 
                 // Only auto-fill if fields are empty to respect manual edits
                 if (!make) setMake(topVehicle.make);
                 if (!model) setModel(topVehicle.model);
                 if (!color) setColor(topVehicle.color);
                 if (!licensePlate) setLicensePlate(topVehicle.licensePlate);
             }
         } catch (error) {
             console.error("Failed to fetch vehicles", error);
         }
      };

      fetchSavedCards();
      fetchVehicles();
    }
  }, [isAuthenticated, user]);

  const quote = bookingLocation ? calculateQuote(bookingLocation, checkIn, checkOut) : null;

  // Calculate final price with dynamic promotion
  const calculateFinalPrice = () => {
    if (!quote) return 0;
    if (!promoApplied || !appliedPromotion) return quote.totalPrice;

    let discount = 0;
    if (appliedPromotion.type === "percentage") {
      discount = quote.totalPrice * (appliedPromotion.value / 100);
    } else {
      discount = appliedPromotion.value;
    }

    if (appliedPromotion.maxDiscount) {
      discount = Math.min(discount, appliedPromotion.maxDiscount);
    }

    return Math.max(0, quote.totalPrice - discount);
  };

  const finalPrice = calculateFinalPrice();

  // Create PaymentIntent when user reaches payment step
  const createPaymentIntentForCheckout = async () => {
    if (!bookingLocation || !quote) return;

    try {
      const result = await createPaymentIntentAction({
        amount: finalPrice,
        locationId: bookingLocation.id,
        locationName: bookingLocation.name,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guestEmail: email,
      });

      if (result.success) {
        setClientSecret(result.clientSecret ?? null);
        setPaymentIntentId(result.paymentIntentId ?? null);
      } else {
        console.error("Payment setup error:", result.error);
        toast({
          title: "Payment Setup Failed",
          description: result.error || "Could not initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Payment setup action error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to set up payment. Please check your connection or log in again.",
        variant: "destructive",
      });
    }
  };

  // Create PaymentIntent when moving to payment step
  useEffect(() => {
    if (step === 3 && !clientSecret && isGuestInfoComplete && isVehicleInfoComplete) {
      createPaymentIntentForCheckout();
    }
  }, [step]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    setIsValidatingPromo(true);
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode,
          amount: quote?.totalPrice
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAppliedPromotion(data.promotion);
        setPromoApplied(true);
        // Reset clientSecret to regenerate with new amount
        setClientSecret(null);
        toast({
          title: "Promo Applied",
          description: `Code ${data.promotion.code} has been applied!`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description: data.error || "The promo code you entered is not valid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate promo code.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      const bookingData = {
        locationId: bookingLocation.id,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        vehicleMake: make,
        vehicleModel: model,
        vehicleColor: color,
        vehiclePlate: licensePlate,
        totalPrice: finalPrice,
        taxes: quote!.taxes,
        fees: quote!.fees,
        paymentIntentId: paymentId,
        promoCode: promoApplied ? appliedPromotion?.code : undefined,
      };

      const response = await createBooking(bookingData);

      if (response.success && response.data) {
        toast({
          title: "Booking Confirmed!",
          description: "Your parking spot has been reserved.",
        });
        router.push(`/confirmation?code=${response.data.confirmationCode}`);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Payment succeeded but booking failed. Please contact support.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleSavedCardPayment = async () => {
    if (!selectedCardId) return;
    setIsSubmitting(true);

    try {
      const bookingData = {
        locationId: bookingLocation.id,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        vehicleMake: make,
        vehicleModel: model,
        vehicleColor: color,
        vehiclePlate: licensePlate,
        totalPrice: finalPrice,
        taxes: quote!.taxes,
        fees: quote!.fees,
        paymentMethodId: selectedCardId,
        promoCode: promoApplied ? appliedPromotion?.code : undefined,
      };

      const response = await createBooking(bookingData);

      if (response.success && response.data) {
        toast({
          title: "Booking Confirmed!",
          description: "Your parking spot has been reserved using your saved card.",
        });
        router.push(`/confirmation?code=${response.data.confirmationCode}`);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to process booking with saved card.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Preparing checkout...</p>
      </div>
    );
  }

  const { days, basePrice, taxes, fees, totalPrice, savings } = quote!;

  const isGuestInfoComplete = firstName && lastName && email && phone;
  const isVehicleInfoComplete = make && model && licensePlate;
  const canProceedToPayment = isGuestInfoComplete && isVehicleInfoComplete && agreedToTerms;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="container px-4 py-6">
          {/* Back Link */}
          <Link
            href={`/parking/${bookingLocation.id}`}
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to parking details
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Main Form */}
            <div className="space-y-6">
              <div>
                <h1 className="mb-1 text-2xl font-bold text-foreground">Complete Your Reservation</h1>
                <p className="text-muted-foreground">
                  Fill in your details to confirm your parking spot
                </p>
              </div>

              <Accordion
                type="single"
                collapsible
                value={`step-${step}`}
                onValueChange={(v) => setStep(parseInt(v.replace("step-", "")) || 1)}
                className="space-y-4"
              >
                {/* Step 1: Guest Information */}
                <AccordionItem value="step-1" className="rounded-xl border border-border bg-card">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isGuestInfoComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                        {isGuestInfoComplete ? <CheckCircle className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Guest Information</p>
                        <p className="text-sm text-muted-foreground">
                          {isGuestInfoComplete ? `${firstName} ${lastName}` : "Enter your contact details"}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-4"
                      onClick={() => setStep(2)}
                      disabled={!isGuestInfoComplete}
                    >
                      Continue to Vehicle Info
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 2: Vehicle Information */}
                <AccordionItem value="step-2" className="rounded-xl border border-border bg-card">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isVehicleInfoComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                        {isVehicleInfoComplete ? <CheckCircle className="h-4 w-4" /> : <CarIcon className="h-4 w-4" />}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Vehicle Information</p>
                        <p className="text-sm text-muted-foreground">
                          {isVehicleInfoComplete ? `${make} ${model} - ${licensePlate}` : "Enter your vehicle details"}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="make">Vehicle Make</Label>
                        <Input
                          id="make"
                          placeholder="Toyota"
                          value={make}
                          onChange={(e) => setMake(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Vehicle Model</Label>
                        <Input
                          id="model"
                          placeholder="Camry"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="color">Color (Optional)</Label>
                        <Input
                          id="color"
                          placeholder="Silver"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="licensePlate">License Plate</Label>
                        <Input
                          id="licensePlate"
                          placeholder="ABC 1234"
                          value={licensePlate}
                          onChange={(e) => setLicensePlate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-4"
                      onClick={() => setStep(3)}
                      disabled={!isVehicleInfoComplete}
                    >
                      Continue to Payment
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 3: Payment */}
                <AccordionItem value="step-3" className="rounded-xl border border-border bg-card">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${selectedCardId || clientSecret ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">
                          Payment Method
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedCardId ? "Using saved card" : "Enter payment details"}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-6">
                      {/* Saved Cards Selection */}
                      {isAuthenticated && savedCards.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Saved Cards</Label>
                          <div className="grid gap-3">
                            {savedCards.map((card) => (
                              <div
                                key={card.id}
                                onClick={() => {
                                  setSelectedCardId(card.id);
                                  setUseNewCard(false);
                                }}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  selectedCardId === card.id ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/20"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-12 h-8 rounded flex items-center justify-center text-[10px] font-black text-white uppercase",
                                    card.brand === 'visa' ? "bg-[#1A1F71]" :
                                      card.brand === 'mastercard' ? "bg-[#EB001B]" : "bg-slate-700"
                                  )}>
                                    {card.brand}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">•••• {card.last4}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}</p>
                                  </div>
                                </div>
                                {selectedCardId === card.id && <CheckCircle className="w-5 h-5 text-primary" />}
                              </div>
                            ))}
                            <div
                              onClick={() => {
                                setSelectedCardId(null);
                                setUseNewCard(true);
                              }}
                              className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                useNewCard ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/20"
                              )}
                            >
                              <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                                <Plus className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <p className="font-bold text-sm">Use a new card</p>
                              {useNewCard && <CheckCircle className="ml-auto w-5 h-5 text-primary" />}
                            </div>
                          </div>
                        </div>
                      )}

                      {(useNewCard || !isAuthenticated || savedCards.length === 0) && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                          {!isStripeConfigured ? (
                            <div className="space-y-4 pt-2">
                              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200 mb-4">
                                <p className="font-bold flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Stripe Demo Mode
                                </p>
                                <p className="mt-1 opacity-80">
                                  Simulation active. Please enter any valid-format card details to continue.
                                </p>
                              </div>

                              <div className="grid gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="mockCardName" className="text-xs font-bold uppercase text-muted-foreground">Cardholder Name</Label>
                                  <Input
                                    id="mockCardName"
                                    placeholder="John Doe"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                    onBlur={() => setCardTouched({ ...cardTouched, cardName: true })}
                                    className={cn("h-12 rounded-xl border-2", (cardErrors.cardName && cardTouched.cardName) && "border-destructive")}
                                  />
                                  {cardErrors.cardName && cardTouched.cardName && <p className="text-[10px] font-bold text-destructive">{cardErrors.cardName}</p>}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="mockCardNumber" className="text-xs font-bold uppercase text-muted-foreground">Card Number</Label>
                                  <div className="relative">
                                    <Input
                                      id="mockCardNumber"
                                      placeholder="0000 0000 0000 0000"
                                      value={cardNumber}
                                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                      onBlur={() => setCardTouched({ ...cardTouched, cardNumber: true })}
                                      maxLength={cardBrand === 'amex' ? 17 : 19}
                                      className={cn("h-12 rounded-xl border-2 pl-20 font-mono", (cardErrors.cardNumber && cardTouched.cardNumber) && "border-destructive")}
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                      <BrandIcon brand={cardBrand} />
                                    </div>
                                  </div>
                                  {cardErrors.cardNumber && cardTouched.cardNumber && <p className="text-[10px] font-bold text-destructive">{cardErrors.cardNumber}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Expiry Date</Label>
                                    <div className="flex gap-2">
                                      <select
                                        value={expiryMonth}
                                        onChange={(e) => setExpiryMonth(e.target.value)}
                                        onBlur={() => setCardTouched({ ...cardTouched, expiry: true })}
                                        className={cn("flex h-12 w-full rounded-xl border-2 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary", (cardErrors.expiry && cardTouched.expiry) && "border-destructive")}
                                      >
                                        <option value="">Month</option>
                                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                                          <option key={m} value={m}>{m}</option>
                                        ))}
                                      </select>
                                      <select
                                        value={expiryYear}
                                        onChange={(e) => setExpiryYear(e.target.value)}
                                        onBlur={() => setCardTouched({ ...cardTouched, expiry: true })}
                                        className={cn("flex h-12 w-full rounded-xl border-2 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary", (cardErrors.expiry && cardTouched.expiry) && "border-destructive")}
                                      >
                                        <option value="">Year</option>
                                        {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i)).map(y => (
                                          <option key={y} value={y}>{y}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {cardErrors.expiry && cardTouched.expiry && <p className="text-[10px] font-bold text-destructive">{cardErrors.expiry}</p>}
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="mockCvv" className="text-xs font-bold uppercase text-muted-foreground">CVV</Label>
                                    <Input
                                      id="mockCvv"
                                      placeholder="123"
                                      value={cvv}
                                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, cardBrand === 'amex' ? 4 : 3))}
                                      onBlur={() => setCardTouched({ ...cardTouched, cvv: true })}
                                      className={cn("h-12 rounded-xl border-2", (cardErrors.cvv && cardTouched.cvv) && "border-destructive")}
                                    />
                                    {cardErrors.cvv && cardTouched.cvv && <p className="text-[10px] font-bold text-destructive">{cardErrors.cvv}</p>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : clientSecret ? (
                            <Elements
                              stripe={stripePromise}
                              options={{
                                clientSecret,
                                appearance: {
                                  theme: 'stripe',
                                  variables: {
                                    colorPrimary: '#10b981',
                                  },
                                },
                              }}
                            >
                              <StripePaymentForm
                                clientSecret={clientSecret}
                                amount={finalPrice}
                                onPaymentSuccess={handlePaymentSuccess}
                                onPaymentError={handlePaymentError}
                                isSubmitting={isSubmitting}
                                setIsSubmitting={setIsSubmitting}
                                agreedToTerms={agreedToTerms}
                                setAgreedToTerms={setAgreedToTerms}
                              />
                            </Elements>
                          ) : (
                            <div className="flex items-center justify-center py-12 bg-muted/20 rounded-xl border-2 border-dashed">
                              <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                              <span className="text-sm font-bold text-muted-foreground">Initializing secure payment...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Terms Checkbox Moved Here */}
                      <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-slate-50/50">
                        <Checkbox
                          id="terms"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                          I agree to the{" "}
                          <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/cancellation-policy" target="_blank" className="text-primary hover:underline font-medium">
                            Cancellation Policy
                          </Link>
                          . I understand that my reservation is subject to availability.
                        </Label>
                      </div>

                      {/* Unified Submit Button for Saved Card or Demo */}
                      {(selectedCardId || (!isStripeConfigured && useNewCard)) && (
                        <Button
                          className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all"
                          disabled={isSubmitting || !agreedToTerms}
                          onClick={() => {
                            if (selectedCardId) {
                              handleSavedCardPayment();
                            } else if (!isStripeConfigured && useNewCard) {
                              if (!validateCardForm()) {
                                setCardTouched({
                                  cardName: true,
                                  cardNumber: true,
                                  expiry: true,
                                  cvv: true
                                });
                                toast({
                                  title: "Validation Error",
                                  description: "Please focus on correcting the card entry errors.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              setIsSubmitting(true);
                              setTimeout(() => {
                                handlePaymentSuccess("pi_demo_" + Math.random().toString(36).substring(7));
                              }, 1500);
                            } else {
                              setIsSubmitting(true);
                              setTimeout(() => {
                                handlePaymentSuccess("pi_demo_" + Math.random().toString(36).substring(7));
                              }, 1500);
                            }
                          }}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Pay ${formatCurrency(finalPrice)} & Book Now`
                          )}
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>


            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location Info */}
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                      <div className="flex h-full items-center justify-center">
                        <CarIcon className="h-8 w-8 text-primary/40" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{bookingLocation.name}</h3>
                      <p className="text-sm text-muted-foreground">{bookingLocation.airport}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {bookingLocation.distance}
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Check-in
                      </div>
                      <span className="font-medium text-foreground">{formatDate(checkIn)} {formatTime(checkIn)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Check-out
                      </div>
                      <span className="font-medium text-foreground">{formatDate(checkOut)} {formatTime(checkOut)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Duration
                      </div>
                      <span className="font-medium text-foreground">{days} day{days > 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="border-t border-border pt-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        disabled={promoApplied}
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyPromo}
                        disabled={promoApplied || !promoCode || isValidatingPromo}
                      >
                        {isValidatingPromo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : promoApplied ? (
                          "Applied"
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                    {promoApplied && appliedPromotion && (
                      <p className="mt-2 flex items-center gap-1 text-sm text-primary">
                        <Tag className="h-3 w-3" />
                        {appliedPromotion.code} - {appliedPromotion.type === "percentage" ? `${appliedPromotion.value}%` : formatCurrency(appliedPromotion.value)} off applied!
                      </p>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(bookingLocation.pricePerDay)} x {days} day{days > 1 ? "s" : ""}
                      </span>
                      <span className="text-foreground">{formatCurrency(basePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxes</span>
                      <span className="text-foreground">{formatCurrency(taxes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Service fee</span>
                      <span className="text-foreground">{formatCurrency(fees)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between text-sm text-primary">
                        <span>Your savings</span>
                        <span>-{formatCurrency(savings)}</span>
                      </div>
                    )}
                    {promoApplied && appliedPromotion && quote && (
                      <div className="flex items-center justify-between text-sm text-primary">
                        <span>Promo discount ({appliedPromotion.code})</span>
                        <span>-{formatCurrency(quote.totalPrice - finalPrice)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">
                        {formatCurrency(finalPrice)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Free cancellation up to 24h before</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Instant confirmation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <LockIcon className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Secure payment via Stripe</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <CheckoutContent />
  );
}
