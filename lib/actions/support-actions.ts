"use server";

import { sendSupportEmail, NotificationService, NotificationType } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { DisputeType, DisputePriority, RefundStatus, DisputeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function submitSupportTicket(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  try {
    // Basic validation
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      return { success: false, error: "All fields are required" };
    }

    if (!formData.email.includes("@")) {
      return { success: false, error: "Invalid email address" };
    }

    // Save to database
    await prisma.supportTicket.create({
      data: {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      },
    });

    // Trigger the email
    const result = await sendSupportEmail(formData);
    
    // Create In-App Notification for Admins
    if (result.success) {
      await NotificationService.notifyAdmins({
        title: "New Support Ticket",
        message: `New ticket from ${formData.name}: ${formData.subject}`,
        type: NotificationType.SUPPORT_TICKET_CREATED,
        metadata: { subject: formData.subject, email: formData.email }
      });
    }

    return result;
  } catch (error) {
    console.error("Error in submitSupportTicket action:", error);
    return { success: false, error: "An unexpected error occurred. Please try again later." };
  }
}

export async function getSupportTickets() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, tickets };
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

export async function updateTicketStatus(ticketId: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED") {
  try {
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });

    // Notify user if possible (we only have email, but if there's a matching user, notify them)
    const user = await prisma.user.findUnique({
      where: { email: updatedTicket.email }
    });

    if (user) {
      await NotificationService.notifyCustomer(user.id, {
        title: "Support Ticket Updated",
        message: `Your ticket "${updatedTicket.subject}" status is now ${status}`,
        type: NotificationType.SUPPORT_TICKET_UPDATED,
        metadata: { ticketId, status }
      });
    }

    return { success: true, ticket: updatedTicket };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * CUSTOMER ACTIONS: Disputes & Refunds
 */

export async function submitDispute(data: {
  bookingId: string;
  subject: string;
  description: string;
  type: DisputeType;
  priority?: DisputePriority;
}) {
  try {
    const userId = await getAuthUserId();
    
    // Verify booking ownership
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { userId: true, confirmationCode: true, locationId: true }
    });

    if (!booking || booking.userId !== userId) {
      return { success: false, error: "Unauthorized or booking not found" };
    }

    const dispute = await prisma.dispute.create({
      data: {
        bookingId: data.bookingId,
        userId: userId,
        subject: data.subject,
        description: data.description,
        type: data.type,
        priority: data.priority || DisputePriority.MEDIUM,
        status: DisputeStatus.OPEN,
      }
    });

    // Create initial audit log
    await prisma.disputeAuditLog.create({
      data: {
        disputeId: dispute.id,
        action: "CREATED",
        notes: `Dispute created by customer for booking ${booking.confirmationCode}`,
        newValue: { status: DisputeStatus.OPEN }
      }
    });

    // Notify Admins
    await NotificationService.notifyAdmins({
      title: "New Dispute Created",
      message: `A new dispute has been raised for booking ${booking.confirmationCode}`,
      type: NotificationType.DISPUTE_CREATED,
      metadata: { disputeId: dispute.id, bookingId: data.bookingId }
    });

    // Notify Owner
    const location = await prisma.parkingLocation.findUnique({
      where: { id: booking.locationId },
      select: { ownerId: true, name: true }
    });

    if (location) {
      await NotificationService.notifyOwner(location.ownerId, {
        title: "New Dispute Awareness",
        message: `A dispute was raised for a booking at ${location.name}`,
        type: NotificationType.DISPUTE_CREATED,
        metadata: { disputeId: dispute.id, bookingId: data.bookingId }
      });
    }

    revalidatePath(`/account/reservations/${data.bookingId}`);
    return { success: true, data: dispute };
  } catch (error) {
    console.error("Error submitting dispute:", error);
    return { success: false, error: "Failed to submit dispute" };
  }
}

export async function requestRefund(data: {
  bookingId: string;
  amount: number;
  reason: string;
  description?: string;
  disputeId?: string;
}) {
  try {
    const userId = await getAuthUserId();

    // Verify booking ownership
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { userId: true, totalPrice: true, confirmationCode: true }
    });

    if (!booking || booking.userId !== userId) {
      return { success: false, error: "Unauthorized or booking not found" };
    }

    if (data.amount > booking.totalPrice) {
      return { success: false, error: "Refund amount cannot exceed booking total" };
    }

    const refundRequest = await prisma.refundRequest.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        reason: data.reason,
        description: data.description,
        disputeId: data.disputeId,
        status: RefundStatus.PENDING,
      }
    });

    // Notify Admins
    await NotificationService.notifyAdmins({
      title: "New Refund Requested",
      message: `A refund of $${data.amount} requested for booking ${booking.confirmationCode}`,
      type: NotificationType.REFUND_REQUESTED,
      metadata: { refundRequestId: refundRequest.id, bookingId: data.bookingId }
    });

    revalidatePath(`/account/reservations/${data.bookingId}`);
    return { success: true, data: refundRequest };
  } catch (error) {
    console.error("Error requesting refund:", error);
    return { success: false, error: "Failed to submit refund request" };
  }
}

export async function getBookingSupportStatus(bookingId: string) {
  try {
    const userId = await getAuthUserId();
    
    const [disputes, refunds] = await Promise.all([
      prisma.dispute.findMany({
        where: { bookingId, userId, isDeleted: false },
        orderBy: { createdAt: "desc" }
      }),
      prisma.refundRequest.findMany({
        where: { bookingId },
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { success: true, disputes, refunds };
  } catch (error) {
    return { success: false, error: "Failed to fetch support status" };
  }
}
