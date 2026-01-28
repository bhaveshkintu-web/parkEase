"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDataStore } from "@/lib/data-store";
import { useToast } from "@/hooks/use-toast";
import { airports } from "@/lib/data";

const amenityOptions = [
  "Covered Parking",
  "EV Charging",
  "Handicap Accessible",
  "Car Wash",
  "Oil Change",
  "Restrooms",
  "WiFi",
  "Luggage Assistance",
];

export default function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { locations, updateLocation, deleteLocation } = useDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find location from store
  const existingLocation = locations.find((l) => l.id === id);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    airportCode: "",
    description: "",
    pricePerDay: "",
    originalPrice: "",
    amenities: [] as string[],
    shuttle: false,
    covered: false,
    selfPark: true,
    valet: false,
    open24Hours: false,
    totalSpots: "100",
    availableSpots: "100",
    status: "active" as "active" | "inactive" | "maintenance",
  });

  useEffect(() => {
    if (existingLocation) {
      setFormData({
        name: existingLocation.name,
        address: existingLocation.address,
        airportCode: existingLocation.airportCode || "",
        description: existingLocation.description || "",
        pricePerDay: existingLocation.pricePerDay.toString(),
        originalPrice: existingLocation.originalPrice?.toString() || "",
        amenities: existingLocation.amenities || [],
        shuttle: existingLocation.shuttle || false,
        covered: existingLocation.covered || false,
        selfPark: existingLocation.selfPark || true,
        valet: existingLocation.valet || false,
        open24Hours: existingLocation.open24Hours || false,
        totalSpots: existingLocation.totalSpots?.toString() || "100",
        availableSpots: existingLocation.availableSpots?.toString() || "100",
        status: "active",
      });
    }
  }, [existingLocation]);

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      const airport = airports.find((a) => a.code === formData.airportCode);

      await updateLocation(id, {
        name: formData.name,
        address: formData.address,
        airport: airport?.name || existingLocation?.airport || "",
        airportCode: formData.airportCode,
        pricePerDay: parseFloat(formData.pricePerDay),
        originalPrice: parseFloat(formData.originalPrice) || parseFloat(formData.pricePerDay) * 1.2,
        amenities: formData.amenities,
        shuttle: formData.shuttle,
        covered: formData.covered,
        selfPark: formData.selfPark,
        valet: formData.valet,
        open24Hours: formData.open24Hours,
        totalSpots: parseInt(formData.totalSpots),
        availableSpots: parseInt(formData.availableSpots),
        description: formData.description,
      });

      toast({
        title: "Location updated",
        description: "The parking location has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteLocation(id);

      toast({
        title: "Location deleted",
        description: "The parking location has been deleted.",
      });

      router.push("/admin/locations");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  if (!existingLocation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Location not found</h2>
        <p className="text-muted-foreground mt-2">The requested location does not exist.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/locations">Back to Locations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/locations">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Edit Location</h1>
              <Badge variant={formData.status === "active" ? "default" : "secondary"}>
                {formData.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{existingLocation.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Location</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{existingLocation.name}&quot;? This action cannot be undone.
                  All reservations for this location will be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="airport">Airport</Label>
                <Select
                  value={formData.airportCode}
                  onValueChange={(value) => handleInputChange("airportCode", value)}
                >
                  <SelectTrigger id="airport">
                    <SelectValue placeholder="Select airport" />
                  </SelectTrigger>
                  <SelectContent>
                    {airports.map((airport) => (
                      <SelectItem key={airport.code} value={airport.code}>
                        {airport.code} - {airport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capacity</CardTitle>
              <CardDescription>Manage parking capacity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="totalSpots">Total Spots</Label>
                  <Input
                    id="totalSpots"
                    type="number"
                    min="1"
                    value={formData.totalSpots}
                    onChange={(e) => handleInputChange("totalSpots", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availableSpots">Available Spots</Label>
                  <Input
                    id="availableSpots"
                    type="number"
                    min="0"
                    max={formData.totalSpots}
                    value={formData.availableSpots}
                    onChange={(e) => handleInputChange("availableSpots", e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Occupancy Rate</span>
                  <span className="font-medium text-foreground">
                    {Math.round(((parseInt(formData.totalSpots) - parseInt(formData.availableSpots)) / parseInt(formData.totalSpots)) * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.round(((parseInt(formData.totalSpots) - parseInt(formData.availableSpots)) / parseInt(formData.totalSpots)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Set daily rates and discounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pricePerDay">Price Per Day</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="pricePerDay"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pricePerDay}
                      onChange={(e) => handleInputChange("pricePerDay", e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.originalPrice}
                      onChange={(e) => handleInputChange("originalPrice", e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
              {formData.originalPrice && parseFloat(formData.originalPrice) > parseFloat(formData.pricePerDay) && (
                <div className="rounded-lg bg-primary/10 p-4 text-sm text-primary">
                  Discount: {Math.round((1 - parseFloat(formData.pricePerDay) / parseFloat(formData.originalPrice)) * 100)}% off
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amenities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Toggle parking features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { id: "shuttle", label: "Free Shuttle Service" },
                  { id: "covered", label: "Covered Parking" },
                  { id: "selfPark", label: "Self Park" },
                  { id: "valet", label: "Valet Available" },
                  { id: "open24Hours", label: "Open 24 Hours" },
                ].map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <Label htmlFor={feature.id} className="cursor-pointer">{feature.label}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInputChange(feature.id, !formData[feature.id as keyof typeof formData])}
                      className="p-0"
                    >
                      {formData[feature.id as keyof typeof formData] ? (
                        <ToggleRight className="h-8 w-8 text-primary" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
              <CardDescription>Select available amenities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {amenityOptions.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <Label htmlFor={`amenity-${amenity}`} className="cursor-pointer">{amenity}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Bookings", value: "1,234", change: "+12%" },
              { label: "Revenue", value: "$45,678", change: "+8%" },
              { label: "Avg Rating", value: existingLocation.rating.toFixed(1), change: "+0.2" },
              { label: "Occupancy", value: "78%", change: "+5%" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-primary">{stat.change} from last month</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest bookings and reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: "booking", message: "New reservation by John D.", time: "2 hours ago" },
                  { type: "review", message: "5-star review received", time: "5 hours ago" },
                  { type: "booking", message: "Reservation cancelled by Sarah M.", time: "1 day ago" },
                  { type: "booking", message: "New reservation by Mike T.", time: "2 days ago" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          activity.type === "review" ? "bg-accent" : "bg-primary"
                        }`}
                      />
                      <span className="text-sm text-foreground">{activity.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
