import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";

import { resetPasswordSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, ...passwordData } = body;
    const result = resetPasswordSchema.safeParse(passwordData);

    if (!token || !result.success) {
      return NextResponse.json(
        { error: token ? result.error?.errors[0].message : "Token is required" },
        { status: 400 }
      );
    }

    const { password } = result.data;

    const hashedToken = hashToken(token);

    // Use any cast to bypass persistent stale Prisma types for resetToken fields
    const user = await (prisma.user as any).findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await (prisma.user as any).update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
