"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Check,
  AlertCircle,
  Info,
  Car,
  Clock,
  Shield,
  Zap,
  Phone,
  Search,
  DollarSign,
  Loader2,
  Upload,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { airports } from "@/lib/data";
import { cn } from "@/lib/utils";
import { getParkingLocationById, updateParkingLocation } from "@/lib/actions/parking-actions";

const amenityOptions = [
  { id: "covered", label: "Covered Parking", icon: Car },
  { id: "ev_charging", label: "EV Charging", icon: Zap },
  { id: "handicap", label: "Handicap Accessible", icon: Shield },
  { id: "car_wash", label: "Car Wash", icon: Car },
  { id: "restrooms", label: "Restrooms", icon: Info },
  { id: "wifi", label: "WiFi", icon: Zap },
  { id: "luggage", label: "Luggage Assistance", icon: Shield },
  { id: "24_7_access", label: "24/7 Access", icon: Clock },
];

interface FormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  airportCode: string;
  description: string;
  pricePerDay: string;
  originalPrice: string;
  amenities: string[];
  shuttle: boolean;
  shuttleHours: string;
  shuttleFrequency: string;
  shuttlePhone: string;
  totalSpots: string;
  heightLimit: string;
  selfPark: boolean;
  valetPark: boolean;
  covered: boolean;
  open24Hours: boolean;
  cancellationPolicy: string;
  cancellationDeadline: string;
  securityFeatures: string[];
  specialInstructions: string;
  latitude: number;
  longitude: number;
  images: string[];
}

const initialFormData: FormData = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  airportCode: "",
  description: "",
  pricePerDay: "",
  originalPrice: "",
  amenities: [],
  shuttle: true,
  shuttleHours: "24/7",
  shuttleFrequency: "Every 10-15 minutes",
  shuttlePhone: "",
  totalSpots: "",
  heightLimit: "",
  selfPark: true,
  valetPark: false,
  covered: false,
  open24Hours: true,
  cancellationPolicy: "free",
  cancellationDeadline: "24",
  securityFeatures: [],
  specialInstructions: "",
  latitude: 0,
  longitude: 0,
  images: [],
};

