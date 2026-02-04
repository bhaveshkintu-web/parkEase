import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { DisputeStatus, DisputePriority } from "@prisma/client";
import { NotificationService, NotificationType } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        booking: {
          include: {
            location: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        auditLogs: {
          include: {
            admin: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        refundRequest: true,
      },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    return NextResponse.json(dispute);
  } catch (error) {
    console.error("Error fetching dispute:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    const { status, priority, assignedAdminId, resolutionNotes, internalNotes } = body;

    const currentDispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!currentDispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // Verify admin exists to avoid FK violations in audit logs
    const adminUser = session?.user?.id ? await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    }) : null;

    const updatedDispute = await prisma.$transaction(async (tx) => {
      const updated = await tx.dispute.update({
        where: { id },
        data: {
          status: status || currentDispute.status,
          priority: priority || currentDispute.priority,
          assignedAdminId: assignedAdminId !== undefined ? assignedAdminId : currentDispute.assignedAdminId,
          internalNotes: internalNotes !== undefined ? internalNotes : currentDispute.internalNotes,
          resolutionNotes: resolutionNotes || currentDispute.resolutionNotes,
        },
      });

      // Create audit log entry
      const changes: any = {};
      if (status && status !== currentDispute.status) changes.status = { from: currentDispute.status, to: status };
      if (priority && priority !== currentDispute.priority) changes.priority = { from: currentDispute.priority, to: priority };
      if (assignedAdminId !== undefined && assignedAdminId !== currentDispute.assignedAdminId) {
        changes.assignedAdminId = { from: currentDispute.assignedAdminId, to: assignedAdminId };
      }
      if (resolutionNotes && resolutionNotes !== currentDispute.resolutionNotes) {
        changes.resolutionNotes = { from: currentDispute.resolutionNotes, to: resolutionNotes };
      }

      if (Object.keys(changes).length > 0 || body.notes) {
        try {
          await tx.disputeAuditLog.create({
            data: {
              disputeId: id,
              adminId: adminUser?.id || null, // Robust fallback
              action: body.notes && Object.keys(changes).length === 0 ? "NOTE_ADDED" : "UPDATED",
              previousValue: Object.keys(changes).length > 0 ? changes : undefined,
              notes: body.notes || "Dispute details updated.",
            },
          });
        } catch (auditError) {
          // Log but don't fail the whole transaction for a non-critical audit log
          console.error("Non-critical audit log failure:", auditError);
        }
      }

      return updated;
    });

    // Notify Customer of status change
    if (status && status !== currentDispute.status) {
      await NotificationService.notifyCustomer(currentDispute.userId, {
        title: "Dispute Status Updated",
        message: `Your dispute for booking ${currentDispute.bookingId} is now ${status}`,
        type: NotificationType.DISPUTE_UPDATED,
        metadata: { disputeId: id, status }
      });
    }

    return NextResponse.json(updatedDispute);
  } catch (error: any) {
    console.error("Error updating dispute:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.dispute.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ message: "Dispute deleted successfully" });
  } catch (error) {
    console.error("Error deleting dispute:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
