"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

// --- Types ---
type EarningsOverview = {
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  totalBookings: number;
  completedBookings: number;
  pendingEarnings: number;
  availableBalance: number;
};

type MonthlyEarnings = {
  month: string; // "Jan 2024"
  amount: number;
};

type LocationEarnings = {
  locationId: string;
  name: string;
  grossRevenue: number;
  netRevenue: number;
};

type BreakdownData = {
  earningsByMonth: MonthlyEarnings[];
  earningsByLocation: LocationEarnings[];
  summary: {
    totalTax: number;
    totalFees: number;
    netRevenue: number;
  }
};

type OwnerLocationMetric = {
  id: string;
  name: string;
  totalBookings: number;
  completedBookings: number;
  revenue: number;
  occupancyRate: number;
  avgBookingValue: number;
};

// --- Helpers ---
async function getOwnerId() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).ownerId) {
    redirect("/auth/login?error=UnauthorizedOwner");
  }
  return (session.user as any).ownerId as string;
}

// --- Actions ---

export async function getOwnerEarningsOverview(startDate?: string, endDate?: string): Promise<EarningsOverview> {
  const ownerId = await getOwnerId();

  const dateFilter = startDate && endDate ? {
    createdAt: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  } : {};

  // 1. Total Earnings (Sum of CONFIRMED or COMPLETED bookings)
  const totalEarningsResult = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
    where: {
      location: { ownerId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      ...dateFilter,
    },
  });

  // 2. This Month Earnings
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthResult = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
    where: {
      location: { ownerId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      createdAt: { gte: startOfMonth },
    },
  });

  // 3. Last Month Earnings
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthResult = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
    where: {
      location: { ownerId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
    },
  });

  // 4. Total Bookings Count
  const totalBookings = await prisma.booking.count({
    where: {
      location: { ownerId },
      ...dateFilter,
    },
  });

  // 5. Completed Bookings Count
  const completedBookings = await prisma.booking.count({
    where: {
      location: { ownerId },
      status: "COMPLETED",
      ...dateFilter,
    },
  });

  // 6. Pending Earnings (Bookings that are not yet confirmed/completed)
  const pendingEarningsResult = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
    where: {
      location: { ownerId },
      status: "PENDING",
      ...dateFilter,
    },
  });

  return {
    totalEarnings: totalEarningsResult._sum.totalPrice || 0,
    thisMonthEarnings: thisMonthResult._sum.totalPrice || 0,
    lastMonthEarnings: lastMonthResult._sum.totalPrice || 0,
    totalBookings,
    completedBookings,
    pendingEarnings: pendingEarningsResult._sum.totalPrice || 0,
    availableBalance: await getAvailableBalance(ownerId),
  };
}

async function getAvailableBalance(ownerId: string): Promise<number> {
  const profile = await prisma.ownerProfile.findUnique({
    where: { id: ownerId },
    include: { wallet: true }
  });
  return profile?.wallet?.balance || 0;
}

export async function getEarningsBreakdown(startDate?: string, endDate?: string): Promise<BreakdownData> {
  const ownerId = await getOwnerId();

  const dateFilter = startDate && endDate ? {
    createdAt: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  } : {};

  // For monthly trend, we use Booking.createdAt
  const monthlyEarningsRaw = await prisma.$queryRaw`
    SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, SUM("totalPrice") as amount
    FROM "Booking"
    WHERE "locationId" IN (SELECT id FROM "ParkingLocation" WHERE "ownerId" = ${ownerId})
    AND "status" IN ('CONFIRMED', 'COMPLETED')
    GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt") DESC
    LIMIT 12
  ` as { month: string, amount: number }[];

  // 2. Earnings grouped by Location
  const locationEarnings = await prisma.booking.groupBy({
    by: ['locationId'],
    _sum: { totalPrice: true, taxes: true, fees: true },
    where: {
      location: { ownerId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      ...dateFilter,
    },
  });

  // Fetch location names
  const locationIds = locationEarnings.map(e => e.locationId);
  const locations = await prisma.parkingLocation.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, name: true }
  });

  const earningsByLocation = locationEarnings.map(item => {
    const loc = locations.find(l => l.id === item.locationId);
    return {
      locationId: item.locationId,
      name: loc?.name || "Unknown Location",
      grossRevenue: item._sum.totalPrice || 0,
      netRevenue: (item._sum.totalPrice || 0) - (item._sum.taxes || 0) - (item._sum.fees || 0),
    };
  });

  // 3. Total tax, fees, net
  const totals = await prisma.booking.aggregate({
    _sum: { totalPrice: true, taxes: true, fees: true },
    where: {
      location: { ownerId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      ...dateFilter,
    },
  });

  return {
    earningsByMonth: monthlyEarningsRaw.map(m => ({ month: m.month, amount: Number(m.amount) })),
    earningsByLocation,
    summary: {
      totalTax: totals._sum.taxes || 0,
      totalFees: totals._sum.fees || 0,
      netRevenue: (totals._sum.totalPrice || 0) - (totals._sum.taxes || 0) - (totals._sum.fees || 0),
    }
  };
}

export async function getLocationMetrics(startDate?: string, endDate?: string): Promise<OwnerLocationMetric[]> {
  const ownerId = await getOwnerId();

  const dateFilter = startDate && endDate ? {
    createdAt: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  } : {};

  const locs = await prisma.parkingLocation.findMany({
    where: { ownerId },
    select: { id: true, name: true, totalSpots: true, analytics: { select: { occupancyRate: true } } }
  });

  // Aggregations
  const stats = await prisma.booking.groupBy({
    by: ['locationId'],
    _count: { id: true },
    _sum: { totalPrice: true },
    where: {
      locationId: { in: locs.map(l => l.id) },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      ...dateFilter,
    }
  });

  const completedStats = await prisma.booking.groupBy({
    by: ['locationId'],
    _count: { id: true },
    where: {
      locationId: { in: locs.map(l => l.id) },
      status: "COMPLETED",
      ...dateFilter,
    }
  });

  // Merge
  return locs.map(loc => {
    const stat = stats.find(s => s.locationId === loc.id);
    const completed = completedStats.find(s => s.locationId === loc.id);
    const totalRev = stat?._sum.totalPrice || 0;
    const count = stat?._count.id || 0;

    return {
      id: loc.id,
      name: loc.name,
      totalBookings: count,
      completedBookings: completed?._count.id || 0,
      revenue: totalRev,
      occupancyRate: loc.analytics?.occupancyRate || 0,
      avgBookingValue: count > 0 ? totalRev / count : 0,
    };
  });
}
