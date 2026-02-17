import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const role = sessionUser.role?.toUpperCase();

    if (role !== "WATCHMAN" && role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters (merged from main branch feature)
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let locationIds: string[] = [];

    if (role === "WATCHMAN") {
      const watchman = await prisma.watchman.findUnique({
        where: { userId: sessionUser.id },
        include: {
          shifts: { select: { locationId: true } },
          assignedLocations: { select: { id: true } }
        }
      });

      if (watchman) {
        const shiftLocationIds = watchman.shifts.map(s => s.locationId);
        const assignedLocationIds = watchman.assignedLocations.map(l => l.id);
        locationIds = Array.from(new Set([...shiftLocationIds, ...assignedLocationIds]));

        // Fallback to owner's locations if no specific shifts or assignments
        if (locationIds.length === 0) {
          const ownerLocations = await prisma.parkingLocation.findMany({
            where: { ownerId: watchman.ownerId },
            select: { id: true }
          });
          locationIds = ownerLocations.map(l => l.id);
        }
      }
    } else if (role === "OWNER") {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: sessionUser.id },
        include: { locations: { select: { id: true } } }
      });
      if (ownerProfile) {
        locationIds = ownerProfile.locations.map(l => l.id);
      }
    } else {
      const allLocations = await prisma.parkingLocation.findMany({ select: { id: true } });
      locationIds = allLocations.map(l => l.id);
    }

    // Prepare filter
    const whereClause: any = {
      locationId: { in: locationIds },
      booking: {
        status: { not: "CANCELLED" }
      }
    };

    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "pending") {
        whereClause.status = { in: ["RESERVED", "PENDING", "reserved", "pending"] };
      } else if (statusFilter === "checked_in" || statusFilter === "active") {
        whereClause.status = { in: ["CHECKED_IN", "checked_in", "ACTIVE", "active"] };
      } else if (statusFilter === "overstay") {
        whereClause.status = { in: ["CHECKED_IN", "checked_in"] };
        whereClause.booking = {
          ...whereClause.booking,
          checkOut: { lt: new Date() }
        };
      } else {
        whereClause.status = statusFilter.toUpperCase();
      }
    }

    const sessions = await (prisma.parkingSession as any).findMany({
      where: whereClause,
      include: {
        booking: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    const now = new Date();

    return NextResponse.json({
      success: true,
      sessions: (sessions as any[]).map((s: any) => {
        const booking = s.booking as any;
        let status = s.status.toLowerCase();

        // Standardize status labels for frontend
        if (status === "reserved") status = "pending";

        // Overstay detection
        if (status === "checked_in" && booking.checkOut < now) {
          status = "overstay";
        }

        return {
          id: s.id,
          bookingId: s.bookingId,
          locationId: s.locationId,
          vehiclePlate: booking.vehiclePlate,
          vehicleType: booking.vehicleModel || "Unknown",
          checkInTime: s.checkInTime?.toISOString(),
          checkOutTime: s.checkOutTime?.toISOString(),
          status: status,
          notes: s.notes,
          expectedCheckIn: booking.checkIn.toISOString(),
          expectedCheckOut: booking.checkOut.toISOString(),
        };
      })
    });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "WATCHMAN") {
      return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, action, notes } = body;

    if (!bookingId || !action) {
      return NextResponse.json({ error: "Booking ID and action are required" }, { status: 400 });
    }

    const watchman = await prisma.watchman.findUnique({
      where: { userId: session.user.id }
    });

    if (!watchman) {
      return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
    }

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: { select: { name: true } } }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "This booking has been cancelled and cannot be processed." }, { status: 400 });
    }

    // Find or create session
    let parkingSession = await prisma.parkingSession.findUnique({
      where: { bookingId }
    });

    if (!parkingSession) {
      parkingSession = await prisma.parkingSession.create({
        data: {
          bookingId,
          locationId: booking.locationId,
          status: "pending",
        }
      });
    }

    // Process action
    if (action === "check-in") {
      parkingSession = await prisma.parkingSession.update({
        where: { id: parkingSession.id },
        data: {
          status: "checked_in",
          checkInTime: new Date(),
          updatedAt: new Date()
        }
      });

      // Log activity
      await prisma.watchmanActivityLog.create({
        data: {
          watchmanId: watchman.id,
          type: "check_in",
          details: {
            sessionId: parkingSession.id,
            bookingId: bookingId,
            vehiclePlate: booking.vehiclePlate,
            locationId: booking.locationId,
            location: (booking as any)?.location?.name || "Unknown Location",
            notes: notes
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
    } else if (action === "check-out") {
      parkingSession = await prisma.parkingSession.update({
        where: { id: parkingSession.id },
        data: {
          status: "checked_out",
          checkOutTime: new Date(),
          updatedAt: new Date()
        }
      });

      // Update Booking Status
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" }
      });

      // Log activity
      await prisma.watchmanActivityLog.create({
        data: {
          watchmanId: watchman.id,
          type: "check_out",
          details: {
            sessionId: parkingSession.id,
            bookingId: bookingId,
            vehiclePlate: booking.vehiclePlate,
            locationId: booking.locationId,
            location: (booking as any)?.location?.name || "Unknown Location",
            notes: notes
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
    }

    return NextResponse.json({ success: true, session: parkingSession });

  } catch (error: any) {
    console.error("Error processing session:", error);
    return NextResponse.json(
      { error: "Failed to process session", details: error.message },
      { status: 500 }
    );
  }
}
