"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useBooking } from "@/lib/booking-context";
import { formatDate, formatTime } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  Plane,
  Building,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { searchLocations, type SearchResult } from "@/app/actions/search";

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
    minBookingDuration,
  } = useBooking();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Search
  useEffect(() => {
    // Clean up empty query search check - just search if not currently debouncing
    // If query is empty, we want default results immediately (no debounce needed ideally, but consistent behavior is fine)
    
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchLocations(localQuery);
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localQuery]);

  const handleSearch = useCallback(() => {
    setSearchQuery(localQuery);
    setShowSuggestions(false);
    // Navigates to results page with: locationId, dropOff date, pickUp date, searchType
    // If we have a selected result, we technically should use its ID, but the "Search Button" behavior 
    // usually performs a text search if no specific item was selected from dropdown, 
    // OR if we already selected one, localQuery might be "Name, City...".
    // The prompt says "Search button -> navigates to results page with: locationId..."
    // If no locationId is present (user just typed words), we might need to send query.
    // However, prompt implies selecting location fills input.
    // I'll assume generic search if no ID selected, but strict "exact Way.com" might imply validation.
    // For now, I'll pass query string if no ID, or let results page handle it. 
    // BUT prompt requirements: "locationId" in params. 
    // If user didn't select from dropdown, we don't have ID easily unless we pick first match.
    // I will adhere to: pass known params. 
    
    // Construct URL params
    const params = new URLSearchParams();
    if (localQuery) params.append("q", localQuery);
    params.append("type", parkingType);
    params.append("checkIn", checkIn.toISOString());
    params.append("checkOut", checkOut.toISOString());
    
    router.push(`/parking?${params.toString()}`);
  }, [localQuery, parkingType, checkIn, checkOut, router, setSearchQuery]);

  const handleSelectResult = (result: SearchResult) => {
    const displayName = `${result.name}, ${result.city}, ${result.country}`;
    setLocalQuery(displayName);
    setSearchQuery(displayName);
    setShowSuggestions(false);
    setActiveIndex(-1);
    
    // Navigate immediately or just fill? 
    // UX rules: "Selecting location -> full name fills input" (done above)
    // "Search button -> navigates..."
    // So we just fill input.
    // We should probably store the locationId in a ref or state to use it in handleSearch?
    // Let's assume the user clicks Search after.
    // But to fully support "locationId" in URL, I should persist it.
    // I'll rely on the query string for now or adding a hidden state if needed, 
    // but generic search page usually handles 'q'.
    // Prompt says "Search button -> navigates to results page with locationId". 
    // This implies exact match ID.
    // I will modify `handleSearch` to use the ID if we have a perfect match or store it.
    // For now, standard query param is robust.
    // Actually, I'll add a 'selectedId' state.
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const onSelect = (result: SearchResult) => {
      const displayName = `${result.name}, ${result.city}, ${result.country}`;
      setLocalQuery(displayName);
      setSearchQuery(displayName);
      setSelectedId(result.id);
      setShowSuggestions(false);
  }

  const onSearchClick = () => {
      const params = new URLSearchParams();
      if (selectedId) params.append("locationId", selectedId);
      else if (localQuery) params.append("q", localQuery);
      
      params.append("type", parkingType);
      params.append("checkIn", checkIn.toISOString());
      params.append("checkOut", checkOut.toISOString());
      
      router.push(`/parking?${params.toString()}`);
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || results.length === 0) {
      if (e.key === "Enter") onSearchClick();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          onSelect(results[activeIndex]);
        } else {
          onSearchClick();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active item
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeElement?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Click outside - updated to check listRef too
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.parentElement?.contains(event.target as Node) &&
        listRef.current &&
        !listRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isHero = variant === "hero";

  return (
    <div className={cn("w-full rounded-xl bg-card shadow-lg", isHero ? "p-4 md:p-6" : "p-3", className)}>
      {/* Tabs */}
      {/* <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {parkingTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setParkingType(type.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              parkingType === type.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <type.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{type.label}</span>
          </button>
        ))}
      </div> */}

      <div className={cn("grid gap-3", isHero ? "md:grid-cols-[1fr_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto_auto]")}>
        {/* Input */}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search by Airport, City, or Name"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                setSelectedId(null); // Clear selected ID on edit
                setShowSuggestions(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className={cn("pl-10 pr-10", isHero ? "h-12 text-base" : "h-10")}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* RESULTS DROPDOWN */}
          {showSuggestions && (
             <div ref={listRef} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-card shadow-lg">
                {results.length > 0 ? (
                  results.map((item, idx) => (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => onSelect(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b last:border-0",
                        activeIndex === idx ? "bg-primary/10" : "hover:bg-muted"
                      )}
                    >
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10")}>
                         {item.airportCode ? <Plane className="h-5 w-5 text-primary" /> : <Building className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                           {item.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                           {item.city}, {item.country} {item.airportCode && `(${item.airportCode})`}
                        </p>
                      </div>
                      <div className="text-right">
                         <span className="block font-bold text-primary">${item.pricePerDay}</span>
                         <span className="text-[10px] text-muted-foreground">/day</span>
                      </div>
                    </button>
                  ))
                ) : (
                  !isLoading && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                       {localQuery ? "No locations found" : "Start typing to search..."}
                    </div>
                  )
                )}
             </div>
          )}
        </div>

        {/* Date Pickers */}
        <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start gap-2 font-normal bg-transparent", isHero ? "h-12 min-w-[160px]" : "h-10 min-w-[140px]")}>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-muted-foreground">Drop-off</span>
                <span className="text-sm">{formatDate(checkIn)} {formatTime(checkIn)}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
              <Calendar mode="single" selected={checkIn} onSelect={(d) => { if(d) { const n = new Date(d); n.setHours(checkIn.getHours(), checkIn.getMinutes(), 0, 0); setCheckIn(n); if(n.getTime() + minBookingDuration * 60000 > checkOut.getTime()) { const nc = new Date(n.getTime() + minBookingDuration * 60000); setCheckOut(nc); } setCheckInOpen(false); }}} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} initialFocus />
              <div className="border-t border-border pt-3">
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Drop-off Time</label>
                <Select
                  value={`${checkIn.getHours().toString().padStart(2, '0')}:${checkIn.getMinutes().toString().padStart(2, '0')}`}
                  onValueChange={(value) => {
                    const [hours, minutes] = value.split(':').map(Number);
                    const newCheckIn = new Date(checkIn);
                    newCheckIn.setHours(hours, minutes, 0, 0);
                    setCheckIn(newCheckIn);
                    if (newCheckIn.getTime() + minBookingDuration * 60000 > checkOut.getTime()) {
                      const newCheckOut = new Date(newCheckIn.getTime() + minBookingDuration * 60000);
                      setCheckOut(newCheckOut);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const hour = Math.floor(i / 2);
                      const minute = (i % 2) * 30;
                      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      const displayHour = hour % 12 || 12;
                      const displayMinute = minute.toString().padStart(2, '0');
                      const ampm = hour < 12 ? 'AM' : 'PM';
                      return (
                        <SelectItem key={timeString} value={timeString}>
                          {displayHour}:{displayMinute} {ampm}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" size="sm" onClick={() => setCheckInOpen(false)}>Done</Button>
          </PopoverContent>
        </Popover>

        <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
          <PopoverTrigger asChild>
             <Button variant="outline" className={cn("justify-start gap-2 font-normal bg-transparent", isHero ? "h-12 min-w-[160px]" : "h-10 min-w-[140px]")}>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-muted-foreground">Pick-up</span>
                <span className="text-sm">{formatDate(checkOut)} {formatTime(checkOut)}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
               <Calendar mode="single" selected={checkOut} onSelect={(d) => { if(d) { const n = new Date(d); n.setHours(checkOut.getHours(), checkOut.getMinutes(), 0, 0); if(checkIn.getTime() + minBookingDuration * 60000 > n.getTime()) { const bumped = new Date(checkIn.getTime() + minBookingDuration * 60000); setCheckOut(bumped); } else { setCheckOut(n); } } }} disabled={(d) => d < new Date(new Date(checkIn).setHours(0,0,0,0))} initialFocus />
              <div className="border-t border-border pt-3">
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Pick-up Time</label>
                <Select
                  value={`${checkOut.getHours().toString().padStart(2, '0')}:${checkOut.getMinutes().toString().padStart(2, '0')}`}
                  onValueChange={(value) => {
                    const [hours, minutes] = value.split(':').map(Number);
                    const newCheckOut = new Date(checkOut);
                    newCheckOut.setHours(hours, minutes, 0, 0);
                    if (checkIn.getTime() + minBookingDuration * 60000 > newCheckOut.getTime()) {
                      const bumped = new Date(checkIn.getTime() + minBookingDuration * 60000);
                      setCheckOut(bumped);
                    } else {
                      setCheckOut(newCheckOut);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const hour = Math.floor(i / 2);
                      const minute = (i % 2) * 30;
                      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      const displayHour = hour % 12 || 12;
                      const displayMinute = minute.toString().padStart(2, '0');
                      const ampm = hour < 12 ? 'AM' : 'PM';
                      return (
                        <SelectItem 
                          key={timeString} 
                          value={timeString}
                          disabled={
                            checkIn.toDateString() === checkOut.toDateString() && 
                            (hour * 60 + minute) < (checkIn.getHours() * 60 + checkIn.getMinutes() + minBookingDuration)
                          }
                        >
                          {displayHour}:{displayMinute} {ampm}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" size="sm" onClick={() => setCheckOutOpen(false)}>Done</Button>
          </PopoverContent>
        </Popover>

        <Button onClick={onSearchClick} className={cn("gap-2", isHero ? "h-12 px-6" : "h-10 px-4")}>
           <Search className="h-4 w-4" />
           <span>Find Parking</span>
        </Button>
      </div>
    </div>
  );
}
