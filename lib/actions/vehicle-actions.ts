"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/validations";
import { getAuthUserId } from "@/lib/auth";

export async function addVehicle(_: any, formData: FormData) {
  try {
    const userId = await getAuthUserId();

    const rawData = {
      nickname: formData.get("nickname"),
      make: formData.get("make"),
      model: formData.get("model"),
      year: Number(formData.get("year")),
      color: formData.get("color"),
      licensePlate: formData.get("licensePlate"),
      state: formData.get("state"),
      isDefault: formData.get("isDefault") === "on",
    };

    const validated = vehicleSchema.safeParse(rawData);

    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
      };
    }

    if (validated.data.isDefault) {
      await prisma.savedVehicle.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    await prisma.savedVehicle.create({
      data: {
        ...validated.data,
        userId,
      },
    });

    revalidatePath("/account/vehicles");
    console.log(`[Vehicle Action] ✅ Vehicle ${validated.data.licensePlate} added/updated for user: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error("[Vehicle Action Error] Failed to add vehicle:", error);
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
  try {
    const userId = await getAuthUserId();
    console.log("[Vehicle Action] Deleting vehicle:", id, "for user:", userId);

    await prisma.savedVehicle.delete({
      where: { id, userId },
    });

    revalidatePath("/account/vehicles");
    console.log("[Vehicle Action] ✅ Vehicle deleted successfully:", id);
  } catch (error) {
    console.error("[Vehicle Action Error] Failed to delete vehicle:", id, error);
  }
}

export async function setDefaultVehicle(id: string) {
  try {
    const userId = await getAuthUserId();
    console.log("[Vehicle Action] Setting default vehicle:", id, "for user:", userId);

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
    console.log("[Vehicle Action] ✅ Default vehicle updated successfully:", id);
  } catch (error) {
    console.error("[Vehicle Action Error] Failed to set default vehicle:", id, error);
  }
}
