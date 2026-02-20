"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBookingDetails, updateBookingVehicle, updateBookingDates } from "@/lib/actions/booking-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, Car, Save, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, calculateQuote } from "@/lib/data";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { createPaymentIntentAction } from "@/lib/actions/stripe-actions";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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
  const [isPaymentSubmitting, setIsPaymentSubmitting] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  React.useEffect(() => {
    async function loadBooking() {
      setIsLoading(true);
      const response = await getBookingDetails(id);
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
        const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);
        if (hoursUntilCheckIn < 2) {
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

  // Recalculate quote when dates change
  React.useEffect(() => {
    if (!reservation || !formData.checkIn || !formData.checkOut) return;

    try {
      const newCheckIn = new Date(formData.checkIn);
      const newCheckOut = new Date(formData.checkOut);

      if (isNaN(newCheckIn.getTime()) || isNaN(newCheckOut.getTime())) return;
      if (newCheckOut <= newCheckIn) return;

      const newQuote = calculateQuote(reservation.location, newCheckIn, newCheckOut);
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
        description: "Modifications can only be performed at least 2 hours before check-in.",
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
            <p>Modifications can only be performed at least 2 hours before check-in.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <CardContent>
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
            <Button type="submit" disabled={isSaving || !isModifiable}>
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
      </form>
    </div>
  );
}
