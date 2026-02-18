import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notifyOwnerOfBookingRequest, notifyAdminsOfBookingRequest } from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role?.toUpperCase() !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parkingId = searchParams.get("parkingId");

    const userId = session.user.id;
    const watchman = await prisma.watchman.findUnique({
      where: { userId },
      include: { assignedLocations: true }
    });

    if (!watchman) {
      return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
    }

    const assignedLocationIds = watchman.assignedLocations.map(l => l.id);

    const where: any = {
      parkingId: parkingId ? parkingId : { in: assignedLocationIds }
    };

    const requests = await prisma.bookingRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: {
        location: true,
        requestedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role?.toUpperCase() !== "WATCHMAN") {
    return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Ensure dates are actual Date objects and enums are correctly formatted
    const requestData = {
      ...body,
      requestedStart: new Date(body.requestedStart),
      requestedEnd: new Date(body.requestedEnd),
      priority: body.priority?.toUpperCase() || "NORMAL",
      requestedById: session.user.id,
      status: "PENDING"
    };

    const newRequest = await prisma.bookingRequest.create({
      data: requestData,
      include: {
        location: true,
        requestedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    // Trigger notifications asynchronously
    notifyOwnerOfBookingRequest(newRequest.id).catch(err =>
      console.error("Failed to notify owner after request creation:", err)
    );
    notifyAdminsOfBookingRequest(newRequest.id).catch(err =>
      console.error("Failed to notify admins after request creation:", err)
    );

    return NextResponse.json(newRequest);
  } catch (error: any) {
    console.error("Error creating request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
