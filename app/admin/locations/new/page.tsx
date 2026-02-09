"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, X, Upload, Loader2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from "@/lib/data-store";
import { useToast } from "@/hooks/use-toast";
import { airports } from "@/lib/data";
import type { ParkingLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

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

export default function NewLocationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addLocation } = useDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
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
    images: [] as string[],
    shuttleHours: "24/7",
    shuttleFrequency: "Every 10-15 minutes",
    shuttlePhone: "",
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!showSuggestions || formData.address.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsFetchingSuggestions(true);
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(formData.address)}&limit=5`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.features || []);
        }
      } catch (error) {
        console.error("Failed to fetch address suggestions:", error);
      } finally {
        setIsFetchingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.address, showSuggestions]);

  const handleSelectSuggestion = (suggestion: any) => {
    const props = suggestion.properties;

    // Construct address
    let streetAddress = props.name || "";
    if (props.housenumber && props.street) {
      streetAddress = `${props.housenumber} ${props.street}`;
    } else if (props.street) {
      streetAddress = props.street;
    }

    setFormData((prev) => ({
      ...prev,
      address: streetAddress,
      city: props.city || props.town || props.village || props.hamlet || props.suburb || props.district || props.city_district || "",
      state: props.state || props.county || "",
      zipCode: props.postcode || "",
    }));

    setSuggestions([]);
    setShowSuggestions(false);
  };

  const [redeemSteps, setRedeemSteps] = useState([
    { step: 1, title: "Arrive at Lot", description: "" },
  ]);

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const addRedeemStep = () => {
    setRedeemSteps((prev) => [
      ...prev,
      { step: prev.length + 1, title: "", description: "" },
    ]);
  };

  const updateRedeemStep = (index: number, field: "title" | "description", value: string) => {
    setRedeemSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeRedeemStep = (index: number) => {
    setRedeemSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 }))
    );
  };

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNum === 1) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.address.trim()) newErrors.address = "Address is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.state.trim()) newErrors.state = "State is required";
      if (!formData.zipCode.trim()) newErrors.zipCode = "ZIP Code is required";
      if (!formData.airportCode) newErrors.airportCode = "Airport is required";
    } else if (stepNum === 2) {
      if (!formData.pricePerDay || parseFloat(formData.pricePerDay) <= 0) {
        newErrors.pricePerDay = "Valid price is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSubmitting(true);
    const uploadedUrls: string[] = [...formData.images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);

        const data = await response.json();
        uploadedUrls.push(data.url);
      }
      handleInputChange("images", uploadedUrls);
      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${files.length} image(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    handleInputChange("images", newImages);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);

    try {
      const airport = airports.find((a) => a.code === formData.airportCode);

      const newLocation = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        airport: airport?.name || "",
        airportCode: formData.airportCode,
        coordinates: { lat: 0, lng: 0 },
        pricePerDay: parseFloat(formData.pricePerDay),
        originalPrice: parseFloat(formData.originalPrice) || parseFloat(formData.pricePerDay) * 1.2,
        rating: 4.5,
        reviewCount: 0,
        amenities: formData.amenities,
        images: formData.images.length > 0 ? formData.images : ["/placeholder.svg"],
        shuttle: formData.shuttle,
        covered: formData.covered,
        selfPark: formData.selfPark,
        valet: formData.valet,
        open24Hours: formData.open24Hours,
        distance: "0.5 mi",
        availableSpots: parseInt(formData.totalSpots),
        totalSpots: parseInt(formData.totalSpots),
        description: formData.description,
        shuttleInfo: formData.shuttle
          ? {
            enabled: true,
            hours: formData.shuttleHours,
            frequency: formData.shuttleFrequency,
            pickupInstructions: "Follow signs to shuttle pickup area",
            phone: formData.shuttlePhone,
          }
          : undefined,
        redeemSteps: redeemSteps.filter((s) => s.title.trim()),
        specialInstructions: [],
        securityFeatures: ["24/7 Surveillance", "Gated Access"],
        cancellationPolicy: {
          type: "free",
          deadline: "24 hours before check-in",
          description: "Free cancellation up to 24 hours before your reservation",
        },
        status: "PENDING",
        createdBy: "ADMIN",
      };

      await addLocation(newLocation as any);

      toast({
        title: "Location created",
        description: "The parking location has been created successfully.",
      });

      router.push("/admin/locations");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/locations">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Location</h1>
          <p className="text-muted-foreground">Create a new parking location</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {s}
            </div>
            {s < 5 && (
              <div
                className={`h-1 w-10 sm:w-12 ${s < step ? "bg-primary/20" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground px-4 text-center">
        <span className={step === 1 ? "text-primary font-medium" : ""}>Basic Info</span>
        <span className={step === 2 ? "text-primary font-medium" : ""}>Pricing</span>
        <span className={step === 3 ? "text-primary font-medium" : ""}>Media</span>
        <span className={step === 4 ? "text-primary font-medium" : ""}>Operations</span>
        <span className={step === 5 ? "text-primary font-medium" : ""}>Review</span>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the location details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Airport Express Parking"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="address">Address *</Label>
              <div className="relative">
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => {
                    handleInputChange("address", e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Start typing an address..."
                  autoComplete="off"
                  aria-invalid={!!errors.address}
                />
                {isFetchingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Suggestions list */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="flex items-start gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors border-b last:border-0"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {suggestion.properties.name ||
                            (suggestion.properties.housenumber ? `${suggestion.properties.housenumber} ${suggestion.properties.street}` : suggestion.properties.street)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            suggestion.properties.city || suggestion.properties.town || suggestion.properties.village || suggestion.properties.hamlet || suggestion.properties.suburb || suggestion.properties.district,
                            suggestion.properties.state || suggestion.properties.county,
                            suggestion.properties.postcode,
                            suggestion.properties.country
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="City"
                  aria-invalid={!!errors.city}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="State"
                  aria-invalid={!!errors.state}
                />
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  placeholder="ZIP Code"
                  aria-invalid={!!errors.zipCode}
                />
                {errors.zipCode && (
                  <p className="text-sm text-destructive">{errors.zipCode}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="airport">Airport *</Label>
              <Select
                value={formData.airportCode}
                onValueChange={(value) => handleInputChange("airportCode", value)}
              >
                <SelectTrigger id="airport" aria-invalid={!!errors.airportCode}>
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
              {errors.airportCode && (
                <p className="text-sm text-destructive">{errors.airportCode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the parking location..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pricing & Amenities */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Set the daily rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pricePerDay">Price Per Day *</Label>
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
                      placeholder="0.00"
                    />
                  </div>
                  {errors.pricePerDay && (
                    <p className="text-sm text-destructive">{errors.pricePerDay}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original Price (optional)</Label>
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
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Show strikethrough price for discounts</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalSpots">Total Parking Spots</Label>
                <Input
                  id="totalSpots"
                  type="number"
                  min="1"
                  value={formData.totalSpots}
                  onChange={(e) => handleInputChange("totalSpots", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Select parking features</CardDescription>
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
                  <div key={feature.id} className="flex items-center gap-2">
                    <Checkbox
                      id={feature.id}
                      checked={formData[feature.id as keyof typeof formData] as boolean}
                      onCheckedChange={(checked) => handleInputChange(feature.id, checked === true)}
                    />
                    <Label htmlFor={feature.id} className="cursor-pointer">{feature.label}</Label>
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
        </div>
      )}

      {/* Step 3: Media */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Location Media</CardTitle>
            <CardDescription>Upload high-quality photos of the parking location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formData.images.map((url, index) => (
                <div key={index} className="group relative aspect-video rounded-lg border overflow-hidden bg-muted">
                  <img src={url} alt={`Location ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-primary/90 text-[10px] text-white py-1 text-center font-bold">
                      MAIN COVER
                    </div>
                  )}
                </div>
              ))}

              <label
                className={cn(
                  "flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/[0.02] cursor-pointer transition-all gap-2",
                  isSubmitting && "opacity-50 pointer-events-none"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Upload className="h-5 w-5 text-primary" />}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground">Upload Photos</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP up to 5MB</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isSubmitting}
                />
              </label>
            </div>

            {formData.images.length === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm">We recommend uploading at least 1 image to help your location stand out.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Operations */}
      {step === 4 && (
        <div className="space-y-6">
          {formData.shuttle && (
            <Card>
              <CardHeader>
                <CardTitle>Shuttle Information</CardTitle>
                <CardDescription>Details about shuttle service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shuttleHours">Shuttle Hours</Label>
                    <Input
                      id="shuttleHours"
                      value={formData.shuttleHours}
                      onChange={(e) => handleInputChange("shuttleHours", e.target.value)}
                      placeholder="e.g., 24/7 or 5am - 12am"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shuttleFrequency">Shuttle Frequency</Label>
                    <Input
                      id="shuttleFrequency"
                      value={formData.shuttleFrequency}
                      onChange={(e) => handleInputChange("shuttleFrequency", e.target.value)}
                      placeholder="e.g., Every 10-15 minutes"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shuttlePhone">Shuttle Phone (optional)</Label>
                  <Input
                    id="shuttlePhone"
                    value={formData.shuttlePhone}
                    onChange={(e) => handleInputChange("shuttlePhone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>How to Redeem</CardTitle>
              <CardDescription>Steps for customers to redeem their reservation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {redeemSteps.map((step, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {step.step}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={step.title}
                      onChange={(e) => updateRedeemStep(index, "title", e.target.value)}
                      placeholder="Step title"
                    />
                    <Input
                      value={step.description}
                      onChange={(e) => updateRedeemStep(index, "description", e.target.value)}
                      placeholder="Step description (optional)"
                    />
                  </div>
                  {redeemSteps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRedeemStep(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addRedeemStep} className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>Review the location details before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="font-medium text-foreground mb-2">Basic Info</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd className="text-foreground">{formData.name || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Airport:</dt>
                    <dd className="text-foreground">{formData.airportCode || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Address:</dt>
                    <dd className="text-foreground text-right max-w-[200px] truncate">{formData.address || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">City:</dt>
                    <dd className="text-foreground">{formData.city || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">State:</dt>
                    <dd className="text-foreground">{formData.state || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">ZIP Code:</dt>
                    <dd className="text-foreground">{formData.zipCode || "-"}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Pricing</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Price/Day:</dt>
                    <dd className="text-foreground">{`$${formData.pricePerDay || "0.00"}`}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Total Spots:</dt>
                    <dd className="text-foreground">{formData.totalSpots}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {formData.images.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-4">Photos ({formData.images.length})</h4>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {formData.images.map((url, idx) => (
                    <div key={idx} className="h-24 aspect-video rounded-md border overflow-hidden shrink-0">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-foreground mb-2">Features</h4>
              <div className="flex flex-wrap gap-2">
                {formData.shuttle && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Shuttle</span>}
                {formData.covered && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Covered</span>}
                {formData.selfPark && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Self Park</span>}
                {formData.valet && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Valet</span>}
                {formData.open24Hours && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">24 Hours</span>}
              </div>
            </div>
            {formData.amenities.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity) => (
                    <span key={amenity} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 1}>
          Back
        </Button>
        {step < 5 ? (
          <Button onClick={handleNext}>Continue</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Location
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
