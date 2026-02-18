import { Button } from "@/components/ui/button";
import { Smartphone, Apple, Star } from "lucide-react";

export function AppDownload() {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="container px-4">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <div className="text-center lg:text-left">
            <h2 className="mb-3 text-2xl font-bold text-primary-foreground md:text-3xl">
              Get an Extra 5% Off in the App
            </h2>
            <p className="mb-6 max-w-xl text-primary-foreground/80">
              Download the ParkZipply app for exclusive deals, easy booking management,
              and real-time notifications about your reservations.
            </p>

            <div className="mb-6 flex items-center justify-center gap-4 lg:justify-start">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-sm text-primary-foreground/80">
                4.9 rating on App Store & Google Play
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2"
              >
                <Apple className="h-5 w-5" />
                Download for iOS
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Smartphone className="h-5 w-5" />
                Download for Android
              </Button>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="relative">
            <div className="relative h-80 w-44 rounded-3xl border-4 border-primary-foreground/20 bg-card shadow-2xl">
              <div className="absolute left-1/2 top-2 h-6 w-20 -translate-x-1/2 rounded-full bg-muted" />
              <div className="flex h-full flex-col items-center justify-center p-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                  <span className="text-2xl font-bold text-primary-foreground">P</span>
                </div>
                <p className="text-center text-sm font-medium text-foreground">
                  ParkZipply
                </p>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Park smarter, save more
                </p>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/30 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary-foreground/20 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
