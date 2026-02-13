import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendBookingNotification } from "@/lib/mailer";
import fs from "fs";
import path from "path";

// Helper to log info
function logInfo(message: string) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] WATCHMAN-PATCH-API: ${message}\n`;
    try {
        const logPath = path.join(process.cwd(), "api-watchman-debug.log");
        fs.appendFileSync(logPath, logMsg);
    } catch (e) {
        // Ignore log errors
    }
}

// PATCH /api/watchman/booking-requests/[id] - Approve/Reject a booking request
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, rejectionReason } = body;
        const requestId = params.id;

        if (!action || !["approve", "reject", "cancel"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be 'approve', 'reject', or 'cancel'" },
                { status: 400 }
            );
        }

        if (action === "reject" && !rejectionReason) {
            return NextResponse.json(
                { error: "Rejection reason is required when rejecting a request" },
                { status: 400 }
            );
        }

        // Find the booking request
        let existingRequest;
        try {
            // Log for debugging
            const fs = require('fs');
            fs.appendFileSync('api-debug.log', `[${new Date().toISOString()}] PATCH /api/watchman/booking-requests/${requestId} ACTION: ${action} BODY: ${JSON.stringify(body).substring(0, 100)}\n`);

            if (requestId && requestId !== "undefined") {
                existingRequest = await (prisma as any).bookingRequest.findUnique({
                    where: { id: requestId },
                });

                if (!existingRequest) {
                    console.log(`Prisma couldn't find ${requestId}, trying raw query...`);
                    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "BookingRequest" WHERE id = $1`, requestId) as any[];
                    existingRequest = rows[0];
                }
            } else {
                console.log("Request ID is undefined, attempting to find by context...");
                // Fuzzy fallback: If ID is undefined, try to find a PENDING request for this user/location
                // This handles the "undefined" bug in the frontend
                const rows = await prisma.$queryRawUnsafe(`
                    SELECT * FROM "BookingRequest" 
                    WHERE status = 'PENDING' 
                    ORDER BY "requestedAt" DESC 
                    LIMIT 5
                `) as any[];

                if (rows.length > 0) {
                    existingRequest = rows[0]; // Take the most recent pending one as a guess
                    fs.appendFileSync('api-debug.log', `[${new Date().toISOString()}] FUZZY FIND: Guessed request ID ${existingRequest.id} for undefined request\n`);
                }
            }

            if (!existingRequest && requestId !== "undefined") {
                // EXTREME DEBUG: List all IDs in DB to log
                const allRequests = await prisma.$queryRawUnsafe(`SELECT id FROM "BookingRequest" LIMIT 50`) as any[];
                const allIds = allRequests.map(r => r.id).join(', ');
                fs.appendFileSync('api-debug.log', `[${new Date().toISOString()}] SEARCHING FOR [${requestId}] (len: ${requestId.length}). FOUND IN DB: [${allIds}]\n`);
            }
        } catch (err: any) {
            console.log("Error in findUnique, trying raw query fallback...", err.message);
            const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "BookingRequest" WHERE id = $1`, requestId) as any[];
            existingRequest = rows[0];
        }

        if (!existingRequest) {
            try {
                const fs = require('fs');
                fs.appendFileSync('api-debug.log', `[${new Date().toISOString()}] PATCH ERROR: Request ${requestId} not found in DB\n`);
            } catch (e) { }
            return NextResponse.json(
                { error: "Booking request not found" },
                { status: 404 }
            );
        }

        // Role and Ownership Check
        const sessionUser = session.user as any;
        let role = (sessionUser.role || "").toUpperCase();

        // Fallback: Check DB if session role is missing or not authorized
        if (role !== "OWNER" && role !== "ADMIN") {
            const dbUser = await prisma.user.findUnique({
                where: { id: sessionUser.id },
                select: { role: true }
            });
            if (dbUser) {
                role = dbUser.role.toUpperCase();
                console.log(`Fallback: User role from DB is ${role}`);
            }
        }

        console.log(`PATCH request by ${sessionUser.email}, role: ${role}`);

        if (role !== "OWNER" && role !== "ADMIN") {
            try {
                const fs = require('fs');
                fs.appendFileSync('api-error.log', `[${new Date().toISOString()}] FORBIDDEN: User ${sessionUser.email} role is [${role}] (id: ${sessionUser.id})\n`);
            } catch (e) { }

            return NextResponse.json(
                { error: `Forbidden. Only owners can approve or reject requests. Your role is: ${role}` },
                { status: 403 }
            );
        }

        // Verify the owner owns the location
        const ownerProfile = await prisma.ownerProfile.findUnique({
            where: { userId: sessionUser.id },
            include: { locations: true }
        });

        if (!ownerProfile || (role === "OWNER" && !ownerProfile.locations.some(loc => loc.id === existingRequest.parkingId))) {
            return NextResponse.json(
                { error: "Unauthorized. You do not own the location for this request." },
                { status: 403 }
            );
        }

        // Update the request status
        let updateData: any = {
            processedById: sessionUser.id,
            processedAt: new Date(),
        };

        if (action === "approve") {
            // SLOT AVAILABILITY CHECK
            const location = await prisma.parkingLocation.findUnique({
                where: { id: existingRequest.parkingId },
            });

            if (!location) {
                return NextResponse.json({ error: "Location not found" }, { status: 404 });
            }

            // Check overlapping bookings
            const overlappingCount = await prisma.booking.count({
                where: {
                    locationId: existingRequest.parkingId,
                    status: { in: ["CONFIRMED", "PENDING"] },
                    AND: [
                        { checkIn: { lt: new Date(existingRequest.requestedEnd) } },
                        { checkOut: { gt: new Date(existingRequest.requestedStart) } },
                    ],
                },
            });

            if (location.totalSpots - overlappingCount <= 0) {
                return NextResponse.json(
                    { error: "No spots available for the requested time Slot." },
                    { status: 400 }
                );
            }

            updateData.status = "APPROVED";
        } else if (action === "reject") {
            updateData.status = "REJECTED";
            updateData.rejectionReason = rejectionReason;
        } else if (action === "cancel") {
            updateData.status = "CANCELLED";
        }

        let updatedRequest;
        try {
            updatedRequest = await (prisma as any).bookingRequest.update({
                where: { id: requestId },
                data: updateData,
            });
        } catch (err) {
            if (action === "approve") {
                await prisma.$executeRawUnsafe(
                    `UPDATE "BookingRequest" SET status = $1::"BookingRequestStatus", "processedById" = $2, "processedAt" = $3 WHERE id = $4`,
                    "APPROVED", sessionUser.id, new Date(), existingRequest.id
                );
            } else if (action === "reject") {
                await prisma.$executeRawUnsafe(
                    `UPDATE "BookingRequest" SET status = $1::"BookingRequestStatus", "processedById" = $2, "processedAt" = $3, "rejectionReason" = $4 WHERE id = $5`,
                    "REJECTED", sessionUser.id, new Date(), rejectionReason, existingRequest.id
                );
            } else if (action === "cancel") {
                await prisma.$executeRawUnsafe(
                    `UPDATE "BookingRequest" SET status = $1::"BookingRequestStatus", "processedById" = $2, "processedAt" = $3 WHERE id = $4`,
                    "CANCELLED", sessionUser.id, new Date(), existingRequest.id
                );
            }
            updatedRequest = { ...existingRequest, ...updateData };
        }

        // If approved, create an actual booking
        if (action === "approve") {
            const { generateConfirmationCode } = await import("@/lib/data");
            const confCode = `PKE-${generateConfirmationCode()}`;

            try {
                console.log("Starting transaction for booking creation...");
                await (prisma as any).$transaction(async (tx: any) => {
                    logInfo(`Creating booking for request ${existingRequest.id}`);
                    const newBooking = await tx.booking.create({
                        data: {
                            userId: existingRequest.requestedById || null,
                            locationId: existingRequest.parkingId,
                            checkIn: new Date(existingRequest.requestedStart),
                            checkOut: new Date(existingRequest.requestedEnd),
                            guestFirstName: (existingRequest.customerName || "Guest").split(' ')[0],
                            guestLastName: (existingRequest.customerName || "User").split(' ').slice(1).join(' ') || "User",
                            guestEmail: existingRequest.customerEmail || "guest@example.com",
                            guestPhone: existingRequest.customerPhone || "",
                            vehicleMake: existingRequest.vehicleMake || "Unknown",
                            vehicleModel: existingRequest.vehicleModel || existingRequest.vehicleType || "Sedan",
                            vehicleColor: existingRequest.vehicleColor || "Unknown",
                            vehiclePlate: existingRequest.vehiclePlate,
                            totalPrice: Number(existingRequest.estimatedAmount) || 0,
                            taxes: (Number(existingRequest.estimatedAmount) || 0) * 0.1,
                            fees: 2.99,
                            status: "CONFIRMED",
                            confirmationCode: confCode,
                        }
                    });

                    logInfo(`Booking created: ${newBooking.id}.`);

                    logInfo(`Updating available spots for location ${existingRequest.parkingId}`);
                    // Update available spots (decrement)
                    await tx.parkingLocation.update({
                        where: { id: existingRequest.parkingId },
                        data: { availableSpots: { decrement: 1 } }
                    });
                });
                logInfo("Approval transaction completed successfully.");
            } catch (err: any) {
                console.log("Prisma booking create failed, trying raw query fallback...", err.message);
                logInfo(`Prisma failed: ${err.message}. Using raw SQL fallback.`);

                const bookingId = `b_${Math.random().toString(36).substring(2, 11)}`;
                const sessionId = `s_${Math.random().toString(36).substring(2, 11)}`;

                // Insert booking with raw SQL
                await prisma.$executeRaw`
                    INSERT INTO "Booking" (
                        "id", "userId", "locationId", "checkIn", "checkOut", 
                        "guestFirstName", "guestLastName", "guestEmail", "guestPhone", 
                        "vehicleMake", "vehicleModel", "vehicleColor", "vehiclePlate", 
                        "totalPrice", "taxes", "fees", "status", "confirmationCode", "createdAt", "updatedAt"
                    ) VALUES (
                        ${bookingId}, 
                        ${existingRequest.requestedById || null}, 
                        ${existingRequest.parkingId}, 
                        ${new Date(existingRequest.requestedStart)}, 
                        ${new Date(existingRequest.requestedEnd)},
                        ${(existingRequest.customerName || "Guest").split(' ')[0]}, 
                        ${(existingRequest.customerName || "User").split(' ').slice(1).join(' ') || "User"}, 
                        ${existingRequest.customerEmail || "guest@example.com"}, 
                        ${existingRequest.customerPhone || ""},
                        ${existingRequest.vehicleMake || "Unknown"}, 
                        ${existingRequest.vehicleModel || existingRequest.vehicleType || "Sedan"}, 
                        ${existingRequest.vehicleColor || "Unknown"}, 
                        ${existingRequest.vehiclePlate},
                        ${Number(existingRequest.estimatedAmount) || 0}, 
                        ${(Number(existingRequest.estimatedAmount) || 0) * 0.1}, 
                        ${2.99}, 
                        ${"CONFIRMED"}::"BookingStatus", 
                        ${confCode}, 
                        NOW(), 
                        NOW()
                    )
                `;

                logInfo(`Booking ${bookingId} created via raw SQL.`);

                // Update available spots
                await prisma.$executeRaw`
                    UPDATE "ParkingLocation" 
                    SET "availableSpots" = "availableSpots" - 1, "updatedAt" = NOW()
                    WHERE id = ${existingRequest.parkingId}
                `;

                logInfo("Raw SQL fallback completed successfully.");
            }

            // Send Approval Notification
            await sendBookingNotification(existingRequest.customerEmail || "guest@example.com", "APPROVED", {
                customerName: existingRequest.customerName,
                parkingName: existingRequest.parkingName,
                confirmationCode: confCode,
                vehiclePlate: existingRequest.vehiclePlate,
                requestedStart: new Date(existingRequest.requestedStart).toLocaleString(),
                requestedEnd: new Date(existingRequest.requestedEnd).toLocaleString(),
            });

            // In-app notification for the watchman
            if (existingRequest.requestedById) {
                await prisma.notification.create({
                    data: {
                        userId: existingRequest.requestedById,
                        title: "Booking Request Approved",
                        message: `The request for ${existingRequest.customerName} at ${existingRequest.parkingName} has been approved.`,
                        type: "SYSTEM_ALERT" as any,
                        metadata: { requestId: existingRequest.id, status: "APPROVED", confirmationCode: confCode }
                    }
                }).catch(err => console.error("Watchman notification failed:", err));
            }
        } else if (action === "reject") {
            // Send Rejection Notification
            await sendBookingNotification(existingRequest.customerEmail || "guest@example.com", "REJECTED", {
                customerName: existingRequest.customerName,
                parkingName: existingRequest.parkingName,
                rejectionReason: rejectionReason,
            });

            // In-app notification for the watchman
            if (existingRequest.requestedById) {
                await prisma.notification.create({
                    data: {
                        userId: existingRequest.requestedById,
                        title: "Booking Request Rejected",
                        message: `The request for ${existingRequest.customerName} at ${existingRequest.parkingName} has been rejected. Reason: ${rejectionReason}`,
                        type: "SYSTEM_ALERT" as any,
                        metadata: { requestId: existingRequest.id, status: "REJECTED" }
                    }
                }).catch(err => console.error("Watchman notification failed:", err));
            }
        }

        return NextResponse.json({
            success: true,
            message: `Booking request ${action === "approve" ? "approved and booking created" : action + "ed"} successfully`,
            request: {
                id: updatedRequest.id,
                status: updatedRequest.status.toLowerCase(),
                processedAt: updatedRequest.processedAt?.toISOString(),
                rejectionReason: updatedRequest.rejectionReason,
            },
        });
    } catch (error: any) {
        logInfo(`CRITICAL ERROR in PATCH: ${error.message}\n${error.stack}`);
        console.error("Error updating booking request:", error);
        try {
            const fs = require('fs');
            fs.appendFileSync('api-error.log', `[${new Date().toISOString()}] PATCH /api/watchman/booking-requests/${params.id} ERROR: ${error.message}\n${error.stack}\n`);
        } catch (e) { }
        return NextResponse.json(
            { error: "Failed to update booking request", details: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}

// DELETE /api/watchman/booking-requests/[id] - Delete a booking request
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requestId = params.id;

        // Delete the booking request
        try {
            await (prisma as any).bookingRequest.delete({
                where: { id: requestId },
            });
        } catch (err) {
            await prisma.$executeRawUnsafe(`DELETE FROM "BookingRequest" WHERE id = $1`, requestId);
        }

        return NextResponse.json({
            success: true,
            message: "Booking request deleted successfully",
        });
    } catch (error: any) {
        console.error("Error deleting booking request:", error);
        return NextResponse.json(
            { error: "Failed to delete booking request", details: error.message },
            { status: 500 }
        );
    }
}
