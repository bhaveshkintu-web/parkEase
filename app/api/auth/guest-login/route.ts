import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMagicToken } from "@/lib/token-utils";
import { sendMagicLink } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email, returnUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find or create guest user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await (prisma.user as any).create({
        data: {
          email,
          firstName: "Guest",
          lastName: "User",
          role: "CUSTOMER",
          isGuest: true,
          emailVerified: true // Verifying via magic link anyway
        },
      });
    }

    const { token } = await createMagicToken(email);
    
    // Construct magic link
    const magicLink = `${process.env.NEXTAUTH_URL}/auth/magic-link?token=${token}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""}`;
    
    await sendMagicLink(email, magicLink);

    return NextResponse.json({ success: true, message: "Magic link sent" });
  } catch (error: any) {
    console.error("Guest login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
