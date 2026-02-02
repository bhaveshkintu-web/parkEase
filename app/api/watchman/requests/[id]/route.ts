import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { convertRequestToBooking, handleExtensionRequest } from "@/lib/utils/booking-conversion";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "WATCHMAN" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, rejectionReason } = body;

    // If approving, we use the transaction logic to create bookings/sessions
    if (status === "APPROVED") {
      const request = await prisma.bookingRequest.findUnique({ where: { id } });
      if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

      if (request.requestType === "WALK_IN") {
        const result = await convertRequestToBooking(id, session.user.id);
        return NextResponse.json(result.request);
      } else if (request.requestType === "EXTENSION" && request.originalBookingId) {
        const result = await handleExtensionRequest(id, session.user.id);
        return NextResponse.json(result.request);
      }
    }

    // Default simple update (for rejection or other status changes)
    const request = await prisma.bookingRequest.update({
      where: { id },
      data: {
        status,
        rejectionReason,
        processedById: session.user.id,
        processedAt: new Date(),
      }
    });

    return NextResponse.json(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "WATCHMAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Soft delete by cancelling
    const request = await prisma.bookingRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        processedById: session.user.id,
        processedAt: new Date(),
      }
    });

    return NextResponse.json(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
