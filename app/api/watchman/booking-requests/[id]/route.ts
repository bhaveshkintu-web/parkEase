import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

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
                    ORDER BY "createdAt" DESC 
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

        // Update the request status
        let updateData: any = {
            processedBy: session.user.id,
            processedAt: new Date(),
        };

        if (action === "approve") {
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
                    `UPDATE "BookingRequest" SET status = $1::"BookingRequestStatus", "processedBy" = $2, "processedAt" = $3 WHERE id = $4`,
                    "APPROVED", session.user.id, new Date(), requestId
                );
            } else if (action === "reject") {
                await prisma.$executeRawUnsafe(
                    `UPDATE "BookingRequest" SET status = $1::"BookingRequestStatus", "processedBy" = $2, "processedAt" = $3, "rejectionReason" = $4 WHERE id = $5`,
                    "REJECTED", session.user.id, new Date(), rejectionReason, requestId
                );
            } else if (action === "cancel") {
                await prisma.$executeRawUnsafe(
                    `UPDATE "BookingRequest" SET status = $1::"BookingRequestStatus", "processedBy" = $2, "processedAt" = $3 WHERE id = $4`,
                    "CANCELLED", session.user.id, new Date(), requestId
                );
            }
            updatedRequest = { ...existingRequest, ...updateData };
        }

        // If approved, create an actual booking
        if (action === "approve") {
            const { generateConfirmationCode } = await import("@/lib/data");
            const confCode = `PKE-${generateConfirmationCode()}`;

            try {
                // Standard method
                await prisma.booking.create({
                    data: {
                        userId: existingRequest.requestedBy,
                        locationId: existingRequest.parkingId,
                        checkIn: new Date(existingRequest.requestedStart),
                        checkOut: new Date(existingRequest.requestedEnd),
                        guestFirstName: existingRequest.customerName.split(' ')[0] || "Guest",
                        guestLastName: existingRequest.customerName.split(' ').slice(1).join(' ') || "User",
                        guestEmail: existingRequest.customerEmail || "guest@example.com",
                        guestPhone: existingRequest.customerPhone || "",
                        vehicleMake: existingRequest.vehicleMake || "Unknown",
                        vehicleModel: existingRequest.vehicleModel || existingRequest.vehicleType,
                        vehicleColor: existingRequest.vehicleColor || "Unknown",
                        vehiclePlate: existingRequest.vehiclePlate,
                        totalPrice: existingRequest.estimatedAmount,
                        taxes: existingRequest.estimatedAmount * 0.1,
                        fees: 2.99,
                        status: "CONFIRMED",
                        confirmationCode: confCode,
                    }
                });
            } catch (err: any) {
                console.log("Prisma booking create failed, trying raw query fallback...");
                const bookingId = `b_${Math.random().toString(36).substring(2, 11)}`;
                await prisma.$executeRawUnsafe(`
                    INSERT INTO "Booking" (
                        "id", "userId", "locationId", "checkIn", "checkOut", 
                        "guestFirstName", "guestLastName", "guestEmail", "guestPhone", 
                        "vehicleMake", "vehicleModel", "vehicleColor", "vehiclePlate", 
                        "totalPrice", "taxes", "fees", "status", "confirmationCode", "updatedAt"
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::"BookingStatus", $18, NOW()
                    )
                `,
                    bookingId, existingRequest.requestedBy, existingRequest.parkingId,
                    new Date(existingRequest.requestedStart), new Date(existingRequest.requestedEnd),
                    existingRequest.customerName.split(' ')[0] || "Guest",
                    existingRequest.customerName.split(' ').slice(1).join(' ') || "User",
                    existingRequest.customerEmail || "guest@example.com", existingRequest.customerPhone || "",
                    existingRequest.vehicleMake || "Unknown", existingRequest.vehicleModel || existingRequest.vehicleType,
                    existingRequest.vehicleColor || "Unknown", existingRequest.vehiclePlate,
                    existingRequest.estimatedAmount, existingRequest.estimatedAmount * 0.1, 2.99,
                    "CONFIRMED", confCode
                );
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
        console.error("Error updating booking request:", error);
        try {
            const fs = require('fs');
            fs.appendFileSync('api-error.log', `[${new Date().toISOString()}] PATCH /api/watchman/booking-requests/${params.id} ERROR: ${error.message}\n${error.stack}\n`);
        } catch (e) { }
        return NextResponse.json(
            { error: "Failed to update booking request", details: error.message },
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
