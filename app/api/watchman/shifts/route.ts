import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role?.toUpperCase() !== "WATCHMAN") {
            return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("activeOnly") === "true";

        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
        }

        const whereClause: any = {
            watchmanId: watchman.id
        };

        if (activeOnly) {
            whereClause.status = "ACTIVE";
        }

        const shifts = await prisma.watchmanShift.findMany({
            where: whereClause,
            orderBy: { scheduledStart: "desc" },
            include: {
                location: { select: { name: true } }
            }
        });

        return NextResponse.json({ shifts });

    } catch (error: any) {
        console.error("Error fetching shifts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role?.toUpperCase() !== "WATCHMAN") {
            return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
        }

        const body = await request.json();
        const { locationId: bodyLocationId, scheduledEnd } = body;
        let locationId = bodyLocationId;

        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id },
            include: {
                assignedLocations: { take: 1 },
                shifts: { take: 1, orderBy: { scheduledStart: 'desc' } } // Maybe use last shift's location?
            }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
        }

        if (!locationId) {
            // Try to find a default location
            const w = watchman as any;
            if (w.assignedLocations && w.assignedLocations.length > 0) {
                locationId = w.assignedLocations[0].id;
            } else {
                // Fallback to finding any location owned by the owner
                const location = await prisma.parkingLocation.findFirst({
                    where: { ownerId: watchman.ownerId }
                });
                if (location) {
                    locationId = location.id;
                }
            }
        }

        if (!locationId) {
            return NextResponse.json({ error: "No location assigned to watchman" }, { status: 400 });
        }

        // Check for existing active shift
        const existingActive = await prisma.watchmanShift.findFirst({
            where: { watchmanId: watchman.id, status: "ACTIVE" }
        });

        if (existingActive) {
            return NextResponse.json({ error: "You already have an active shift" }, { status: 400 });
        }

        const newShift = await prisma.watchmanShift.create({
            data: {
                watchmanId: watchman.id,
                locationId: locationId,
                scheduledStart: new Date(),
                scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : new Date(Date.now() + 8 * 60 * 60 * 1000), // Default 8h
                actualStart: new Date(),
                status: "ACTIVE"
            }
        });

        const createdWithLocation = await prisma.watchmanShift.findUnique({
            where: { id: newShift.id },
            include: { location: { select: { name: true } } }
        });

        return NextResponse.json({ shift: createdWithLocation });

    } catch (error: any) {
        console.error("Error creating shift:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
