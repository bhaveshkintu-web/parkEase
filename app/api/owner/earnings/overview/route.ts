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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const userId = session.user.id;
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: {
        wallet: true,
      }
    });

    if (!ownerProfile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const wallet = ownerProfile.wallet;

    // Filter condition for bookings/transactions
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    // 1. Total Earnings (Sum of all completed booking payments)
    const bookings = await prisma.booking.findMany({
      where: {
        location: { ownerId: ownerProfile.id },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        // SUCCESS if any payment is successful
        payments: {
          some: { status: { in: ["SUCCESS", "COMPLETED"] } }
        },
        ...(startDate || endDate ? { createdAt: dateFilter.createdAt } : {})
      },
      select: {
        totalPrice: true,
        id: true,
        payments: {
          where: { status: { in: ["SUCCESS", "COMPLETED"] } },
          select: { amount: true }
        }
      }
    });

    const totalEarnings = bookings.reduce((sum, b) => {
      const bookingTotal = b.payments.reduce((pSum, p) => pSum + p.amount, 0);
      return sum + bookingTotal;
    }, 0);

    // 2. Commission & Net Earnings
    // We aggregate COMMISSION transactions from the wallet for the period
    const commissionTxs = await prisma.walletTransaction.aggregate({
      where: {
        walletId: wallet?.id,
        type: "COMMISSION",
        status: "COMPLETED",
        ...(startDate || endDate ? { createdAt: dateFilter.createdAt } : {})
      },
      _sum: {
        amount: true
      }
    });

    const totalCommission = Math.abs(commissionTxs._sum.amount || 0);
    const netEarnings = totalEarnings - totalCommission;

    // 3. Pending Withdrawals
    const pendingWithdrawals = await prisma.withdrawalRequest.aggregate({
      where: {
        walletId: wallet?.id,
        status: "PENDING"
      },
      _sum: {
        amount: true
      }
    });

    // 4. Revenue Trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendTxs = await prisma.walletTransaction.findMany({
      where: {
        walletId: wallet?.id,
        type: "CREDIT",
        status: "COMPLETED",
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: "asc" },
      select: {
        amount: true,
        createdAt: true
      }
    });

    const chartData = trendTxs.reduce((acc: any[], tx) => {
      const date = tx.createdAt.toISOString().split("T")[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.amount += tx.amount;
      } else {
        acc.push({ date, amount: tx.amount });
      }
      return acc;
    }, []);

    return NextResponse.json({
      stats: {
        totalEarnings,
        netEarnings,
        totalCommission,
        availableBalance: wallet?.balance || 0,
        pendingWithdrawals: pendingWithdrawals._sum.amount || 0,
        totalBookings: bookings.length
      },
      chartData
    });
  } catch (error) {
    console.error("[OWNER_EARNINGS_OVERVIEW_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
