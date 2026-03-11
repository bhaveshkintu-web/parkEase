import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter: any = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.gte = new Date(from);
      if (to) dateFilter.createdAt.lte = new Date(to);
    }

    let wallet = await (prisma.wallet as any).findFirst({
      where: { type: "SYSTEM" },
    });

    if (!wallet) {
      wallet = await (prisma.wallet as any).create({
        data: {
          type: "SYSTEM",
          balance: 0,
          currency: "USD",
        },
        include: {
          transactions: true
        }
      });
    }

    // Calculate total commission earnings for the period
    const commissionStats = await prisma.walletTransaction.aggregate({
      where: {
        walletId: wallet.id,
        type: "COMMISSION" as any,
        amount: { gt: 0 },
        ...dateFilter
      },
      _sum: {
        amount: true
      }
    });

    return NextResponse.json({
      ...wallet,
      totalCommissionEarnings: commissionStats._sum.amount || 0
    });
  } catch (error) {
    console.error("[ADMIN_WALLET_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bankName, accountName, accountNumber, routingNumber } = body;

    const wallet = await (prisma.wallet as any).update({
      where: { type: "SYSTEM" },
      data: {
        bankName,
        accountName,
        accountNumber,
        routingNumber,
      }
    });

    return NextResponse.json(wallet);
  } catch (error) {
    console.error("[ADMIN_WALLET_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
