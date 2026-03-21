"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Navbar } from "@/components/navbar";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { MockCardForm } from "@/components/mock-card-form";
import { useBooking } from "@/lib/booking-context";
import { AuthProvider } from "@/lib/auth-context";
import { formatCurrency, formatDate, formatTime, calculateQuote, CAR_MAKES } from "@/lib/data";
import { createBooking } from "@/lib/actions/booking-actions";
import { fetchModelsByMake } from "@/lib/vehicle-api";
import { useToast } from "@/hooks/use-toast";
import { createPaymentIntentAction, chargeSavedCardAction } from "@/lib/actions/stripe-actions";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { validateLuhn, formatCardNumber, detectCardBrand, validateExpiry } from "@/lib/card-utils";
import { getVehicles } from "@/lib/actions/vehicle-actions";
import { getGeneralSettings } from "@/lib/actions/settings-actions";
import { PromoSelector } from "@/components/checkout/promo-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { StripeElementsWrapper } from "@/components/stripe-elements-wrapper";
import { isStripeConfigured } from "@/lib/stripe";

function CheckoutContent() {
  const isStripeActive = isStripeConfigured();
  const router = useRouter();
  const { toast } = useToast();
  const {
    location: contextLocation,
    checkIn,
    checkOut,
    guestInfo: contextGuestInfo,
    vehicleInfo: contextVehicleInfo,
    setGuestInfo: updateContextGuestInfo,
    setVehicleInfo: updateContextVehicleInfo,
    minBookingDuration
  } = useBooking();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const searchParams = useSearchParams();
  const step = parseInt(searchParams.get("step") || "1");

  const setStep = (newStep: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", newStep.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const [bookingLocation, setBookingLocation] = useState<any>(contextLocation);
  const [isLoading, setIsLoading] = useState(!contextLocation);

  // Always fetch FRESH pricing settings on mount — context value may be stale from app init
  const [pricingTaxRate, setPricingTaxRate] = useState(12);
  const [pricingServiceFee, setPricingServiceFee] = useState(5.99);
  useEffect(() => {
    getGeneralSettings().then((s) => {
      setPricingTaxRate(s.taxRate ?? 12);
      setPricingServiceFee(s.serviceFee ?? 5.99);
    }).catch(console.error);
  }, []);

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

  // Guest Info initialized from context or user session
  const [firstName, setFirstName] = useState(contextGuestInfo?.firstName || "");
  const [lastName, setLastName] = useState(contextGuestInfo?.lastName || "");
  const [email, setEmail] = useState(contextGuestInfo?.email || "");
  const [phone, setPhone] = useState(contextGuestInfo?.phone || "");

  // Vehicle Info initialized from context
  const [savedVehicles, setSavedVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [useNewVehicle, setUseNewVehicle] = useState(true);
  const [make, setMake] = useState(contextVehicleInfo?.make || "");
  const [model, setModel] = useState(contextVehicleInfo?.model || "");
  const [color, setColor] = useState(contextVehicleInfo?.color || "");
  const [licensePlate, setLicensePlate] = useState(contextVehicleInfo?.licensePlate || "");
  const [models, setModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [stripe, setStripe] = useState<any>(null);

  useEffect(() => {
    if (isStripeActive) {
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!).then(setStripe);
    }
  }, []);

  const isGuestInfoComplete = firstName && lastName && email && phone;
  const isVehicleInfoComplete = make && model && licensePlate;
  const canProceedToPayment = isGuestInfoComplete && isVehicleInfoComplete && agreedToTerms;

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

    const minDuration = minBookingDuration * 60 * 1000;
    if (checkOut.getTime() - checkIn.getTime() < minDuration) {
      toast({
        title: "Invalid Duration",
        description: `Minimum booking duration is ${minBookingDuration >= 60 ? `${minBookingDuration / 60} hours` : `${minBookingDuration} minutes`}.`,
        variant: "destructive",
      });
      router.push(`/parking/${contextLocation.id}`);
      return;
    }

    setIsLoading(false);
  }, [contextLocation, checkIn, checkOut, router, toast]);

  useEffect(() => {
    const loadModels = async () => {
      if (!make || make === "Other") {
        setModels([]);
        return;
      }

      setIsFetchingModels(true);
      try {
        const fetchedModels = await fetchModelsByMake(make);
        setModels(fetchedModels);
      } catch (error) {
        console.error("Error loading models:", error);
        setModels([]);
      } finally {
        setIsFetchingModels(false);
      }
    };

    loadModels();
  }, [make]);

  // Sync Guest and Vehicle info to context whenever they change
  useEffect(() => {
    updateContextGuestInfo({ firstName, lastName, email, phone });
  }, [firstName, lastName, email, phone, updateContextGuestInfo]);

  useEffect(() => {
    updateContextVehicleInfo({ make, model, color, licensePlate });
  }, [make, model, color, licensePlate, updateContextVehicleInfo]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Auto-fill Guest Info from session if both session exists and local state is empty
      // BUT prioritized session data if we just returned from login
      if (user.firstName && !firstName) setFirstName(user.firstName);
      if (user.lastName && !lastName) setLastName(user.lastName);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !phone) setPhone(user.phone);

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
          setSavedVehicles(vehicles || []);

          if (vehicles && vehicles.length > 0) {
            setUseNewVehicle(false);
            // getVehicles sorts by default first, then newest.
            const defaultVehicle = vehicles.find((v: any) => v.isDefault) || vehicles[0];
            setSelectedVehicleId(defaultVehicle.id);

            // Auto-fill fields for consistency
            setMake(defaultVehicle.make);
            setModel(defaultVehicle.model);
            setColor(defaultVehicle.color || "");
            setLicensePlate(defaultVehicle.licensePlate);
          } else {
            setUseNewVehicle(true);
          }
        } catch (error) {
          console.error("Failed to fetch vehicles", error);
        }
      };

      fetchSavedCards();
      fetchVehicles();
    }
  }, [isAuthenticated, user]);

  const quote = bookingLocation ? calculateQuote(bookingLocation, checkIn, checkOut, pricingTaxRate, pricingServiceFee) : null;

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
    if (step === 3) {
      // Don't redirect if we're still loading the auth state
      if (isAuthLoading) return;

      if (!isAuthenticated) {
        const currentUrl = window.location.pathname + window.location.search;
        router.push(`/auth/guest-login?returnUrl=${encodeURIComponent(currentUrl)}`);
        return;
      }

      if (!clientSecret && isGuestInfoComplete && isVehicleInfoComplete) {
        createPaymentIntentForCheckout();
      }
    }
  }, [step, isAuthenticated, isAuthLoading, router, isGuestInfoComplete, isVehicleInfoComplete]);

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
        confirmed: true,
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
      // 1. Charge the saved card directly via our secure server action
      const chargeResult = await chargeSavedCardAction({
        amount: finalPrice,
        paymentMethodId: selectedCardId,
        locationId: bookingLocation.id,
        locationName: bookingLocation.name,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
      });

      if (!chargeResult.success) {
        // Handle 3D Secure (SCA) challenge
        if (chargeResult.requiresAction && chargeResult.clientSecret && stripe) {
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(chargeResult.clientSecret);
          
          if (confirmError) {
            throw new Error(confirmError.message || "Authentication failed");
          }
          
          if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing') {
             throw new Error("Payment failed or was cancelled");
          }
          
          // Use the intent from the confirmation
          chargeResult.paymentIntentId = paymentIntent.id;
        } else {
          throw new Error(chargeResult.error);
        }
      }

      // 2. If charge succeeds, then record the booking
      // We pass the real Stripe paymentIntentId from the charge action back to createBooking
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
        paymentIntentId: chargeResult.paymentIntentId as string, // Real ID from Stripe
        confirmed: chargeResult.status === 'succeeded',
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
        throw new Error(response.error || "Failed to finalize booking");
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

  if (!quote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invalid Booking Details</h2>
        <p className="text-muted-foreground mb-6 text-center">
          We couldn't calculate the pricing for your selection. Please try searching again.
        </p>
        <Button onClick={() => router.push("/parking")}>
          Return to Search
        </Button>
      </div>
    );
  }

  const { days, basePrice, taxes, fees, totalPrice, savings } = quote;

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
                    <div className="space-y-6">
                      {/* Saved Vehicles Selection */}
                      {isAuthenticated && savedVehicles.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Saved Vehicles</Label>
                          <div className="grid gap-3">
                            {savedVehicles.map((vehicle) => (
                              <div
                                key={vehicle.id}
                                onClick={() => {
                                  setSelectedVehicleId(vehicle.id);
                                  setUseNewVehicle(false);
                                  setMake(vehicle.make);
                                  setModel(vehicle.model);
                                  setColor(vehicle.color || "");
                                  setLicensePlate(vehicle.licensePlate);
                                }}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
                                  selectedVehicleId === vehicle.id && !useNewVehicle ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/20"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <CarIcon className="w-6 h-6 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">{vehicle.nickname || `${vehicle.make} ${vehicle.model}`}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">{vehicle.color} • {vehicle.licensePlate}</p>
                                  </div>
                                </div>
                                {selectedVehicleId === vehicle.id && !useNewVehicle && <CheckCircle className="w-5 h-5 text-primary" />}
                              </div>
                            ))}
                            <div
                              onClick={() => {
                                setUseNewVehicle(true);
                                setSelectedVehicleId(null);
                                // Clear fields if they were filled by a saved vehicle selection
                                setMake("");
                                setModel("");
                                setColor("");
                                setLicensePlate("");
                              }}
                              className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                useNewVehicle ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/20"
                              )}
                            >
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                <Plus className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <p className="font-bold text-sm">Use a new vehicle</p>
                              {useNewVehicle && <CheckCircle className="ml-auto w-5 h-5 text-primary" />}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Manual Entry Fields */}
                      {(useNewVehicle || !isAuthenticated || savedVehicles.length === 0) && (
                        <div className="grid gap-4 sm:grid-cols-2 pt-2 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                            <Label htmlFor="make">Vehicle Make</Label>
                            <Select
                              value={make}
                              onValueChange={(v) => {
                                setMake(v);
                                setModel(""); // Reset model when make changes
                              }}
                            >
                              <SelectTrigger id="make">
                                <SelectValue placeholder="Select make" />
                              </SelectTrigger>
                              <SelectContent>
                                {CAR_MAKES.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="model">Vehicle Model</Label>
                            {isFetchingModels ? (
                              <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Loading...</span>
                              </div>
                            ) : models.length > 0 ? (
                              <Select
                                value={model}
                                onValueChange={(v) => setModel(v)}
                              >
                                <SelectTrigger id="model">
                                  <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent>
                                  {models.map((m) => (
                                    <SelectItem key={m} value={m}>
                                      {m}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id="model"
                                placeholder={make ? "Enter model" : "Select make first"}
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                              />
                            )}
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
                      )}

                      <Button
                        className="w-full h-12 rounded-xl"
                        onClick={() => setStep(3)}
                        disabled={!isVehicleInfoComplete}
                      >
                        Continue to Payment
                      </Button>
                    </div>
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
                              <div className="flex-1">
                                <p className="font-bold text-sm">Use a new card / another payment method</p>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase">Select your preferred payment option below</p>
                              </div>
                              {useNewCard && <CheckCircle className="ml-auto w-5 h-5 text-primary" />}
                            </div>
                          </div>
                        </div>
                      )}

                      {(useNewCard || !isAuthenticated || savedCards.length === 0) && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                          {!isStripeActive && useNewCard ? (
                            <MockCardForm
                              onSuccess={(pi) => handlePaymentSuccess(pi)}
                              amount={finalPrice}
                              isSubmitting={isSubmitting}
                              setIsSubmitting={setIsSubmitting}
                              agreedToTerms={agreedToTerms}
                              setAgreedToTerms={setAgreedToTerms}
                            />
                          ) : clientSecret && clientSecret.startsWith("mock_") ? (
                            <MockCardForm
                              onSuccess={(pi) => handlePaymentSuccess(pi)}
                              amount={finalPrice}
                              isSubmitting={isSubmitting}
                              setIsSubmitting={setIsSubmitting}
                              agreedToTerms={agreedToTerms}
                              setAgreedToTerms={setAgreedToTerms}
                            />
                          ) : clientSecret ? (
                            <StripeElementsWrapper clientSecret={clientSecret}>
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
                            </StripeElementsWrapper>
                          ) : (
                            <div className="flex items-center justify-center py-12 bg-muted/20 rounded-xl border-2 border-dashed">
                              <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                              <span className="text-sm font-bold text-muted-foreground">Initializing secure payment...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Unified Submit Button ONLY for Saved Card */}
                      {selectedCardId && (
                        <div className="space-y-4 pt-2">
                          <div className={cn(
                            "flex items-start gap-4 p-5 rounded-2xl border-2 transition-colors",
                            agreedToTerms ? "border-primary/20 bg-primary/5 shadow-inner" : "border-border/50 bg-slate-50/50"
                          )}>
                            <div className="pt-0.5">
                              <Checkbox
                                id="saved-card-terms"
                                checked={agreedToTerms}
                                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                                className="w-5 h-5 rounded-md"
                              />
                            </div>
                            <Label htmlFor="saved-card-terms" className="flex-1 block text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
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
                          <Button
                            className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all"
                            disabled={isSubmitting || !agreedToTerms}
                            onClick={handleSavedCardPayment}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Pay ${formatCurrency(finalPrice)} via Saved Card`
                            )}
                          </Button>
                        </div>
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
                        {bookingLocation?.images?.length > 0 ? (
                          <img
                            src={bookingLocation.images[0]}
                            alt="Location"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <CarIcon className="h-8 w-8 text-primary/40" />
                        )}
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
                      <span className="font-medium text-foreground">{quote.durationText}</span>
                    </div>
                  </div>

                  {/* Promo Code Selector */}
                  <div className="border-t border-border pt-4">
                    <PromoSelector
                      bookingAmount={quote?.totalPrice || 0}
                      appliedPromo={appliedPromotion}
                      onApply={(promo) => {
                        // If it's a full promo object from the selector
                        if (promo.id) {
                          setAppliedPromotion(promo);
                          setPromoApplied(true);
                          setClientSecret(null); // Force regenerate payment intent
                          toast({
                            title: "Promo Applied",
                            description: `Code ${promo.code} has been applied!`,
                          });
                        } else {
                          // If it's just a manual code string
                          setPromoCode(promo.code);
                          handleApplyPromo();
                        }
                      }}
                      onRemove={() => {
                        setAppliedPromotion(null);
                        setPromoApplied(false);
                        setPromoCode("");
                        setClientSecret(null);
                        toast({
                          title: "Promo Removed",
                          description: "The promotion has been removed.",
                        });
                      }}
                    />
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(bookingLocation.pricePerDay)} x {quote.durationText}
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
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
