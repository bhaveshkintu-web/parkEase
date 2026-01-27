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
