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
}

export function ReviewsSection({ rating, reviewCount }: ReviewsSectionProps) {
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
          const percentage = stars === 5 ? 78 : stars === 4 ? 15 : stars === 3 ? 5 : stars === 2 ? 1 : 1;
          return (
            <div key={stars} className="flex items-center gap-2">
              <span className="w-3 text-sm text-muted-foreground">{stars}</span>
              <Star className="h-3 w-3 fill-accent text-accent" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-muted-foreground">{percentage}%</span>
            </div>
          );
        })}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Recent Reviews</h3>
        {mockReviews.map((review) => (
          <div key={review.id} className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                  {review.author.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{review.author}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
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
            <p className="mb-2 text-sm text-foreground">{review.text}</p>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground">
              <ThumbsUp className="h-3 w-3" />
              Helpful ({review.helpful})
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" className="mt-4 w-full bg-transparent">
        Show all {reviewCount.toLocaleString()} reviews
      </Button>
    </div>
  );
}
