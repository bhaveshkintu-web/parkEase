import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  // const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
  const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

  console.log("verifyUrl---------------", verifyUrl, email);

  try {
    await resend.emails.send({
      from: "ParkEase <onboarding@resend.dev>",
      to: "bhavesh.kintu@gmail.com",
      // to: email,
      subject: "Verify your email",
      html: `
        <h2>Email Verification</h2>
        <p>Please click the link below to verify your email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>This link is valid for 24 hours.</p>
      `,
    });

    console.log("✅ Verification email sent to:", email);
  } catch (error) {
    console.error("❌ RESEND_EMAIL_FAILED:", error);
    throw new Error("Email send failed");
  }
}

export async function sendBookingNotification(email: string, status: string, details: any) {
  try {
    const isApproved = status.toUpperCase() === "APPROVED";
    await resend.emails.send({
      from: "ParkEase <onboarding@resend.dev>",
      to: "bhavesh.kintu@gmail.com", // Keeping same as verification for demo
      subject: `Booking Request ${isApproved ? "Approved" : "Rejected"}`,
      html: `
        <h2>Booking Request Update</h2>
        <p>Dear ${details.customerName},</p>
        <p>Your booking request for <strong>${details.parkingName}</strong> has been <strong>${status}</strong>.</p>
        ${isApproved ? `
          <p>Your confirmation code is: <strong>${details.confirmationCode}</strong></p>
          <p>Vehicle: ${details.vehiclePlate}</p>
          <p>Time: ${details.requestedStart} - ${details.requestedEnd}</p>
        ` : `
          <p>Reason: ${details.rejectionReason || "No specific reason provided."}</p>
        `}
        <p>Thank you for using ParkEase!</p>
      `,
    });
    console.log(`✅ Booking ${status} notification sent to:`, email);
  } catch (error) {
    console.error(`❌ NOTIFICATION_SEND_FAILED:`, error);
    // Don't throw error to avoid breaking the main flow
  }
}

// import nodemailer from "nodemailer";

// export async function sendVerificationEmail(email: string, token: string) {
//   const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
//   console.log("verifyUrl---------------", verifyUrl, email);

//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT),
//     secure: false,
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   });

//   await transporter.sendMail({
//     from: `"ParkEase" <${process.env.SMTP_USER}>`,
//     to: email,
//     subject: "Verify your email",
//     html: `
//       <h2>Email Verification</h2>
//       <p>Please click the link below to verify your email:</p>
//       <a href="${verifyUrl}">${verifyUrl}</a>
//       <p>This link is valid for 24 hours.</p>
//     `,
//   });
// }
