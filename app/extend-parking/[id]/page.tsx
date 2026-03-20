"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getBookingDetails } from "@/lib/actions/booking-actions";
import { createPaymentIntentAction, chargeSavedCardAction } from "@/lib/actions/stripe-actions";
import { extendBookingAction, checkExtensionOverlapAction } from "@/lib/actions/extension-actions";
import { formatCurrency, formatTime, formatDate } from "@/lib/data";
import { Loader2, Clock, Calendar, MapPin, ChevronRight, AlertCircle, CheckCircle2, SquareParking, CreditCard, PlusCircle, Lock, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { MockCardForm } from "@/components/mock-card-form";
import { StripeElementsWrapper } from "@/components/stripe-elements-wrapper";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { isStripeConfigured as isStripeActive } from "@/lib/stripe";
import { useAuth } from "@/lib/auth-context";


const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && stripePublishableKey.length > 0 && !stripePublishableKey.includes("YOUR_PUBLISHABLE_KEY");
const stripePromise = isStripeConfigured ? loadStripe(stripePublishableKey) : null;

function ExtensionForm({ booking, onComplete }: { booking: any, onComplete: (newCheckOut: string) => void }) {
    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const { isAuthenticated } = useAuth();
    const [customHours, setCustomHours] = useState(0.5); // in 0.5-hr steps

    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
    const { toast } = useToast();
    const [taxRate, setTaxRate] = useState(12);
    const [serviceFee, setServiceFee] = useState(5.99);

    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [overlapInfo, setOverlapInfo] = useState<{ hasOverlap: boolean; maxAllowedMinutes: number | null; nextBookingCheckIn?: Date } | null>(null);
    const [savedMethods, setSavedMethods] = useState<any[]>([]);

    useEffect(() => {
        import("@/lib/actions/settings-actions").then(mod => {
            mod.getGeneralSettings().then(settings => {
                if (settings) {
                    setTaxRate(settings.taxRate);
                    setServiceFee(settings.serviceFee);
                }
            });
        });

        // Check for overlaps
        checkExtensionOverlapAction(booking.id).then(res => {
            if (res.success) {
                setOverlapInfo({
                    hasOverlap: res.hasOverlap ?? false,
                    maxAllowedMinutes: res.maxAllowedMinutes ?? null,
                    nextBookingCheckIn: res.nextBookingCheckIn ? new Date(res.nextBookingCheckIn) : undefined
                });
            }
        });

        // Fetch saved payment methods
        const fetchMethods = async () => {
            try {
                const res = await fetch("/api/payment-methods");
                if (res.ok) {
                    const data = await res.json();
                    setSavedMethods(data);
                    if (data.length > 0) {
                        const defaultCard = data.find((c: any) => c.isDefault) || data[0];
                        setSelectedCardId(defaultCard?.id || null);
                        setUseNewCard(false);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch saved payment methods", error);
            }
        };

        fetchMethods();
    }, [booking.id]);

    const options = [
        { label: "30 Minutes", minutes: 30, basePrice: booking.location.pricePerDay / 48 },
        { label: "1 Hour", minutes: 60, basePrice: booking.location.pricePerDay / 24 },
        { label: "2 Hours", minutes: 120, basePrice: booking.location.pricePerDay / 12 },
    ];

    // Filter options based on overlap
    const availableOptions = options.filter(opt => {
        if (overlapInfo?.hasOverlap && overlapInfo.maxAllowedMinutes !== null) {
            return opt.minutes <= overlapInfo.maxAllowedMinutes;
        }
        return true;
    });

    if (isCustomMode) {
        const customMinutes = customHours * 60;
        availableOptions.push({ label: "Custom", minutes: customMinutes, basePrice: (booking.location.pricePerDay / 48) * (customMinutes / 30) });
    }

    // Calculate total price with taxes and fees
    const enrichedOptions = availableOptions.map(opt => {
        const _basePrice = opt.basePrice;
        const subtotal = _basePrice;
        const addTaxes = subtotal * (taxRate / 100);

        // Final price does NOT include a second service fee because it was
        // already paid on the primary booking. No $1.00 minimum.
        const finalPrice = Math.round((subtotal + addTaxes) * 100) / 100;

        return {
            ...opt,
            subtotal,
            taxes: addTaxes,
            price: finalPrice
        };
    });

    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [useNewCard, setUseNewCard] = useState(false);

    const handleExtendClick = async () => {
        if (!selectedDuration) return;

        const option = enrichedOptions.find(o => o.minutes === selectedDuration);
        if (!option) return;

        // If they chose a saved card, process immediately via server action
        if (selectedCardId && !useNewCard) {
             setIsProcessing(true);
             try {
                 const chargeResult = await chargeSavedCardAction({
                     amount: option.price,
                     paymentMethodId: selectedCardId,
                     locationId: booking.locationId,
                     bookingId: booking.id,
                     locationName: booking.location.name,
                 });

                 if (!chargeResult.success) throw new Error(chargeResult.error);

                 // Complete the extension with the actual payment intent ID
                 await handleExtensionSuccess(chargeResult.paymentIntentId as string);
             } catch (err: any) {
                 toast({ title: "Payment Error", description: err.message || "Failed to charge saved card", variant: "destructive" });
             } finally {
                 setIsProcessing(false);
             }
             return;
        }

        // Otherwise show payment UI for deferred intent creation
        setShowPaymentForm(true);
    };


    const handleExtensionSuccess = async (paymentIntentId: string) => {
        if (!selectedDuration) return;
        const option = enrichedOptions.find(o => o.minutes === selectedDuration);
        if (!option) return;

        setIsPaymentSubmitting(true);
        try {
            const extResult = await extendBookingAction(
                booking.id,
                selectedDuration,
                option.price,
                paymentIntentId
            );

            if (extResult.success) {
                toast({ title: "Extension Successful", description: `Your checkout time is now ${formatTime(new Date(extResult.data.checkOut))}` });
                onComplete(extResult.data.checkOut);
            } else {
                throw new Error(extResult.error);
            }
        } catch (err: any) {
            toast({ title: "Extension Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsPaymentSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {overlapInfo?.hasOverlap && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold">Limited Extension Available</p>
                        <p className="opacity-90">
                            Another reservation starts at {formatTime(overlapInfo.nextBookingCheckIn!)}.
                            You can extend for a maximum of <b>{overlapInfo.maxAllowedMinutes} minutes</b>.
                        </p>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {enrichedOptions.filter(o => o.label !== "Custom").map((opt) => (
                    <div
                        key={opt.minutes}
                        onClick={() => { setIsCustomMode(false); setSelectedDuration(opt.minutes); }}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center text-center h-14 ${selectedDuration === opt.minutes && !isCustomMode
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/40"
                            }`}
                    >
                        <p className="font-bold text-sm">{opt.label}</p>
                    </div>
                ))}

                <div
                    onClick={() => {
                        setIsCustomMode(true);
                        setSelectedDuration(customHours * 60);
                    }}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center h-14 ${isCustomMode
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                        }`}
                >
                    <p className="font-bold text-sm">Custom</p>
                </div>
            </div>

            {isCustomMode && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col items-center gap-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Select Custom Duration</label>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => {
                            const newHours = Math.max(0.5, customHours - 0.5);
                            setCustomHours(newHours);
                            setSelectedDuration(newHours * 60);
                        }}>
                            -
                        </Button>
                        <span className="text-xl font-bold w-24 text-center">
                            {customHours % 1 === 0 ? `${customHours} hr` : `${customHours} hr`}
                        </span>
                        <Button variant="outline" size="icon" onClick={() => {
                            const newHours = customHours + 0.5;
                            setCustomHours(newHours);
                            setSelectedDuration(newHours * 60);
                        }}>
                            +
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {customHours * 60} minutes total
                    </p>
                    {overlapInfo?.hasOverlap && overlapInfo.maxAllowedMinutes !== null && customHours * 60 > overlapInfo.maxAllowedMinutes && (
                        <p className="text-xs text-destructive font-bold">
                            ⚠️ Exceeds available time limit ({overlapInfo.maxAllowedMinutes} mins)
                        </p>
                    )}
                </div>
            )}

            {selectedDuration && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center pb-2 border-bottom border-border">
                        <span className="text-sm text-muted-foreground">New Checkout Time:</span>
                        <span className="font-bold text-lg">
                            {formatTime(new Date(booking.checkOut.getTime() + selectedDuration * 60000))}
                        </span>
                    </div>

                    {(() => {
                        const selOpt = enrichedOptions.find(o => o.minutes === selectedDuration);
                        if (!selOpt) return null;
                        return (
                            <div className="space-y-2 border-bottom border-border pb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Extension Cost:</span>
                                    <span>{formatCurrency(selOpt.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Taxes ({taxRate}%):</span>
                                    <span>{formatCurrency(selOpt.taxes)}</span>
                                </div>
                                {/* <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Service Fee:</span>
                                  <span>{formatCurrency(selOpt.fees)}</span>
                                </div> */}
                                <div className="pt-2 border-t flex justify-between items-center">
                                    <span className="font-bold text-amber-600">Amount Due Now:</span>
                                    <span className="text-lg font-bold text-amber-600">{formatCurrency(selOpt.price)}</span>
                                </div>
                                <p className="text-[10px] text-amber-700 mt-2 italic">
                                    * Extensions require payment for the additional duration before changes are saved.
                                </p>
                            </div>
                        )
                    })()}

                    <div className="space-y-3">
                        {/* Saved Cards Selection */}
                        {savedMethods.length > 0 && (
                            <div className="space-y-4 mb-8">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-3.5 h-3.5" /> 
                                        <span>Your Saved Cards</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 tracking-widest">SECURE</span>
                                </label>
                                <div className="grid gap-3">
                                    {savedMethods.map((card) => (
                                        <div
                                            key={card.id}
                                            onClick={() => {
                                                setSelectedCardId(card.id);
                                                setUseNewCard(false);
                                                setShowPaymentForm(false);
                                            }}
                                            className={cn(
                                                "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                                                selectedCardId === card.id && !useNewCard 
                                                    ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/5 scale-[1.01]" 
                                                    : "border-border/50 bg-card hover:border-primary/20 hover:bg-slate-50/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={cn(
                                                    "w-14 h-9 rounded-lg flex items-center justify-center text-[10px] font-black text-white uppercase shadow-inner relative overflow-hidden",
                                                    card.brand === 'visa' ? "bg-[#1A1F71]" :
                                                    card.brand === 'mastercard' ? "bg-[#EB001B]" : "bg-slate-800"
                                                )}>
                                                    {card.brand}
                                                    <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm tracking-tight capitalize">•••• {card.last4}</p>
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}</p>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                selectedCardId === card.id && !useNewCard ? "border-primary bg-primary" : "border-border"
                                            )}>
                                                {selectedCardId === card.id && !useNewCard && <Check className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>
                                    ))}
                                    <div
                                        onClick={() => {
                                            setUseNewCard(true);
                                            setSelectedCardId(null);
                                        }}
                                        className={cn(
                                            "flex items-center gap-5 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
                                            useNewCard 
                                                ? "border-primary bg-primary/[0.03] scale-[1.01]" 
                                                : "border-border/60 bg-slate-50/20 hover:border-primary/40 hover:bg-slate-50/50"
                                        )}
                                    >
                                        <div className="w-14 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                            <PlusCircle className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 text-sm tracking-tight">Use a new card / another method</p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Select your preferred payment option below</p>
                                        </div>
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            useNewCard ? "border-primary bg-primary" : "border-border"
                                        )}>
                                            {useNewCard && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showPaymentForm && (useNewCard || savedMethods.length === 0) ? (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                {!isStripeActive() ? (
                                    <MockCardForm
                                        onSuccess={handleExtensionSuccess}
                                        amount={enrichedOptions.find(o => o.minutes === selectedDuration)?.price || 0}
                                        isSubmitting={isPaymentSubmitting}
                                        setIsSubmitting={setIsPaymentSubmitting}
                                        agreedToTerms={agreedToTerms}
                                        setAgreedToTerms={setAgreedToTerms}
                                    />
                                ) : (
                                    <StripeElementsWrapper 
                                        mode="payment"
                                        amount={Math.round((enrichedOptions.find(o => o.minutes === selectedDuration)?.price || 0) * 100)}
                                        currency="usd"
                                        setupFutureUsage={isAuthenticated ? "off_session" : undefined}
                                    >

                                        <StripePaymentForm
                                            amount={enrichedOptions.find(o => o.minutes === selectedDuration)?.price || 0}
                                            onPaymentSuccess={handleExtensionSuccess}
                                            onPaymentError={(err) => toast({ title: "Payment Error", description: err, variant: "destructive" })}
                                            isSubmitting={isPaymentSubmitting}
                                            setIsSubmitting={setIsPaymentSubmitting}
                                            agreedToTerms={agreedToTerms}
                                            setAgreedToTerms={setAgreedToTerms}
                                            onCreateIntent={async () => {
                                                const option = enrichedOptions.find(o => o.minutes === selectedDuration);
                                                const result = await createPaymentIntentAction({
                                                    amount: option?.price || 0,
                                                    locationId: booking.locationId,
                                                    locationName: booking.location.name,
                                                    guestEmail: booking.guestEmail,
                                                });
                                                if (!result.success) throw new Error(result.error);
                                                return result.clientSecret!;
                                            }}
                                        />
                                    </StripeElementsWrapper>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {selectedCardId && !useNewCard && (
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
                                                . I understand my booking is subject to availability.
                                            </span>
                                        </Label>
                                    </div>
                                )}

                                <Button
                                    className={cn(
                                        "w-full h-16 text-xl font-black uppercase tracking-[0.2em] shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-2xl group",
                                        (agreedToTerms || (!selectedCardId || useNewCard))
                                            ? "bg-slate-950 text-white shadow-primary/20 hover:shadow-primary/30"
                                            : "opacity-40 grayscale"
                                    )}
                                    onClick={handleExtendClick}
                                    disabled={isProcessing || (selectedCardId && !useNewCard && !agreedToTerms) || (overlapInfo?.hasOverlap && overlapInfo.maxAllowedMinutes !== null && selectedDuration! > overlapInfo.maxAllowedMinutes)}
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            <span className="animate-pulse">Processing...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center w-full relative">
                                            <span className="drop-shadow-sm truncate px-8 leading-none">
                                                {overlapInfo?.hasOverlap && overlapInfo.maxAllowedMinutes !== null && selectedDuration! > overlapInfo.maxAllowedMinutes
                                                    ? "Time Slot Unavailable"
                                                    : `Pay ${formatCurrency(enrichedOptions.find(o => o.minutes === selectedDuration)?.price || 0)} & Extend`}
                                            </span>
                                            <Lock className="absolute right-4 h-6 w-6 opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all scale-90 group-hover:scale-100" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ExtendParkingPage() {
    const { id } = useParams() as { id: string };
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [newCheckOut, setNewCheckOut] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const res = await getBookingDetails(id, true);
            if (res.success) {
                setBooking(res.data);
            }
            setLoading(false);
        }
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-medium">Fetching your reservation...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Reservation Not Found</h1>
                <p className="text-muted-foreground max-w-md mb-6">We couldn't find the parking session you're looking for. It may have expired or public access is restricted.</p>
                <Button onClick={() => router.push("/")}>Return Home</Button>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background animate-in fade-in">
                <div className="bg-card border border-border p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-black">Success!</h1>
                    <p className="text-muted-foreground">Your parking session has been successfully extended. A confirmation email has been sent to you.</p>

                    <div className="p-4 bg-muted rounded-2xl space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">New Checkout:</span>
                            <span className="font-bold">{formatTime(new Date(newCheckOut || booking.checkOut))}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span className="font-bold">{booking.location.name}</span>
                        </div>
                    </div>

                    <Button className="w-full h-12 font-bold" onClick={() => router.push("/account/reservations")}>
                        View My Reservations
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tight">Extend Parking</h1>
                            <p className="text-lg text-muted-foreground">Need more time? Extend your session in a few clicks.</p>
                        </div>

                        <Card className="border-none shadow-xl bg-gradient-to-br from-card to-card/50 overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/10">
                                <CardTitle className="text-primary flex items-center gap-2">
                                    <Clock className="w-5 h-5" /> Extension Options
                                </CardTitle>
                                <CardDescription>Select how long you'd like to extend your stay.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <Elements stripe={stripePromise}>
                                    <ExtensionForm booking={booking} onComplete={(checkOut) => { setNewCheckOut(checkOut); setCompleted(true); }} />
                                </Elements>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-border/50 shadow-lg sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold">Booking Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold leading-tight">{booking.location.name}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{booking.location.address}</p>
                                    </div>
                                </div>

                                {/* Assigned Spot */}
                                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                        <SquareParking className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Assigned Spot</p>
                                        <p className="font-black text-lg leading-tight">
                                            {booking.spotIdentifier || "General Parking"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Check-in</p>
                                        <p className="font-bold text-sm">{formatTime(booking.checkIn)}</p>
                                        <p className="text-[10px] text-muted-foreground">{formatDate(booking.checkIn)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground text-primary">Checkout</p>
                                        <p className="font-bold text-sm">{formatTime(booking.checkOut)}</p>
                                        <p className="text-[10px] text-muted-foreground">{formatDate(booking.checkOut)}</p>
                                    </div>
                                </div>

                                {/*  */}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
