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

        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id },
            include: {
                assignedLocations: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
        }

        return NextResponse.json({ watchman });

    } catch (error: any) {
        console.error("Error fetching watchman profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
