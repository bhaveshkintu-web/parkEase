import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/auth/verify-email?token=${token}`;

  try {
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465; // SSL requires secure=true

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure,
      auth: {
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
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

export async function sendResetPasswordEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  try {
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure,
      auth: {
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
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

// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function sendWatchmanWelcomeEmail(
  email: string,
  name: string,
  password: string,
) {
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

export async function sendBookingConfirmation(email: string, booking: any) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"ParkEase" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Booking Confirmation - ${booking.confirmationCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f172a;">Booking Confirmed!</h2>
          <p>Thank you for booking with ParkEase. Here are your reservation details:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Location:</strong> ${booking.location.name}</p>
            <p style="margin: 5px 0;"><strong>Confirmation Code:</strong> <span style="font-family: monospace; font-size: 1.2em;">${booking.confirmationCode}</span></p>
            <p style="margin: 5px 0;"><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${booking.vehicleMake} ${booking.vehicleModel} (${booking.vehiclePlate})</p>
          </div>

          <p>Please show your confirmation code or QR code at the entrance.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL}/account/reservations/${booking.id}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Reservation</a>
          </div>
        </div>
      `,
    });

    console.log("✅ Confirmation email sent!", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send confirmation email:", error);
    return { success: false, error };
  }
}

export async function sendBookingReceipt(email: string, booking: any) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"ParkEase" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Receipt for Booking ${booking.confirmationCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
            .header { background-color: #0f172a; color: white; padding: 20px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; letter-spacing: 1px; }
            .content { padding: 30px 20px; }
            .receipt-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .row.total { border-top: 2px solid #cbd5e1; padding-top: 10px; margin-top: 10px; font-weight: bold; font-size: 1.2em; }
            .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 0.8em; color: #64748b; }
            .button { display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ParkEase</div>
              <div style="font-size: 0.9em; opacity: 0.8;">Payment Receipt</div>
            </div>
            
            <div class="content">
              <h2 style="margin-top: 0; color: #0f172a;">Thank you for your payment</h2>
              <p>Your reservation at <strong>${booking.location.name}</strong> has been successfully paid.</p>
              
              <div class="receipt-box">
                <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                  <div style="font-size: 0.9em; color: #64748b; margin-bottom: 5px;">Confirmation Code</div>
                  <div style="font-family: monospace; font-size: 1.2em; font-weight: bold;">${booking.confirmationCode}</div>
                </div>

                <div class="row">
                  <span>Parking Fee</span>
                  <span>$${(booking.totalPrice - booking.taxes - booking.fees).toFixed(2)}</span>
                </div>
                <div class="row">
                  <span>Taxes</span>
                  <span>$${booking.taxes.toFixed(2)}</span>
                </div>
                <div class="row">
                  <span>Service Fee</span>
                  <span>$${booking.fees.toFixed(2)}</span>
                </div>
                
                <div class="row total">
                  <span>Total Paid</span>
                  <span>$${booking.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.APP_URL}/account/reservations/${booking.id}" class="button" style="color: white;">View Reservation</a>
              </div>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ParkEase. All rights reserved.</p>
              <p>If you have any questions, please contact <a href="mailto:support@parkease.com" style="color: #0f172a;">support@parkease.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ Receipt email sent!", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send receipt email:", error);
    return { success: false, error };
  }
}
