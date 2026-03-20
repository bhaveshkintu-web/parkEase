"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Info,
  Car,
  Clock,
  Shield,
  Zap,
  Phone,
  Search,
  Loader2,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MediaManagementCard } from "@/components/owner/media-management-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useToast } from "@/hooks/use-toast";
import { airports } from "@/lib/data";
import { cn } from "@/lib/utils";
import { 
  getParkingLocationById, 
  updateParkingLocation, 
  deleteLocation as removeLocationAction 
} from "@/lib/actions/parking-actions";
import { SpotIdentifierGrid } from "@/components/owner/spot-identifier-grid";
import { getSpotsWithBookingStatus } from "@/lib/actions/spot-actions";

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
  ownerId: string;
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
  spotIdentifiers: any[];
  status: string;
}

const initialFormData: FormData = {
  ownerId: "",
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
  spotIdentifiers: [],
  status: "ACTIVE",
};

// Utility to sync list with target total
const syncSpotList = (total: number, currentList: any[]) => {
  const normalizedTotal = Math.max(0, total);
  if (normalizedTotal === currentList.length) return currentList;

  if (normalizedTotal < currentList.length) {
    return currentList.slice(0, normalizedTotal);
  }

  const newList = [...currentList];
  let lastId = "A0";
  if (currentList.length > 0) {
    const last = currentList[currentList.length - 1];
    lastId = typeof last === "string" ? last : (last as any).identifier;
  }

  const match = lastId.match(/^(.*?)(\d+)$/);
  let prefix = "A";
  let startNum = 1;

  if (match) {
    prefix = match[1] || "";
    startNum = (parseInt(match[2]) || 0) + 1;
  }

  while (newList.length < normalizedTotal) {
    newList.push({
      id: `new-${Date.now()}-${newList.length}`,
      identifier: `${prefix}${startNum++}`,
      status: "ACTIVE"
    });
  }
  return newList;
};

