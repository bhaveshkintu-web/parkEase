import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id"); // ya session / token se
  if (!userId)
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatar: true,
      emailVerified: true,
    },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
 
  console.log(`[User Profile API] ✅ Fetched profile for user: ${userId}`);
  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  const { userId, firstName, lastName, phone, avatar } = await req.json();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      phone,
      avatar,
    },
  });
 
  console.log(`[User Profile API] ✅ Profile updated for user: ${userId}`);
  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
    },
  });
}
