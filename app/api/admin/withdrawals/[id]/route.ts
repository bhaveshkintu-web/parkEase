import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications";
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;
  const withdrawalId = resolvedParams.id;

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log(`[PATCH_WITHDRAWAL] ID: ${withdrawalId}, Payload:`, body);
    
    const { status, adminNotes } = body;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!withdrawal) {
      console.error(`[PATCH_WITHDRAWAL_ERROR] Withdrawal ${withdrawalId} not found`);
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    console.log(`[PATCH_WITHDRAWAL_CURRENT] Status: ${withdrawal.status}, Targeted Status: ${status}`);

    const result = await prisma.$transaction(async (tx) => {
      console.log(`[PATCH_WITHDRAWAL_TX_START] Updating status to ${status}`);
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status,
          adminNotes: adminNotes || null,
          processedAt: status === "PROCESSED" || status === "APPROVED" ? new Date() : null,
        } as any,
      });
      console.log(`[PATCH_WITHDRAWAL_TX_SUCCESS] New status in DB: ${updatedWithdrawal.status}`);

      // Avoid failures if wallet/transactions are missing
      const transaction = await tx.walletTransaction.findFirst({
        where: { reference: withdrawalId, type: "WITHDRAWAL" as any }
      });

      if (status === "REJECTED") {
          await tx.wallet.update({
            where: { id: withdrawal.walletId },
            data: {
              balance: { increment: withdrawal.amount }
            }
          });

          if (transaction) {
            await tx.walletTransaction.update({
              where: { id: transaction.id },
              data: {
                status: "FAILED",
                description: `Rejected: ${adminNotes || "Withdrawal failed"}`
              }
            });
          }
      } else if (status === "PROCESSED") {
          if (transaction) {
            await tx.walletTransaction.update({
              where: { id: transaction.id },
              data: { status: "COMPLETED" }
            });
          }
      }

      return updatedWithdrawal;
    });

    // Notify Owner - added safe navigation
    if (withdrawal.wallet?.owner?.userId) {
      let notificationType: any = "SYSTEM_ALERT";
      let title = "Withdrawal Update";
      let message = "";

      if (status === "APPROVED") {
          notificationType = "WITHDRAWAL_PROCESSED" as any;
          message = `Your withdrawal request for $${withdrawal.amount.toFixed(2)} has been approved and is being processed.`;
      } else if (status === "REJECTED") {
          notificationType = "WITHDRAWAL_REJECTED" as any;
          message = `Your withdrawal request for $${withdrawal.amount.toFixed(2)} was rejected. Reason: ${adminNotes || "Not specified"}`;
      } else if (status === "PROCESSED") {
          notificationType = "WITHDRAWAL_PROCESSED" as any;
          message = `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been completed.`;
      }

      await NotificationService.create({
        userId: withdrawal.wallet.owner.userId,
        title,
        message,
        type: notificationType,
        metadata: { withdrawalId, status, amount: withdrawal.amount }
      }).catch(err => console.error("Notification failed", err));
    }

    console.log(`[WITHDRAWAL_APPROVED] ID: ${withdrawalId}, New Status: ${status}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating admin withdrawal:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
