import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "WATCHMAN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id },
            include: { assignedLocations: true }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman profile not found" }, { status: 404 });
        }

        // Transform to the format expected by the frontend AdminParkingLocation type if necessary
        // or just return the assignedLocations as is.
        const locations = watchman.assignedLocations.map(loc => ({
            id: loc.id,
            name: loc.name,
            address: loc.address,
            city: loc.city,
            state: loc.state,
            zipCode: loc.zipCode,
            status: "active", // Default to active for simplicity in this dropdown
        }));

        return NextResponse.json(locations);
    } catch (error: any) {
        console.error("Fetch Watchman Locations error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
