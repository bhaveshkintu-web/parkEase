import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action } = await request.json();
    const sessionId = params.id;

    const watchman = await prisma.watchman.findUnique({
      where: { userId: session.user.id }
    });

    if (!watchman) {
      return NextResponse.json({ error: "Watchman profile not found" }, { status: 404 });
    }

    if (action === "check-in") {
      const updatedSession = await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          status: "checked_in",
          checkInTime: new Date(),
          // Associate with watchman if needed, e.g., in metadata or a separate field if added later
        }
      });
      return NextResponse.json(updatedSession);
    } else if (action === "check-out") {
      const updatedSession = await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          status: "checked_out",
          checkOutTime: new Date(),
        }
      });
      
      // Bonus: Increment available spots back
      const sessionData = await prisma.parkingSession.findUnique({
        where: { id: sessionId },
        select: { locationId: true }
      });
      
      if (sessionData) {
        await prisma.parkingLocation.update({
          where: { id: sessionData.locationId },
          data: { availableSpots: { increment: 1 } }
        });
      }

      return NextResponse.json(updatedSession);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Session Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
