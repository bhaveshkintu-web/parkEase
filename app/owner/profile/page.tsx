"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, MapPin, Search } from "lucide-react";

export default function OwnerProfilePage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "individual" as string,
    taxId: "",
    registrationNumber: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Address autocomplete states
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
      street: streetAddress,
      city: addr.city || addr.town || addr.village || addr.suburb || "",
      state: addr.state || "",
      zipCode: addr.postcode || "",
    }));

    setShowSuggestions(false);
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/owner/profile");
        if (response.ok) {
          const profile = await response.json();
          if (profile) {
            setFormData({
              businessName: profile.businessName || "",
              businessType: profile.businessType || "individual",
              taxId: profile.taxId || "",
              registrationNumber: profile.registrationNumber || "",
              street: profile.street === "N/A" ? "" : profile.street || "",
              city: profile.city || "",
              state: profile.state || "",
              zipCode: profile.zipCode === "N/A" ? "" : profile.zipCode || "",
              country: profile.country || "USA",
            });
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/owner/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          if (error.details) {
            setErrors(error.details);
          }
          throw new Error(error.error || "Failed to create profile");
        } else {
          throw new Error("Failed to create profile: Server returned non-JSON response");
        }
      }

      toast({
        title: "Profile created",
        description: "Your owner profile has been created successfully.",
      });

      await refresh();
      router.push("/owner");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Complete Your Owner Profile
          </CardTitle>
          <CardDescription>
            Please provide your business information to start adding parking locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g., ABC Parking Services"
                required
              />
              {errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type *</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) =>
                  setFormData({ ...formData, businessType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="hotel">Hotel/Commercial Space</SelectItem>
                  <SelectItem value="airport">Airport Parking Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID (Optional)</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="XX-XXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number (Optional)</Label>
                <Input
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="REG-XXXXX"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Business Address *</Label>
              <div className="relative" ref={addressRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formData.street}
                    onChange={(e) => {
                      setFormData({ ...formData, street: e.target.value });
                      fetchSuggestions(e.target.value);
                    }}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    placeholder="Street Address"
                    required
                    className="pl-10 pr-10"
                  />
                  {isFetchingAddress && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {showSuggestions && addressSuggestions.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 shadow-lg overflow-hidden border-border max-h-[300px] overflow-y-auto bg-background">
                    <div className="p-1">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-sm transition-colors flex items-start gap-3"
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {suggestion.display_name.split(',')[0]}
                            </span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {suggestion.display_name.split(',').slice(1).join(',').trim()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
              {errors.street && <p className="text-sm text-destructive">{errors.street}</p>}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  required
                />
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  placeholder="State"
                  maxLength={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="ZIP Code"
                  required
                />
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                "Create Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
