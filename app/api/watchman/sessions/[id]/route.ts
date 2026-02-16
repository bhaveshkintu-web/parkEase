import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function PATCH(
  request: Request,
  props: { params: any }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action } = await request.json();
    const params = await props.params;
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is missing" }, { status: 400 });
    }

    const watchman = await prisma.watchman.findUnique({
      where: { userId: session.user.id }
    });

    if (!watchman) {
      return NextResponse.json({ error: "Watchman profile not found" }, { status: 404 });
    }

    if (action === "check-in") {
      const updatedSession = await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          status: "checked_in",
          checkInTime: new Date(),
        },
        include: { booking: true }
      });

      // Log activity
      await prisma.watchmanActivityLog.create({
        data: {
          watchmanId: watchman.id,
          type: "check_in",
          details: {
            sessionId: updatedSession.id,
            bookingId: updatedSession.bookingId,
            vehiclePlate: updatedSession.booking?.vehiclePlate || "Unknown",
            parkingId: updatedSession.locationId,
            spotNumber: "N/A" // Add spot logic if exists
          }
        }
      });

      return NextResponse.json(updatedSession);
    } else if (action === "check-out") {
      const result = await prisma.$transaction(async (tx) => {
        const updatedSession = await tx.parkingSession.update({
          where: { id: sessionId },
          data: {
            status: "checked_out",
            checkOutTime: new Date(),
          },
          include: { booking: true }
        });

        if (updatedSession.bookingId) {
          const { FinanceService } = await import("@/lib/finance-service");

          // 1. Mark booking as COMPLETED
          await tx.booking.update({
            where: { id: updatedSession.bookingId },
            data: { status: "COMPLETED" }
          });

          // 2. Credit earnings to owner
          await FinanceService.creditEarnings(updatedSession.bookingId);
        }

        // 3. Increment available spots (only if within bounds)
        const location = await tx.parkingLocation.findUnique({
          where: { id: updatedSession.locationId },
          select: { availableSpots: true, totalSpots: true }
        });

        if (location && location.availableSpots < location.totalSpots) {
          await tx.parkingLocation.update({
            where: { id: updatedSession.locationId },
            data: { availableSpots: { increment: 1 } }
          });
        }

        return updatedSession;
      });

      const updatedSession = result;

      // Log activity
      await prisma.watchmanActivityLog.create({
        data: {
          watchmanId: watchman.id,
          type: "check_out",
          details: {
            sessionId: updatedSession.id,
            bookingId: updatedSession.bookingId,
            vehiclePlate: updatedSession.booking?.vehiclePlate || "Unknown",
            parkingId: updatedSession.locationId,
            spotNumber: "N/A"
          }
        }
      });

      return NextResponse.json(updatedSession);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Session Update Error:", error);
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'api-session-error.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${error.message}\n${error.stack}\n`);
    } catch (e) { }

    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
