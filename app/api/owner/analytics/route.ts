import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Cleanup expired bookings before fetching stats to ensure accuracy
    const { cleanupExpiredBookings } = await import("@/lib/actions/booking-actions");
    await cleanupExpiredBookings();

    // Get the owner profile to link to data
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: {
        locations: {
          include: {
            bookings: true,
          }
        },
        watchmen: {
          include: {
            user: true
          }
        },
      }
    });

    if (!ownerProfile) {
      return NextResponse.json({
        stats: {
          totalRevenue: 0,
          totalBookings: 0,
          activeLocations: 0,
          totalLocations: 0,
          activeWatchmen: 0,
          totalWatchmen: 0,
          totalCapacity: 0,
          totalOccupied: 0
        }
      });
    }

    // Calculate stats from real data
    const locations = ownerProfile.locations;
    const watchmen = ownerProfile.watchmen;

    // 1. Locations Stats
    const totalLocations = locations.length;
    // ParkingStatus Enum likely uppercase in Prisma Client (ACTIVE)
    const activeLocations = locations.filter(l => l.status === "ACTIVE").length;
    const totalCapacity = locations.reduce((sum, l) => sum + l.totalSpots, 0);
    const currentAvailable = locations.reduce((sum, l) => sum + l.availableSpots, 0);
    const totalOccupied = totalCapacity - currentAvailable;

    // 2. Watchmen Stats
    const totalWatchmen = watchmen.length;
    // Watchman status defined as String @default("active") in schema. Assuming strict string check.
    const activeWatchmen = watchmen.filter(w => w.status === "active").length;

    // 3. Bookings & Revenue
    // Flatten all bookings from all locations
    const allBookings = locations.flatMap(l => l.bookings);
    const totalBookings = allBookings.length;

    // Revenue: Sum of totalPrice for all confirmed/completed bookings
    // BookingStatus Enum (CONFIRMED, COMPLETED)
    const revenueBookings = allBookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED");
    const totalRevenue = revenueBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // 4. Prepare list data for widgets
    const recentBookings = allBookings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(b => ({
        id: b.id,
        vehicleInfo: {
          licensePlate: b.vehiclePlate,
          make: b.vehicleMake,
          model: b.vehicleModel,
          color: b.vehicleColor
        },
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status.toLowerCase(),
        totalPrice: b.totalPrice
      }));

    const locationList = locations.map(l => ({
      id: l.id,
      name: l.name,
      totalSpots: l.totalSpots,
      availableSpots: l.availableSpots,
      status: l.status.toLowerCase()
    }));

    // Fetch today's activities for all watchmen to calculate in/out counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const watchmanIds = watchmen.map(w => w.id);
    const todayLogs = await prisma.watchmanActivityLog.findMany({
      where: {
        watchmanId: { in: watchmanIds },
        timestamp: { gte: today },
        type: { in: ["check_in", "check_out"] }
      }
    });

    const watchmanList = watchmen.map(w => {
      const wLogs = todayLogs.filter(log => log.watchmanId === w.id);
      return {
        id: w.id,
        name: w.user ? `${w.user.firstName} ${w.user.lastName}` : "Unknown",
        shift: w.shift || "morning",
        todayCheckIns: wLogs.filter(l => l.type === "check_in").length,
        todayCheckOuts: wLogs.filter(l => l.type === "check_out").length,
        status: w.status.toLowerCase()
      };
    });

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalBookings,
        activeLocations,
        totalLocations,
        activeWatchmen,
        totalWatchmen,
        totalCapacity,
        totalOccupied
      },
      data: {
        recentBookings,
        locations: locationList,
        watchmen: watchmanList
      }
    });

  } catch (error) {
    console.error("[OWNER_ANALYTICS]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
