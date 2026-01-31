import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma"; // adjust path if needed
import { sendVerificationEmail } from "@/lib/mailer";
import { generateToken } from "@/lib/token";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { firstName, lastName, email, phone, password } = body;

    // -----------------------------
    // VALIDATION
    // -----------------------------
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "All required fields are mandatory" },
        { status: 400 },
      );
    }

    // -----------------------------
    // CHECK EXISTING USER
    // -----------------------------
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    // -----------------------------
    // HASH PASSWORD
    // -----------------------------
    const hashedPassword = await bcrypt.hash(password, 10);
    const { rawToken, hashedToken, expiry } = generateToken();

    // -----------------------------
    // CREATE USER
    // -----------------------------
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        role: "CUSTOMER",
        password: hashedPassword,
        emailVerified: false,
        verifyToken: hashedToken,
        tokenExpiry: expiry,
      },
    });

    try {
      await sendVerificationEmail(email, rawToken);
    } catch (emailError) {
      console.error("EMAIL_SEND_FAILED:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        role: user.role,
        verifyToken: hashedToken,
        tokenExpiry: expiry,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("REGISTER_API_ERROR:", error);

    return NextResponse.json({ error: `Registration failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
