"use client";

import { useState } from "react";
import { Star, ThumbsUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { toggleReviewHelpful } from "@/lib/actions/review-actions";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  helpful: number;
  user?: any;
  createdAt?: string;
  content?: string;
}

interface ReviewsSectionProps {
  rating: number;
  reviewCount: number;
  reviews?: Review[];
}

export function ReviewsSection({ rating, reviewCount, reviews = [] }: ReviewsSectionProps) {
  const pathname = usePathname();
  // Keep track of which reviews the user has found helpful in this session
  const [upvotedReviews, setUpvotedReviews] = useState<Set<string>>(new Set());
  // Keep local counts so UI updates instantly even if revalidatePath is slow
  const [localHelpfulCounts, setLocalHelpfulCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  // Modal and Pagination states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const REVIEWS_PER_PAGE = 10;

  const handleHelpfulClick = async (reviewId: string, currentHelpfulCount: number) => {
    const isCurrentlyUpvoted = upvotedReviews.has(reviewId);
    const isIncrement = !isCurrentlyUpvoted;
    
    setIsLoading(reviewId);
    
    try {
      const result = await toggleReviewHelpful(reviewId, pathname, isIncrement);
      
      if (result.success) {
        setUpvotedReviews(prev => {
          const newSet = new Set(prev);
          if (isIncrement) {
            newSet.add(reviewId);
          } else {
            newSet.delete(reviewId);
          }
          return newSet;
        });
        
        setLocalHelpfulCounts(prev => ({
          ...prev,
          [reviewId]: result.helpfulCount || (currentHelpfulCount + (isIncrement ? 1 : -1))
        }));
        
        toast.success(isIncrement ? "Marked as helpful!" : "Helpful vote removed.");
      } else {
        toast.error("Failed to update helpful count.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(null);
    }
  };

  // If no real reviews yet, we can show a message or fallback
  const hasReviews = reviews.length > 0;

  // Sort reviews: Max rating first, then max helpful first
  const sortedReviews = [...reviews].sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating; // Highest rating first
    }
    // Highest helpful first
    const bHelpful = localHelpfulCounts[b.id] !== undefined ? localHelpfulCounts[b.id] : (b.helpful || 0);
    const aHelpful = localHelpfulCounts[a.id] !== undefined ? localHelpfulCounts[a.id] : (a.helpful || 0);
    return bHelpful - aHelpful;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = sortedReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  // The single best review to show on the main page
  const bestReview = sortedReviews.slice(0, 1);

  // Reusable Review Card renderer
  const renderReviewCard = (review: Review) => {
    const authorName = review.user 
      ? `${review.user.firstName} ${review.user.lastName.charAt(0)}.`
      : review.author || "Anonymous";
    const date = new Date(review.createdAt || new Date()).toLocaleDateString("en-US", { 
      month: "long", 
      year: "numeric" 
    });

    const isUpvoted = upvotedReviews.has(review.id);
    const currentLoading = isLoading === review.id;
    
    // Use local count if available, otherwise fallback to database count
    const displayHelpfulCount = localHelpfulCounts[review.id] !== undefined 
      ? localHelpfulCounts[review.id] 
      : (review.helpful || 0);

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
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 gap-1.5 text-xs transition-colors ${isUpvoted ? "text-primary font-medium bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => handleHelpfulClick(review.id, displayHelpfulCount)}
          disabled={currentLoading}
        >
          <ThumbsUp className={`h-3 w-3 ${isUpvoted ? "fill-primary" : ""}`} />
          {currentLoading ? "Updating..." : `Helpful (${displayHelpfulCount})`}
        </Button>
      </div>
    );
  };

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

      {/* Reviews List (Main Page View) */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">
          {hasReviews ? "Recent Reviews" : "No reviews yet"}
        </h3>
        
        {bestReview.map(renderReviewCard)}
      </div>

      {/* Show All Modal Trigger */}
      {reviews.length > 1 && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="mt-4 w-full bg-transparent">
              Show all {reviewCount.toLocaleString()} reviews
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
            <DialogHeader className="shrink-0 mb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Star className="h-6 w-6 fill-accent text-accent" />
                {rating} <span className="text-muted-foreground text-base font-normal">({reviewCount.toLocaleString()} reviews)</span>
              </DialogTitle>
              <DialogDescription>
                Read what others have to say about this location.
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Reviews Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {paginatedReviews.map(renderReviewCard)}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="shrink-0 pt-4 flex items-center justify-between border-t border-border mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                
                <span className="text-sm text-muted-foreground font-medium">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
