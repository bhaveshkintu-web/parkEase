import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET: Fetch all reviews for admin moderation
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [reviews, owners, locations] = await Promise.all([
      prisma.review.findMany({
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          location: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              airportCode: true,
              owner: {
                select: {
                  businessName: true,
                  user: { select: { firstName: true, lastName: true } }
                }
              }
            }
          },
          adminReview: true,
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.ownerProfile.findMany({
        include: {
          user: { select: { firstName: true, lastName: true } }
        }
      }),
      prisma.parkingLocation.findMany({
        select: { id: true, name: true, ownerId: true, airportCode: true }
      })
    ]);

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      locationId: r.locationId,
      locationName: r.location.name,
      airportCode: r.location.airportCode,
      ownerId: r.location.ownerId,
      ownerName: r.location.owner.businessName || `${r.location.owner.user.firstName} ${r.location.owner.user.lastName}`,
      author: `${r.user.firstName} ${r.user.lastName}`,
      userEmail: r.user.email,
      rating: r.rating,
      content: r.content,
      date: r.createdAt,
      helpful: r.helpful,
      status: r.adminReview?.status || "pending",
      reportCount: 0,
      flagReason: r.adminReview?.moderatorNotes || null,
    }));

    const formattedOwners = owners.map(o => ({
      id: o.id,
      name: o.businessName || `${o.user.firstName} ${o.user.lastName}`
    }));

    // Get unique airports from locations
    const airports = Array.from(new Set(locations.map(l => l.airportCode).filter(Boolean)));

    return NextResponse.json({
      reviews: formattedReviews,
      owners: formattedOwners,
      locations: locations,
      airports: airports
    });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Update review status (approve, reject, flag)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status, notes } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminReview = await prisma.adminReview.upsert({
      where: { reviewId: id },
      update: {
        status,
        moderatorNotes: notes,
        moderatedById: session.user.id,
        moderatedAt: new Date(),
      },
      create: {
        reviewId: id,
        status,
        moderatorNotes: notes,
        moderatedById: session.user.id,
        moderatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, adminReview });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE: Permanently remove a review
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Review ID required" }, { status: 400 });
    }

    await prisma.review.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
