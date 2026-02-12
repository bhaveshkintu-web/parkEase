import { getFavorites } from "@/lib/actions/favorites-actions";
import { LocationCard } from "@/components/parking/location-card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function FavoritesPage() {
  const result = await getFavorites();
  const savedLocations = result.success ? result.data || [] : [];

  // Default dates for the card display (tomorrow + 3 days)
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);
  const days = 3;

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
            <div className="grid gap-6">
              {savedLocations.map((item) => (
                <LocationCard
                  key={item.location.id}
                  location={item.location as any} // Cast to any to bypass strict type matching if needed, or update types
                  checkIn={checkIn}
                  checkOut={checkOut}
                  days={days}
                />
              ))}
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
