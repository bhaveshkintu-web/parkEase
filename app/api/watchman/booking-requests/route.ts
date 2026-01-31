import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/watchman/booking-requests - Get all booking requests
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
            const fs = require('fs');
            const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
            fs.appendFileSync('api-debug.log', `[${new Date().toISOString()}] Prisma keys: ${keys.join(', ')}\n`);
        } catch (e) { }

        // Get query params for filtering
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get("status");
        const requestType = searchParams.get("requestType");
        const priority = searchParams.get("priority");

        // 1. Get watchman profile to find ownerId
        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman profile not found" }, { status: 403 });
        }

        // 2. Build where clause
        const where: any = {
            parking: {
                ownerId: watchman.ownerId
            }
        };

        if (status && status !== "all") {
            where.status = status.toUpperCase();
        }

        if (requestType) {
            where.requestType = requestType.toUpperCase();
        }

        if (priority) {
            where.priority = priority.toUpperCase();
        }

        // Fetch booking requests from database
        let requests;
        try {
            requests = await (prisma as any).bookingRequest.findMany({
                where,
                include: {
                    parking: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            city: true,
                        },
                    },
                    requester: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: [
                    { priority: "desc" }, // Urgent first
                    { createdAt: "desc" }, // Most recent first
                ],
            });
        } catch (err: any) {
            console.log("Prisma findMany failed, trying raw query fallback...");
            // Simplified fallback for fetching
            requests = await prisma.$queryRawUnsafe(`
                SELECT br.*, 
                json_build_object('id', pl.id, 'name', pl.name, 'address', pl.address, 'city', pl.city) as parking,
                json_build_object('id', u.id, 'firstName', u."firstName", 'lastName', u."lastName", 'email', u.email) as requester
                FROM "BookingRequest" br
                JOIN "ParkingLocation" pl ON br."parkingId" = pl.id
                JOIN "User" u ON br."requestedBy" = u.id
                WHERE pl."ownerId" = $1
                ORDER BY br.priority DESC, br."createdAt" DESC
            `, watchman.ownerId);
        }

        // Transform to match frontend format
        const formattedRequests = (requests as any[]).map((req: any) => {
            // Debug log for the first request
            if (req === (requests as any[])[0]) {
                try {
                    const fs = require('fs');
                    fs.appendFileSync('api-debug.log', `[${new Date().toISOString()}] GET Req Sample: ${JSON.stringify(req).substring(0, 200)}\n`);
                } catch (e) { }
            }
            return {
                id: req.id || req.ID,
                customerId: req.customerId,
                customerName: req.customerName,
                customerEmail: req.customerEmail,
                customerPhone: req.customerPhone,
                vehiclePlate: req.vehiclePlate,
                vehicleType: req.vehicleType?.toLowerCase() || "sedan",
                vehicleMake: req.vehicleMake,
                vehicleModel: req.vehicleModel,
                vehicleColor: req.vehicleColor,
                parkingId: req.parkingId,
                parkingName: req.parkingName,
                spotNumber: req.spotNumber,
                requestType: req.requestType?.toLowerCase() || "walk_in",
                originalBookingId: req.originalBookingId,
                requestedStart: req.requestedStart instanceof Date ? req.requestedStart.toISOString() : new Date(req.requestedStart).toISOString(),
                requestedEnd: req.requestedEnd instanceof Date ? req.requestedEnd.toISOString() : new Date(req.requestedEnd).toISOString(),
                estimatedAmount: req.estimatedAmount,
                status: req.status?.toLowerCase() || "pending",
                priority: req.priority?.toLowerCase() || "normal",
                notes: req.notes,
                rejectionReason: req.rejectionReason,
                requestedBy: req.requestedBy,
                requestedAt: req.requestedAt instanceof Date ? req.requestedAt.toISOString() : new Date(req.requestedAt).toISOString(),
                processedBy: req.processedBy,
                processedAt: req.processedAt ? (req.processedAt instanceof Date ? req.processedAt.toISOString() : new Date(req.processedAt).toISOString()) : null,
            };
        });

        return NextResponse.json({
            success: true,
            requests: formattedRequests,
            count: formattedRequests.length,
        });
    } catch (error: any) {
        console.error("Error fetching booking requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch booking requests", details: error.message },
            { status: 500 }
        );
    }
}

