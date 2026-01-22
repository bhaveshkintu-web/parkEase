"use client";

import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BookingWidget } from "@/components/parking/booking-widget";
import { AmenitiesList } from "@/components/parking/amenities-list";
import { ReviewsSection } from "@/components/parking/reviews-section";
import { ShuttleInfoCard } from "@/components/parking/shuttle-info";
import { RedeemStepsCard, SpecialInstructionsCard } from "@/components/parking/redeem-steps";
import { BookingProvider, useBooking } from "@/lib/booking-context";
import { parkingLocations, getAvailabilityStatus, formatCurrency, calculateQuote } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Star,
  MapPin,
  Clock,
  Bus,
  Shield,
  Car,
  Share,
  Heart,
  Navigation,
  Phone,
  CheckCircle,
  Zap,
  ParkingCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { use } from "react";

function LocationDetailsContent({ id }: { id: string }) {
  const location = parkingLocations.find((l) => l.id === id);
  const { checkIn, checkOut, setLocation } = useBooking();

  if (!location) {
    notFound();
  }

  const availability = getAvailabilityStatus(location);
  const quote = calculateQuote(location, checkIn, checkOut);

  // Find nearby alternatives
  const nearbyLocations = parkingLocations
    .filter((l) => l.id !== location.id && l.airportCode === location.airportCode)
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background">
        <div className="container px-4 py-6">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/parking">Parking</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/parking?q=${location.airportCode}`}>
                  {location.airportCode}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{location.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                  {location.name}
                </h1>
                {availability.status === "limited" && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    {availability.message}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-semibold text-foreground">{location.rating}</span>
                  <span className="text-muted-foreground">
                    ({location.reviewCount.toLocaleString()} reviews)
                  </span>
                </div>
                <span className="text-muted-foreground">·</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{location.distance}</span>
                </div>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{location.airport}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Share className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Heart className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          {/* Image Gallery */}
          <div className="relative mb-8 grid gap-2 overflow-hidden rounded-xl md:grid-cols-4 md:grid-rows-2">
            <div className="relative col-span-2 row-span-2 aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 md:aspect-auto">
              <div className="absolute inset-0 flex items-center justify-center">
                <Car className="h-24 w-24 text-primary/30" />
              </div>
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {location.shuttle && (
                  <Badge className="gap-1 bg-primary">
                    <Bus className="h-3 w-3" />
                    Free Shuttle
                  </Badge>
                )}
                {location.cancellationPolicy.type === "free" && (
                  <Badge variant="secondary" className="gap-1 bg-card/90 text-foreground">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Free Cancellation
                  </Badge>
                )}
              </div>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="hidden aspect-video bg-gradient-to-br from-muted to-muted/50 md:block"
              >
                <div className="flex h-full items-center justify-center">
                  <Car className="h-12 w-12 text-muted-foreground/30" />
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 gap-2"
            >
              Show all photos
            </Button>
          </div>

          {/* Main Content */}
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              {/* Quick Info Badges */}
              <div className="flex flex-wrap gap-3">
                {location.shuttle && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
                    <Bus className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Free Shuttle</span>
                  </div>
                )}
                {location.covered && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                    <ParkingCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Covered</span>
                  </div>
                )}
                {location.valet && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Valet Available</span>
                  </div>
                )}
                {location.open24Hours && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Open 24/7</span>
                  </div>
                )}
                {location.heightLimit && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 dark:bg-amber-900/30">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Height Limit: {location.heightLimit}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>About this parking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{location.description}</p>
                </CardContent>
              </Card>

              {/* Cancellation Policy */}
              <Card className={cn(
                location.cancellationPolicy.type === "free" && "border-primary/20 bg-primary/5"
              )}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    location.cancellationPolicy.type === "free" ? "bg-primary/10" : "bg-muted"
                  )}>
                    <CheckCircle className={cn(
                      "h-5 w-5",
                      location.cancellationPolicy.type === "free" ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {location.cancellationPolicy.type === "free" 
                        ? "Free Cancellation" 
                        : location.cancellationPolicy.type === "partial"
                        ? "Partial Refund Available"
                        : "Non-Refundable"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {location.cancellationPolicy.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Shuttle Info */}
              {location.shuttleInfo && <ShuttleInfoCard shuttleInfo={location.shuttleInfo} />}

              {/* How to Redeem */}
              <RedeemStepsCard steps={location.redeemSteps} />

              {/* Special Instructions */}
              {location.specialInstructions && (
                <SpecialInstructionsCard instructions={location.specialInstructions} />
              )}

              {/* Amenities */}
              <AmenitiesList amenities={location.amenities} />

              {/* Security Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Security Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {location.securityFeatures.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Location Map */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{location.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {location.distance} from {location.airport}
                      </p>
                    </div>
                  </div>
                  {/* Map Placeholder */}
                  <div className="relative h-64 overflow-hidden rounded-lg bg-muted">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Navigation className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Interactive map</p>
                      </div>
                    </div>
                    <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary shadow-lg">
                      <MapPin className="h-5 w-5 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                      <Navigation className="h-4 w-4" />
                      Get Directions
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                      <Phone className="h-4 w-4" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <ReviewsSection rating={location.rating} reviewCount={location.reviewCount} />

              {/* Nearby Options */}
              {nearbyLocations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Need more options?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {nearbyLocations.map((nearby) => (
                        <Link
                          key={nearby.id}
                          href={`/parking/${nearby.id}`}
                          className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{nearby.name}</p>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                              <Star className="h-3 w-3 fill-accent text-accent" />
                              <span>{nearby.rating}</span>
                              <span>·</span>
                              <span>{nearby.distance}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(nearby.pricePerDay)}
                            </p>
                            <p className="text-xs text-muted-foreground">per day</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Button variant="outline" className="mt-4 w-full bg-transparent" asChild>
                      <Link href={`/parking?q=${location.airportCode}`}>
                        View all {location.airportCode} parking
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Booking Widget - Desktop */}
            <div className="hidden lg:block">
              <BookingWidget location={location} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Booking Bar */}
      <div className="sticky bottom-0 border-t border-border bg-card p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(quote.totalPrice)}
              <span className="text-sm font-normal text-muted-foreground"> total</span>
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="font-medium">{location.rating}</span>
              <span className="text-muted-foreground">· {quote.days} days</span>
            </div>
          </div>
          <Link href="/checkout" onClick={() => setLocation(location)}>
            <Button size="lg" disabled={availability.status === "soldout"}>
              {availability.status === "soldout" ? "Sold Out" : "Reserve Now"}
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function LocationDetailsPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Handle both Promise and direct object params for compatibility
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  
  return (
    <BookingProvider>
      <LocationDetailsContent id={resolvedParams.id} />
    </BookingProvider>
  );
}
