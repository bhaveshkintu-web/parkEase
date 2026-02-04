"use client";

import React from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BookingWidget } from "@/components/parking/booking-widget";
import { AmenitiesList } from "@/components/parking/amenities-list";
import { ReviewsSection } from "@/components/parking/reviews-section";
import { ShuttleInfoCard } from "@/components/parking/shuttle-info";
import { RedeemStepsCard, SpecialInstructionsCard } from "@/components/parking/redeem-steps";
import { BookingProvider, useBooking } from "@/lib/booking-context";
import { getAvailabilityStatus, formatCurrency, calculateQuote } from "@/lib/data";
import { getParkingLocationById, getNearbyParkingLocations } from "@/lib/actions/parking-actions";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { use } from "react";

function LocationDetailsContent({ id }: { id: string }) {
  const router = useRouter();
  const [location, setLocationData] = React.useState<any>(null);
  const [nearbyLocations, setNearbyLocations] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const { checkIn, checkOut, setLocation } = useBooking();

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const locResponse = await getParkingLocationById(id);
      if (locResponse.success && locResponse.data) {
        setLocationData(locResponse.data);

        // Fetch nearby locations once we have the airport code
        if (locResponse.data.airportCode) {
          const nearbyResponse = await getNearbyParkingLocations(locResponse.data.airportCode, locResponse.data.id);
          if (nearbyResponse.success && nearbyResponse.data) {
            setNearbyLocations(nearbyResponse.data);
          }
        }
      }
      setIsLoading(false);
    }
    fetchData();
  }, [id]);

  const { toast } = require("@/hooks/use-toast");

  const handleReserve = async () => {
    if (!location) return;
    setIsLoading(true);
    setLocation(location);
    // Give context some time to update and simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    router.push("/checkout");
  };

  const handleGetDirections = () => {
    if (!location) return;
    const dest = (location.latitude && location.longitude)
      ? `${location.latitude},${location.longitude}`
      : encodeURIComponent(location.address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    window.open(url, "_blank");
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: location.name,
        text: `Check out this parking at ${location.name}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "The link has been copied to your clipboard.",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Saved",
      description: "Location added to your favorites.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading location details...</p>
      </div>
    );
  }

  if (!location) {
    notFound();
  }

  const availability = getAvailabilityStatus(location as any);
  const quote = calculateQuote(location as any, checkIn, checkOut);

  // For related locations, we now use the fetched nearbyLocations state

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
                  <span className="font-semibold text-foreground">{location.rating || "0.0"}</span>
                  <span className="text-muted-foreground">
                    ({(location.reviewCount || 0).toLocaleString()} reviews)
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
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleShare}>
                <Share className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleSave}>
                <Heart className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          {/* Image Gallery */}
          <div className="relative mb-8 grid gap-2 overflow-hidden rounded-xl md:grid-cols-4 md:grid-rows-2">
            <div className="relative col-span-2 row-span-2 aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 md:aspect-auto">
              {location.images && location.images[0] ? (
                <img
                  src={location.images[0]}
                  alt={location.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Car className="h-24 w-24 text-primary/30" />
                </div>
              )}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {location.shuttle && (
                  <Badge className="gap-1 bg-primary">
                    <Bus className="h-3 w-3" />
                    Free Shuttle
                  </Badge>
                )}
                {location.cancellationPolicy?.type === "free" && (
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
                className="hidden aspect-video bg-gradient-to-br from-muted to-muted/50 md:block relative overflow-hidden"
              >
                {location.images && location.images[i] ? (
                  <img
                    src={location.images[i]}
                    alt={`${location.name} ${i}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
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

              {/* Amenities Highlights */}
              <div className="flex flex-wrap gap-4">
                <div className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 transition-colors",
                  location.shuttle ? "border-primary/20 bg-primary/5" : "border-border bg-card"
                )}>
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    location.shuttle ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Bus className={cn(
                      "h-4 w-4",
                      location.shuttle ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Shuttle</p>
                    <p className="text-sm font-semibold text-foreground">
                      {location.shuttle ? "Free Shuttle" : "No Shuttle"}
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 transition-colors",
                  location.cancellationPolicy?.type === "free" && "border-primary/20 bg-primary/5"
                )}>
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    location.cancellationPolicy?.type === "free" ? "bg-primary/10" : "bg-muted"
                  )}>
                    <CheckCircle className={cn(
                      "h-4 w-4",
                      location.cancellationPolicy?.type === "free" ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cancellation</p>
                    <p className="text-sm font-semibold text-foreground">
                      {location.cancellationPolicy?.type === "free"
                        ? "Free"
                        : location.cancellationPolicy?.type === "partial"
                          ? "Partial Refund"
                          : "Non-refundable"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Security</p>
                    <p className="text-sm font-semibold text-foreground">Verified Secure</p>
                  </div>
                </div>
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
                location.cancellationPolicy?.type === "free" && "border-primary/20 bg-primary/5"
              )}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    location.cancellationPolicy?.type === "free" ? "bg-primary/10" : "bg-muted"
                  )}>
                    <CheckCircle className={cn(
                      "h-5 w-5",
                      location.cancellationPolicy?.type === "free" ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {location.cancellationPolicy?.type === "free"
                        ? "Free Cancellation"
                        : location.cancellationPolicy?.type === "partial"
                          ? "Partial Refund Available"
                          : "Non-Refundable"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {location.cancellationPolicy?.description}
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
                    {(location.securityFeatures || []).map((feature: string) => (
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
                  {/* Map Preview */}
                  <div className="relative h-64 overflow-hidden rounded-lg bg-muted border">
                    {location.latitude && location.longitude ? (
                      <img
                        src={`https://maps.locationiq.com/v3/staticmap?key=${process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY}&center=${location.latitude},${location.longitude}&zoom=14&size=600x400&markers=icon:large-red-cutout|${location.latitude},${location.longitude}`}
                        alt="Location Map"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Navigation className="mx-auto mb-2 h-12 w-12 text-muted-foreground opacity-20" />
                          <p className="text-sm text-muted-foreground">Map preview not available</p>
                        </div>
                      </div>
                    )}
                    {location.latitude && location.longitude && (
                      <div className="absolute left-1/2 top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary/20 animate-ping">
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 bg-transparent"
                      onClick={handleGetDirections}
                    >
                      <Navigation className="h-4 w-4" />
                      Get Directions
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 bg-transparent"
                      onClick={() => {
                        if (location.shuttleInfo?.phone) {
                          window.location.href = `tel:${location.shuttleInfo.phone}`;
                        }
                      }}
                    >
                      <Phone className="h-4 w-4" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <ReviewsSection
                rating={location.rating}
                reviewCount={location.reviewCount}
                reviews={location.reviews}
              />

              {/* Nearby Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Need more options?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {nearbyLocations.length > 0 ? (
                      nearbyLocations.map((nearby) => (
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
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(nearby.pricePerDay)}
                            </p>
                            <p className="text-xs text-muted-foreground">per day</p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No other parking options available at this location.
                      </p>
                    )}
                  </div>
                  <Button variant="outline" className="mt-4 w-full bg-transparent" asChild>
                    <Link href="/parking">
                      View all parking
                    </Link>
                  </Button>
                </CardContent>
              </Card>
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
          <Button
            size="lg"
            disabled={availability.status === "soldout"}
            onClick={handleReserve}
          >
            {availability.status === "soldout" ? "Sold Out" : "Reserve Now"}
          </Button>
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
    <LocationDetailsContent id={resolvedParams.id} />
  );
}
