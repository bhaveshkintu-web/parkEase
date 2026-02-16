"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatCurrency } from "@/lib/data";
import { X, Bus, Shield, Car, Zap, Clock, CheckCircle, ParkingCircle } from "lucide-react";

interface Filters {
  priceRange: [number, number];
  shuttle: boolean;
  covered: boolean;
  selfPark: boolean;
  valet: boolean;
  evCharging: boolean;
  open24Hours: boolean;
  freeCancellation: boolean;
}

interface FilterSidebarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

const amenityFilters = [
  { id: "shuttle", label: "Free Shuttle", icon: Bus },
  { id: "covered", label: "Covered Parking", icon: ParkingCircle },
  { id: "selfPark", label: "Self Park", icon: Car },
  { id: "valet", label: "Valet Available", icon: Zap },
  { id: "evCharging", label: "EV Charging", icon: Zap },
  { id: "open24Hours", label: "Open 24/7", icon: Clock },
] as const;

const policyFilters = [
  { id: "freeCancellation", label: "Free Cancellation", icon: CheckCircle },
] as const;

export function FilterSidebar({
  filters,
  onFiltersChange,
  onClose,
  isMobile,
}: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handlePriceChange = (value: number[]) => {
    const newFilters = { ...localFilters, priceRange: [value[0], value[1]] as [number, number] };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleFilterChange = (key: keyof Filters, checked: boolean) => {
    const newFilters = { ...localFilters, [key]: checked };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: Filters = {
      priceRange: [0, 50],
      shuttle: false,
      covered: false,
      selfPark: false,
      valet: false,
      evCharging: false,
      open24Hours: false,
      freeCancellation: false,
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const activeFilterCount = [
    localFilters.shuttle,
    localFilters.covered,
    localFilters.selfPark,
    localFilters.valet,
    localFilters.evCharging,
    localFilters.open24Hours,
    localFilters.freeCancellation,
    localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 50,
  ].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Clear all
            </Button>
          )}
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["price", "amenities", "policies"]} className="w-full">
        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-medium">
            Price per Day
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-1 pt-2">
              <Slider
                value={localFilters.priceRange}
                onValueChange={handlePriceChange}
                max={50}
                min={0}
                step={1}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(localFilters.priceRange[0])}</span>
                <span>{localFilters.priceRange[1] >= 50 ? `${formatCurrency(50)}+` : formatCurrency(localFilters.priceRange[1])}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Policies */}
        <AccordionItem value="policies">
          <AccordionTrigger className="text-sm font-medium">
            Booking Policies
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {policyFilters.map((policy) => (
                <div key={policy.id} className="flex items-center gap-3">
                  <Checkbox
                    id={policy.id}
                    checked={localFilters[policy.id as keyof Filters] as boolean}
                    onCheckedChange={(checked) =>
                      handleFilterChange(policy.id as keyof Filters, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={policy.id}
                    className="flex items-center gap-2 text-sm font-normal text-foreground cursor-pointer"
                  >
                    <policy.icon className="h-4 w-4 text-primary" />
                    {policy.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Amenities */}
        <AccordionItem value="amenities">
          <AccordionTrigger className="text-sm font-medium">
            Amenities & Features
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {amenityFilters.map((amenity) => (
                <div key={amenity.id} className="flex items-center gap-3">
                  <Checkbox
                    id={amenity.id}
                    checked={localFilters[amenity.id as keyof Filters] as boolean}
                    onCheckedChange={(checked) =>
                      handleFilterChange(amenity.id as keyof Filters, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={amenity.id}
                    className="flex items-center gap-2 text-sm font-normal text-foreground cursor-pointer"
                  >
                    <amenity.icon className="h-4 w-4 text-muted-foreground" />
                    {amenity.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {isMobile && (
        <Button className="mt-4 w-full" onClick={onClose}>
          Show Results
        </Button>
      )}
    </div>
  );
}