// POST /api/watchman/booking-requests - Create a new booking request
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        try {
            const fs = require('fs');
            fs.appendFileSync('api-debug.log', `[${new Date().toISOString()}] POST /api/watchman/booking-requests BODY: ${JSON.stringify(body)} | USER: ${session.user.id}\n`);
        } catch (e) { }

        const {
            customerName,
            customerEmail,
            customerPhone,
            vehiclePlate,
            vehicleType,
            vehicleMake,
            vehicleModel,
            vehicleColor,
            parkingId,
            parkingName,
            requestType,
            duration, // in hours
            notes,
            priority = "normal",
        } = body;

        // Validation
        if (!customerName || !vehiclePlate || !parkingId) {
            return NextResponse.json(
                { error: "Missing required fields: customerName, vehiclePlate, parkingId" },
                { status: 400 }
            );
        }

        // Calculate start and end times
        const requestedStart = new Date();
        const requestedEnd = new Date(
            requestedStart.getTime() + (parseInt(duration) || 2) * 60 * 60 * 1000
        );

        // Fetch parking info if parkingName is missing
        let finalParkingName = parkingName;
        if (!finalParkingName) {
            const parking = await prisma.parkingLocation.findUnique({
                where: { id: parkingId }
            });
            finalParkingName = parking?.name || "Unknown";
        }

        // Calculate estimated amount (simple calculation, adjust as needed)
        const estimatedAmount = parseFloat(duration || "2") * 5; // $5 per hour

        // Create booking request
        let bookingRequest;
        try {
            // Standard method
            bookingRequest = await (prisma as any).bookingRequest.create({
                data: {
                    customerName,
                    customerEmail,
                    customerPhone,
                    vehiclePlate: vehiclePlate.toUpperCase(),
                    vehicleType: vehicleType || "sedan",
                    vehicleMake,
                    vehicleModel,
                    vehicleColor,
                    parkingId,
                    parkingName: finalParkingName,
                    requestType: requestType?.toUpperCase() || "WALK_IN",
                    requestedStart,
                    requestedEnd,
                    estimatedAmount,
                    priority: priority.toUpperCase(),
                    notes,
                    requestedBy: session.user.id,
                    status: "PENDING",
                },
            });
        } catch (err: any) {
            console.log("Prisma create failed, trying raw query fallback...");
            // Raw SQL Fallback for when Prisma client is out of sync
            const id = `fallback_${Math.random().toString(36).substring(2, 11)}`;
            await prisma.$executeRawUnsafe(`
                INSERT INTO "BookingRequest" (
                    "id", "customerName", "customerEmail", "customerPhone", 
                    "vehiclePlate", "vehicleType", "vehicleMake", "vehicleModel", "vehicleColor", 
                    "parkingId", "parkingName", "requestType", "requestedStart", "requestedEnd", 
                    "estimatedAmount", "priority", "notes", "requestedBy", "status", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::"BookingRequestType", $13, $14, $15, $16::"BookingRequestPriority", $17, $18, $19::"BookingRequestStatus", NOW()
                )
            `,
                id, customerName, customerEmail, customerPhone,
                vehiclePlate.toUpperCase(), vehicleType || "sedan", vehicleMake || null, vehicleModel || null, vehicleColor || null,
                parkingId, finalParkingName, requestType?.toUpperCase() || "WALK_IN", requestedStart, requestedEnd,
                estimatedAmount, priority.toUpperCase(), notes || null, session.user.id, "PENDING"
            );

            bookingRequest = {
                id,
                customerName,
                vehiclePlate: vehiclePlate.toUpperCase(),
                status: "PENDING",
                requestedStart,
                requestedEnd,
                estimatedAmount
            };
        }

        return NextResponse.json({
            success: true,
            message: "Booking request created successfully",
            request: {
                id: bookingRequest.id,
                customerName: bookingRequest.customerName,
                vehiclePlate: bookingRequest.vehiclePlate,
                status: bookingRequest.status.toLowerCase(),
                requestedStart: bookingRequest.requestedStart.toISOString(),
                requestedEnd: bookingRequest.requestedEnd.toISOString(),
                estimatedAmount: bookingRequest.estimatedAmount,
            },
        });
    } catch (error: any) {
        console.error("Error creating booking request:", error);
        try {
            const fs = require('fs');
            fs.appendFileSync('api-error.log', `[${new Date().toISOString()}] POST /api/watchman/booking-requests ERROR: ${error.message}\n${error.stack}\n`);
        } catch (e) { }
        return NextResponse.json(
            { error: "Failed to create booking request", details: error.message },
            { status: 500 }
        );
    }
}
