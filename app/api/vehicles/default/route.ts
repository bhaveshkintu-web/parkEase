import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    const { vehicleId } = await req.json();

    if (!vehicleId) {
      return NextResponse.json(
        { message: "Vehicle ID required" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.savedVehicle.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.savedVehicle.update({
        where: { id: vehicleId, userId },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SET DEFAULT ERROR:", error);
    return NextResponse.json(
      { message: "Failed to set default vehicle" },
      { status: 500 },
    );
  }
}
