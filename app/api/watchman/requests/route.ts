import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { notifyAdminsOfBookingRequest } from "@/lib/notifications";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["WATCHMAN", "OWNER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const parkingId = searchParams.get("parkingId");

    const sessionUser = session.user as any;

    try {
      // Try Prisma first
      const where: any = {};
      if (status && status !== "ALL") where.status = status;
      if (parkingId) where.parkingId = parkingId;

      const requests = await (prisma as any).bookingRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        include: {
          requestedBy: {
            select: { firstName: true, lastName: true }
          }
        }
      });
      return NextResponse.json(requests);
    } catch (prismaError) {
      console.error("Prisma GET requests failed, using raw query:", prismaError);
      // Raw fallback
      let query = `SELECT r.*, u."firstName" as "requestedByFirstName", u."lastName" as "requestedByLastName" 
                     FROM "BookingRequest" r
                     LEFT JOIN "User" u ON r."requestedById" = u.id `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (status && status !== "ALL") {
        conditions.push(`r.status = $${params.length + 1}`);
        params.push(status);
      }
      if (parkingId) {
        conditions.push(`r."parkingId" = $${params.length + 1}`);
        params.push(parkingId);
      }

      if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
      query += ' ORDER BY r."requestedAt" DESC';

      const requests = await prisma.$queryRawUnsafe(query, ...params) as any[];
      return NextResponse.json(requests.map(r => ({
        ...r,
        requestedBy: { firstName: r.requestedByFirstName, lastName: r.requestedByLastName }
      })));
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["WATCHMAN", "OWNER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerId, customerName, customerPhone, customerEmail,
      vehiclePlate, vehicleType, vehicleMake, vehicleModel, vehicleColor,
      parkingId, parkingName, requestType, requestedStart, requestedEnd,
      estimatedAmount, notes, priority
    } = body;

    if (!customerName || !vehiclePlate || !parkingId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sessionUser = session.user as any;
    const safeRequestType = (requestType || "WALK_IN").toUpperCase();
    const safePriority = (priority || "NORMAL").toUpperCase();
    const startTime = new Date(requestedStart || new Date());
    const endTime = new Date(requestedEnd || new Date(startTime.getTime() + 2 * 3600000));

    let createdRequest;

    try {
      // Try Prisma first
      createdRequest = await (prisma as any).bookingRequest.create({
        data: {
          customerId,
          customerName,
          customerPhone: customerPhone || "",
          customerEmail: customerEmail || "",
          vehiclePlate: vehiclePlate.toUpperCase(),
          vehicleType: vehicleType || "sedan",
          vehicleMake: vehicleMake || "",
          vehicleModel: vehicleModel || "",
          vehicleColor: vehicleColor || "",
          parkingId,
          parkingName: parkingName || "Parking Location",
          requestType: safeRequestType as any,
          requestedStart: startTime,
          requestedEnd: endTime,
          estimatedAmount: Number(estimatedAmount) || 0,
          notes: notes || "",
          priority: safePriority as any,
          requestedById: sessionUser.id,
        }
      });
    } catch (prismaError: any) {
      console.error("Prisma POST request failed, using raw query:", prismaError.message);

      const id = `req_${Math.random().toString(36).substring(2, 11)}`;
      await prisma.$executeRawUnsafe(`
            INSERT INTO "BookingRequest" (
                "id", "customerId", "customerName", "customerPhone", "customerEmail", "vehiclePlate", "vehicleType", 
                "vehicleMake", "vehicleModel", "vehicleColor",
                "parkingId", "parkingName", "requestType", "requestedStart", "requestedEnd", 
                "estimatedAmount", "notes", "requestedById", "status", "requestedAt", "priority"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                $13::"BookingRequestType", 
                $14, $15, 
                $16, $17, $18, 
                'PENDING'::"BookingRequestStatus", 
                NOW(), 
                $19::"BookingRequestPriority"
            )
        `,
        id, customerId, customerName, customerPhone || "", customerEmail || "", vehiclePlate.toUpperCase(), vehicleType || "sedan",
        vehicleMake || "", vehicleModel || "", vehicleColor || "",
        parkingId, parkingName || "Parking Location", safeRequestType,
        startTime, endTime, Number(estimatedAmount) || 0, notes || "", sessionUser.id, safePriority
      );

      createdRequest = { id, status: "PENDING", customerName, vehiclePlate: vehiclePlate.toUpperCase() };
    }

    // Async notification
    try {
      notifyAdminsOfBookingRequest(createdRequest.id).catch(e => console.error("Notify error:", e));
    } catch (e) { }

    return NextResponse.json(createdRequest);
  } catch (error: any) {
    console.error("Booking Request POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
