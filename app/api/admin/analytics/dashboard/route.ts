import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * @api {get} /api/admin/analytics/dashboard Get admin dashboard analytics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get counts with individual error handling
    let totalUsers = 0;
    let totalOwners = 0;
    let totalLocations = 0;
    let totalBookings = 0;
    let activeLocations = 0;
    let pendingOwners = 0;
    let pendingLocations = 0;
    let totalRevenue = 0;
    let openTickets = 0;
    let openDisputes = 0;
    let pendingRefunds = 0;
    let pendingReviews = 0;

    try {
      totalUsers = await prisma.user.count();
    } catch (error) {
      console.error("Error counting users:", error);
    }

    try {
      totalOwners = await prisma.ownerProfile.count();
    } catch (error) {
      console.error("Error counting owners:", error);
    }

    try {
      totalLocations = await prisma.parkingLocation.count();
    } catch (error) {
      console.error("Error counting locations:", error);
    }

    try {
      totalBookings = await prisma.booking.count();
    } catch (error) {
      console.error("Error counting bookings:", error);
    }

    try {
      activeLocations = await prisma.parkingLocation.count({
        where: { status: "ACTIVE" } // Use enum value
      });
    } catch (error) {
      console.error("Error counting active locations:", error);
    }

    try {
      pendingOwners = await prisma.ownerProfile.count({
        where: { status: "pending" }
      });
    } catch (error) {
      console.error("Error counting pending owners:", error);
    }

    try {
      openTickets = await prisma.supportTicket.count({
        where: { status: "OPEN" }
      });
    } catch (error) {
      console.error("Error counting open tickets:", error);
    }

    try {
      openDisputes = await prisma.dispute.count({
        where: { status: "OPEN" }
      });
    } catch (error) {
      console.error("Error counting open disputes:", error);
    }

    try {
      pendingLocations = await prisma.parkingLocation.count({
        where: { status: "PENDING" }
      });
    } catch (error) {
      console.error("Error counting pending locations:", error);
    }

    try {
      pendingRefunds = await prisma.refundRequest.count({
        where: { status: "PENDING" }
      });
    } catch (error) {
      console.error("Error counting pending refunds:", error);
    }

    try {
      pendingReviews = await prisma.review.count({
        where: { adminReview: { is: null } }
      });
    } catch (error) {
      console.error("Error counting pending reviews:", error);
    }

    // Get revenue safely (sum of all bookings)
    try {
      const revenueData = await prisma.booking.aggregate({
        _sum: {
          totalPrice: true,
        },
      });
      totalRevenue = revenueData._sum.totalPrice || 0;
    } catch (error) {
      console.error("Error calculating revenue:", error);
    }

    // Calculate SLA Adherence (percentage of resolved disputes/tickets within 24h)
    let slaAdherence = 0;
    try {
      const resolvedTickets = await prisma.supportTicket.findMany({
        where: { status: "RESOLVED" },
        select: { createdAt: true, updatedAt: true }
      });
      
      if (resolvedTickets.length > 0) {
        const withinSLA = resolvedTickets.filter(t => {
          const diff = t.updatedAt.getTime() - t.createdAt.getTime();
          return diff < 24 * 60 * 60 * 1000; // 24 hours
        }).length;
        slaAdherence = Math.round((withinSLA / resolvedTickets.length) * 100);
      } else {
        slaAdherence = 100; // Default if no data
      }
    } catch (error) {
       console.error("Error calculating SLA:", error);
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOwners,
        totalLocations,
        totalBookings,
        activeLocations,
        pendingOwners,
        pendingLocations,
        totalRevenue,
        openTickets,
        openDisputes,
        pendingRefunds,
        pendingReviews,
        totalPendingApprovals: pendingOwners + pendingLocations + pendingRefunds,
        slaAdherence,
      },
    });
  } catch (error) {
    console.error("[ADMIN_DASHBOARD_ANALYTICS]", error);
    return NextResponse.json({ error: "Internal error", details: String(error) }, { status: 500 });
  }
}
