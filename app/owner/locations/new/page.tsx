"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Loader2,
  MapPin,
  Check,
  AlertCircle,
  Info,
  Car,
  Clock,
  Shield,
  Zap,
  Phone,
  Search,
  ChevronRight,
  DollarSign,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { airports } from "@/lib/data";
import { cn } from "@/lib/utils";

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

const securityFeatureOptions = [
  "24/7 Surveillance",
  "Gated Access",
  "Security Patrol",
  "Well-Lit Facility",
  "Fenced Perimeter",
  "License Plate Recognition",
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

interface RedeemStep {
  title: string;
  description: string;
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

const initialRedeemSteps: RedeemStep[] = [
  { title: "Show confirmation", description: "Present your booking confirmation at the entrance" },
  { title: "Park your vehicle", description: "Follow signs to available parking spots" },
  { title: "Board shuttle", description: "Take the free shuttle to the airport terminal" },
];

export default function OwnerNewLocationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [redeemSteps, setRedeemSteps] = useState<RedeemStep[]>(initialRedeemSteps);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [airportOpen, setAirportOpen] = useState(false);

  // Address fetching states
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressRef = useRef<HTMLDivElement>(null);

  const totalSteps = 5;
  const progress = Math.round((currentStep / totalSteps) * 100);

  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setHasUnsavedChanges(hasChanges);
  }, [formData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addressRef.current && !addressRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const toggleAmenity = useCallback((amenityId: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((a) => a !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  }, []);

  const toggleSecurityFeature = useCallback((feature: string) => {
    setFormData((prev) => ({
      ...prev,
      securityFeatures: prev.securityFeatures.includes(feature)
        ? prev.securityFeatures.filter((f) => f !== feature)
        : [...prev.securityFeatures, feature],
    }));
  }, []);

  const addRedeemStep = useCallback(() => {
    setRedeemSteps((prev) => [...prev, { title: "", description: "" }]);
  }, []);

  const removeRedeemStep = useCallback((index: number) => {
    setRedeemSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateRedeemStep = useCallback((index: number, field: keyof RedeemStep, value: string) => {
    setRedeemSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    );
  }, []);

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

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = "Location name is required";
      if (!formData.address.trim()) newErrors.address = "Street address is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.state.trim()) newErrors.state = "State is required";
      if (!formData.zipCode.trim()) newErrors.zipCode = "ZIP code is required";
      if (!formData.airportCode) newErrors.airportCode = "Airport selection is required";
    }

    if (step === 2) {
      if (!formData.pricePerDay || parseFloat(formData.pricePerDay) <= 0) {
        newErrors.pricePerDay = "Valid daily rate is required";
      }
      if (!formData.totalSpots || parseInt(formData.totalSpots) <= 0) {
        newErrors.totalSpots = "Number of spots is required";
      }
    }

    if (step === 3) {
      if (formData.shuttle && !formData.shuttlePhone.trim()) {
        newErrors.shuttlePhone = "Shuttle contact phone is required when shuttle is enabled";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleExit = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      router.push("/owner/locations");
    }
  }, [hasUnsavedChanges, router]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const selectedAirport = airports.find((a) => a.code === formData.airportCode);

      // Prepare data for API
      const locationData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: "USA",
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
        images: formData.images.length > 0 ? formData.images : ["/placeholder.svg"],
        shuttle: formData.shuttle,
        covered: formData.covered,
        selfPark: formData.selfPark,
        valet: formData.valetPark,
        open24Hours: formData.open24Hours,
        cancellationPolicy: formData.cancellationPolicy,
        cancellationDeadline: formData.cancellationDeadline,
      };

      // Call the real API
      const response = await fetch("/api/owner/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          console.error("Location creation failed:", error);

          // Show validation details if available
          if (error.details) {
            const fieldErrors = Object.entries(error.details)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('\n');
            throw new Error(`Validation failed:\n${fieldErrors}`);
          }

          throw new Error(error.error || "Failed to create location");
        } else {
          throw new Error("Failed to create location: Server returned non-JSON error");
        }
      }

      const result = await response.json();

      toast({
        title: "Location created",
        description: "Your new parking location has been successfully created.",
      });

      router.push("/owner/locations");
    } catch (error) {
      console.error("Location creation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, formData, redeemSteps, router, toast, validateStep]);

  const selectedAirport = airports.find((a) => a.code === formData.airportCode);

  const savingsPercent = formData.originalPrice && formData.pricePerDay
    ? Math.round(((parseFloat(formData.originalPrice) - parseFloat(formData.pricePerDay)) / parseFloat(formData.originalPrice)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleExit}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Add New Location</h1>
                <p className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span>{progress}% complete</span>
              <Progress value={progress} className="w-24 h-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="container px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { num: 1, label: "Location" },
            { num: 2, label: "Pricing" },
            { num: 3, label: "Services" },
            { num: 4, label: "Media" },
            { num: 5, label: "Review" },
          ].map((step, index) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            return (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary text-primary-foreground",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : step.num}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 hidden sm:block",
                    isActive || isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < 4 && (
                  <div
                    className={cn(
                      "w-12 sm:w-20 h-1 mx-2",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Location Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location Details
                </CardTitle>
                <CardDescription>
                  Enter the basic information about your parking location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., LAX Economy Parking"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <Separator />

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
                      placeholder="123 Airport Blvd"
                      aria-invalid={!!errors.address}
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
                        aria-invalid={!!errors.city}
                      />
                    </div>
                    <Input
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      placeholder="State"
                      aria-invalid={!!errors.state}
                    />
                    <Input
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      placeholder="ZIP"
                      aria-invalid={!!errors.zipCode}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Nearest Airport *</Label>
                  <Popover open={airportOpen} onOpenChange={setAirportOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={airportOpen}
                        className="w-full justify-between bg-transparent"
                      >
                        {selectedAirport
                          ? `${selectedAirport.code} - ${selectedAirport.name}`
                          : "Search and select airport..."}
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
                                value={`${airport.code} ${airport.name} ${airport.city}`}
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
                                <span className="font-medium">{airport.code}</span>
                                <span className="ml-2 text-muted-foreground">{airport.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.airportCode && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.airportCode}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your parking location, highlighting key features and benefits..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Pricing & Capacity */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Pricing & Capacity
                </CardTitle>
                <CardDescription>
                  Set your pricing and parking capacity
                </CardDescription>
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
                        placeholder="0.00"
                        aria-invalid={!!errors.pricePerDay}
                      />
                    </div>
                    {errors.pricePerDay && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.pricePerDay}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">Compare at Price (Optional)</Label>
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
                  </div>
                </div>

                {savingsPercent > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Savings Preview</AlertTitle>
                    <AlertDescription>
                      Customers will see {savingsPercent}% savings compared to the original price.
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="totalSpots">Total Parking Spots *</Label>
                    <Input
                      id="totalSpots"
                      type="number"
                      min="1"
                      value={formData.totalSpots}
                      onChange={(e) => handleInputChange("totalSpots", e.target.value)}
                      placeholder="100"
                      aria-invalid={!!errors.totalSpots}
                    />
                    {errors.totalSpots && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.totalSpots}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heightLimit">Height Limit</Label>
                    <Input
                      id="heightLimit"
                      value={formData.heightLimit}
                      onChange={(e) => handleInputChange("heightLimit", e.target.value)}
                      placeholder={`e.g., 6'6" or No limit`}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Cancellation Policy</Label>
                  <Select
                    value={formData.cancellationPolicy}
                    onValueChange={(value) => handleInputChange("cancellationPolicy", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free Cancellation</SelectItem>
                      <SelectItem value="moderate">Moderate (50% refund)</SelectItem>
                      <SelectItem value="strict">Strict (No refund)</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.cancellationPolicy !== "strict" && (
                    <div className="space-y-2">
                      <Label>Cancellation Deadline (hours before)</Label>
                      <Select
                        value={formData.cancellationDeadline}
                        onValueChange={(value) => handleInputChange("cancellationDeadline", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                          <SelectItem value="72">72 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Services & Amenities */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Services & Amenities
                </CardTitle>
                <CardDescription>
                  Configure parking options and available amenities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Parking Types</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "selfPark", label: "Self-Park" },
                      { id: "valetPark", label: "Valet Parking" },
                      { id: "covered", label: "Covered Parking" },
                      { id: "open24Hours", label: "Open 24/7" },
                    ].map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={formData[option.id as keyof FormData] as boolean}
                          onCheckedChange={(checked) =>
                            handleInputChange(option.id as keyof FormData, checked as boolean)
                          }
                        />
                        <Label htmlFor={option.id} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Shuttle Service</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuttle"
                        checked={formData.shuttle}
                        onCheckedChange={(checked) => handleInputChange("shuttle", checked as boolean)}
                      />
                      <Label htmlFor="shuttle" className="cursor-pointer">
                        Available
                      </Label>
                    </div>
                  </div>

                  {formData.shuttle && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="shuttleHours">Operating Hours</Label>
                        <Input
                          id="shuttleHours"
                          value={formData.shuttleHours}
                          onChange={(e) => handleInputChange("shuttleHours", e.target.value)}
                          placeholder="24/7"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shuttleFrequency">Frequency</Label>
                        <Input
                          id="shuttleFrequency"
                          value={formData.shuttleFrequency}
                          onChange={(e) => handleInputChange("shuttleFrequency", e.target.value)}
                          placeholder="Every 10-15 minutes"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="shuttlePhone">Shuttle Contact Phone *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="shuttlePhone"
                            value={formData.shuttlePhone}
                            onChange={(e) => handleInputChange("shuttlePhone", e.target.value)}
                            className="pl-10"
                            placeholder="(555) 123-4567"
                            aria-invalid={!!errors.shuttlePhone}
                          />
                        </div>
                        {errors.shuttlePhone && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.shuttlePhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
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
                        onClick={() => toggleAmenity(amenity.id)}
                      >
                        <Checkbox checked={formData.amenities.includes(amenity.id)} />
                        <span>{amenity.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Security Features</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {securityFeatureOptions.map((feature) => (
                      <div
                        key={feature}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors cursor-pointer",
                          formData.securityFeatures.includes(feature)
                            ? "bg-primary/10 border-primary text-primary"
                            : "hover:bg-muted"
                        )}
                        onClick={() => toggleSecurityFeature(feature)}
                      >
                        <Checkbox checked={formData.securityFeatures.includes(feature)} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Check-in Instructions</Label>
                  <div className="space-y-3">
                    {redeemSteps.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                          {index + 1}
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
                            className="flex-shrink-0"
                            onClick={() => removeRedeemStep(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addRedeemStep}
                      className="w-full bg-transparent"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="specialInstructions">Special Instructions</Label>
                  <Textarea
                    id="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                    placeholder="Enter any special instructions for customers..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Media Upload */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Location Media
                </CardTitle>
                <CardDescription>
                  Upload high-quality photos to make your location stand out
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
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
                      Locations with at least 3 photos receive up to 50% more bookings.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Review & Submit
                </CardTitle>
                <CardDescription>
                  Please review your location details before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Almost there!</AlertTitle>
                  <AlertDescription>
                    Review the information below and click Submit to create your parking location.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Location</h4>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <p className="font-medium">{formData.name || "Unnamed Location"}</p>
                      <p className="text-sm text-muted-foreground">
                        {formData.address}, {formData.city}, {formData.state} {formData.zipCode}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Airport:</span>{" "}
                        {selectedAirport ? `${selectedAirport.code} - ${selectedAirport.name}` : "Not selected"}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {formData.images.length > 0 && (
                    <>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-4">Photos ({formData.images.length})</h4>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                          {formData.images.map((url, idx) => (
                            <div key={idx} className="h-20 aspect-video rounded-md border overflow-hidden shrink-0">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Pricing & Capacity</h4>
                    <div className="bg-muted/50 p-4 rounded-lg grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Daily Rate</p>
                        <p className="font-medium">${formData.pricePerDay || "0.00"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Spots</p>
                        <p className="font-medium">{formData.totalSpots || "0"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cancellation</p>
                        <p className="font-medium capitalize">{formData.cancellationPolicy}</p>
                      </div>
                      {formData.heightLimit && (
                        <div>
                          <p className="text-sm text-muted-foreground">Height Limit</p>
                          <p className="font-medium">{formData.heightLimit}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Services</h4>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {formData.selfPark && <Badge>Self-Park</Badge>}
                        {formData.valetPark && <Badge>Valet</Badge>}
                        {formData.covered && <Badge>Covered</Badge>}
                        {formData.open24Hours && <Badge>24/7</Badge>}
                        {formData.shuttle && <Badge variant="secondary">Shuttle Available</Badge>}
                      </div>
                    </div>
                  </div>

                  {formData.amenities.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Amenities</h4>
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div className="flex flex-wrap gap-2">
                            {formData.amenities.map((amenityId) => {
                              const amenity = amenityOptions.find((a) => a.id === amenityId);
                              return amenity ? (
                                <Badge key={amenityId} variant="outline">
                                  {amenity.label}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {formData.securityFeatures.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Security</h4>
                        <div className="flex flex-wrap gap-2">
                          {formData.securityFeatures.map((feature) => (
                            <Badge key={feature} variant="outline">
                              <Shield className="h-3 w-3 mr-1" />
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {redeemSteps.filter((s) => s.title.trim()).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Check-in Steps</h4>
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <ol className="space-y-2">
                            {redeemSteps
                              .filter((s) => s.title.trim())
                              .map((step, index) => (
                                <li key={index} className="flex gap-2">
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium">{step.title}</p>
                                    {step.description && (
                                      <p className="text-xs text-muted-foreground">{step.description}</p>
                                    )}
                                  </div>
                                </li>
                              ))}
                          </ol>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Submit Location
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)} className="bg-transparent">
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={() => router.push("/owner/locations")}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
