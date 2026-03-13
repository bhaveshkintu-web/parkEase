
import { NextRequest, NextResponse } from "next/server";
import { runExpiryCheck } from "@/lib/utils/expiry-check";

/**
 * GET /api/cron/check-expiry
 * Processed via the BookingCleanupPoller component in the frontend.
 */
export async function GET(req: NextRequest) {
    const logs: string[] = [];
    const logger = (msg: string) => logs.push(msg);

    try {
        const authHeader = req.headers.get("Authorization");
        const expectedSecret = process.env.CRON_SECRET;
        const host = req.headers.get("host") || "";

        // Internal (localhost) calls are allowed
        const isLocalRequest = host.startsWith("localhost") || host.startsWith("127.0.0.1");

        // Enforce secret for external requests if a secret is configured
        if (expectedSecret && !isLocalRequest && authHeader !== `Bearer ${expectedSecret}`) {
            return NextResponse.json({ error: "Unauthorized cron access" }, { status: 401 });
        }

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


