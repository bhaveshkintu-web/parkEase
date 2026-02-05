import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { RefundStatus } from "@prisma/client";
import { NotificationService, NotificationType } from "@/lib/notifications";

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status, approvedAmount, notes } = body;

    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id },
      include: { booking: true }
    });

    if (!refundRequest) {
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    }

    const updatedRefund = await prisma.refundRequest.update({
      where: { id },
      data: {
        status: status as RefundStatus,
        approvedAmount: approvedAmount !== undefined ? parseFloat(approvedAmount) : refundRequest.approvedAmount,
        processedAt: status === "PROCESSED" || status === "APPROVED" ? new Date() : refundRequest.processedAt,
      },
    });

    // If there's a linked dispute, log the action
    if (refundRequest.disputeId) {
        await prisma.disputeAuditLog.create({
            data: {
                disputeId: refundRequest.disputeId,
                adminId: session.user.id,
                action: `REFUND_${status}`,
                notes: notes || `Refund request ${status.toLowerCase()}. Amount: ${approvedAmount || refundRequest.amount}`,
                newValue: { status, approvedAmount }
            }
        });
    }

    // If there's a matching user, notify them
    const booking = await prisma.booking.findUnique({
      where: { id: updatedRefund.bookingId },
      select: { userId: true, confirmationCode: true }
    });

    if (booking && booking.userId) {
      await NotificationService.notifyCustomer(booking.userId, {
        title: "Refund Status Updated",
        message: `Your refund for booking ${booking.confirmationCode} is now ${status}`,
        type: NotificationType.REFUND_PROCESSED,
        metadata: { refundRequestId: id, status }
      });
    }

    return NextResponse.json(updatedRefund);
  } catch (error) {
    console.error("Error updating refund:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
