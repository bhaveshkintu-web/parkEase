import { prisma } from "./prisma";
import nodemailer from "nodemailer";

// Local enum definition until Prisma client is regenerated
export enum NotificationType {
  DISPUTE_CREATED = "DISPUTE_CREATED",
  DISPUTE_UPDATED = "DISPUTE_UPDATED",
  REFUND_REQUESTED = "REFUND_REQUESTED",
  REFUND_PROCESSED = "REFUND_PROCESSED",
  SUPPORT_TICKET_CREATED = "SUPPORT_TICKET_CREATED",
  SUPPORT_TICKET_UPDATED = "SUPPORT_TICKET_UPDATED",
  SYSTEM_ALERT = "SYSTEM_ALERT"
}

export async function notifyAdminsOfBookingRequest(requestId: string) {
// ... existing code ...
  try {
    const request = await prisma.bookingRequest.findUnique({
      where: { id: requestId },
      include: {
        location: true,
        requestedBy: true,
      },
    });

    if (!request) return;

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true, firstName: true },
    });

    if (admins.length === 0) return;

    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    for (const admin of admins) {
      await transporter.sendMail({
        from: `"ParkEase Notifications" <${process.env.SMTP_USER}>`,
        to: admin.email,
        subject: `New Booking Request: ${request.customerName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #0d9488;">New Booking Request</h2>
            <p>A new ${request.requestType.toLowerCase()} request has been submitted by watchman <strong>${request.requestedBy.firstName} ${request.requestedBy.lastName}</strong>.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Customer:</strong> ${request.customerName}</p>
              <p style="margin: 0;"><strong>Vehicle:</strong> ${request.vehiclePlate}</p>
              <p style="margin: 0;"><strong>Location:</strong> ${request.parkingName}</p>
              <p style="margin: 0;"><strong>Requested Time:</strong> ${new Date(request.requestedStart).toLocaleString()} - ${new Date(request.requestedEnd).toLocaleString()}</p>
              <p style="margin: 0;"><strong>Estimated Amount:</strong> $${request.estimatedAmount}</p>
            </div>

            <p>Please log in to the admin dashboard to approve or reject this request.</p>
            <a href="${process.env.APP_URL}/admin/bookings" style="display: inline-block; background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8em; color: #999;">&copy; ${new Date().getFullYear()} ParkEase. All rights reserved.</p>
          </div>
        `,
      });
    }

    console.log(`✅ Admin notifications sent for request ${requestId}`);
  } catch (error) {
    console.error("❌ Failed to notify admins:", error);
  }
}

/**
 * Sends a reservation receipt to the guest.
 */
