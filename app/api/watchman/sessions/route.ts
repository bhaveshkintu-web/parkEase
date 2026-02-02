import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    
    const watchman = await prisma.watchman.findUnique({
      where: { userId: session.user.id },
      include: { assignedLocations: true }
    });

    if (!watchman) {
      return NextResponse.json({ error: "Watchman profile not found" }, { status: 404 });
    }

    const parkingIds = watchman.assignedLocations.map(p => p.id);

    const sessions = await prisma.parkingSession.findMany({
      where: {
        locationId: { in: parkingIds },
        status: status && status !== "all" ? status : undefined
      },
      include: {
        booking: true,
        location: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return NextResponse.json(sessions);

  } catch (error) {
    console.error("Sessions API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
