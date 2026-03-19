"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { payOverstayAction, getOverstaySessionAction } from "@/lib/actions/overstay-actions";
import { formatCurrency, formatTime, formatDate } from "@/lib/data";
import { Loader2, Clock, Calendar, MapPin, AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MockCardForm } from "@/components/mock-card-form";
import { useAuth } from "@/lib/auth-context";
import { StripeElementsWrapper } from "@/components/stripe-elements-wrapper";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { isStripeConfigured as isStripeActive } from "@/lib/stripe";
import { createPaymentIntentAction, chargeSavedCardAction } from "@/lib/actions/stripe-actions";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && stripePublishableKey.length > 0 && !stripePublishableKey.includes("YOUR_PUBLISHABLE_KEY");
const stripePromise = isStripeConfigured ? loadStripe(stripePublishableKey) : null;

function OverstayPaymentForm({ booking, onComplete }: { booking: any, onComplete: () => void }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const { user, isAuthenticated } = useAuth();

    // Saved Cards
    const [savedCards, setSavedCards] = useState<any[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [useNewCard, setUseNewCard] = useState(true);

    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const overstayCharge = (booking as any).parkingSession?.overstayCharge || 0;

    useEffect(() => {
        if (isAuthenticated && user) {
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
            fetchSavedCards();
        }
    }, [isAuthenticated, user]);

    const handlePaymentSuccess = async (paymentIntentId: string) => {
        if (overstayCharge <= 0) return;

        setIsProcessing(true);
        try {
            const payResult = await payOverstayAction(
                booking.id,
                overstayCharge,
                paymentIntentId
            );

            if (payResult.success) {
                toast({ title: "Payment Successful", description: "Your overstay charge has been settled." });
                onComplete();
            } else {
                throw new Error((payResult as any).error);
            }
        } catch (err: any) {
            toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    const handlePaymentIntentCreated = async () => {
        if (!agreedToTerms) {
            toast({ title: "Agreement Required", description: "You must agree to the terms to proceed.", variant: "destructive" });
            return;
        }

        // 1. Saved Card Flow
        if (selectedCardId && !useNewCard) {
            setIsProcessing(true);
            try {
                const chargeResult = await chargeSavedCardAction({
                    amount: overstayCharge,
                    paymentMethodId: selectedCardId,
                    locationId: booking.locationId,
                    bookingId: booking.id,
                    locationName: booking.location.name,
                });

                if (!chargeResult.success) throw new Error(chargeResult.error);

                await handlePaymentSuccess(chargeResult.paymentIntentId as string);
            } catch (err: any) {
                toast({ title: "Payment Error", description: err.message || "Failed to charge saved card", variant: "destructive" });
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // 2. New Card Flow (Create Intent)
        setIsProcessing(true);
        try {
            const result = await createPaymentIntentAction({
                amount: overstayCharge,
                locationId: booking.locationId,
                locationName: booking.location.name,
                guestEmail: booking.guestEmail,
            });

            if (!result.success) throw new Error(result.error);

            if (result.clientSecret) {
                setClientSecret(result.clientSecret);
                setShowPaymentForm(true);
            }
        } catch (err: any) {
            toast({ title: "Payment Error", description: err.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-red-600 text-white rounded-2xl shadow-xl space-y-2 text-center">
                <p className="text-sm font-bold uppercase tracking-widest opacity-80">Total Overstay Charge</p>
                <p className="text-4xl font-black tracking-tighter">
                    {formatCurrency(overstayCharge)}
                </p>
            </div>

            <div className="space-y-6">
                {/* Saved Cards Section */}
                {isAuthenticated && savedCards.length > 0 && !showPaymentForm && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Saved Cards</label>
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
                                        selectedCardId === card.id && !useNewCard ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/20"
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
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase italic">Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}</p>
                                        </div>
                                    </div>
                                    {selectedCardId === card.id && !useNewCard && <CheckCircle2 className="w-5 h-5 text-primary" />}
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
                                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center font-bold text-lg">
                                    +
                                </div>
                                <p className="font-bold text-sm">Use a new card</p>
                                {useNewCard && <CheckCircle2 className="ml-auto w-5 h-5 text-primary" />}
                            </div>
                        </div>
                    </div>
                )}

                {showPaymentForm && clientSecret && useNewCard ? (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                        {!isStripeActive() ? (
                            <MockCardForm
                                onSuccess={handlePaymentSuccess}
                                amount={overstayCharge}
                                isSubmitting={isProcessing}
                                setIsSubmitting={setIsProcessing}
                                agreedToTerms={agreedToTerms}
                                setAgreedToTerms={setAgreedToTerms}
                                showWallet={true}
                            />
                        ) : (
                                <StripeElementsWrapper clientSecret={clientSecret}>
                                    <StripePaymentForm
                                        clientSecret={clientSecret}
                                        amount={overstayCharge}
                                        onPaymentSuccess={handlePaymentSuccess}
                                        onPaymentError={(err) => toast({ title: "Payment Error", description: err, variant: "destructive" })}
                                        isSubmitting={isProcessing}
                                        setIsSubmitting={setIsProcessing}
                                        agreedToTerms={agreedToTerms}
                                        setAgreedToTerms={setAgreedToTerms}
                                    />
                                </StripeElementsWrapper>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-slate-50/50">
                            <input
                                type="checkbox"
                                id="terms"
                                className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                            />
                            <label htmlFor="terms" className="flex-1 block text-[11px] font-medium text-muted-foreground leading-tight cursor-pointer">
                                I agree to the <span className="text-primary underline font-bold">Terms of Service</span> and <span className="text-primary underline font-bold">Cancellation Policy</span>.
                            </label>
                        </div>

                        <Button
                            className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 bg-black hover:bg-zinc-900 rounded-2xl transition-all active:scale-[0.98]"
                            onClick={handlePaymentIntentCreated}
                            disabled={isProcessing || !agreedToTerms}
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                            Pay {formatCurrency(overstayCharge)}
                        </Button>
                    </div>
                )}
            </div>

            <p className="text-[10px] text-center text-muted-foreground font-medium italic">
                Secure 256-bit SSL encrypted payment processing.
            </p>
        </div>
    );
}

export default function OverstayPaymentPage() {
    const { id } = useParams() as { id: string };
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const res = await getOverstaySessionAction(id);
            if (res.success) {
                setBooking(res.data);
                // If already paid, or no overstay, redirect
                if ((res.data as any).parkingSession?.paymentStatus === "PAID") {
                    setCompleted(true);
                }
            }
            setLoading(false);
        }
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="mt-4 font-medium opacity-70 italic">Processing your request...</p>
            </div>
        );
    }

    if (!booking || !(booking as any).parkingSession) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
                <p className="text-muted-foreground max-w-md mb-6">We couldn't find the overstay session. It may have already been cleared or public access is restricted.</p>
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
                    <h1 className="text-3xl font-black">Payment Complete!</h1>
                    <p className="text-muted-foreground">Your overstay payment has been processed successfully. You can now inform the watchman that you are cleared for checkout.</p>

                    <Card className="bg-muted/50 border-none">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="font-bold text-green-600 italic">PAID & CLEARED</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Amount Paid:</span>
                                <span className="font-bold">{formatCurrency((booking as any).parkingSession.overstayCharge)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full h-12 font-bold" onClick={() => router.push("/account/reservations")}>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="container max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tight text-red-600 flex items-center gap-3">
                                <AlertTriangle className="w-10 h-10" />
                                Payment Required
                            </h1>
                            <p className="text-lg text-muted-foreground">An overstay has been detected for your parking session.</p>
                        </div>

                        <Card className="border-none shadow-2xl overflow-hidden">
                            <CardHeader className="bg-red-50 border-b border-red-100 italic">
                                <CardTitle className="text-red-700 flex items-center gap-2">
                                    <Clock className="w-5 h-5 font-bold" /> Overstay Details
                                </CardTitle>
                                <CardDescription className="text-red-600 font-medium opacity-80 font-black italic">
                                    You have exceeded your booked time by {(booking as any).parkingSession.overstayMinutes} minutes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <OverstayPaymentForm booking={booking} onComplete={() => setCompleted(true)} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="sticky top-24 space-y-6">
                            <Card className="border-border shadow-lg overflow-hidden">
                                <CardHeader className="bg-muted/30">
                                    <CardTitle className="text-lg font-bold">Booking Reference</CardTitle>
                                    <CardDescription className="font-medium opacity-80 italic">#{booking.id.slice(-8).toUpperCase()}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold leading-tight">{booking.location.name}</p>
                                                <p className="text-sm text-muted-foreground mt-1">{booking.location.address}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Original Checkout</p>
                                                <p className="font-bold text-sm">{formatTime(booking.checkOut)}</p>
                                                <p className="text-[10px] text-muted-foreground">{formatDate(booking.checkOut)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-black tracking-widest text-red-600">Current Time</p>
                                                <p className="font-bold text-sm">{formatTime(new Date())}</p>
                                                <p className="text-[10px] text-muted-foreground italic text-red-500 font-medium">LATE</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-sm italic font-medium shadow-lg shadow-amber-500/5">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <p>Once paid, the watchman's scanner will automatically update and allow you to exit immediately.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
