"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleReviewHelpful(reviewId: string, path: string, isIncrement: boolean) {
  try {
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpful: { [isIncrement ? "increment" : "decrement"]: 1 },
      },
    });

    // Revalidate the page so the new helpful count shows up instantly
    revalidatePath(path);

    return { success: true, helpfulCount: review.helpful };
  } catch (error) {
    console.error("Error updating helpful count:", error);
    return { success: false, error: "Failed to update review" };
  }
}

export async function getTopHomepageReviews() {
  try {
    // 1. Fetch the absolute highest-rated and most helpful reviews
    // We fetch a larger batch (e.g. 20) so we have enough pool to filter out duplicates by location
    const topReviews = await prisma.review.findMany({
      take: 20,
      orderBy: [
        { rating: 'desc' },
        { helpful: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        location: {
          select: {
            name: true,
            city: true,
            state: true,
          }
        }
      }
    });

    // 2. Filter to ensure we only have 1 review maximum per distinct parking location
    const distinctReviews = [];
    const seenLocationIds = new Set<string>();

    for (const review of topReviews) {
      if (!seenLocationIds.has(review.locationId)) {
        seenLocationIds.add(review.locationId);
        distinctReviews.push(review);
        
        // Stop once we have our top 3 distinct reviews
        if (distinctReviews.length === 3) {
          break;
        }
      }
    }

    return distinctReviews;
  } catch (error) {
    console.error("Error fetching top reviews for homepage:", error);
    return []; // Return empty array to trigger graceful static fallback
  }
}
