import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/booking-requests/[id] - Admin Approve/Reject a booking request
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || session.user.role !== "ADMIN") {
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

        const existingRequest = await (prisma as any).bookingRequest.findUnique({
            where: { id: requestId },
        });

        if (!existingRequest) {
            return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
        }

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

        const updatedRequest = await (prisma as any).bookingRequest.update({
            where: { id: requestId },
            data: updateData,
        });

        // If approved, create an actual booking
        if (action === "approve") {
            const { generateConfirmationCode } = await import("@/lib/data");
            const confCode = `PKE-${generateConfirmationCode()}`;

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
        }

        return NextResponse.json({
            success: true,
            message: `Booking request ${action}ed successfully by admin`,
            request: {
                id: updatedRequest.id,
                status: updatedRequest.status.toLowerCase(),
            },
        });
    } catch (error: any) {
        console.error("Error updating booking request by admin:", error);
        return NextResponse.json(
            { error: "Failed to update booking request", details: error.message },
            { status: 500 }
        );
    }
}
