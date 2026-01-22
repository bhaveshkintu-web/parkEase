import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah M.",
    location: "Los Angeles, CA",
    rating: 5,
    text: "Saved over $100 on my week-long trip! The shuttle was prompt and the lot was well-lit and secure. Will definitely use again.",
    date: "2 weeks ago",
  },
  {
    id: 2,
    name: "James T.",
    location: "Chicago, IL",
    rating: 5,
    text: "So much easier than circling the airport garage. Booked my spot in minutes and had peace of mind the entire trip.",
    date: "1 month ago",
  },
  {
    id: 3,
    name: "Emily R.",
    location: "New York, NY",
    rating: 5,
    text: "The free cancellation policy saved me when my flight got rescheduled. Customer service was incredibly helpful.",
    date: "3 weeks ago",
  },
];

export function Testimonials() {
  return (
    <section className="py-16 md:py-24">
      <div className="container px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground">
            Join millions of happy travelers who trust ParkEase
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="relative rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" />

              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating
                        ? "fill-accent text-accent"
                        : "text-muted"
                    }`}
                  />
                ))}
              </div>

              <p className="mb-4 text-foreground">"{testimonial.text}"</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {testimonial.date}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Star className="h-5 w-5 fill-accent text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">4.9 Rating</p>
              <p className="text-xs text-muted-foreground">50,000+ reviews</p>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold text-primary">
              2M+
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Travelers</p>
              <p className="text-xs text-muted-foreground">Trust ParkEase</p>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold text-primary">
              500+
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Locations</p>
              <p className="text-xs text-muted-foreground">Nationwide</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
