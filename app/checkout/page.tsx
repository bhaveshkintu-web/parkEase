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
  User,
  Car,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Lock,
  Tag,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Load Stripe outside of component to avoid recreating on every render
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && !stripePublishableKey.includes("YOUR_PUBLISHABLE_KEY");
const stripePromise = isStripeConfigured ? loadStripe(stripePublishableKey) : null;

function CheckoutContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { location: contextLocation, checkIn, checkOut } = useBooking();
  
  const [bookingLocation, setBookingLocation] = useState<any>(contextLocation);
  const [isLoading, setIsLoading] = useState(!contextLocation);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

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

  const quote = bookingLocation ? calculateQuote(bookingLocation, checkIn, checkOut) : null;
  const finalPrice = quote ? (promoApplied ? quote.totalPrice * 0.9 : quote.totalPrice) : 0;

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
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
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
  
  const handleApplyPromo = () => {
    if (promoCode.toLowerCase() === "save10") {
      setPromoApplied(true);
      // Reset clientSecret to regenerate with new amount
      setClientSecret(null);
      toast({
        title: "Promo Applied",
        description: "10% discount has been applied to your total.",
      });
    } else {
      toast({
        title: "Invalid Code",
        description: "The promo code you entered is not valid.",
        variant: "destructive",
      });
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
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isGuestInfoComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {isGuestInfoComplete ? <CheckCircle className="h-4 w-4" /> : <User className="h-4 w-4" />}
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
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isVehicleInfoComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {isVehicleInfoComplete ? <CheckCircle className="h-4 w-4" /> : <Car className="h-4 w-4" />}
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

                {/* Step 3: Payment via Stripe */}
                <AccordionItem value="step-3" className="rounded-xl border border-border bg-card">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        clientSecret ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">
                          Payment {!isStripeConfigured && "(Demo Mode)"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isStripeConfigured ? "Secure payment via Stripe" : "Configure Stripe keys for real payments"}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    {!isStripeConfigured ? (
                      <div className="space-y-4">
                        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
                          <p className="font-semibold flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Stripe Demo Mode
                          </p>
                          <p className="mt-1">
                            Stripe keys are not configured in your <code>.env</code> file. 
                            You can still test the booking flow using this simulation.
                          </p>
                        </div>
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={() => {
                            setIsSubmitting(true);
                            // Simulate a short delay then proceed
                            setTimeout(() => {
                              handlePaymentSuccess("pi_demo_" + Math.random().toString(36).substring(7));
                            }, 1500);
                          }}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Simulating Demo Payment...
                            </>
                          ) : (
                            "Simulate Demo Payment - Proceed to Confirmation"
                          )}
                        </Button>
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
                        />
                      </Elements>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading payment form...</span>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Terms Checkbox */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
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
                </CardContent>
              </Card>
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
                        <Car className="h-8 w-8 text-primary/40" />
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
                        disabled={promoApplied || !promoCode}
                      >
                        {promoApplied ? "Applied" : "Apply"}
                      </Button>
                    </div>
                    {promoApplied && (
                      <p className="mt-2 flex items-center gap-1 text-sm text-primary">
                        <Tag className="h-3 w-3" />
                        SAVE10 - 10% off applied!
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
                    {promoApplied && (
                      <div className="flex items-center justify-between text-sm text-primary">
                        <span>Promo discount (10%)</span>
                        <span>-{formatCurrency(totalPrice * 0.1)}</span>
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
                      <Lock className="h-4 w-4 text-primary" />
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
