import {
  CheckCircle,
  Shield,
  Bus,
  Lock,
  Calendar,
  Star,
  Headset,
} from "lucide-react";

const benefits = [
  {
    title: "Free Cancellation",
    description: "Cancel up to 24 hours before for a full refund",
    icon: CheckCircle,
  },
  {
    title: "Best Price Guarantee",
    description: "Find a lower price? We'll match it",
    icon: Shield,
  },
  {
    title: "Free Shuttle",
    description: "Complimentary shuttle to and from terminals",
    icon: Bus,
  },
  {
    title: "Secure Parking",
    description: "24/7 surveillance and security patrols",
    icon: Lock,
  },
  {
    title: "Guaranteed Spot",
    description: "Your spot is guaranteed when you book",
    icon: Calendar,
  },
  {
    title: "Loyalty Rewards",
    description: "Earn points on every booking",
    icon: Star,
  },
  {
    title: "24/7 Support",
    description: "Customer service around the clock",
    icon: Headset,
  },
];

export function BenefitsSection() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container px-4 py-8">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <Star className="h-4 w-4 fill-primary" />
            7 FREE benefits with your reservation
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="group flex flex-col items-center text-center"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm transition-colors group-hover:bg-primary/10">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 text-sm font-medium text-foreground">
                {benefit.title}
              </h3>
              <p className="hidden text-xs text-muted-foreground lg:block">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
