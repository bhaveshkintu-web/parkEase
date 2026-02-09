import { NextResponse } from "next/server";
import { verifyMagicToken } from "@/lib/token-utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const returnUrl = searchParams.get("returnUrl");

  if (!token) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/login?error=InvalidToken`);
  }

  const user = await verifyMagicToken(token);

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/login?error=TokenExpired`);
  }

  // Redirect to a specialized callback page that performs the actual signIn
  // This avoids logic issues with server-side signIn in App Router for NextAuth
  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/magic-link/callback?token=${token}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""}`);
}
