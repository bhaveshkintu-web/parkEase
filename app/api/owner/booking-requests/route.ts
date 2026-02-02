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

        const role = session.user.role?.toUpperCase();
        if (role !== "OWNER" && role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const ownerProfile = await prisma.ownerProfile.findUnique({
            where: { userId: session.user.id },
            include: { locations: true }
        });

        if (!ownerProfile) {
            return NextResponse.json({ error: "Owner profile not found" }, { status: 404 });
        }

        const locationIds = ownerProfile.locations.map(loc => loc.id);

        let requests;
        try {
            requests = await (prisma as any).bookingRequest.findMany({
                where: {
                    parkingId: { in: locationIds }
                },
                orderBy: {
                    requestedAt: "desc"
                }
            });
        } catch (err) {
            console.log("Prisma bookingRequest findMany failed, trying raw query fallback...");
            const placeholders = locationIds.map((_, i) => `$${i + 1}`).join(',');
            requests = await prisma.$queryRawUnsafe(`
                SELECT * FROM "BookingRequest" 
                WHERE "parkingId" IN (${placeholders})
                ORDER BY "requestedAt" DESC
            `, ...locationIds);
        }

        return NextResponse.json({
            success: true,
            requests: requests.map((req: any) => ({
                ...req,
                status: req.status.toLowerCase()
            }))
        });
    } catch (error: any) {
        console.error("Error fetching owner booking requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch requests", details: error.message },
            { status: 500 }
        );
    }
}
