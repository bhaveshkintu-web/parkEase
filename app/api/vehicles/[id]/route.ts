import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET single vehicle (for edit form)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getAuthUserId();

  const vehicle = await prisma.savedVehicle.findFirst({
    where: { id, userId },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(vehicle);
}

/**
 * UPDATE vehicle
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getAuthUserId();
  const body = await req.json();

  const updated = await prisma.savedVehicle.update({
    where: { id },
    data: {
      make: body.make,
      model: body.model,
      year: body.year,
      color: body.color,
      licensePlate: body.licensePlate,
      state: body.state,
      isDefault: body.isDefault,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE vehicle
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getAuthUserId();

  await prisma.savedVehicle.deleteMany({
    where: { id, userId },
  });

  return NextResponse.json({ success: true });
}
