"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BookingProvider, useBooking } from "@/lib/booking-context";
import { formatCurrency, formatDate, formatTime, calculateQuote } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Car,
  Phone,
  Mail,
  Printer,
  Download,
  Share,
  Navigation,
  Bus,
  QrCode,
  Copy,
  Smartphone,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Suspense, useState, useEffect } from "react";
import Loading from "./loading";

import QRCode from "react-qr-code";

import { getBookingByConfirmationCode } from "@/lib/actions/booking-actions";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { location: contextLocation, checkIn: contextCheckIn, checkOut: contextCheckOut } = useBooking();
  
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      if (!code) {
        setIsLoading(false);
        return;
      }
      
      const response = await getBookingByConfirmationCode(code);
      if (response.success && response.data) {
        setBooking(response.data);
      }
      setIsLoading(false);
    }
    fetchBooking();
  }, [code]);

  const handleCopyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Confirmation code copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const receiptContent = `
PARKEASE RESERVATION RECEIPT
===========================
Confirmation Code: ${confirmationCode}
Status: CONFIRMED

LOCATION DETAILS
----------------
Name: ${bookingLocation.name}
Address: ${bookingLocation.address}

RESERVATION DETAILS
-------------------
Drop-off: ${formatDate(checkIn)} ${formatTime(checkIn)}
Pick-up: ${formatDate(checkOut)} ${formatTime(checkOut)}
Duration: ${quote.days} day(s)

GUEST INFORMATION
-----------------
Name: ${guestInfo ? `${guestInfo.firstName} ${guestInfo.lastName}` : "N/A"}
Email: ${guestInfo?.email || "N/A"}
Phone: ${guestInfo?.phone || "N/A"}

VEHICLE INFORMATION
-------------------
Make/Model: ${vehicleInfo ? `${vehicleInfo.make} ${vehicleInfo.model}` : "N/A"}
License Plate: ${vehicleInfo?.licensePlate || "N/A"}

PAYMENT SUMMARY
---------------
Base Rate: ${formatCurrency(bookingLocation.pricePerDay)}/day
Subtotal: ${formatCurrency(quote.basePrice)}
Taxes & Fees: ${formatCurrency(quote.taxes + quote.fees)}
TOTAL PAID: ${formatCurrency(quote.totalPrice)}

===========================
Thank you for booking with ParkEase!
Visit our website at parkease.com for help.
    `.trim();

    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ParkEase-Reservation-${confirmationCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Your reservation receipt has been saved.",
    });
  };

  const handleAddToWallet = () => {
    // Generate .ics file content
    const formatDateICS = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const start = formatDateICS(checkIn);
    const end = formatDateICS(checkOut);
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ParkEase//Reservation//EN",
      "BEGIN:VEVENT",
      `UID:${confirmationCode}@parkease.com`,
      `DTSTAMP:${formatDateICS(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Parking Reservation: ${bookingLocation.name}`,
      `DESCRIPTION:Confirmation Code: ${confirmationCode}\\nAddress: ${bookingLocation.address}\\nVehicle: ${vehicleInfo?.make} ${vehicleInfo?.model}`,
      `LOCATION:${bookingLocation.address}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\\r\\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ParkEase-${confirmationCode}.ics`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Added to Calendar",
      description: "Reservation event has been saved to your device.",
    });
  };

  const handleGetDirections = () => {
    if (!bookingLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(bookingLocation.address)}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your confirmation...</p>
      </div>
    );
  }

  if (!booking && !code) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">No Booking Found</h2>
        <p className="text-muted-foreground mb-6">We couldn't find a booking with that code.</p>
        <Link href="/parking">
          <Button>Search Parking</Button>
        </Link>
      </div>
    );
  }

  // Use DB data if available, otherwise fallback to context (for immediate post-booking view)
  const confirmationCode = booking?.confirmationCode || code || "";
  const bookingLocation = booking?.location || contextLocation;
  
  if (!bookingLocation) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Location Details Missing</h2>
        <p className="text-muted-foreground mb-6">We couldn't load the parking location details.</p>
        <Link href="/parking">
          <Button>Search Parking</Button>
        </Link>
      </div>
    );
  }

  const checkIn = booking ? new Date(booking.checkIn) : contextCheckIn;
  const checkOut = booking ? new Date(booking.checkOut) : contextCheckOut;
  const guestInfo = booking ? {
    firstName: booking.guestFirstName,
    lastName: booking.guestLastName,
    email: booking.guestEmail,
    phone: booking.guestPhone
  } : null;
  const vehicleInfo = booking ? {
    make: booking.vehicleMake,
    model: booking.vehicleModel,
    color: booking.vehicleColor,
    licensePlate: booking.vehiclePlate
  } : null;

  const quote = calculateQuote(bookingLocation, checkIn, checkOut);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="container px-4 py-8 md:py-12">
          {/* Success Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
              Reservation Confirmed!
            </h1>
            <p className="text-muted-foreground">
              Your parking spot has been reserved. A confirmation email has been sent to your inbox.
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            {/* QR Code and Confirmation Card */}
            <Card className="overflow-hidden">
              <div className="bg-primary/5 p-6 md:p-8">
                <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
                  {/* QR Code */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-xl">
                      <QRCode value={confirmationCode} size={160} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Scan at entry gate
                    </p>
                  </div>

                  {/* Confirmation Details */}
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-sm text-muted-foreground">Confirmation Code</p>
                    <div className="mt-1 flex items-center justify-center gap-2 md:justify-start">
                      <p className="text-3xl font-bold tracking-wider text-foreground">
                        {confirmationCode}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCopyCode}
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleAddToWallet}>
                        <Smartphone className="h-4 w-4" />
                        Add to Wallet
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Location */}
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                    <div className="flex h-full items-center justify-center">
                      <Car className="h-10 w-10 text-primary/40" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{bookingLocation.name}</h3>
                    <p className="text-sm text-muted-foreground">{bookingLocation.address}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {bookingLocation.shuttle && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          <Bus className="h-3 w-3" />
                          Free Shuttle
                        </span>
                      )}
                      {bookingLocation.cancellationPolicy?.type === "free" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          Free Cancellation
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dates & Times */}
                <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Drop-off</p>
                      <p className="font-medium text-foreground">{formatDate(checkIn)}</p>
                      <p className="text-sm text-muted-foreground">{formatTime(checkIn)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pick-up</p>
                      <p className="font-medium text-foreground">{formatDate(checkOut)}</p>
                      <p className="text-sm text-muted-foreground">{formatTime(checkOut)}</p>
                    </div>
                  </div>
                </div>

                {/* Duration & Price */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{quote.days} day{quote.days > 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(quote.totalPrice)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guest & Vehicle Info */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Guest Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {guestInfo?.firstName?.charAt(0) || "J"}
                    </div>
                    <span className="text-foreground">
                      {guestInfo ? `${guestInfo.firstName} ${guestInfo.lastName}` : "John Doe"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{guestInfo?.email || "john@example.com"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{guestInfo?.phone || "(555) 123-4567"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vehicle Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">
                      {vehicleInfo ? `${vehicleInfo.make} ${vehicleInfo.model}` : "Toyota Camry"}
                    </span>
                  </div>
                  {vehicleInfo?.color && (
                    <p className="pl-8 text-sm text-muted-foreground">
                      Color: {vehicleInfo.color}
                    </p>
                  )}
                  <p className="pl-8 text-sm text-muted-foreground">
                    License: {vehicleInfo?.licensePlate || "ABC 1234"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* How to Redeem & Directions */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    How to Check In
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(bookingLocation.redeemSteps || [
                      { step: 1, title: "Arrive at Facility", description: "Arrive 15-20 mins before your desired airport arrival time." },
                      { step: 2, title: "Show Confirmation", description: "Present this confirmation to the attendant or scan QR code." },
                      { step: 3, title: "Park Your Vehicle", description: "Follow attendant instructions or look for any open spot." },
                      { step: 4, title: "Take the Shuttle", description: "Board the complimentary shuttle to your terminal." }
                    ]).map((step: any) => (
                      <div key={step.step} className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {step.step}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Navigation className="h-5 w-5 text-primary" />
                    How to Return
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { step: 1, title: "Collect Luggage", description: "Once you land and collect your bags, call the shuttle service." },
                      { step: 2, title: "Find Pick-up Point", description: "Head to the designated 'Off-Airport' shuttle area." },
                      { step: 3, title: "Show Receipt", description: "Present your confirmation when exiting the lot if required." },
                      { step: 4, title: "Safe Travels", description: "Your car will be ready or where you left it. Have a safe drive!" }
                    ].map((step: any) => (
                      <div key={step.step} className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {step.step}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Important Notes */}
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-900/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
                  <QrCode className="h-5 w-5" />
                  Important Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-amber-800/80 dark:text-amber-200/80">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Please have your license plate number ready when arriving.</li>
                  <li>Over-sized vehicles (e.g., campers, large trucks) may be subject to additional fees.</li>
                  <li>The shuttle frequency is typically every 15-20 minutes.</li>
                  <li>Your reservation is guaranteed for the dates and times selected.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Shuttle Information */}
            {bookingLocation.shuttleInfo && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bus className="h-5 w-5 text-primary" />
                    Shuttle Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="font-medium text-foreground">{bookingLocation.shuttleInfo.hours}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Frequency</p>
                      <p className="font-medium text-foreground">{bookingLocation.shuttleInfo.frequency}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Pickup Instructions</p>
                    <p className="text-foreground">{bookingLocation.shuttleInfo.pickupInstructions}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <a
                      href={`tel:${bookingLocation.shuttleInfo.phone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {bookingLocation.shuttleInfo.phone}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button className="gap-2" onClick={handleGetDirections}>
                <Navigation className="h-4 w-4" />
                Get Directions
              </Button>
              <Button 
                variant="outline" 
                className="gap-2 bg-transparent"
                onClick={() => {
                  const SUPPORT_PHONE = "(800) 555-0199";
                  const facilityPhone = bookingLocation.shuttleInfo?.phone || bookingLocation.owner?.user?.phone;
                  const phoneToCall = facilityPhone || SUPPORT_PHONE;
                  
                  if (phoneToCall) {
                    window.location.href = `tel:${phoneToCall.replace(/[^\d+]/g, '')}`;
                  } else {
                    toast({
                      title: "Contact Info",
                      description: "Contact information not available.",
                    });
                  }
                }}
              >
                <Phone className="h-4 w-4" />
                Contact Parking Lot
              </Button>
              <Link href="/">
                <Button variant="ghost" className="w-full sm:w-auto">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConfirmationContent />
    </Suspense>
  );
}
