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
        include: { shifts: { select: { locationId: true } } }
      });

      if (watchman) {
        locationIds = watchman.shifts.map(s => s.locationId);
        // Fallback to owner's locations if no specific shifts assigned
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
      locationId: { in: locationIds }
    };

    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "pending") {
        whereClause.status = { in: ["RESERVED", "PENDING", "reserved", "pending"] };
      } else if (statusFilter === "checked_in" || statusFilter === "active") {
        whereClause.status = { in: ["CHECKED_IN", "checked_in", "ACTIVE", "active"] };
      } else if (statusFilter === "overstay") {
        whereClause.status = { in: ["CHECKED_IN", "checked_in"] };
        whereClause.booking = {
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
