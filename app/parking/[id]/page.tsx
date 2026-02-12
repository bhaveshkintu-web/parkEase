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
import { toggleFavorite, checkIsFavorite } from "@/lib/actions/favorites-actions";
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
  ChevronLeft,
  ChevronRight,
  X as CloseIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { use } from "react";

function LocationDetailsContent({ id }: { id: string }) {
  const router = useRouter();
  const [location, setLocationData] = React.useState<any>(null);
  const [nearbyLocations, setNearbyLocations] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = React.useState(0);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const { checkIn, checkOut, setLocation } = useBooking();

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const locResponse = await getParkingLocationById(id, {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
      });
      if (locResponse.success && locResponse.data) {
        setLocationData(locResponse.data);

        // Fetch nearby locations once we have the airport code
        if (locResponse.data.airportCode) {
          const nearbyResponse = await getNearbyParkingLocations(locResponse.data.airportCode, locResponse.data.id);
          if (nearbyResponse.success && nearbyResponse.data) {
            setNearbyLocations(nearbyResponse.data);
          }
        }

        // Check if favorite
        const favResponse = await checkIsFavorite(id);
        setIsFavorite(favResponse.isFavorite);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [id, checkIn, checkOut]);

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

  const handleSave = async () => {
    if (!location) return;
    setIsSaving(true);
    try {
      const result = await toggleFavorite(location.id);
      if (result.success) {
        setIsFavorite(!!result.isFavorite);
        toast({
          title: result.isFavorite ? "Saved to Favorites" : "Removed from Favorites",
          description: result.isFavorite
            ? "Location added to your favorites."
            : "Location removed from your favorites.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update favorites.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openGallery = (index: number = 0) => {
    setCurrentPhotoIndex(index);
    setIsGalleryOpen(true);
  };

  const nextPhoto = () => {
    if (!location?.images) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % location.images.length);
  };

  const prevPhoto = () => {
    if (!location?.images) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + location.images.length) % location.images.length);
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
                  {location.airport && !location.distance.includes(location.airport) && (
                    <>
                      <span className="mx-1">·</span>
                      <span>{location.airport}</span>
                    </>
                  )}
                  {location.airport && location.distance === "Near terminal" && (
                    <>
                      <span className="mx-1">·</span>
                      <span>{location.airport}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleShare}>
                <Share className="h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 bg-transparent transition-colors",
                  isFavorite && "text-red-500 hover:text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900"
                )}
                onClick={handleSave}
                disabled={isSaving}
              >
                <Heart className={cn("h-4 w-4 transition-all", isFavorite && "fill-current scale-110")} />
                {isFavorite ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          {/* Image Gallery */}
          <div className="relative mb-8 grid gap-2 overflow-hidden rounded-xl h-[300px] md:h-[500px] md:grid-cols-4 md:grid-rows-2">
            {/* Main Large Image */}
            <div
              className={cn(
                "relative row-span-2 aspect-auto bg-muted overflow-hidden group border-r border-background/10 md:border-r-0",
                location.images && location.images.length === 1 ? "col-span-4" : "col-span-2",
                location.images && location.images.length > 0 && "cursor-pointer"
              )}
              onClick={() => location.images && location.images.length > 0 && openGallery(0)}
            >
              {location.images && location.images[0] ? (
                <img
                  src={location.images[0]}
                  alt={location.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Car className="h-24 w-24 text-primary/30" />
                </div>
              )}
              {/* Overlay labels */}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2 pointer-events-none">
                {location.shuttle && (
                  <Badge className="gap-1 bg-primary/90 backdrop-blur-md border-none shadow-sm">
                    <Bus className="h-3 w-3" />
                    Free Shuttle
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnails - Grid approach to look more "equal" */}
            {location.images && location.images.length > 1 && (
              <div className={cn(
                "hidden md:grid col-span-2 row-span-2 gap-2",
                location.images.length === 2 ? "grid-cols-1 grid-rows-1" :
                  location.images.length === 3 ? "grid-cols-1 grid-rows-2" :
                    "grid-cols-2 grid-rows-2"
              )}>
                {[1, 2, 3, 4].map((i) => {
                  if (i >= location.images.length) return null;

                  return (
                    <div
                      key={i}
                      className="relative overflow-hidden bg-muted cursor-pointer group"
                      onClick={() => openGallery(i)}
                    >
                      <img
                        src={location.images[i]}
                        alt={`${location.name} ${i}`}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Overlay for more photos tag on the last slot */}
                      {i === 4 && location.images.length > 5 && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-white font-bold group-hover:bg-black/60 transition-colors">
                          <span className="text-2xl">+{location.images.length - 4}</span>
                          <span className="text-[10px] uppercase tracking-wider">Photos</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {location.images && location.images.length > 5 && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-4 right-4 gap-2 shadow-lg bg-white/80 backdrop-blur-md hover:bg-white text-foreground border-white/20 transition-all active:scale-95"
                onClick={() => openGallery(0)}
              >
                <span className="font-semibold px-1">Show all photos</span>
              </Button>
            )}
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

      {/* Photo Gallery Lightbox - Compact Glassmorphism */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/20 shadow-2xl rounded-3xl flex flex-col sm:rounded-3xl sm:-translate-y-[54%]">
          <div className="relative flex flex-col h-full w-full">
            {/* Header / Top Bar - Integrated */}
            <div className="absolute top-0 inset-x-0 z-50 p-4 pb-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="text-white text-sm font-semibold pointer-events-auto flex items-center gap-2 pl-2">
                <DialogTitle className="sr-only">Photo Gallery: {location.name}</DialogTitle>
                <span className="bg-primary/30 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase border border-white/10">
                  {currentPhotoIndex + 1} / {location.images?.length || 0}
                </span>
                <span className="opacity-80 text-xs hidden sm:inline">{location.name}</span>
              </div>
              <DialogClose className="p-2 mr-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all pointer-events-auto active:scale-90 border border-white/10 backdrop-blur-md">
                <CloseIcon className="h-4 w-4" />
              </DialogClose>
            </div>

            {/* Main Image Area - Constrained */}
            <div className="flex-1 flex items-center justify-center relative p-2 md:p-6 bg-black/10 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="relative w-full h-full flex items-center justify-center p-4">
                {location.images && location.images[currentPhotoIndex] && (
                  <img
                    src={location.images[currentPhotoIndex]}
                    alt={`${location.name} - Full view`}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl select-none"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Thumbnail Reel - Minimal Glassy */}
            <div className="h-24 bg-black/20 backdrop-blur-md p-4 border-t border-white/10 flex items-center justify-center shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto h-full max-w-full px-2 [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {location.images?.map((img: string, i: number) => (
                  <button
                    key={i}
                    className={cn(
                      "relative h-full aspect-square rounded-md overflow-hidden border-2 transition-all flex-shrink-0 active:scale-95",
                      currentPhotoIndex === i
                        ? "border-primary scale-105 shadow-lg z-10"
                        : "border-white/5 opacity-50 hover:opacity-100"
                    )}
                    onClick={() => setCurrentPhotoIndex(i)}
                  >
                    <img src={img} alt={`Thumbnail ${i}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
