import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

  try {
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465; // SSL requires secure=true

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
    console.log("✅ Verification email sent to:", email);
    console.log("Message ID:", info.messageId);
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

export async function sendResetPasswordEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

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

    console.log("✅ Reset password email sent to:", email);
    console.log("Message ID:", info.messageId);
  } catch (error: any) {
    console.error("❌ Failed to send reset password email:", error);
    throw new Error(
      "Unable to send reset password email. Check SMTP settings and logs.",
    );
  }
}
