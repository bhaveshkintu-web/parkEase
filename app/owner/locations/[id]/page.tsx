"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getParkingLocationById, updateLocationStatus } from "@/lib/actions/parking-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/data";
import {
  ArrowLeft,
  MapPin,
  Car,
  DollarSign,
  Edit,
  Star,
  Clock,
  Shield,
  Zap,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OwnerLocationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [location, setLocation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const locationId = params.id as string;

  const fetchLocation = async () => {
    setIsLoading(true);
    const result = await getParkingLocationById(locationId);
    if (result.success) {
      setLocation(result.data);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to fetch location details",
        variant: "destructive",
      });
      router.push("/owner/locations");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (locationId) {
      fetchLocation();
    }
  }, [locationId]);

  const handleStatusToggle = async () => {
    if (!location) return;
    const newStatus = location.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await updateLocationStatus(locationId, newStatus);

    if (result.success) {
      toast({
        title: `Location ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`,
        description: `The location is now ${newStatus.toLowerCase()}.`,
      });
      fetchLocation(); // Refresh data
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!location) return null;

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/owner/locations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {location.name}
              <Badge variant={location.status === "ACTIVE" ? "default" : "secondary"}>
                {location.status}
              </Badge>
            </h1>
            <div className="flex items-center text-muted-foreground mt-1 text-sm">
              <MapPin className="h-4 w-4 mr-1" />
              {location.address}, {location.city}, {location.state} {location.zipCode}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleStatusToggle}>
            {location.status === "ACTIVE" ? (
              <>
                <ToggleLeft className="w-4 h-4 mr-2" />
                Deactivate
              </>
            ) : (
              <>
                <ToggleRight className="w-4 h-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Link href={`/owner/locations/${locationId}/edit`}>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Edit Location
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 pt-4 flex flex-col items-center text-center">
                <DollarSign className="h-5 w-5 text-green-600 mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-semibold">Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(location.analytics?.revenue || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 pt-4 flex flex-col items-center text-center">
                <Car className="h-5 w-5 text-blue-600 mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-semibold">Bookings</p>
                <p className="text-xl font-bold">{location.analytics?.totalBookings || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 pt-4 flex flex-col items-center text-center">
                <Star className="h-5 w-5 text-amber-500 mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-semibold">Rating</p>
                <p className="text-xl font-bold">{location.rating || "N/A"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 pt-4 flex flex-col items-center text-center">
                <Info className="h-5 w-5 text-primary mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-semibold">Price/Day</p>
                <p className="text-xl font-bold">{formatCurrency(location.pricePerDay)}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({location.reviewCount})</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {location.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operational Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">24/7 Access</p>
                        <p className="text-sm text-muted-foreground">
                          {location.open24Hours ? "Yes" : "No, see hours"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Car className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Total Spots</p>
                        <p className="text-sm text-muted-foreground">{location.totalSpots}</p>
                      </div>
                    </div>
                    {location.shuttle && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Car className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Shuttle Service</p>
                          <p className="text-sm text-muted-foreground">Available</p>
                        </div>
                      </div>
                    )}
                    {location.valet && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Valet Parking</p>
                          <p className="text-sm text-muted-foreground">Available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="amenities" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Services & Amenities</CardTitle>
                  <CardDescription>Features available at this location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {location.amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-2 p-2 border rounded-md">
                        <span className="capitalize">{amenity.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                    {location.amenities.length === 0 && (
                      <p className="text-muted-foreground col-span-full">No amenities listed.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  {location.reviews && location.reviews.length > 0 ? (
                    <div className="space-y-4">
                      {location.reviews.map((review: any) => (
                        <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {review.user?.firstName?.[0] || "U"}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {review.user?.firstName} {review.user?.lastName}
                                </p>
                                <div className="flex items-center">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        "h-3 w-3",
                                        i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No reviews yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Rules</CardTitle>
                  <CardDescription>Active pricing adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {location.pricingRules && location.pricingRules.length > 0 ? (
                      location.pricingRules.map((rule: any) => (
                        <div key={rule.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{rule.type}</p>
                          </div>
                          <Badge variant="outline">x{rule.multiplier}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No custom pricing rules configured.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Map/Images (Placeholder) */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0 overflow-hidden aspect-video relative bg-muted flex items-center justify-center">
              <MapPin className="h-10 w-10 text-muted-foreground/50" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-muted-foreground text-sm font-medium">
                Map View (Coming Soon)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Location Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {location.images && location.images.length > 0 ? (
                  location.images.map((img: string, i: number) => (
                    <div key={i} className="aspect-square bg-muted rounded-md overflow-hidden relative">
                      {/* Placeholder for actual image component */}
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        Image {i + 1}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 aspect-[2/1] bg-muted/30 rounded-md flex items-center justify-center text-muted-foreground text-sm border border-dashed">
                    No images uploaded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
