"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useBooking } from "@/lib/booking-context";
import type { ParkingLocation } from "@/lib/types";
import { formatCurrency, formatDate, calculateQuote, getAvailabilityStatus } from "@/lib/data";
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Shield, 
  Clock, 
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingWidgetProps {
  location: ParkingLocation;
}

export function BookingWidget({ location }: BookingWidgetProps) {
  const router = useRouter();
  const { checkIn, checkOut, setCheckIn, setCheckOut, setLocation } = useBooking();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const quote = calculateQuote(location, checkIn, checkOut);
  const availability = getAvailabilityStatus(location);

  const handleReserve = async () => {
    setIsLoading(true);
    setLocation(location);
    // Simulate hold creation
    await new Promise(resolve => setTimeout(resolve, 500));
    router.push("/checkout");
  };

  const getCancellationText = () => {
    if (!location.cancellationPolicy) {
      return "Non-refundable";
    }

    switch (location.cancellationPolicy.type) {
      case "free":
        return `Free cancellation ${location.cancellationPolicy.deadline}`;
      case "partial":
        return `Partial refund ${location.cancellationPolicy.deadline}`;
      default:
        return "Non-refundable";
    }
  };

  return (
    <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-lg">
      {/* Availability Status */}
      {availability.status !== "available" && (
        <div className={cn(
          "mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
          availability.status === "soldout" 
            ? "bg-destructive/10 text-destructive"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
        )}>
          <AlertCircle className="h-4 w-4" />
          {availability.message}
        </div>
      )}

      {/* Price Header */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            {formatCurrency(quote.totalPrice)}
          </span>
          {quote.savings > 0 && (
            <span className="text-lg text-muted-foreground line-through">
              {formatCurrency((location.originalPrice || location.pricePerDay) * quote.days + quote.taxes + quote.fees)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(location.pricePerDay)}/day · {quote.days} day{quote.days > 1 ? "s" : ""}
        </p>
        {quote.savings > 0 && (
          <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary">
            Save {formatCurrency(quote.savings)}
          </Badge>
        )}
      </div>

      {/* Date Selection */}
      <div className="mb-4 rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-border">
          <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger asChild>
              <button className="flex flex-col items-start p-3 text-left transition-colors hover:bg-muted">
                <span className="text-xs font-medium text-muted-foreground">DROP-OFF</span>
                <span className="text-sm font-medium text-foreground">{formatDate(checkIn)}</span>
                <span className="text-xs text-muted-foreground">12:00 PM</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={(date) => {
                  if (date) {
                    const newDate = new Date(date);
                    newDate.setHours(12, 0, 0, 0);
                    setCheckIn(newDate);
                    if (newDate >= checkOut) {
                      const newCheckOut = new Date(newDate);
                      newCheckOut.setDate(newCheckOut.getDate() + 1);
                      setCheckOut(newCheckOut);
                    }
                    setCheckInOpen(false);
                  }
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger asChild>
              <button className="flex flex-col items-start p-3 text-left transition-colors hover:bg-muted">
                <span className="text-xs font-medium text-muted-foreground">PICK-UP</span>
                <span className="text-sm font-medium text-foreground">{formatDate(checkOut)}</span>
                <span className="text-xs text-muted-foreground">12:00 PM</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={(date) => {
                  if (date) {
                    const newDate = new Date(date);
                    newDate.setHours(12, 0, 0, 0);
                    setCheckOut(newDate);
                    setCheckOutOpen(false);
                  }
                }}
                disabled={(date) => date <= checkIn}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Reserve Button */}
      <Button 
        onClick={handleReserve} 
        className="mb-4 w-full" 
        size="lg"
        disabled={availability.status === "soldout" || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Reserving...
          </>
        ) : availability.status === "soldout" ? (
          "Sold Out"
        ) : (
          "Reserve Now"
        )}
      </Button>

      <p className="mb-4 text-center text-xs text-muted-foreground">
        You won't be charged yet
      </p>

      {/* Price Breakdown */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(location.pricePerDay)} x {quote.days} day{quote.days > 1 ? "s" : ""}
          </span>
          <span className="text-foreground">{formatCurrency(quote.basePrice)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Taxes</span>
          <span className="text-foreground">{formatCurrency(quote.taxes)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Service fee</span>
          <span className="text-foreground">{formatCurrency(quote.fees)}</span>
        </div>
        {quote.savings > 0 && (
          <div className="flex items-center justify-between text-sm text-primary">
            <span>Your savings</span>
            <span>-{formatCurrency(quote.savings)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
          <span className="text-foreground">Total</span>
          <span className="text-foreground">{formatCurrency(quote.totalPrice)}</span>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-primary" />
          <span>{getCancellationText()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>Best price guarantee</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span>Instant confirmation</span>
        </div>
      </div>
    </div>
  );
}
