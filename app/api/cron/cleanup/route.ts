import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredBookings } from "@/lib/actions/booking-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    const host = req.headers.get("host") || "";
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const realIp = req.headers.get("x-real-ip") || "";

    // Detect internal requests (VPS localhost / proxy)
    const isLocalRequest =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      forwardedFor.startsWith("127.0.0.1") ||
      realIp.startsWith("127.0.0.1");

    // Protect cron route
    if (
      expectedSecret &&
      !isLocalRequest &&
      authHeader !== `Bearer ${expectedSecret}`
    ) {
      return NextResponse.json(
        { error: "Unauthorized cron access" },
        { status: 401 },
      );
    }

    const result = await cleanupExpiredBookings();

    if (result.success) {
      return NextResponse.json(
        {
          message: "Successfully executed expired bookings cleanup",
          processed: result.processed,
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        error: "Cleanup failed during execution",
        details: result.error,
      },
      { status: 500 },
    );
  } catch (error: any) {
    console.error("[CRON_CLEANUP_API]", error);

    return NextResponse.json(
      {
        error: "Internal cron server error",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
