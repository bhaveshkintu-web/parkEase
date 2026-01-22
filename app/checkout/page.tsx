"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BookingProvider, useBooking } from "@/lib/booking-context";
import { parkingLocations, formatCurrency, formatDate, calculateQuote, generateConfirmationCode, calculateDays } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "lucide-react";

function CheckoutContent() {
  const router = useRouter();
  const { location, checkIn, checkOut, setGuestInfo, setVehicleInfo } = useBooking();
  
  // Use first location as fallback for demo
  const bookingLocation = location || parkingLocations[0];
  const quote = calculateQuote(bookingLocation, checkIn, checkOut);
  const { days, basePrice, taxes, fees, totalPrice, savings } = quote;

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

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

  // Payment Info
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleApplyPromo = () => {
    if (promoCode.toLowerCase() === "save10") {
      setPromoApplied(true);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Save info to context
    setGuestInfo({ firstName, lastName, email, phone });
    setVehicleInfo({ make, model, color, licensePlate });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate confirmation code and redirect
    const confirmationCode = generateConfirmationCode();
    router.push(`/confirmation?code=${confirmationCode}`);
  };

  const isGuestInfoComplete = firstName && lastName && email && phone;
  const isVehicleInfoComplete = make && model && licensePlate;
  const isPaymentInfoComplete = cardNumber && expiry && cvv && nameOnCard;
  const canSubmit = isGuestInfoComplete && isVehicleInfoComplete && isPaymentInfoComplete && agreedToTerms;

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

                {/* Step 3: Payment Information */}
                <AccordionItem value="step-3" className="rounded-xl border border-border bg-card">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isPaymentInfoComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {isPaymentInfoComplete ? <CheckCircle className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Payment Information</p>
                        <p className="text-sm text-muted-foreground">
                          {isPaymentInfoComplete ? `Card ending in ${cardNumber.slice(-4)}` : "Enter your payment details"}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nameOnCard">Name on Card</Label>
                        <Input
                          id="nameOnCard"
                          placeholder="John Doe"
                          value={nameOnCard}
                          onChange={(e) => setNameOnCard(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            placeholder="123"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Your payment information is encrypted and secure
                      </span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Terms & Submit */}
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link href="#" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="#" className="text-primary hover:underline">
                        Cancellation Policy
                      </Link>
                      . I understand that my reservation is subject to availability.
                    </Label>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Reservation - {formatCurrency(promoApplied ? totalPrice * 0.9 : totalPrice)}
                      </>
                    )}
                  </Button>
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
                      <span className="font-medium text-foreground">{formatDate(checkIn)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Check-out
                      </div>
                      <span className="font-medium text-foreground">{formatDate(checkOut)}</span>
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
                        {formatCurrency(promoApplied ? totalPrice * 0.9 : totalPrice)}
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
                      <span className="text-muted-foreground">Secure payment</span>
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
    <BookingProvider>
      <CheckoutContent />
    </BookingProvider>
  );
}
