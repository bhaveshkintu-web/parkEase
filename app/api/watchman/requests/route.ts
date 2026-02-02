import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { notifyAdminsOfBookingRequest } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "WATCHMAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as any;
    const parkingId = searchParams.get("parkingId");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (parkingId) {
      where.parkingId = parkingId;
    }

    const requests = await prisma.bookingRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: {
        requestedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "WATCHMAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerId,
      customerName,
      customerPhone,
      vehiclePlate,
      vehicleType,
      parkingId,
      parkingName,
      requestType,
      requestedStart,
      requestedEnd,
      estimatedAmount,
      notes,
      priority
    } = body;

    const request = await prisma.bookingRequest.create({
      data: {
        customerId,
        customerName,
        customerPhone,
        vehiclePlate: vehiclePlate.toUpperCase(),
        vehicleType,
        parkingId,
        parkingName,
        requestType,
        requestedStart: new Date(requestedStart),
        requestedEnd: new Date(requestedEnd),
        estimatedAmount,
        notes,
        priority: priority || "normal",
        requestedById: session.user.id,
      }
    });

    // Send notification to admin
    await notifyAdminsOfBookingRequest(request.id);

    return NextResponse.json(request);
  } catch (error: any) {
    console.error("Booking Request Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
