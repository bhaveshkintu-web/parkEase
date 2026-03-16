import { NextRequest, NextResponse } from "next/server";
import { runExpiryCheck } from "@/lib/utils/expiry-check";

/**
 * GET /api/cron/check-expiry
 */
export async function GET(req: NextRequest) {
  const logs: string[] = [];

  try {
    console.log("[Expiry Job API] Starting check-expiry cron job...");
    const logger = (msg: string) => {
        logs.push(msg);
        console.log(`[Expiry Job API] ${msg}`);
    };

    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    const host = req.headers.get("host") || "";
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const realIp = req.headers.get("x-real-ip") || "";

    // Detect local requests
    const isLocalRequest =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      forwardedFor.startsWith("127.0.0.1") ||
      realIp.startsWith("127.0.0.1");

    // Protect endpoint
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

    const stats = await runExpiryCheck();

    console.log("[Expiry Job API] ✅ Cron job completed successfully");
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      logs,
      ...stats,
    });
  } catch (error: any) {
    console.error("[Expiry Job API Error] Cron failure:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
