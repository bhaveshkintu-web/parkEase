import { Star, Quote } from "lucide-react";
import { getTopHomepageReviews } from "@/lib/actions/review-actions";

const FALLBACK_TESTIMONIALS = [
  {
    id: 'static-1',
    name: "Sarah M.",
    locationName: null,
    locationAddress: "Los Angeles, CA",
    rating: 5,
    text: "Saved over $100 on my week-long trip! The shuttle was prompt and the lot was well-lit and secure. Will definitely use again.",
    date: "2 weeks ago",
  },
  {
    id: 'static-2',
    name: "James T.",
    locationName: null,
    locationAddress: "Chicago, IL",
    rating: 5,
    text: "So much easier than circling the airport garage. Booked my spot in minutes and had peace of mind the entire trip.",
    date: "1 month ago",
  },
  {
    id: 'static-3',
    name: "Emily R.",
    locationName: null,
    locationAddress: "New York, NY",
    rating: 5,
    text: "The free cancellation policy saved me when my flight got rescheduled. Customer service was incredibly helpful.",
    date: "3 weeks ago",
  },
];

export async function Testimonials() {
  // 1. Fetch the absolute top reviews from the DB (Max 5 stars, max helpful, 1 per location)
  const dbReviews = await getTopHomepageReviews();

  // 2. Map the DB reviews to the UI structure expected by the grid
  const dynamicTestimonials = dbReviews.map((review) => {
    const authorName = review.user 
      ? `${review.user.firstName} ${review.user.lastName.charAt(0)}.`
      : "Anonymous";

    // Format the location nicely (e.g. "Airport Parking - Los Angeles, CA")
    let displayAddress = "US";
    let displayName = null;
    
    if (review.location) {
      if (review.location.name) displayName = review.location.name;
      
      const cityState = [];
      if (review.location.city) cityState.push(review.location.city);
      if (review.location.state) cityState.push(review.location.state);
      
      if (cityState.length > 0) {
        displayAddress = cityState.join(", ");
      }
    }

    // Friendly date formatter
    const timeDisplay = new Date(review.createdAt || new Date()).toLocaleDateString("en-US", { 
      month: "short", 
      year: "numeric" 
    });

    return {
      id: review.id,
      name: authorName,
      locationName: displayName,
      locationAddress: displayAddress,
      rating: review.rating,
      text: review.content,
      date: timeDisplay,
    };
  });

  // 3. Graceful fallback: If the DB doesn't have 3 perfect unique reviews yet, pad the remaining empty spots with the classic static reviews so the homepage always looks full and beautiful.
  const testimonials = [];
  for (let i = 0; i < 3; i++) {
    if (dynamicTestimonials[i]) {
      testimonials.push(dynamicTestimonials[i]);
    } else {
      testimonials.push(FALLBACK_TESTIMONIALS[i]);
    }
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground">
            Join millions of happy travelers who trust ParkZipply
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
                    className={`h-4 w-4 ${i < testimonial.rating
                        ? "fill-accent text-accent"
                        : "text-muted"
                      }`}
                  />
                ))}
              </div>

              <p className="mb-4 text-foreground">"{testimonial.text}"</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                  
                  {/* Clean Two-Line Location Styling */}
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {testimonial.locationName && (
                      <p className="text-[13px] font-medium text-primary/80 truncate max-w-[180px]">
                        {testimonial.locationName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {testimonial.locationAddress}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {testimonial.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
