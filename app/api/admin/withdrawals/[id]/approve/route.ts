import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/**
 * @api {post} /api/admin/withdrawals/:id/approve Approve a withdrawal request
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { 
        wallet: { 
          include: { 
            owner: true 
          } 
        } 
      },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending requests can be approved" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Withdrawal Status
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          processedBy: session.user.id,
        },
      });

      // 2. Update Transaction Status
      await tx.walletTransaction.updateMany({
        where: { 
          reference: id,
          type: "WITHDRAWAL"
        },
        data: {
          status: "COMPLETED",
        },
      });

      // 3. Notify Owner
      await createNotification({
        userId: withdrawal.wallet.owner.userId,
        title: "Withdrawal Approved",
        message: `Your withdrawal request for $${withdrawal.amount} has been approved and processed.`,
        type: "success",
        link: "/owner/wallet",
        prisma: tx,
      });

      return updatedWithdrawal;
    });

    return NextResponse.json({
      message: "Withdrawal approved successfully",
      withdrawal: result,
    });
  } catch (error) {
    console.error("[WITHDRAWAL_APPROVE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
