import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { RefundStatus, DisputeStatus } from "@prisma/client";

export async function POST(
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
    const { amount, reason, description } = body;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        booking: true,
        refundRequest: true,
      },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    if (dispute.refundRequest) {
      return NextResponse.json({ error: "Refund already exists for this dispute" }, { status: 400 });
    }

    if (parseFloat(amount) > dispute.booking.totalPrice + 0.01) { // Add tiny buffer for rounding
      return NextResponse.json({ error: "Refund amount cannot exceed booking total price" }, { status: 400 });
    }

    // Verify admin exists to avoid FK violations in audit logs
    const adminUser = session?.user?.id ? await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    }) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Refund Request
      const refundRequest = await tx.refundRequest.create({
        data: {
          bookingId: dispute.bookingId,
          disputeId: dispute.id,
          amount: parseFloat(amount),
          reason,
          description,
          status: RefundStatus.PENDING,
        },
      });

      // 2. Update Dispute status to RESOLVED
      await tx.dispute.update({
        where: { id },
        data: {
          status: DisputeStatus.RESOLVED,
        },
      });

      // 3. Create Audit Log
      try {
        await tx.disputeAuditLog.create({
          data: {
            disputeId: id,
            adminId: adminUser?.id || null, // Robust fallback
            action: "REFUND_TRIGGERED",
            newValue: { refundRequestId: refundRequest.id, amount: parseFloat(amount) },
            notes: `Refund of ${amount} triggered for dispute. Dispute resolved.`,
          },
        });
      } catch (auditError) {
        console.error("Non-critical audit log failure during refund:", auditError);
      }

      return refundRequest;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating refund from dispute:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
