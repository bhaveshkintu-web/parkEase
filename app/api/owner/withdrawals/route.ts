import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

/**
 * @api {post} /api/owner/withdrawals Create a new withdrawal request
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, bankDetails } = body;

    if (!amount || amount <= 0 || !bankDetails) {
      return NextResponse.json({ error: "Invalid withdrawal details" }, { status: 400 });
    }

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: session.user.id },
      include: { wallet: true },
    });

    if (!ownerProfile || !ownerProfile.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (ownerProfile.wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Withdrawal Request
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          walletId: ownerProfile.wallet!.id,
          amount,
          accountName: bankDetails.accountName,
          accountNumber: bankDetails.accountNumber,
          bankName: bankDetails.bankName,
          routingNumber: bankDetails.routingNumber,
          status: "PENDING",
        },
      });

      // 2. Create Wallet Transaction
      await tx.walletTransaction.create({
        data: {
          walletId: ownerProfile.wallet!.id,
          type: "WITHDRAWAL",
          amount: -amount,
          description: `Withdrawal request for ${amount}`,
          status: "PENDING",
          reference: withdrawal.id,
        },
      });

      // 3. Update Wallet Balance
      await tx.wallet.update({
        where: { id: ownerProfile.wallet!.id },
        data: {
          balance: { decrement: amount },
        },
      });

      // 4. Notify Admins
      await notifyAdmins({
        title: "New Withdrawal Request",
        message: `Owner ${ownerProfile.businessName} has requested a withdrawal of $${amount}.`,
        type: "info",
        link: "/admin/payouts",
        prisma: tx,
      });

      return withdrawal;
    });

    return NextResponse.json({
      message: "Withdrawal request submitted successfully",
      withdrawal: result,
    });
  } catch (error) {
    console.error("[WITHDRAWAL_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * @api {get} /api/owner/withdrawals Get withdrawal history for owner
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: session.user.id },
      include: { wallet: true },
    });

    if (!ownerProfile || !ownerProfile.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { walletId: ownerProfile.wallet.id },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error("[WITHDRAWAL_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
