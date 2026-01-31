import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/admin/booking-requests - Get all booking requests for admin
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get("status");

        const where: any = {};
        if (status && status !== "all") {
            where.status = status.toUpperCase();
        }

        const requests = await (prisma as any).bookingRequest.findMany({
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
                { priority: "desc" },
                { createdAt: "desc" },
            ],
        });

        // Transform to match frontend format
        const formattedRequests = requests.map((req: any) => ({
            id: req.id,
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
            requestedStart: req.requestedStart.toISOString(),
            requestedEnd: req.requestedEnd.toISOString(),
            estimatedAmount: req.estimatedAmount,
            status: req.status.toLowerCase(),
            priority: req.priority.toLowerCase(),
            notes: req.notes,
            rejectionReason: req.rejectionReason,
            requestedBy: req.requestedBy,
            requestedByInfo: req.requester,
            requestedAt: req.requestedAt.toISOString(),
            processedBy: req.processedBy,
            processedAt: req.processedAt?.toISOString() || null,
        }));

        return NextResponse.json({
            success: true,
            requests: formattedRequests,
            count: formattedRequests.length,
        });
    } catch (error: any) {
        console.error("Error fetching booking requests for admin:", error);
        return NextResponse.json(
            { error: "Failed to fetch booking requests", details: error.message },
            { status: 500 }
        );
    }
}
