import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * @api {patch} /api/admin/locations/:id/approve Approve/reject parking location
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

    const { id } = await context.params;
    const body = await req.json();
    const { action, notes } = body; // action: 'approve' | 'reject'

    console.log(`[ADMIN_LOCATION_APPROVE] Modifying location ${id} with action ${action}`);

    if (action === "approve") {
      try {
        const updatedLocation = await prisma.parkingLocation.update({
          where: { id },
          data: {
            status: "ACTIVE",
          },
        });

        console.log(`[ADMIN_LOCATION_APPROVE] Successfully approved location ${id}`);

        return NextResponse.json({
          message: "Parking location approved successfully",
          location: updatedLocation,
        });
      } catch (updateError) {
        console.error(`[ADMIN_LOCATION_APPROVE] Update failed for ${id}:`, updateError);
        return NextResponse.json({ 
          error: "Failed to update location status in database", 
          details: updateError instanceof Error ? updateError.message : String(updateError)
        }, { status: 500 });
      }
    } else if (action === "reject") {
      try {
        const updatedLocation = await prisma.parkingLocation.update({
          where: { id },
          data: {
            status: "INACTIVE",
          },
        });

        return NextResponse.json({
          message: "Parking location rejected",
          location: updatedLocation,
        });
      } catch (updateError) {
        console.error(`[ADMIN_LOCATION_APPROVE] Rejection failed for ${id}:`, updateError);
        return NextResponse.json({ error: "Failed to update location status" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[ADMIN_LOCATION_APPROVE] Global error:", error);
    return NextResponse.json({ 
      error: "Internal error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
