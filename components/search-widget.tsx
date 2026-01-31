"use client";

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useBooking } from "@/lib/booking-context";
import { destinations, formatDate } from "@/lib/data";
import type { Destination } from "@/lib/types";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  Plane,
  Building,
  CalendarDays,
  MapPinned,
  Locate,
  Loader2,
} from "lucide-react";

const parkingTypes = [
  { id: "airport", label: "Airport", icon: Plane },
  { id: "hourly", label: "Hourly", icon: Clock },
  { id: "monthly", label: "Monthly", icon: CalendarDays },
] as const;

interface SearchWidgetProps {
  variant?: "hero" | "inline";
  className?: string;
}

export function SearchWidget({ variant = "hero", className }: SearchWidgetProps) {
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    parkingType,
    setParkingType,
  } = useBooking();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLocating, setIsLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and group destinations
  const filteredDestinations = localQuery.length >= 1
    ? destinations.filter(
      (dest) =>
        dest.name.toLowerCase().includes(localQuery.toLowerCase()) ||
        dest.city.toLowerCase().includes(localQuery.toLowerCase()) ||
        (dest.code && dest.code.toLowerCase().includes(localQuery.toLowerCase()))
    )
    : [];

  const groupedResults = {
    airports: filteredDestinations.filter((d) => d.type === "airport"),
    cities: filteredDestinations.filter((d) => d.type === "city"),
    venues: filteredDestinations.filter((d) => d.type === "venue"),
  };

  const flatResults = [...groupedResults.airports, ...groupedResults.cities, ...groupedResults.venues];

  const handleSearch = useCallback(() => {
    setSearchQuery(localQuery);
    setShowSuggestions(false);
    router.push(`/parking?q=${encodeURIComponent(localQuery)}`);
  }, [localQuery, router, setSearchQuery]);

  const handleSelectDestination = (dest: Destination) => {
    const displayName = dest.code ? `${dest.code} - ${dest.name}` : dest.name;
    setLocalQuery(displayName);
    setSearchQuery(displayName);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleUseLocation = async () => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });

      // Find nearest airport (simplified)
      const { latitude, longitude } = position.coords;
      let nearest = destinations[0];
      let minDist = Number.POSITIVE_INFINITY;

      for (const dest of destinations.filter(d => d.type === "airport")) {
        const dist = Math.sqrt(
          Math.pow(dest.coordinates.lat - latitude, 2) +
          Math.pow(dest.coordinates.lng - longitude, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = dest;
        }
      }

      handleSelectDestination(nearest);
    } catch {
      // Silently fail - user denied or timeout
    } finally {
      setIsLocating(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || flatResults.length === 0) {
      if (e.key === "Enter") {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatResults.length) {
          handleSelectDestination(flatResults[activeIndex]);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeElement?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isHero = variant === "hero";

  const getIcon = (type: Destination["type"]) => {
    switch (type) {
      case "airport": return Plane;
      case "city": return Building;
      case "venue": return MapPinned;
      default: return MapPin;
    }
  };

  const renderGroup = (title: string, items: Destination[], startIndex: number) => {
    if (items.length === 0) return null;

    return (
      <div key={title}>
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
          {title}
        </div>
        {items.map((dest, idx) => {
          const globalIndex = startIndex + idx;
          const Icon = getIcon(dest.type);
          return (
            <button
              key={dest.id}
              data-index={globalIndex}
              onClick={() => handleSelectDestination(dest)}
              onMouseEnter={() => setActiveIndex(globalIndex)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                activeIndex === globalIndex ? "bg-primary/10" : "hover:bg-muted"
              )}
              role="option"
              aria-selected={activeIndex === globalIndex}
            >
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                dest.type === "airport" ? "bg-primary/10" : "bg-muted"
              )}>
                <Icon className={cn(
                  "h-5 w-5",
                  dest.type === "airport" ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {dest.code && <span className="text-primary">{dest.code}</span>}
                  {dest.code && " - "}
                  {dest.name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {dest.city}{dest.state && `, ${dest.state}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "w-full rounded-xl bg-card shadow-lg",
        isHero ? "p-4 md:p-6" : "p-3",
        className
      )}
    >
      {/* Parking Type Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {parkingTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setParkingType(type.id)}
            suppressHydrationWarning
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              parkingType === type.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <type.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{type.label}</span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "grid gap-3",
          isHero ? "md:grid-cols-[1fr_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto_auto]"
        )}
      >
        {/* Location Input with Autosuggest */}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search airport, city, or venue"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                setShowSuggestions(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className={cn("pl-10 pr-10", isHero ? "h-12 text-base" : "h-10")}
              role="combobox"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
              aria-controls="destination-listbox"
              aria-activedescendant={activeIndex >= 0 ? `dest-${activeIndex}` : undefined}
            />
            {/* Use my location button */}
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={isLocating}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              title="Use my location"
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Locate className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && (localQuery.length > 0 || true) && (
            <div
              ref={listRef}
              id="destination-listbox"
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-card shadow-lg"
            >
              {localQuery.length < 1 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Start typing to search airports, cities, and venues
                </div>
              ) : flatResults.length > 0 ? (
                <>
                  {renderGroup("Airports", groupedResults.airports, 0)}
                  {renderGroup("Cities", groupedResults.cities, groupedResults.airports.length)}
                  {renderGroup("Venues", groupedResults.venues, groupedResults.airports.length + groupedResults.cities.length)}
                </>
              ) : (
                <div className="flex items-center gap-3 px-4 py-4 text-muted-foreground">
                  <Search className="h-5 w-5" />
                  <span>No results found for "{localQuery}"</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Check-in Date */}
        <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start gap-2 font-normal bg-transparent",
                isHero ? "h-12 min-w-[160px]" : "h-10 min-w-[140px]"
              )}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-muted-foreground">Drop-off</span>
                <span className="text-sm">{formatDate(checkIn)}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={(date) => {
                if (date) {
                  const newDate = new Date(date);
                  newDate.setHours(12, 0, 0, 0);
                  setCheckIn(newDate);
                  if (newDate >= checkOut) {
                    const newCheckOut = new Date(newDate);
                    newCheckOut.setDate(newCheckOut.getDate() + 1);
                    setCheckOut(newCheckOut);
                  }
                  setCheckInOpen(false);
                }
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Check-out Date */}
        <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start gap-2 font-normal bg-transparent",
                isHero ? "h-12 min-w-[160px]" : "h-10 min-w-[140px]"
              )}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-muted-foreground">Pick-up</span>
                <span className="text-sm">{formatDate(checkOut)}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={(date) => {
                if (date) {
                  const newDate = new Date(date);
                  newDate.setHours(12, 0, 0, 0);
                  setCheckOut(newDate);
                  setCheckOutOpen(false);
                }
              }}
              disabled={(date) => date <= checkIn}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className={cn("gap-2", isHero ? "h-12 px-6" : "h-10 px-4")}
        >
          <Search className="h-4 w-4" />
          <span>Find Parking</span>
        </Button>
      </div>
    </div>
  );
}