export async function sendReservationReceipt(bookingId: string, customEmail?: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        location: true,
      },
    });

    if (!booking) throw new Error("Booking not found");

    const targetEmail = customEmail || booking.guestEmail;

    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const formatDateStr = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    };

    await transporter.sendMail({
      from: `"ParkEase" <${process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: `Reservation Receipt: ${booking.confirmationCode}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">ParkEase</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Reservation Receipt</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="margin-top: 0; color: #0d9488;">Hello ${booking.guestFirstName},</h2>
            <p>Thank you for choosing ParkEase. Here are your reservation details for <strong>${booking.location.name}</strong>.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="text-align: center; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Confirmation Code</p>
                <h3 style="margin: 5px 0; font-size: 28px; font-family: monospace; letter-spacing: 2px;">${booking.confirmationCode}</h3>
              </div>
              
              <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div style="flex: 1;">
                  <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Check-in</p>
                  <p style="margin: 5px 0 0; font-weight: bold;">${formatDateStr(new Date(booking.checkIn))}</p>
                </div>
                <div style="flex: 1; text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Check-out</p>
                  <p style="margin: 5px 0 0; font-weight: bold;">${formatDateStr(new Date(booking.checkOut))}</p>
                </div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Vehicle</p>
                <p style="margin: 5px 0 0; font-weight: bold;">${booking.vehicleColor} ${booking.vehicleMake} ${booking.vehicleModel} (${booking.vehiclePlate})</p>
              </div>
              
              <div style="margin-bottom: 0;">
                <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Location</p>
                <p style="margin: 5px 0 0; font-weight: bold;">${booking.location.address}</p>
              </div>
            </div>

            <div style="margin: 20px 0; border-top: 1px solid #eee; padding-top: 20px;">
              <h3 style="margin-top: 0; font-size: 16px;">Payment Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #666;">Parking Fee</td>
                  <td style="padding: 5px 0; text-align: right;">$${(booking.totalPrice - booking.taxes - booking.fees).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Taxes</td>
                  <td style="padding: 5px 0; text-align: right;">$${booking.taxes.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Service Fee</td>
                  <td style="padding: 5px 0; text-align: right;">$${booking.fees.toFixed(2)}</td>
                </tr>
                <tr style="font-weight: bold; border-top: 1px solid #eee;">
                  <td style="padding: 10px 0; font-size: 18px;">Total Paid</td>
                  <td style="padding: 10px 0; text-align: right; font-size: 18px; color: #0d9488;">$${booking.totalPrice.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/account/reservations/${bookingId}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Reservation Online</a>
            </div>
          </div>
          
          <div style="background-color: #f3f4f6; color: #666; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0 0 10px;">Questions? Reply to this email or visit our <a href="${process.env.APP_URL}/center" style="color: #0d9488;">Help Center</a>.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ParkEase. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Reservation receipt sent to ${targetEmail} for booking ${bookingId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send reservation receipt:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendSupportEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  try {
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ParkEase Support" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Sending to ourselves/support address
      replyTo: data.email,
      subject: `Support Ticket: ${data.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">ParkEase</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">New Support Message</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="margin-top: 0; color: #0d9488;">New Support Request</h2>
            <p>You have received a new message from the support contact form.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px;"><strong>Name:</strong> ${data.name}</p>
              <p style="margin: 0 0 10px;"><strong>Email:</strong> ${data.email}</p>
              <p style="margin: 0 0 10px;"><strong>Subject:</strong> ${data.subject}</p>
              <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                <p style="margin: 0; font-weight: bold;">Message:</p>
                <p style="margin: 5px 0 0; white-space: pre-wrap;">${data.message}</p>
              </div>
            </div>

            <p style="font-size: 14px; color: #666;">
              You can reply directly to this email to contact the user at ${data.email}.
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; color: #666; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ParkEase Support System. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Support email sent from ${data.email}: ${data.subject}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send support email:", error);
    return { success: false, error: "Failed to send message" };
  }
}

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: any;
}

export class NotificationService {
  /**
   * Create a single notification for a user
   */
  static async create({
    userId,
    title,
    message,
    type,
    metadata,
  }: CreateNotificationParams) {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          metadata,
        },
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * Notify all Admins and Support agents
   */
  static async notifyAdmins(params: Omit<CreateNotificationParams, "userId">) {
    try {
      const staff = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "SUPPORT"] },
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (staff.length === 0) return null;

      const notifications = staff.map((s) => ({
        ...params,
        userId: s.id,
      }));

      return await prisma.notification.createMany({
        data: notifications,
      });
    } catch (error) {
      console.error("Error notifying admins:", error);
      return null;
    }
  }

  /**
   * Notify an owner about a dispute at their location
   */
  static async notifyOwner(
    ownerId: string,
    params: Omit<CreateNotificationParams, "userId">
  ) {
    try {
      const owner = await prisma.ownerProfile.findUnique({
        where: { id: ownerId },
        select: { userId: true },
      });

      if (owner) {
        return this.create({
          ...params,
          userId: owner.userId,
        });
      }
    } catch (error) {
      console.error("Error notifying owner:", error);
    }
    return null;
  }

  /**
   * Notify a customer about an update to their request
   */
  static async notifyCustomer(
    userId: string,
    params: Omit<CreateNotificationParams, "userId">
  ) {
    return this.create({
      ...params,
      userId,
    });
  }
}
