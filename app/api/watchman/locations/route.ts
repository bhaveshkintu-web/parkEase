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

        // 1. Find watchman profile to get ownerId
        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id }
        });

        if (!watchman) {
            // If not found as watchman, maybe they are an owner/admin?
            // For now, if not watchman, return empty or unauthorized
            if (session.user.role === 'ADMIN') {
                const locations = await prisma.parkingLocation.findMany({
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                    }
                });
                return NextResponse.json({ success: true, locations });
            }
            return NextResponse.json({ error: "Watchman profile not found" }, { status: 403 });
        }

        // 2. Fetch locations owned by the watchman's owner
        const locations = await prisma.parkingLocation.findMany({
            where: {
                ownerId: watchman.ownerId,
                status: "ACTIVE", // Only active locations
            },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true,
                airportCode: true,
            },
        });

        return NextResponse.json({
            success: true,
            locations,
        });
    } catch (error: any) {
        console.error("Error fetching watchman locations:", error);
        return NextResponse.json(
            { error: "Failed to fetch locations", details: error.message },
            { status: 500 }
        );
    }
}
