"use client";

import { SearchWidget } from "@/components/search-widget";
import { CheckCircle, Shield, Clock } from "lucide-react";

const heroFeatures = [
  { icon: CheckCircle, text: "Free Cancellation" },
  { icon: Shield, text: "Best Price Guarantee" },
  { icon: Clock, text: "24/7 Support" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="container relative px-4 py-16 md:py-24 lg:py-32">
        <div className="w-full flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span>Trusted by 2M+ travelers</span>
          </div>

          <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Book and Park.{" "}
            <span className="text-primary">It's that easy.</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            Find the lowest parking prices at airports, stadiums, and city centers. 
            Reserve your spot in seconds and save up to 60%.
          </p>

          {/* Features */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {heroFeatures.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <feature.icon className="h-4 w-4 text-primary" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Search Widget */}
          <SearchWidget variant="hero" className="mx-auto max-w-4xl" />
        </div>
      </div>
    </section>
  );
}
