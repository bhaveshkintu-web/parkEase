import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getPlatformCommissionRate } from "@/lib/actions/settings-actions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  try {
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter: any = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.gte = new Date(from);
      if (to) dateFilter.createdAt.lte = new Date(to);
    }

    const wallet = await prisma.wallet.findFirst({
      where: { owner: { userId } },
      include: {
        owner: true,
        transactions: {
          where: dateFilter,
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!wallet) {
      // ... (existing logic for creating wallet if missing)
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId }
      });

      if (ownerProfile) {
        const newWallet = await prisma.wallet.create({
          data: {
            ownerId: ownerProfile.id,
            balance: 0,
            totalBalance: 0,
            currency: "USD",
          },
          include: {
            owner: true,
            transactions: true
          }
        });
        return NextResponse.json({
          ...newWallet,
          lifetimeEarnings: 0,
          totalWithdrawn: 0,
          pendingWithdrawn: 0
        });
      }
      return NextResponse.json({ error: "Owner profile not found" }, { status: 404 });
    }

    // Calculate period stats
    const statsWhere = {
      walletId: wallet.id,
      ...dateFilter
    };

    // 1. Period Earnings: Sum of (DEPOSITED) - Sum of (REFUND)
    const deposits = await prisma.walletTransaction.aggregate({
      where: { ...statsWhere, type: "DEPOSITED" as any },
      _sum: { amount: true }
    });

    const refunds = await prisma.walletTransaction.aggregate({
      where: { ...statsWhere, type: "REFUND" as any },
      _sum: { amount: true }
    });

    // 2. Period Withdrawn: Sum of completed WITHDRAWAL (negative amounts)
    const withdrawn = await prisma.walletTransaction.aggregate({
      where: {
        ...statsWhere,
        type: "WITHDRAWAL" as any,
        status: "COMPLETED"
      },
      _sum: { amount: true }
    });

    // 3. Period Pending: Sum of pending WITHDRAWAL
    const pending = await prisma.walletTransaction.aggregate({
      where: {
        ...statsWhere,
        type: "WITHDRAWAL" as any,
        status: "PENDING"
      },
      _sum: { amount: true }
    });

    console.log(`[Owner Wallet API] ✅ Fetched wallet and stats for user: ${session.user.id}`);
    return NextResponse.json({
      ...wallet,
      lifetimeEarnings: (deposits._sum.amount || 0) - Math.abs(refunds._sum.amount || 0),
      totalWithdrawn: Math.abs(withdrawn._sum.amount || 0),
      pendingWithdrawn: Math.abs(pending._sum.amount || 0),
      commissionRate: await getPlatformCommissionRate()
    });
  } catch (error) {
    console.error(`[Owner Wallet API Error] GET failed for user ${session?.user?.id}:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
