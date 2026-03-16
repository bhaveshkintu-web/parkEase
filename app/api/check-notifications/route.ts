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

    console.log(`[Check Notifications API] ✅ Fetched ${notifications.length} recent NEW_BOOKING notifications`);
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error("[Check Notifications API Error] GET failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
