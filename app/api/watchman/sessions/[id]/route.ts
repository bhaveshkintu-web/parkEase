import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function PATCH(
  request: Request,
  props: { params: any }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role?.toUpperCase() !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
  }

  const params = await props.params;
  const sessionId = params.id;
  try {
    const { action } = await request.json();
    
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
      const currentSession = await prisma.parkingSession.findUnique({
        where: { id: sessionId },
        include: { booking: true }
      });

      if (!currentSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const now = new Date();
      if (now > new Date(currentSession.booking.checkOut)) {
        return NextResponse.json({
          error: "CHECK_IN_FORBIDDEN",
          message: "Check-in is not allowed after the scheduled checkout time. This reservation has expired."
        }, { status: 400 });
      }

      const updatedSession = await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          status: "checked_in",
          checkInTime: new Date(),
        },
        include: {
          booking: {
            include: {
              location: { select: { name: true } }
            }
          }
        }
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
            location: (updatedSession.booking as any)?.location?.name || "Unknown Location"
          }
        }
      });

      // Increment counts on active shift
      const activeShiftIn = await prisma.watchmanShift.findFirst({
        where: { watchmanId: watchman.id, status: "ACTIVE" }
      });
      if (activeShiftIn) {
        await prisma.watchmanShift.update({
          where: { id: activeShiftIn.id },
          data: { totalCheckIns: { increment: 1 } }
        });
      }

      console.log(`[Watchman Session ID API] ✅ Action '${action}' processed successfully for session: ${sessionId}`);
      return NextResponse.json(updatedSession);
    } else if (action === "check-out") {
      const result = await prisma.$transaction(async (tx) => {
        const currentSession = await tx.parkingSession.findUnique({
          where: { id: sessionId },
          include: { booking: true }
        });

        if (!currentSession) throw new Error("Session not found");
        if (currentSession.status === "checked_out") throw new Error("This vehicle has already been checked out");
        if (currentSession.booking.status === "COMPLETED") throw new Error("This booking is already completed");

        const now = new Date();
        const checkOutLimit = new Date(currentSession.booking.checkOut);

        // Fetch grace period from settings
        const { getGeneralSettings } = await import("@/lib/actions/settings-actions");
        const settings = await getGeneralSettings();
        const gracePeriodMinutes = settings.gracePeriodMinutes ?? 30;
        const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
        const checkOutWithGrace = new Date(checkOutLimit.getTime() + gracePeriodMs);

        // Calculate overstay only if past grace period
        if (now > checkOutWithGrace && (currentSession as any).paymentStatus !== "PAID") {
            // Calculate overstay duration AFTER the grace period
            const diffMs = now.getTime() - checkOutWithGrace.getTime();
            const diffMins = Math.ceil(diffMs / 60000);

          // Find location to get rates
          const location = await tx.parkingLocation.findUnique({
            where: { id: currentSession.locationId }
          });

          const ratePer15Min = (location?.pricePerDay || 20) / (24 * 4);
          const overstayRateUnit = Math.ceil(diffMins / 15);
          const overstayCharge = overstayRateUnit * (ratePer15Min * 2);

          // Mark as waiting for payment
          const updatedSession = await (tx.parkingSession as any).update({
            where: { id: sessionId },
            data: {
              overstayMinutes: diffMins,
              overstayCharge: overstayCharge,
              paymentStatus: "PENDING",
              actualCheckOutTime: now,
            }
          });

          await tx.booking.update({
            where: { id: currentSession.bookingId },
            data: { status: "WAITING_OVERSTAY_PAYMENT" as any }
          });

          return { overstay: true, details: { overstayMinutes: diffMins, overstayCharge, checkOutLimit: checkOutLimit.toISOString() } };
        }

        const updatedSession = await (tx.parkingSession as any).update({
          where: { id: sessionId },
          data: {
            status: "checked_out",
            checkOutTime: now,
            actualCheckOutTime: now,
          },
          include: {
            booking: {
              include: {
                location: { select: { name: true } }
              }
            }
          }
        });

        if (updatedSession.bookingId) {
          // Import dynamically to avoid circular dependencies if any
          const { FinanceService } = await import("@/lib/finance-service");

          // 1. Mark booking as COMPLETED
          await tx.booking.update({
            where: { id: updatedSession.bookingId },
            data: { status: "COMPLETED" }
          });

          // 2. Credit earnings to owner
          await FinanceService.creditEarnings(updatedSession.bookingId, tx);
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

      if ((result as any).overstay) {
        return NextResponse.json({
          error: "OVERSTAY_DETECTED",
          details: (result as any).details
        }, { status: 402 });
      }

      const updatedSession = result as any;

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
            location: (updatedSession.booking as any)?.location?.name || "Unknown Location"
          }
        }
      });

      // Increment counts on active shift
      const activeShiftOut = await prisma.watchmanShift.findFirst({
        where: { watchmanId: watchman.id, status: "ACTIVE" }
      });
      if (activeShiftOut) {
        await prisma.watchmanShift.update({
          where: { id: activeShiftOut.id },
          data: { totalCheckOuts: { increment: 1 } }
        });
      }

      console.log(`[Watchman Session ID API] ✅ Action '${action}' processed successfully for session: ${sessionId}`);
      return NextResponse.json(updatedSession);
    }

    console.error(`[Watchman Session ID API Error] Invalid action selected: ${action}`);
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error(`[Watchman Session ID API Error] PATCH failed for session ${sessionId}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
