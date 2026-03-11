
import { NextResponse } from "next/server";
import { runExpiryCheck } from "@/lib/utils/expiry-check";

/**
 * GET /api/cron/check-expiry
 * This endpoint is intended to be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * to check for bookings expiring in 30 minutes and send notifications.
 */
export async function GET(request: Request) {
    const logs: string[] = [];
    const logger = (msg: string) => logs.push(msg);

    try {
        const stats = await runExpiryCheck(logger);
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            logs,
            ...stats
        });
    } catch (error: any) {
        console.error("Cron Error (check-expiry):", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}


