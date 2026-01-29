"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/validations";
import { getAuthUserId } from "@/lib/auth";
import crypto from "crypto";

export async function addVehicle(_: any, formData: FormData) {
  try {
    const userId = await getAuthUserId();

    const rawData = {
      make: formData.get("make"),
      model: formData.get("model"),
      year: Number(formData.get("year")),
      color: formData.get("color"),
      licensePlate: formData.get("licensePlate"),
      state: formData.get("state"),
      isDefault: formData.get("isDefault") === "true",
    };

    const validated = vehicleSchema.safeParse(rawData);

    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
      };
    }

    if (validated.data.isDefault) {
      await prisma.$executeRawUnsafe(
        'UPDATE "SavedVehicle" SET "isDefault" = false WHERE "userId" = $1',
        userId
      );
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SavedVehicle" (id, "userId", make, model, year, color, "licensePlate", state, "isDefault", "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
      userId,
      validated.data.make,
      validated.data.model,
      validated.data.year,
      validated.data.color,
      validated.data.licensePlate,
      validated.data.state,
      validated.data.isDefault
    );

    revalidatePath("/account/vehicles");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function getVehicles() {
  const userId = await getAuthUserId();

  return prisma.savedVehicle.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function deleteVehicle(id: string) {
  const userId = await getAuthUserId();

  await prisma.savedVehicle.delete({
    where: { id, userId },
  });

  revalidatePath("/account/vehicles");
}

export async function setDefaultVehicle(id: string) {
  const userId = await getAuthUserId();

  await prisma.$transaction([
    prisma.savedVehicle.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.savedVehicle.update({
      where: { id, userId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/account/vehicles");
}
