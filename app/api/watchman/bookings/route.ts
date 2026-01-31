import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/watchman/bookings - Get bookings with filtering
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get watchman profile to find ownerId
        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman profile not found" }, { status: 403 });
        }

        // 2. Build where clause
        const where: any = {};

        // Filter by owner's locations
        where.location = {
            ownerId: watchman.ownerId
        };

        // Get query params for filtering
        const searchParams = request.nextUrl.searchParams;
        const dateFilter = searchParams.get("dateFilter"); // today, tomorrow, week, all
        const status = searchParams.get("status");
        const search = searchParams.get("search");

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Date filtering
        if (dateFilter === "today") {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            where.OR = [
                {
                    checkIn: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
                {
                    checkOut: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
            ];
        } else if (dateFilter === "tomorrow") {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date(tomorrow);
            dayAfter.setDate(dayAfter.getDate() + 1);
            where.checkIn = {
                gte: tomorrow,
                lt: dayAfter,
            };
        } else if (dateFilter === "week") {
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            where.checkIn = {
                gte: today,
                lte: weekFromNow,
            };
        }

        // Status filtering
        if (status && status !== "all") {
            where.status = status.toUpperCase();
        }

        // Search by license plate
        if (search) {
            where.vehiclePlate = {
                contains: search,
                mode: "insensitive",
            };
        }

        // Fetch bookings from database
        let bookings;
        try {
            bookings = await (prisma as any).booking.findMany({
                where,
                include: {
                    location: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            city: true,
                            state: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
                orderBy: {
                    checkIn: "asc",
                },
            });
        } catch (err: any) {
            console.log("Prisma booking findMany failed, trying raw query fallback...");
            // Basic fallback for bookings
            bookings = await prisma.$queryRawUnsafe(`
                SELECT b.*, 
                json_build_object('id', pl.id, 'name', pl.name, 'address', pl.address, 'city', pl.city, 'state', pl.state) as location,
                json_build_object('id', u.id, 'firstName', u."firstName", 'lastName', u."lastName", 'email', u.email, 'phone', u.phone) as "user"
                FROM "Booking" b
                JOIN "ParkingLocation" pl ON b."locationId" = pl.id
                JOIN "User" u ON b."userId" = u.id
                WHERE pl."ownerId" = $1
                ORDER BY b."checkIn" ASC
            `, watchman.ownerId);
        }

        // Transform to match frontend format
        const formattedBookings = bookings.map((booking: any) => ({
            id: booking.id,
            userId: booking.userId,
            locationId: booking.locationId,
            locationName: booking.location.name,
            checkIn: booking.checkIn.toISOString(),
            checkOut: booking.checkOut.toISOString(),
            guestInfo: {
                firstName: booking.guestFirstName,
                lastName: booking.guestLastName,
                email: booking.guestEmail,
                phone: booking.guestPhone,
            },
            vehicleInfo: {
                make: booking.vehicleMake,
                model: booking.vehicleModel,
                color: booking.vehicleColor,
                licensePlate: booking.vehiclePlate,
                type: booking.vehicleModel?.toLowerCase() || "sedan",
            },
            total: booking.totalPrice,
            totalPrice: booking.totalPrice,
            taxes: booking.taxes,
            fees: booking.fees,
            status: booking.status.toLowerCase(),
            confirmationCode: booking.confirmationCode,
            qrCode: booking.qrCode,
            createdAt: booking.createdAt.toISOString(),
            modificationHistory: [],
            cancellationEligibility: {
                eligible: booking.status === "PENDING" || booking.status === "CONFIRMED",
                refundAmount: booking.totalPrice,
                deadline: new Date(booking.checkIn.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            },
            location: {
                id: booking.location.id,
                name: booking.location.name,
                address: booking.location.address,
                city: booking.location.city,
                state: booking.location.state,
            },
        }));

        return NextResponse.json({
            success: true,
            bookings: formattedBookings,
            count: formattedBookings.length,
        });
    } catch (error: any) {
        console.error("Error fetching bookings:", error);
        return NextResponse.json(
            { error: "Failed to fetch bookings", details: error.message },
            { status: 500 }
        );
    }
}
