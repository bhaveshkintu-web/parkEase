import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * @api {get} /api/admin/owners/:id Get owner profile details
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await context.params;
    const { id } = params;

    const owner = await prisma.ownerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        },
        locations: {
          include: {
            analytics: true,
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
        },
        documents: true,
        wallet: true,
      },
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    return NextResponse.json({ owner });
  } catch (error) {
    console.error("[ADMIN_OWNER_GET]", error);
    return NextResponse.json({ 
      error: "Internal error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * @api {patch} /api/admin/owners/:id/approve Approve owner profile
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const params = await context.params;
    const { id } = params;
    
    console.log("Approving owner with ID:", id);

    if (!id) {
      return NextResponse.json({ error: "Owner ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body;
    
    console.log("Action:", action);

    if (action === "approve") {
      const updatedProfile = await prisma.ownerProfile.update({
        where: { id },
        data: {
          status: "approved",
          verificationStatus: "verified",
        },
      });

      console.log("Owner approved successfully:", updatedProfile.id);

      return NextResponse.json({
        message: "Owner profile approved successfully",
        profile: updatedProfile,
      });
    } else if (action === "reject") {
      const updatedProfile = await prisma.ownerProfile.update({
        where: { id },
        data: {
          status: "rejected",
          verificationStatus: "failed",
        },
      });

      return NextResponse.json({
        message: "Owner profile rejected",
        profile: updatedProfile,
      });
    } else if (action === "suspend") {
      const updatedProfile = await prisma.ownerProfile.update({
        where: { id },
        data: {
          status: "suspended",
        },
      });

      return NextResponse.json({
        message: "Owner profile suspended",
        profile: updatedProfile,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[ADMIN_OWNER_APPROVE] Error:", error);
    return NextResponse.json({ 
      error: "Internal error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
