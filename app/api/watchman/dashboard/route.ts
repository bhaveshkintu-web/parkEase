import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role?.toUpperCase() !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
  }

  try {
    const watchman = await prisma.watchman.findUnique({
      where: { userId: session.user.id },
      include: { assignedLocations: true }
    });

    if (!watchman || watchman.assignedLocations.length === 0) {
      return NextResponse.json({
        stats: { todayCheckIns: 0, todayCheckOuts: 0, pendingArrivals: 0, overstays: 0, pendingRequestsCount: 0 },
        occupancy: { totalCapacity: 0, totalOccupied: 0, locations: [] },
        schedule: [],
        recentActivity: []
      });
    }

    const locationIds = watchman.assignedLocations.map(l => l.id);
    const today = new Date();

    const [todayCheckIns, todayCheckOuts, pendingSessions, overstaySessions, pendingRequests] = await Promise.all([
      prisma.parkingSession.count({
        where: {
          locationId: { in: locationIds },
          checkInTime: { gte: startOfDay(today), lte: endOfDay(today) }
        }
      }),
      prisma.parkingSession.count({
        where: {
          locationId: { in: locationIds },
          checkOutTime: { gte: startOfDay(today), lte: endOfDay(today) }
        }
      }),
      prisma.booking.count({
        where: {
          locationId: { in: locationIds },
          status: "CONFIRMED",
          checkIn: { lte: endOfDay(today) },
          parkingSession: null
        }
      }),
      prisma.parkingSession.count({
        where: {
          locationId: { in: locationIds },
          status: "ACTIVE",
          booking: { checkOut: { lt: today } }
        }
      }),
      prisma.bookingRequest.count({
        where: {
          parkingId: { in: locationIds },
          status: "PENDING"
        }
      })
    ]);

    const sessions = await prisma.parkingSession.findMany({
      where: { locationId: { in: locationIds } },
      include: { booking: true, location: true },
      orderBy: { updatedAt: "desc" },
      take: 10
    });

    const locations = watchman.assignedLocations.map(loc => ({
      id: loc.id,
      name: loc.name,
      totalSpots: loc.totalSpots,
      occupiedSpots: loc.totalSpots - loc.availableSpots
    }));

    return NextResponse.json({
      stats: {
        todayCheckIns,
        todayCheckOuts,
        pendingArrivals: pendingSessions,
        overstays: overstaySessions,
        pendingRequestsCount: pendingRequests
      },
      occupancy: {
        totalCapacity: locations.reduce((sum, l) => sum + l.totalSpots, 0),
        totalOccupied: locations.reduce((sum, l) => sum + l.occupiedSpots, 0),
        locations
      },
      schedule: [],
      recentActivity: sessions.map(s => ({
        id: s.id,
        status: s.status === "ACTIVE" ? "checked_in" : "checked_out",
        vehiclePlate: s.booking.vehiclePlate,
        time: s.updatedAt,
        location: s.location.name
      }))
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
