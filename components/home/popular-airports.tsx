"use client";

import Link from "next/link";
import { airports } from "@/lib/data";
import { Plane, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PopularAirports() {
  return (
    <section className="py-16 md:py-24">
      <div className="container px-4">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
              Popular Airport Parking
            </h2>
            <p className="text-muted-foreground">
              Book parking at top airports and save up to 60%
            </p>
          </div>
          <Button variant="ghost" className="hidden gap-2 md:flex">
            View all airports
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {airports.slice(0, 8).map((airport) => (
            <Link
              key={airport.code}
              href={`/parking?q=${encodeURIComponent(airport.code)}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg"
            >
              {/* Image Placeholder with Gradient */}
              <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plane className="h-12 w-12 text-primary/40" />
                </div>
                <div className="absolute left-3 top-3 rounded-md bg-card/90 px-2 py-1 text-xs font-bold text-foreground backdrop-blur-sm">
                  {airport.code}
                </div>
              </div>

              <div className="p-4">
                <h3 className="mb-1 font-semibold text-foreground group-hover:text-primary">
                  {airport.city}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {airport.name}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">From</span>
                  <span className="font-semibold text-primary">$8.99/day</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Button variant="outline" className="gap-2 bg-transparent">
            View all airports
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