export default function OwnerEditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const locationId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [airportOpen, setAirportOpen] = useState(false);

  // Address fetching states
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addressRef.current && !addressRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!locationId) return;
      setIsLoading(true);
      const result = await getParkingLocationById(locationId);

      if (result.success && result.data) {
        const data = result.data;
        // Map API data to form state
        setFormData({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state || "",
          zipCode: data.zipCode || "",
          airportCode: data.airportCode || "",
          description: data.description || "",
          pricePerDay: String(data.pricePerDay),
          originalPrice: data.originalPrice ? String(data.originalPrice) : "",
          amenities: data.amenities || [],
          shuttle: data.shuttle,
          shuttleHours: "24/7", // TODO: Add to schema
          shuttleFrequency: "Every 10-15 minutes", // TODO: Add to schema
          shuttlePhone: "", // TODO: Add to schema
          totalSpots: String(data.totalSpots),
          heightLimit: (data as any).heightLimit || "",
          selfPark: data.selfPark,
          valetPark: data.valet,
          covered: data.covered,
          open24Hours: data.open24Hours,
          cancellationPolicy: "free", // TODO: Add to schema
          cancellationDeadline: "24", // TODO: Add to schema
          securityFeatures: (data as any).securityFeatures || [],
          specialInstructions: "", // TODO: Add to schema
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          images: data.images || [],
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch location details",
          variant: "destructive",
        });
        router.push("/owner/locations");
      }
      setIsLoading(false);
    };

    fetchLocation();
  }, [locationId, router, toast]);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

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

  const removeImage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  // Fetch address suggestions from LocationIQ API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
    if (!apiKey) {
      console.error("LocationIQ API key is missing");
      return;
    }

    setIsFetchingAddress(true);
    try {
      const response = await fetch(
        `https://api.locationiq.com/v1/autocomplete?key=${apiKey}&q=${encodeURIComponent(query)}&limit=5&dedupe=1`
      );
      if (response.ok) {
        const data = await response.json();
        setAddressSuggestions(data || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Failed to fetch address suggestions:", error);
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const addr = suggestion.address;

    // Format street address
    let streetAddress = suggestion.display_name.split(',')[0];
    if (addr.house_number && addr.road) {
      streetAddress = `${addr.house_number} ${addr.road}`;
    } else if (addr.road) {
      streetAddress = addr.road;
    }

    setFormData(prev => ({
      ...prev,
      address: streetAddress,
      city: addr.city || addr.town || addr.village || addr.suburb || "",
      state: addr.state || "",
      zipCode: addr.postcode || "",
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
    }));

    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Simple validation
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = "Location name is required";
    if (!formData.pricePerDay || parseFloat(formData.pricePerDay) <= 0) newErrors.pricePerDay = "Valid price is required";
    if (!formData.totalSpots || parseInt(formData.totalSpots) <= 0) newErrors.totalSpots = "Valid spot count is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const locationData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: "USA", // Default
        zipCode: formData.zipCode,
        airportCode: formData.airportCode || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        description: formData.description,
        pricePerDay: parseFloat(formData.pricePerDay),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        totalSpots: parseInt(formData.totalSpots),
        heightLimit: formData.heightLimit || undefined,
        securityFeatures: formData.securityFeatures,
        amenities: formData.amenities,
        images: formData.images,
        shuttle: formData.shuttle,
        covered: formData.covered,
        selfPark: formData.selfPark,
        valet: formData.valetPark,
        open24Hours: formData.open24Hours,
        cancellationPolicy: formData.cancellationPolicy as any,
        cancellationDeadline: formData.cancellationDeadline,
      };

      const result = await updateParkingLocation(locationId, locationData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Location updated successfully",
        });
        router.push("/owner/locations");
      } else {
        const errorDetails = (result as any).details ? JSON.stringify((result as any).details) : result.error;
        console.error("Update failed details:", errorDetails);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update location",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAirport = airports.find((a) => a.code === formData.airportCode);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/owner/locations/${locationId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Edit Location</h1>
                <p className="text-sm text-muted-foreground">{formData.name}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href={`/owner/locations/${locationId}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-4xl space-y-8 mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-4">
              <Label>Address</Label>
              <div className="relative" ref={addressRef}>
                <Input
                  value={formData.address}
                  onChange={(e) => {
                    handleInputChange("address", e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Street Address"
                  className="pr-10"
                />
                {isFetchingAddress && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {showSuggestions && addressSuggestions.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 shadow-lg overflow-hidden border-border max-h-[300px] overflow-y-auto">
                    <div className="p-1">
                      {addressSuggestions.map((suggestion, idx) => {
                        const subText = suggestion.display_name.split(',').slice(1).join(',').trim();
                        return (
                          <div
                            key={idx}
                            className="px-3 py-2 text-sm hover:bg-muted cursor-pointer rounded-md transition-colors border-b last:border-0"
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            <div className="font-medium text-foreground">
                              {suggestion.display_name.split(',')[0]}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{subText}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                  />
                </div>
                <Input
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="State"
                />
                <Input
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nearest Airport</Label>
              <Popover open={airportOpen} onOpenChange={setAirportOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedAirport
                      ? `${selectedAirport.code} - ${selectedAirport.name}`
                      : "Search airport..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search airports..." />
                    <CommandList>
                      <CommandEmpty>No airport found.</CommandEmpty>
                      <CommandGroup>
                        {airports.map((airport) => (
                          <CommandItem
                            key={airport.code}
                            value={`${airport.code} ${airport.name}`}
                            onSelect={() => {
                              handleInputChange("airportCode", airport.code);
                              setAirportOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.airportCode === airport.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {airport.code} - {airport.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pricePerDay">Daily Rate *</Label>
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
                {errors.pricePerDay && <p className="text-sm text-destructive">{errors.pricePerDay}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalSpots">Total Spots *</Label>
                <Input
                  id="totalSpots"
                  type="number"
                  min="1"
                  value={formData.totalSpots}
                  onChange={(e) => handleInputChange("totalSpots", e.target.value)}
                />
                {errors.totalSpots && <p className="text-sm text-destructive">{errors.totalSpots}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services & Amenities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Parking Types</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="selfPark" checked={formData.selfPark} onCheckedChange={(c) => handleInputChange("selfPark", !!c)} />
                  <Label htmlFor="selfPark">Self-Park</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="valetPark" checked={formData.valetPark} onCheckedChange={(c) => handleInputChange("valetPark", !!c)} />
                  <Label htmlFor="valetPark">Valet</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="covered" checked={formData.covered} onCheckedChange={(c) => handleInputChange("covered", !!c)} />
                  <Label htmlFor="covered">Covered</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="open24Hours" checked={formData.open24Hours} onCheckedChange={(c) => handleInputChange("open24Hours", !!c)} />
                  <Label htmlFor="open24Hours">Open 24/7</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Shuttle Service</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="shuttle" checked={formData.shuttle} onCheckedChange={(c) => handleInputChange("shuttle", !!c)} />
                  <Label htmlFor="shuttle">Available</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {amenityOptions.map((amenity) => (
                  <div
                    key={amenity.id}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors cursor-pointer",
                      formData.amenities.includes(amenity.id)
                        ? "bg-primary/10 border-primary text-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => {
                      const newAmenities = formData.amenities.includes(amenity.id)
                        ? formData.amenities.filter(a => a !== amenity.id)
                        : [...formData.amenities, amenity.id];
                      handleInputChange("amenities", newAmenities);
                    }}
                  >
                    <amenity.icon className="h-4 w-4" />
                    {amenity.label}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Location Media
            </CardTitle>
            <CardDescription>
              Manage photos of your parking location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formData.images.map((url, index) => (
                <div key={index} className="group relative aspect-video rounded-lg border overflow-hidden bg-muted">
                  <img src={url} alt={`Location ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
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
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
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
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No photos yet</AlertTitle>
                <AlertDescription>
                  Adding at least 3 high-quality photos helps build trust with customers.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
