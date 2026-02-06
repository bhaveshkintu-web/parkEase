import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications";

// GET Withdrawal History
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: { wallet: true }
    });

    if (!ownerProfile || !ownerProfile.wallet) {
      return NextResponse.json({ withdrawals: [] });
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { walletId: ownerProfile.wallet.id },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error("[OWNER_WITHDRAWALS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST Request Withdrawal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, bankDetails } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const userId = session.user.id;
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: { wallet: true }
    });

    if (!ownerProfile || !ownerProfile.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (ownerProfile.wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const withdrawal = await prisma.$transaction(async (tx) => {
      // 1. Create withdrawal request
      const request = await tx.withdrawalRequest.create({
        data: {
          walletId: ownerProfile.wallet!.id,
          amount,
          accountName: bankDetails.accountName || ownerProfile.bankAccountName || "N/A",
          accountNumber: bankDetails.accountNumber || ownerProfile.accountNumber || "N/A",
          bankName: bankDetails.bankName || ownerProfile.bankName || "N/A",
          routingNumber: bankDetails.routingNumber || ownerProfile.routingNumber,
          status: "PENDING" as any,
        }
      });

      // 2. Create WITHDRAWAL transaction (pending/hold)
      // Note: We deduct from available balance immediately or mark it as held.
      // For simplicity, we deduct it and describe it as withdrawal.
      await tx.walletTransaction.create({
        data: {
          walletId: ownerProfile.wallet!.id,
          type: "WITHDRAWAL" as any,
          amount: -amount,
          description: `Withdrawal request #${request.id.slice(-6)}`,
          status: "PENDING",
          reference: request.id
        }
      });

      // 3. Update wallet balance
      await tx.wallet.update({
        where: { id: ownerProfile.wallet!.id },
        data: {
          balance: { decrement: amount }
        }
      });

      return request;
    });

    // Notify Admins
    await NotificationService.notifyAdmins({
      title: "New Withdrawal Request",
      message: `Owner ${ownerProfile.businessName} has requested a withdrawal of $${amount}.`,
      type: "WITHDRAWAL_REQUESTED" as any,
      metadata: { withdrawalId: withdrawal.id, amount }
    });

    return NextResponse.json(withdrawal);
  } catch (error) {
    console.error("[OWNER_WITHDRAW_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
