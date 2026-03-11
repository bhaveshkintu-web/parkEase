"use client";

import { useEffect, useState } from "react";
import { getFavorites } from "@/lib/actions/favorites-actions";
import { LocationCard } from "@/components/parking/location-card";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import Link from "next/link";

const ITEMS_PER_PAGE = 10;

export default function FavoritesPage() {
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      const result = await getFavorites();
      if (result.success) {
        setSavedLocations(result.data || []);
      }
      setLoading(false);
    };
    fetchFavorites();
  }, []);

  // Default dates for the card display (tomorrow + 3 days)
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);
  const days = 3;

  // Pagination
  const totalPages = Math.ceil(savedLocations.length / ITEMS_PER_PAGE);
  const paginatedLocations = savedLocations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading saved locations...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 bg-background">
        <div className="container px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Saved Locations</h1>
            <p className="text-muted-foreground mt-2">
              Manage your favorite parking spots for quick access.
            </p>
          </header>

          {savedLocations.length > 0 ? (
            <div className="space-y-6">
              <div className="grid gap-6">
                {paginatedLocations.map((item) => (
                  <LocationCard
                    key={item.location.id}
                    location={item.location as any}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    days={days}
                  />
                ))}
              </div>
              <PaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={savedLocations.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center animate-in fade-in-50">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                <Heart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">No Saved Locations</h2>
              <p className="mt-2 max-w-sm text-muted-foreground mb-6">
                You haven't saved any parking locations yet. Browse our parking spots and click the heart icon to save them here.
              </p>
              <Button asChild>
                <Link href="/parking">Explore Parking</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
