import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const wallet = await (prisma.wallet as any).findFirst({
      where: { type: "SYSTEM" }
    });

    if (!wallet) {
      return NextResponse.json({ error: "System wallet not found" }, { status: 404 });
    }

    if (wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient platform balance" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create WITHDRAWAL transaction (COMPLETED immediately for admin)
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL" as any,
          amount: -amount,
          description: `Platform revenue transfer to corporate account`,
          status: "COMPLETED",
          reference: `ADM-WD-${Date.now().toString().slice(-6)}`
        }
      });

      // 2. Update wallet balance
      const updatedWallet = await (tx.wallet as any).update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount }
        }
      });

      return { transaction, updatedWallet };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ADMIN_WITHDRAW_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
