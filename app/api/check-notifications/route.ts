import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        type: "NEW_BOOKING" as any
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true }
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
