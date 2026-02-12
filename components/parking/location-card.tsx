"use client";

import Link from "next/link";
import type { ParkingLocation } from "@/lib/types";
import { formatCurrency, getAvailabilityStatus, calculateQuote } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Star,
  MapPin,
  Bus,
  Shield,
  Car,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface LocationCardProps {
  location: ParkingLocation;
  checkIn: Date;
  checkOut: Date;
  days: number;
}

export function LocationCard({ location, checkIn, checkOut, days }: LocationCardProps) {
  const quote = calculateQuote(location, checkIn, checkOut);
  const availability = getAvailabilityStatus(location);

  return (
    <div className={cn(
      "group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg",
      availability.status === "soldout"
        ? "border-border opacity-60"
        : "border-border"
    )}>
      <div className="flex flex-col sm:flex-row">
        {/* Image Section */}
        <div className="relative h-52 w-full shrink-0 bg-muted sm:w-64 md:w-72 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0">
            {location.images && location.images.length > 0 ? (
              <img
                src={location.images[0]}
                alt={location.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Car className="h-16 w-16 text-primary/30" />
              </div>
            )}
          </div>

          {/* Top badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {quote.savings > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                Save {formatCurrency(quote.savings)}
              </Badge>
            )}
            {location.cancellationPolicy?.type === "free" && (
              <Badge variant="secondary" className="bg-card/90 text-foreground backdrop-blur-sm">
                <CheckCircle className="mr-1 h-3 w-3 text-primary" />
                Free Cancellation
              </Badge>
            )}
          </div>

          {/* Bottom badges */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
            {location.shuttle && (
              <div className="flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                <Bus className="h-3 w-3 text-primary" />
                Free Shuttle
              </div>
            )}
            {location.valet && (
              <div className="flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                <Zap className="h-3 w-3" />
                Valet
              </div>
            )}
          </div>

          {/* Sold out overlay */}
          {availability.status === "soldout" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="secondary" className="text-sm">Sold Out</Badge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex-1">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/parking/${location.id}`}
                  className="text-lg font-semibold text-foreground hover:text-primary"
                >
                  {location.name}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{location.distance}</span>
                  <span>·</span>
                  <span>{location.airport}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-semibold text-foreground">{location.rating || "0.0"}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  ({(location.reviewCount || 0).toLocaleString()})
                </span>
              </div>
            </div>

            {/* Amenities */}
            <div className="mb-3 flex flex-wrap gap-3">
              {location.covered && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Covered
                </span>
              )}
              {location.open24Hours && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  24/7
                </span>
              )}
              {location.amenities.includes("EV Charging") && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" />
                  EV Charging
                </span>
              )}
            </div>

            {/* Availability Status & Trust Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                availability.status === "soldout"
                  ? "text-destructive"
                  : availability.status === "limited"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-primary"
              )}>
                {availability.status === "soldout" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : availability.status === "limited" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {availability.message}
              </div>

              {availability.status !== "soldout" && (
                <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Shield className="h-3 w-3" />
                  Safety Assured
                </div>
              )}
            </div>
          </div>

          {/* Price & CTA */}
          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(quote.totalPrice)}
                </span>
                {quote.savings > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(location.originalPrice * days + quote.taxes + quote.fees)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(location.pricePerDay)}/day · {days.toFixed(2)} day{days > 1 ? "s" : ""} · incl. taxes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/parking/${location.id}`}>
                <Button disabled={availability.status === "soldout"}>
                  {availability.status === "soldout" ? "Sold Out" : "Select"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
