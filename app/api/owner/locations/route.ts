import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ownerLocationSchema } from "@/lib/validations";

/**
 * @api {post} /api/owner/locations Create a new parking location
 * @apiName CreateParkingLocation
 * @apiGroup Owner
 * 
 * @apiPermission OWNER (Approved & Verified)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication Check
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Role Check
    const role = session.user.role?.toUpperCase();
    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Only owners can create locations." },
        { status: 403 }
      );
    }

    // 3. Owner Profile Check (Pre-check)
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!ownerProfile) {
      return NextResponse.json(
        { error: "Owner profile not found. Please complete your profile first." },
        { status: 403 }
      );
    }

    // In production, require approval. In development, allow pending profiles.
    const isDevelopment = process.env.NODE_ENV !== "production";
    
    if (!isDevelopment && ownerProfile.status !== "approved") {
      return NextResponse.json(
        { 
          error: "Your owner profile is pending approval. Please wait for admin approval before adding locations.",
          details: { 
            status: ownerProfile.status, 
            verificationStatus: ownerProfile.verificationStatus 
          }
        },
        { status: 403 }
      );
    }

    // Show warning in development if profile is pending
    if (isDevelopment && ownerProfile.status === "pending") {
      console.log("⚠️  Development mode: Allowing location creation with pending profile");
    }

    // 4. Input Validation
    const body = await req.json();
    const result = ownerLocationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const data = result.data;

    // 5. Database Operations (Transaction)
    const newLocation = await prisma.$transaction(async (tx) => {
      // Create ParkingLocation
      const location = await tx.parkingLocation.create({
        data: {
          ownerId: ownerProfile.id,
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          zipCode: data.zipCode,
          airportCode: data.airportCode,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description,
          pricePerDay: data.pricePerDay,
          originalPrice: data.originalPrice,
          amenities: data.amenities,
          images: data.images,
          shuttle: data.shuttle,
          covered: data.covered,
          selfPark: data.selfPark,
          valet: data.valet,
          open24Hours: data.open24Hours,
          totalSpots: data.totalSpots,
          availableSpots: data.totalSpots, // Initial state
          status: "ACTIVE", // Production-ready default
        },
      });

      // Create LocationAnalytics (1-to-1)
      await tx.locationAnalytics.create({
        data: {
          locationId: location.id,
          totalBookings: 0,
          revenue: 0,
          averageRating: 0,
          occupancyRate: 0,
        },
      });

      return location;
    });

    // 6. Response
    return NextResponse.json(
      { 
        message: "Parking location created successfully.", 
        location: newLocation 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("[OWNER_LOCATION_POST]", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
