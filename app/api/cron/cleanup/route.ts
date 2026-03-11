import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredBookings } from "@/lib/actions/booking-actions";

// This allows the route to be deployed on Edge/Serverless environments securely
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = process.env.CRON_SECRET;
    const host = req.headers.get("host") || "";

    // Internal (localhost) calls are always allowed — this powers the client-side poller
    const isLocalRequest = host.startsWith("localhost") || host.startsWith("127.0.0.1");

    // For external production requests, enforce the secret token
    if (expectedSecret && !isLocalRequest && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron access" }, { status: 401 });
    }

    const result = await cleanupExpiredBookings();

    if (result.success) {
      return NextResponse.json({
        message: "Successfully executed expired bookings cleanup",
        processed: result.processed
      }, { status: 200 });
    } else {
      return NextResponse.json({
        error: "Cleanup failed during execution",
        details: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error("[CRON_CLEANUP_API]", error);
    return NextResponse.json({ error: "Internal cron server error" }, { status: 500 });
  }
}
