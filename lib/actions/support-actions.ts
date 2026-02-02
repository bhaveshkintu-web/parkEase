"use server";

import { sendSupportEmail } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

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
    return { success: true, ticket: updatedTicket };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { success: false, error: "Failed to update status" };
  }
}
