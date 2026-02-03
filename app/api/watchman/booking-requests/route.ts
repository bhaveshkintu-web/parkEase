import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

// Helper to log errors
function logError(context: string, error: any) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${context} ERROR: ${error.message}\n${error.stack}\n`;
    console.error(message);
    try {
        // Use absolute path for logging to avoid confusion
        const logPath = path.join(process.cwd(), "api-watchman-debug.log");
        fs.appendFileSync(logPath, message);
    } catch (e) {
        // Ignore log errors
    }
}

// Helper to log info
function logInfo(message: string) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${message}\n`;
    try {
        const logPath = path.join(process.cwd(), "api-watchman-debug.log");
        fs.appendFileSync(logPath, logMsg);
    } catch (e) {
        // Ignore log errors
    }
}

// POST /api/watchman/booking-requests - Create a new booking request
export async function POST(request: NextRequest) {
    let session;
    let body;
    try {
        session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        body = await request.json();
        logInfo(`POST /api/watchman/booking-requests BODY: ${JSON.stringify(body)}`);

        const {
            customerName,
            customerPhone,
            customerEmail,
            vehiclePlate,
            vehicleType,
            vehicleMake,
            vehicleModel,
            vehicleColor,
            parkingId,
            parkingName,
            requestType,
            requestedStart,
            requestedEnd,
            estimatedAmount,
            priority,
            notes
        } = body;

        if (!customerName || !vehiclePlate || !parkingId || !requestedStart || !requestedEnd) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const sessionUser = session.user as any;

        // Try using Prisma Client first (if generated)
        try {
            const newRequest = await (prisma as any).bookingRequest.create({
                data: {
                    customerName,
                    customerPhone,
                    customerEmail,
                    vehiclePlate: vehiclePlate.toUpperCase(),
                    vehicleType,
                    vehicleMake,
                    vehicleModel,
                    vehicleColor,
                    parkingId,
                    parkingName,
                    requestType: (requestType || "WALK_IN").toUpperCase(),
                    requestedStart: new Date(requestedStart),
                    requestedEnd: new Date(requestedEnd),
                    estimatedAmount: parseFloat(estimatedAmount),
                    priority: (priority || "NORMAL").toUpperCase(),
                    notes,
                    requestedBy: sessionUser.id,
                    status: "PENDING"
                }
            });

            return NextResponse.json({
                success: true,
                request: {
                    ...newRequest,
                    status: newRequest.status.toLowerCase()
                }
            }, { status: 201 });
        } catch (prismaError: any) {
            logError("Prisma Create", prismaError);
            // Fall through to raw query fallback
        }

        // Fallback for raw query with explicit casts for enums
        logInfo("Attempting RAW Query Fallback with EXPLICIT CASTS...");
        const id = `req_${Math.random().toString(36).substring(2, 11)}`;

        // We use explicit casts to ensure Postgres accepts the strings as enums
        await prisma.$executeRawUnsafe(`
            INSERT INTO "BookingRequest" (
                "id", "customerName", "customerPhone", "customerEmail", "vehiclePlate", "vehicleType", 
                "parkingId", "parkingName", "requestType", "requestedStart", "requestedEnd", 
                "estimatedAmount", "notes", "requestedBy", "status", "requestedAt", "priority"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 
                $9::"BookingRequestType", 
                $10, $11, 
                $12, $13, $14, 
                $15::"BookingRequestStatus", 
                NOW(), 
                $16::"BookingRequestPriority"
            )
        `,
            id, customerName, customerPhone, customerEmail || null, vehiclePlate.toUpperCase(), vehicleType,
            parkingId, parkingName, (requestType || "WALK_IN").toUpperCase(),
            new Date(requestedStart), new Date(requestedEnd),
            parseFloat(estimatedAmount), notes, sessionUser.id, "PENDING", (priority || "NORMAL").toUpperCase()
        );

        return NextResponse.json({
            success: true,
            request: { id, status: "pending" }
        }, { status: 201 });

    } catch (error: any) {
        logError("POST /api/watchman/booking-requests OUTER", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}

// GET /api/watchman/booking-requests - Get booking requests for the watchman's locations
export async function GET(request: NextRequest) {
    let session;
    try {
        session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionUser = session.user as any;

        try {
            const requests = await (prisma as any).bookingRequest.findMany({
                where: {
                    OR: [
                        { requestedBy: sessionUser.id },
                    ]
                },
                orderBy: {
                    requestedAt: "desc"
                }
            });

            return NextResponse.json({
                success: true,
                requests: requests.map((req: any) => ({
                    ...req,
                    status: (req.status || 'pending').toLowerCase()
                }))
            });
        } catch (prismaError: any) {
            logError("Prisma FindMany", prismaError);
            // Try raw query
        }

        logInfo("Attempting RAW Query GET Fallback...");
        const requests = await prisma.$queryRawUnsafe(`
            SELECT * FROM "BookingRequest" 
            WHERE "requestedBy" = $1
            ORDER BY "requestedAt" DESC
        `, sessionUser.id) as any[];

        return NextResponse.json({
            success: true,
            requests: requests.map((req: any) => ({
                ...req,
                status: (req.status || 'pending').toLowerCase()
            }))
        });
    } catch (error: any) {
        logError("GET /api/watchman/booking-requests", error);
        return NextResponse.json(
            { error: "Failed to fetch booking requests", details: error.message },
            { status: 500 }
        );
    }
}
