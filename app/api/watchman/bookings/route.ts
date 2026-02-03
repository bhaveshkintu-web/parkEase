import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionUser = session.user as any;
        const role = (sessionUser.role || "").toUpperCase();

        if (role !== "WATCHMAN" && role !== "OWNER" && role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const weekFromNow = new Date(now);
        weekFromNow.setDate(now.getDate() + 7);

        let locationIds: string[] = [];

        if (role === "WATCHMAN") {
            // Find watchman profile
            const watchman = await (prisma.watchman as any).findUnique({
                where: { userId: sessionUser.id },
                include: {
                    shifts: {
                        where: {
                            scheduledStart: { gte: now, lt: tomorrow }
                        },
                        select: { locationId: true }
                    },
                    assignedLocations: {
                        select: { id: true }
                    }
                }
            });

            if (watchman) {
                const shiftLocationIds = (watchman.shifts as any[] || []).map(s => s.locationId);
                const assignedLocationIds = (watchman.assignedLocations as any[] || []).map(l => l.id);

                // Combine and deduplicate
                locationIds = Array.from(new Set([...shiftLocationIds, ...assignedLocationIds]));

                // If still no locations, fallback to owner's locations
                if (locationIds.length === 0 && watchman.ownerId) {
                    const ownerLocations = await prisma.parkingLocation.findMany({
                        where: { ownerId: watchman.ownerId },
                        select: { id: true }
                    });
                    locationIds = ownerLocations.map(l => l.id);
                }
            }
        } else if (role === "OWNER") {
            const ownerProfile = await prisma.ownerProfile.findUnique({
                where: { userId: sessionUser.id },
                include: { locations: { select: { id: true } } }
            });
            if (ownerProfile) {
                locationIds = ownerProfile.locations.map(l => l.id);
            }
        } else {
            // Admin can see everything
            const allLocations = await prisma.parkingLocation.findMany({
                select: { id: true }
            });
            locationIds = allLocations.map(l => l.id);
        }

        // Get date filters from query params
        const searchParams = request.nextUrl.searchParams;
        const dateFilter = searchParams.get("date") || "today";

        let dateQuery: any = {};
        if (dateFilter === "today") {
            dateQuery = {
                OR: [
                    { checkIn: { gte: now, lt: tomorrow } },
                    { checkOut: { gte: now, lt: tomorrow } }
                ]
            };
        } else if (dateFilter === "tomorrow") {
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(tomorrow.getDate() + 1);
            dateQuery = {
                OR: [
                    { checkIn: { gte: tomorrow, lt: dayAfterTomorrow } },
                    { checkOut: { gte: tomorrow, lt: dayAfterTomorrow } }
                ]
            };
        } else if (dateFilter === "week") {
            dateQuery = {
                OR: [
                    { checkIn: { gte: now, lte: weekFromNow } },
                    { checkOut: { gte: now, lte: weekFromNow } }
                ]
            };
        }

        // Prepare query
        const whereClause = {
            locationId: { in: locationIds },
            ...dateQuery,
            status: { not: "CANCELLED" } as any
        };

        const bookings = await prisma.booking.findMany({
            where: whereClause,
            include: {
                location: true,
                parkingSession: true
            },
            orderBy: {
                checkIn: "asc"
            }
        });

        return NextResponse.json({
            success: true,
            bookings: bookings.map(b => ({
                id: b.id,
                userId: b.userId,
                locationId: b.locationId,
                locationName: (b.location as any).name,
                checkIn: b.checkIn.toISOString(),
                checkOut: b.checkOut.toISOString(),
                guestInfo: {
                    firstName: b.guestFirstName,
                    lastName: b.guestLastName,
                    email: b.guestEmail,
                    phone: b.guestPhone,
                },
                vehicleInfo: {
                    make: b.vehicleMake,
                    model: b.vehicleModel,
                    color: b.vehicleColor,
                    licensePlate: b.vehiclePlate,
                },
                total: b.totalPrice,
                status: b.status.toLowerCase(),
                confirmationCode: b.confirmationCode,
                sessionStatus: b.parkingSession?.status || "pending"
            }))
        });

    } catch (error: any) {
        console.error("Error fetching watchman bookings:", error);
        return NextResponse.json(
            { error: "Failed to fetch bookings", details: error.message },
            { status: 500 }
        );
    }
}
