"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SearchWidget } from "@/components/search-widget";
import { LocationCard } from "@/components/parking/location-card";
import { FilterSidebar } from "@/components/parking/filter-sidebar";
import { BookingProvider, useBooking } from "@/lib/booking-context";
import { getParkingLocations } from "@/lib/actions/parking-actions";
import { calculateDays, destinations } from "@/lib/data";
import { calculateDistance, formatDistance } from "@/lib/utils/geo-utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SlidersHorizontal,
  MapPin,
  List,
  Map,
  ArrowUpDown,
} from "lucide-react";
import { Suspense, lazy } from "react";
import dynamic from "next/dynamic";
import Loading from "./loading";

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/parking/map-view"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted animate-pulse rounded-xl">
      <div className="text-center">
        <Map className="mx-auto mb-4 h-8 w-8 text-muted-foreground animate-bounce" />
        <p className="text-sm text-muted-foreground">Loading Map...</p>
      </div>
    </div>
  ),
});

type SortOption = "price-low" | "price-high" | "rating" | "distance";

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

function ParkingResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const locationId = searchParams.get("locationId");
  const { checkIn, checkOut } = useBooking();

  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    priceRange: [0, 100],
    shuttle: false,
    covered: false,
    selfPark: false,
    valet: false,
    evCharging: false,
    open24Hours: false,
    freeCancellation: false,
  });
  const [sortBy, setSortBy] = useState<SortOption>("price-low");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const response = await getParkingLocations({
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
      });
      if (response.success && response.data) {
        setLocations(response.data);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [checkIn, checkOut]);

  const days = calculateDays(checkIn, checkOut);

  // Resolve search destination coordinates
  const searchDestination = useMemo(() => {
    if (!query) return null;
    const lowerQuery = query.toLowerCase();
    return destinations.find(
      (d) =>
        (d.code && d.code.toLowerCase() === lowerQuery) ||
        d.name.toLowerCase().includes(lowerQuery) ||
        d.city.toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  // Enhanced locations with distance
  const enrichedLocations = useMemo(() => {
    return locations.map((loc) => {
      let distanceStr = "";
      if (searchDestination && loc.latitude && loc.longitude) {
        const dist = calculateDistance(
          searchDestination.coordinates.lat,
          searchDestination.coordinates.lng,
          loc.latitude,
          loc.longitude
        );
        distanceStr = formatDistance(dist);
      } else {
        distanceStr = "Near terminal";
      }
      return { ...loc, distance: distanceStr };
    });
  }, [locations, searchDestination]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    return enrichedLocations.filter((location) => {
      // Location ID filter (Exact match)
      if (locationId && location.id !== locationId) {
        return false;
      }

      // Search query filter
      if (query) {
        const searchLower = query.toLowerCase();
        const matchesSearch =
          location.name.toLowerCase().includes(searchLower) ||
          (location.airport && location.airport.toLowerCase().includes(searchLower)) ||
          (location.airportCode && location.airportCode.toLowerCase().includes(searchLower)) ||
          location.address.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Price filter
      const [minPrice, maxPrice] = filters.priceRange;
      if (location.pricePerDay < minPrice) return false;
      // If maxPrice is at the upper bound (50), show everything above it too
      if (maxPrice < 50 && location.pricePerDay > maxPrice) return false;

      // Amenity filters
      if (filters.shuttle && !location.shuttle) return false;
      if (filters.covered && !location.covered) return false;
      if (filters.selfPark && !location.selfPark) return false;
      if (filters.valet && !location.valet) return false;
      if (filters.evCharging && !location.amenities.includes("EV Charging")) return false;
      if (filters.open24Hours && !location.open24Hours) return false;
      if (filters.freeCancellation && location.cancellationPolicy?.type !== "free") return false;

      return true;
    });
  }, [query, filters, enrichedLocations, locationId]);

  // Sort locations
  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.pricePerDay - b.pricePerDay;
        case "price-high":
          return b.pricePerDay - a.pricePerDay;
        case "rating":
          return b.rating - a.rating;
        case "distance":
          return parseFloat(a.distance) - parseFloat(b.distance);
        default:
          return 0;
      }
    });
  }, [filteredLocations, sortBy]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Search Bar */}
      <div className="border-b border-border bg-card">
        <div className="container px-4 py-3 md:py-4">
          <SearchWidget variant="inline" />
        </div>
      </div>

      <main className="flex-1 bg-background">
        <div className="container px-4 py-6">
          {/* Results Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {query ? `Parking near ${query}` : "All Parking Locations"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {sortedLocations.length} location{sortedLocations.length !== 1 ? "s" : ""} available
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 lg:hidden bg-transparent">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Filter Sidebar</SheetTitle>
                    <SheetDescription>Filter and search parking locations.</SheetDescription>
                  </SheetHeader>
                  <div className="p-4">
                    <FilterSidebar
                      filters={filters}
                      onFiltersChange={setFilters}
                      onClose={() => setFilterSheetOpen(false)}
                      isMobile
                    />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Sort Dropdown - Prevent hydration error by rendering only on mount */}
              {isMounted ? (
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[160px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="distance">Highest Distance</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 w-[160px] animate-pulse rounded-md bg-muted" />
              )}

              {/* View Toggle */}
              <div className="hidden items-center rounded-lg border border-border sm:flex">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "map" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode("map")}
                >
                  <Map className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <FilterSidebar filters={filters} onFiltersChange={setFilters} />
            </aside>

            {/* Results */}
            <div className="flex-1">
              {viewMode === "list" ? (
                <div className="space-y-4">
                  {sortedLocations.length > 0 ? (
                    sortedLocations.map((location) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        checkIn={checkIn}
                        checkOut={checkOut}
                        days={days}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
                      <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        No parking locations found
                      </h3>
                      <p className="text-center text-sm text-muted-foreground">
                        Try adjusting your search or filters to find available spots.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-[600px] overflow-hidden rounded-xl border border-border bg-muted z-0">
                  <MapView locations={sortedLocations} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ParkingResultsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ParkingResultsContent />
    </Suspense>
  );
}
