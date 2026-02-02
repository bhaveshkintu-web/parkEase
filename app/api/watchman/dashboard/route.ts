import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 0 });
  }

  try {
    const watchman = await prisma.watchman.findUnique({
      where: { userId: session.user.id },
      include: { assignedLocations: true }
    });

    if (!watchman) {
      return NextResponse.json({ error: "Watchman profile not found" }, { status: 404 });
    }

    const parkingIds = watchman.assignedLocations.map(p => p.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Stats
    const [todayCheckIns, todayCheckOuts, pendingSessions, overstaySessions] = await Promise.all([
      prisma.parkingSession.count({
        where: {
          locationId: { in: parkingIds },
          checkInTime: { gte: today, lt: tomorrow }
        }
      }),
      prisma.parkingSession.count({
        where: {
          locationId: { in: parkingIds },
          checkOutTime: { gte: today, lt: tomorrow }
        }
      }),
      prisma.parkingSession.count({
        where: {
          locationId: { in: parkingIds },
          status: "pending"
        }
      }),
      prisma.parkingSession.count({
        where: {
          locationId: { in: parkingIds },
          status: "overstay"
        }
      })
    ]);

    // 2. Schedule (Today's check-ins and check-outs)
    const todaySchedule = await prisma.booking.findMany({
      where: {
        locationId: { in: parkingIds },
        OR: [
          { checkIn: { gte: today, lt: tomorrow } },
          { checkOut: { gte: today, lt: tomorrow } }
        ],
        status: "CONFIRMED"
      },
      orderBy: { checkIn: "asc" },
      take: 5
    });

    // 3. Occupancy Calculation
    const locations = await prisma.parkingLocation.findMany({
      where: { id: { in: parkingIds } },
      select: {
        id: true,
        name: true,
        totalSpots: true,
        availableSpots: true
      }
    });

    const totalCapacity = locations.reduce((sum, l) => sum + l.totalSpots, 0);
    const totalAvailable = locations.reduce((sum, l) => sum + l.availableSpots, 0);
    const totalOccupied = totalCapacity - totalAvailable;

    // 4. Recent Activity
    const recentActivity = await prisma.parkingSession.findMany({
      where: {
        locationId: { in: parkingIds },
        status: { in: ["checked_in", "checked_out"] }
      },
      orderBy: { 
        updatedAt: "desc" // Assuming there's an updatedAt or use checkInTime/checkOutTime
      },
      take: 4,
      include: {
        booking: {
          select: {
            vehiclePlate: true
          }
        }
      }
    });

    // 5. Pending Booking Requests Count
    const pendingRequestsCount = await prisma.bookingRequest.count({
      where: {
        parkingId: { in: parkingIds },
        status: "PENDING"
      }
    });

    return NextResponse.json({
      stats: {
        todayCheckIns,
        todayCheckOuts,
        pendingArrivals: pendingSessions,
        overstays: overstaySessions,
        pendingRequestsCount
      },
      occupancy: {
        totalCapacity,
        totalOccupied,
        locations: locations.map(l => ({
          id: l.id,
          name: l.name,
          total: l.totalSpots,
          available: l.availableSpots
        }))
      },
      schedule: todaySchedule,
      recentActivity: recentActivity.map(s => ({
        id: s.id,
        vehiclePlate: s.booking.vehiclePlate,
        status: s.status,
        time: s.status === "checked_in" ? s.checkInTime : s.checkOutTime
      }))
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
