import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

  try {
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465; // SSL requires secure=true

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"ParkEase" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify your email",
      html: `
      <h2>Email Verification</h2>
      <p>Please click the link below to verify your email:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link is valid for 24 hours.</p>
    `,
    });

    // Log the result
    console.log("✅ Email sent!");
    console.log("Message ID:", info.messageId);
    console.log("Accepted recipients:", info.accepted);
    console.log("Rejected recipients:", info.rejected);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }
  } catch (error: any) {
    console.error("❌ Failed to send verification email:", error);

    // Extra debug info for SMTP issues
    if (error.response) console.error("SMTP Response:", error.response);
    if (error.code) console.error("SMTP Code:", error.code);
    if (error.stack) console.error("Stack:", error.stack);

    throw new Error(
      "Unable to send verification email. Check SMTP settings and logs.",
    );
  }
}

export async function sendBookingNotification(email: string, status: string, details: any) {
  try {
    const isApproved = status.toUpperCase() === "APPROVED";

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
      from: `"ParkEase" <${process.env.SMTP_USER}>`,
      to: email,
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
  }
}

export async function sendResetPasswordEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

  try {
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"ParkEase" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset your password",
      html: `
      <h2>Password Reset Request</h2>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link is valid for 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
    });

    console.log("✅ Reset password email sent!");
    console.log("Message ID:", info.messageId);
  } catch (error: any) {
    console.error("❌ Failed to send reset password email:", error);
    throw new Error(
      "Unable to send reset password email. Check SMTP settings and logs.",
    );
  }
}

// export async function sendVerificationEmail(email: string, token: string) {
//   // const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
//   const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

//   console.log("verifyUrl---------------", verifyUrl, email);

//   try {
//     await resend.emails.send({
//       from: "ParkEase <onboarding@resend.dev>",
//       to: "bhavesh.kintu@gmail.com",
//       // to: email,
//       subject: "Verify your email",
//       html: `
//         <h2>Email Verification</h2>
//         <p>Please click the link below to verify your email:</p>
//         <a href="${verifyUrl}">${verifyUrl}</a>
//         <p>This link is valid for 24 hours.</p>
//       `,
//     });

//     console.log("✅ Verification email sent to:", email);
//   } catch (error) {
//     console.error("❌ RESEND_EMAIL_FAILED:", error);
//     throw new Error("Email send failed");
//   }
// }
export async function sendWatchmanWelcomeEmail(email: string, name: string, password: string) {
  const loginUrl = `${process.env.APP_URL}/auth/login`;

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

    const info = await transporter.sendMail({
      from: `"ParkEase Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to ParkEase - Your Watchman Account Credentials",
      html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">Welcome to the Team, ${name}!</h2>
        <p>You have been added as a watchman on the ParkEase platform. You can now log in to manage your shift and parking activities.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
        </div>

        <p>Use the link below to access your dashboard:</p>
        <a href="${loginUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Watchman Dashboard</a>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
          For security reasons, we recommend changing your password after your first login.<br>
          If you have any questions, please contact your manager.
        </p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #999;">&copy; ${new Date().getFullYear()} ParkEase. All rights reserved.</p>
      </div>
    `,
    });

    console.log("✅ Watchman welcome email sent!");
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("❌ Failed to send watchman welcome email:", error);
    return { success: false, error: error.message };
  }
}

export async function sendWelcomeEmail(email: string, name: string, password: string, role: string) {
  const loginUrl = `${process.env.APP_URL}/auth/login`;

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

    const info = await transporter.sendMail({
      from: `"ParkEase Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to ParkEase - Your Account Credentials",
      html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">Welcome to ParkEase, ${name}!</h2>
        <p>Your account has been created successfully. You can now log in to the platform.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Role:</strong> ${role}</p>
          <p style="margin: 0;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
        </div>

        <p>Use the link below to access your account:</p>
        <a href="${loginUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login now</a>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
          For security reasons, we recommend changing your password after your first login.<br>
          If you have any questions, please contact support.
        </p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #999;">&copy; ${new Date().getFullYear()} ParkEase. All rights reserved.</p>
      </div>
    `,
    });

    console.log("✅ Welcome email sent!");
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("❌ Failed to send welcome email:", error);
    return { success: false, error: error.message };
  }
}

export async function sendMagicLink(email: string, magicLink: string) {
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
      from: `"ParkEase Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Sign in to ParkEase",
      html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">Sign in to ParkEase</h2>
        <p>Click the link below to sign in to your account. This link will expire in 15 minutes.</p>
        
        <div style="margin: 30px 0;">
          <a href="${magicLink}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Sign In</a>
        </div>

        <p>If you did not request this link, you can safely ignore this email.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #999;">&copy; ${new Date().getFullYear()} ParkEase. All rights reserved.</p>
      </div>
    `,
    });

    console.log("✅ Magic link email sent to:", email);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to send magic link email:", error);
    return { success: false, error: error.message };
  }
}
