import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getAuthUserId();
    const body = await req.json();

    const updated = await prisma.savedVehicle.update({
      where: {
        id: params.id,
        userId,
      },
      data: {
        make: body.make,
        model: body.model,
        year: body.year,
        color: body.color,
        licensePlate: body.licensePlate,
        state: body.state,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("EDIT VEHICLE ERROR:", error);
    return NextResponse.json(
      { message: "Failed to update vehicle" },
      { status: 500 },
    );
  }
}
