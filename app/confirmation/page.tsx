"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BookingProvider, useBooking } from "@/lib/booking-context";
import { parkingLocations, formatCurrency, formatDate, calculateQuote } from "@/lib/data";
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
} from "lucide-react";
import { Suspense, useState } from "react";
import Loading from "./loading";

// Simple QR Code component using a data URL pattern
function QRCodeDisplay({ value, size = 180 }: { value: string; size?: number }) {
  // Generate a simple visual QR-like pattern (for demo purposes)
  // In production, use a library like 'qrcode' to generate actual QR codes
  const cells = 21; // QR code size
  const cellSize = size / cells;
  
  // Create a deterministic pattern based on the value
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };
  
  const seed = hash(value);
  const pattern: boolean[][] = [];
  
  for (let y = 0; y < cells; y++) {
    pattern[y] = [];
    for (let x = 0; x < cells; x++) {
      // Position detection patterns (corners)
      const isCorner = (
        (x < 7 && y < 7) || // Top-left
        (x >= cells - 7 && y < 7) || // Top-right
        (x < 7 && y >= cells - 7) // Bottom-left
      );
      
      if (isCorner) {
        // Corner patterns
        const inOuter = (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
        const cx = x < 7 ? x : x >= cells - 7 ? x - (cells - 7) : x;
        const cy = y < 7 ? y : y;
        const inInner = cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4;
        const onBorder = cx === 0 || cx === 6 || cy === 0 || cy === 6;
        pattern[y][x] = inOuter && (onBorder || inInner);
      } else {
        // Data pattern (pseudo-random based on seed)
        pattern[y][x] = ((seed * (x + 1) * (y + 1)) % 3) === 0;
      }
    }
  }
  
  return (
    <div 
      className="inline-block rounded-lg bg-white p-3"
      style={{ width: size + 24, height: size + 24 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {pattern.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="black"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const confirmationCode = searchParams.get("code") || "PARK" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const { location, checkIn, checkOut, guestInfo, vehicleInfo } = useBooking();
  const [copied, setCopied] = useState(false);

  // Use first location as fallback for demo
  const bookingLocation = location || parkingLocations[0];
  const quote = calculateQuote(bookingLocation, checkIn, checkOut);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(confirmationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                    <QRCodeDisplay value={confirmationCode} size={160} />
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
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Smartphone className="h-4 w-4" />
                        Add to Wallet
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
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
                      {bookingLocation.cancellationPolicy.type === "free" && (
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
                      <p className="text-sm text-muted-foreground">12:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pick-up</p>
                      <p className="font-medium text-foreground">{formatDate(checkOut)}</p>
                      <p className="text-sm text-muted-foreground">12:00 PM</p>
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

            {/* How to Redeem */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  How to Check In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookingLocation.redeemSteps.map((step) => (
                    <div key={step.step} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {step.step}
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
              <Button className="gap-2">
                <Navigation className="h-4 w-4" />
                Get Directions
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
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
    <BookingProvider>
      <Suspense fallback={<Loading />}>
        <ConfirmationContent />
      </Suspense>
    </BookingProvider>
  );
}