export default function AdminEditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: locationId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [owners, setOwners] = useState<any[]>([]);
  const [isOwnersLoading, setIsOwnersLoading] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [airportOpen, setAirportOpen] = useState(false);
  // Identifiers of spots that have active/future bookings (cannot be deleted)
  const [bookedIdentifiers, setBookedIdentifiers] = useState<string[]>([]);
  const [allSpotsBlocked, setAllSpotsBlocked] = useState(false);

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
    const fetchOwners = async () => {
      setIsOwnersLoading(true);
      try {
        const response = await fetch("/api/admin/owners");
        if (response.ok) {
          const data = await response.json();
          setOwners(data.owners || []);
        }
      } catch (error) {
        console.error("Failed to fetch owners:", error);
      } finally {
        setIsOwnersLoading(false);
      }
    };
    fetchOwners();
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!locationId) return;
      setIsLoading(true);
      const result = await getParkingLocationById(locationId);

      if (result.success && result.data) {
        const data = result.data;
        const loadedTotalSpots = data.totalSpots || 0;
        const loadedSpots = (data as any).spots || [];

        setFormData({
          ownerId: data.ownerId || "",
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
          shuttleHours: "24/7",
          shuttleFrequency: "Every 10-15 minutes",
          shuttlePhone: "",
          totalSpots: String(loadedTotalSpots),
          heightLimit: (data as any).heightLimit || "",
          selfPark: data.selfPark,
          valetPark: data.valet,
          covered: data.covered,
          open24Hours: data.open24Hours,
          cancellationPolicy: "free",
          cancellationDeadline: "24",
          securityFeatures: (data as any).securityFeatures || [],
          specialInstructions: "",
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          images: data.images || [],
          spotIdentifiers: syncSpotList(loadedTotalSpots, loadedSpots),
          status: data.status || "ACTIVE",
        });

        // Load booking status for each spot to know which are protected
        const statusResult = await getSpotsWithBookingStatus(locationId);
        if (statusResult.success && statusResult.data) {
          const booked = statusResult.data
            .filter((s: any) => s.hasActiveOrFutureBooking)
            .map((s: any) => s.identifier);
          setBookedIdentifiers(booked);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch location details",
          variant: "destructive",
        });
        router.push("/admin/locations");
      }
      setIsLoading(false);
    };

    fetchLocation();
  }, [locationId, router, toast]);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean | string[]) => {
    setFormData((prev) => {
      const newState = { ...prev, [field]: value };

      if (field === "totalSpots") {
        const newTotal = parseInt(value as string);
        const oldTotal = prev.spotIdentifiers.length;
        if (!isNaN(newTotal)) {
          newState.spotIdentifiers = syncSpotList(newTotal, prev.spotIdentifiers);

          // Check if all spots being removed are protected (have active/future bookings)
          if (newTotal < oldTotal) {
            const slotsToRemove = prev.spotIdentifiers.slice(newTotal);
            const removableCount = slotsToRemove.filter(
              (s: any) => !bookedIdentifiers.includes(typeof s === "string" ? s : s.identifier)
            ).length;
            setAllSpotsBlocked(removableCount === 0 && slotsToRemove.length > 0);
          } else {
            setAllSpotsBlocked(false);
          }
        }
      } else if (field === "spotIdentifiers") {
        newState.totalSpots = String((value as any[]).length);
        setAllSpotsBlocked(false);
      }

      return newState;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors, bookedIdentifiers]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = "Location name is required";
    if (!formData.ownerId) newErrors.ownerId = "Owner is required";
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
        images: formData.images,
        shuttle: formData.shuttle,
        covered: formData.covered,
        selfPark: formData.selfPark,
        valet: formData.valetPark,
        open24Hours: formData.open24Hours,
        cancellationPolicy: formData.cancellationPolicy as any,
        cancellationDeadline: formData.cancellationDeadline,
        spotIdentifiers: formData.spotIdentifiers,
        ownerId: formData.ownerId || undefined,
      };

      const result = await updateParkingLocation(locationId, locationData);

      if (result.success) {
        const protectedSpots = (result as any).protectedSpots as string[];
        if (protectedSpots && protectedSpots.length > 0) {
          toast({
            title: "Saved with restrictions",
            description: `${protectedSpots.length} spot(s) (${protectedSpots.join(", ")}) could not be removed because they have active or future bookings.`,
          });
        } else {
          toast({
            title: "Success",
            description: "Location updated successfully",
          });
        }
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update location",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await removeLocationAction(locationId);
      if (result.success) {
        toast({
          title: "Location deleted",
          description: "The parking location has been deleted.",
        });
        router.push("/admin/locations");
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedAirport = airports.find((a) => a.code === formData.airportCode);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 -mx-4 -mt-6">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/locations">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Edit Location</h1>
                <p className="text-sm text-muted-foreground">{formData.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
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
                      Are you sure you want to delete &quot;{formData.name}&quot;? This action cannot be undone.
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
              <Button onClick={() => handleSubmit()} disabled={isSubmitting || allSpotsBlocked} size="sm">
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
              <Label>Owner Company Name *</Label>
              <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.ownerId
                      ? owners.find((o) => o.id === formData.ownerId)?.businessName || "Select owner..."
                      : "Search owner..."}
                    {isOwnersLoading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" />
                    ) : (
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search owners..." />
                    <CommandList>
                      <CommandEmpty>No owner found.</CommandEmpty>
                      <CommandGroup>
                        {owners.map((owner) => (
                          <CommandItem
                            key={owner.id}
                            value={`${owner.businessName} ${owner.user?.email} ${owner.user?.firstName} ${owner.user?.lastName}`}
                            onSelect={() => {
                              handleInputChange("ownerId", owner.id);
                              setOwnerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.ownerId === owner.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{owner.businessName}</span>
                              <span className="text-xs text-muted-foreground">
                                {owner.user?.firstName} {owner.user?.lastName} ({owner.user?.email})
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.ownerId && <p className="text-sm text-destructive">{errors.ownerId}</p>}
            </div>

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

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Parking Spot Identifiers</Label>
                  <p className="text-xs text-muted-foreground">
                    Assign names to each physical spot (e.g. A1, A2, B1...)
                  </p>
                </div>
              </div>

              <SpotIdentifierGrid
                identifiers={formData.spotIdentifiers}
                onChange={(ids) => handleInputChange("spotIdentifiers", ids)}
                lockedIdentifiers={formData.spotIdentifiers
                  .filter((s: any) => s._count?.bookings > 0)
                  .map((s: any) => s.identifier)}
                bookedIdentifiers={bookedIdentifiers}
                maxSpots={parseInt(formData.totalSpots) || 500}
                locationId={locationId}
              />

              {allSpotsBlocked && (
                <Alert variant="destructive" className="py-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    <strong>Cannot Reduce Spots:</strong> All spots in this reduction range have active or future bookings. Please wait until those bookings are completed before reducing the total spot count.
                  </AlertDescription>
                </Alert>
              )}
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

        <MediaManagementCard
          locationId={locationId}
          images={formData.images}
          onImagesChange={(newImages) => handleInputChange("images", newImages)}
          autoSave={false}
        />
      </div>
    </div>
  );
}
