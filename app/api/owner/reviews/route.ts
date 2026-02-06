import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the owner profile and include all locations and their reviews
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: {
        locations: {
          include: {
            reviews: {
              include: {
                user: true,
                adminReview: true
              }
            }
          }
        },
      }
    });

    if (!ownerProfile) {
      return NextResponse.json([]);
    }

    // Map all reviews from all locations to AdminReview format
    const reviews = ownerProfile.locations.flatMap(location =>
      location.reviews.map(r => ({
        id: r.id,
        locationId: r.locationId,
        locationName: location.name,
        airportCode: location.airportCode,
        author: r.user ? `${r.user.firstName} ${r.user.lastName}` : "Anonymous",
        rating: r.rating,
        date: r.createdAt,
        title: r.title || "Review",
        content: r.content,
        status: r.adminReview?.status?.toLowerCase() || "pending",
        reportCount: 0,
        userEmail: r.user?.email
      }))
    );

    // Sort by newest first
    reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Extract all locations and airports for filters
    const locations = ownerProfile.locations.map(l => ({
      id: l.id,
      name: l.name,
      airportCode: l.airportCode
    }));

    const airports = Array.from(new Set(locations.map(l => l.airportCode).filter(Boolean)));

    return NextResponse.json({
      reviews,
      locations,
      airports
    });
  } catch (error) {
    console.error("[OWNER_REVIEWS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
