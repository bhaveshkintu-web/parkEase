import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/token";
import { sendResetPasswordEmail } from "@/lib/mailer";

import { forgotPasswordSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // For security reasons, don't reveal if user exists or not
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    }

    const { rawToken, hashedToken, expiry } = generateToken();

    // Use any cast to bypass persistent stale Prisma types for resetToken fields
    await (prisma.user as any).update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiry,
      },
    });

    try {
      await sendResetPasswordEmail(email, rawToken);
    } catch (emailError) {
      console.error("FORGOT_PASSWORD_EMAIL_FAILED:", emailError);
      // We still return success to the user to avoid enumeration
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
