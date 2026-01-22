import { Search, Calendar, Car, CheckCircle } from "lucide-react";

const steps = [
  {
    step: 1,
    title: "Search & Compare",
    description: "Enter your destination and dates to see all available parking options with real prices",
    icon: Search,
  },
  {
    step: 2,
    title: "Book Online",
    description: "Select your preferred lot, complete your reservation, and receive instant confirmation",
    icon: Calendar,
  },
  {
    step: 3,
    title: "Park & Go",
    description: "Show your confirmation at the lot, park your car, and take the free shuttle to the terminal",
    icon: Car,
  },
  {
    step: 4,
    title: "Return Stress-Free",
    description: "When you return, call for pickup and your car will be ready and waiting",
    icon: CheckCircle,
  },
];

export function HowItWorks() {
  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Booking parking has never been easier. Follow these simple steps to secure your spot.
          </p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-1/2 top-16 hidden h-0.5 w-3/4 -translate-x-1/2 bg-border lg:block" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step Number with Icon */}
                <div className="relative mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {item.step}
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
