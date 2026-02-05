import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "WATCHMAN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id },
            include: {
                assignedLocations: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        status: true,
                        availableSpots: true,
                        totalSpots: true
                    }
                }
            }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
        }

        return NextResponse.json(watchman.assignedLocations);
    } catch (error: any) {
        console.error("Error fetching locations:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
