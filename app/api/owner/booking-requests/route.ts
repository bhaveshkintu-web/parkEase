import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

// Helper to log info
function logInfo(message: string) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] OWNER-API: ${message}\n`;
    try {
        const logPath = path.join(process.cwd(), "api-watchman-debug.log");
        fs.appendFileSync(logPath, logMsg);
    } catch (e) {
        // Ignore log errors
    }
}

export async function GET(request: NextRequest) {
    try {
        logInfo("--- START GET /api/owner/booking-requests ---");
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            logInfo("UNAUTHORIZED: No session found");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionUser = session.user as any;
        const role = (sessionUser.role || "").toUpperCase();
        logInfo(`IDENTIFIED: ${sessionUser.email} [${role}]`);

        // Check if user is actually allowed
        if (role !== "OWNER" && role !== "ADMIN") {
            logInfo(`FORBIDDEN: User ${sessionUser.email} has role ${role}`);
            return NextResponse.json({ error: "Forbidden", role }, { status: 403 });
        }

        // Try to get location IDs for this owner using raw SQL to be ultra-safe
        let locationIds: string[] = [];
        try {
            logInfo(`Fetching owner profile for userId: ${sessionUser.id}`);

            // Try fetching profile first - avoid fetching all fields to bypass potential schema mismatch issues
            const profileRows = await prisma.$queryRawUnsafe(
                'SELECT id FROM "OwnerProfile" WHERE "userId" = $1 LIMIT 1',
                sessionUser.id
            ) as any[];

            if (profileRows.length > 0) {
                const ownerProfileId = profileRows[0].id;
                logInfo(`Found owner profile ID: ${ownerProfileId}`);

                // Fetch locations for this profile
                const locRows = await prisma.$queryRawUnsafe(
                    'SELECT id FROM "ParkingLocation" WHERE "ownerId" = $1',
                    ownerProfileId
                ) as any[];

                locationIds = locRows.map((loc: any) => loc.id);
                logInfo(`Found ${locationIds.length} locations via raw SQL`);
            } else {
                logInfo(`No owner profile found for userId: ${sessionUser.id}`);
            }
        } catch (e) {
            logInfo(`Error fetching ownership mapping: ${e instanceof Error ? e.message : String(e)}`);
        }

        logInfo(`Target Locations: ${JSON.stringify(locationIds)}`);

        let requests: any[] = [];

        try {
            logInfo("Attempting RAW SQL query for booking requests...");

            // Construct query safely
            let query = `SELECT * FROM "BookingRequest" `;
            let params: any[] = [];

            if (locationIds.length > 0) {
                const placeholders = locationIds.map((_, i) => `$${i + 1}`).join(', ');
                query += `WHERE "parkingId" IN (${placeholders}, '1') `;
                params = [...locationIds];
            } else if (role === "ADMIN") {
                // Admins see all
                query += ` `;
            } else {
                // Owners without profiles see only demo location 1
                query += `WHERE "parkingId" = '1' `;
            }

            query += `ORDER BY "requestedAt" DESC LIMIT 100`;

            requests = await prisma.$queryRawUnsafe(query, ...params) as any[];
            logInfo(`Successfully fetched ${requests.length} requests`);
        } catch (rawError) {
            logInfo(`RAW SQL failed: ${rawError instanceof Error ? rawError.message : String(rawError)}`);
            // Absolute fallback
            try {
                requests = await prisma.$queryRawUnsafe('SELECT * FROM "BookingRequest" ORDER BY "requestedAt" DESC LIMIT 20') as any[];
                logInfo(`Fallback query returned ${requests.length} rows`);
            } catch (finalError) {
                logInfo("Final fallback failed.");
            }
        }

        return NextResponse.json({
            success: true,
            requests: (requests || []).map((req: any) => ({
                ...req,
                customerId: req.customerId || null,
                customerName: req.customerName || "Unknown",
                vehiclePlate: req.vehiclePlate || "N/A",
                status: (req.status || 'pending').toUpperCase(),
                requestedAt: req.requestedAt || new Date().toISOString(),
                requestedStart: req.requestedStart || req.requestedAt || new Date().toISOString(),
                requestedEnd: req.requestedEnd || new Date().toISOString()
            }))
        });
    } catch (error: any) {
        logInfo(`CRITICAL OUTER ERROR: ${error.message}`);
        console.error("Error fetching owner booking requests:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
