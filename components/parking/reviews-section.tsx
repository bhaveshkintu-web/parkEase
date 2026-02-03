import { Star, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  helpful: number;
}

const mockReviews: Review[] = [
  {
    id: "1",
    author: "Michael S.",
    rating: 5,
    date: "December 2025",
    text: "Excellent experience! The shuttle was waiting for me as soon as I parked. The lot was well-lit and I felt my car was secure. Will definitely use again for my next trip.",
    helpful: 24,
  },
  {
    id: "2",
    author: "Jennifer L.",
    rating: 5,
    date: "November 2025",
    text: "Super easy booking process and the price was way better than the airport garage. The shuttle driver was friendly and helped with my bags.",
    helpful: 18,
  },
  {
    id: "3",
    author: "Robert K.",
    rating: 4,
    date: "November 2025",
    text: "Good value for the price. The only minor issue was a slightly longer wait for the shuttle on return, but overall a solid experience.",
    helpful: 12,
  },
];

interface ReviewsSectionProps {
  rating: number;
  reviewCount: number;
  reviews?: any[];
}

export function ReviewsSection({ rating, reviewCount, reviews = [] }: ReviewsSectionProps) {
  // If no real reviews yet, we can show a message or fallback
  const hasReviews = reviews.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Rating Summary */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
          <span className="text-2xl font-bold text-primary">{rating}</span>
        </div>
        <div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(rating) ? "fill-accent text-accent" : "text-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on {reviewCount.toLocaleString()} reviews
          </p>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="mb-6 space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = reviews.filter(r => r.rating === stars).length;
          const percentage = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
          // Fallback if we don't have enough reviews but have a rating
          const displayPercentage = reviewCount > 0 ? percentage : (stars === 5 ? 80 : stars === 4 ? 15 : 5);
          
          return (
            <div key={stars} className="flex items-center gap-2">
              <span className="w-3 text-sm text-muted-foreground">{stars}</span>
              <Star className="h-3 w-3 fill-accent text-accent" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-muted-foreground">{displayPercentage}%</span>
            </div>
          );
        })}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">
          {hasReviews ? "Recent Reviews" : "No reviews yet"}
        </h3>
        
        {reviews.slice(0, 3).map((review) => {
          const authorName = review.user 
            ? `${review.user.firstName} ${review.user.lastName.charAt(0)}.`
            : review.author || "Anonymous";
          const date = new Date(review.createdAt).toLocaleDateString("en-US", { 
            month: "long", 
            year: "numeric" 
          });

          return (
            <div key={review.id} className="border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                    {authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{authorName}</p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < review.rating ? "fill-accent text-accent" : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="mb-2 text-sm text-foreground">{review.content || review.text}</p>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground">
                <ThumbsUp className="h-3 w-3" />
                Helpful ({review.helpful || 0})
              </Button>
            </div>
          );
        })}
      </div>

      {reviewCount > 3 && (
        <Button variant="outline" className="mt-4 w-full bg-transparent">
          Show all {reviewCount.toLocaleString()} reviews
        </Button>
      )}
    </div>
  );
}
