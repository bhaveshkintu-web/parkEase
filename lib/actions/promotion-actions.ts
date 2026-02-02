"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPromotions() {
  try {
    const promos = await prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
    });
    return promos;
  } catch (error) {
    console.error("GET_PROMOTIONS_ERROR:", error);
    return [];
  }
}

export async function addPromotion(data: any) {
  try {
    const promo = await prisma.promotion.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        type: data.type,
        value: Number(data.value),
        minBookingValue: data.minBookingValue ? Number(data.minBookingValue) : null,
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
        isActive: data.isActive ?? true,
      },
    });
    revalidatePath("/admin/promotions");
    return { success: true, promo };
  } catch (error) {
    console.error("ADD_PROMOTION_ERROR:", error);
    if (error instanceof Error && error.message.includes("unique-constraint")) {
      return { success: false, error: "Promotion code already exists" };
    }
    return { success: false, error: "Failed to create promotion" };
  }
}

export async function updatePromotion(id: string, data: any) {
  try {
    const promo = await prisma.promotion.update({
      where: { id },
      data: {
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined,
        value: data.value !== undefined ? Number(data.value) : undefined,
        minBookingValue: data.minBookingValue !== undefined ? (data.minBookingValue ? Number(data.minBookingValue) : null) : undefined,
        maxDiscount: data.maxDiscount !== undefined ? (data.maxDiscount ? Number(data.maxDiscount) : null) : undefined,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        usageLimit: data.usageLimit !== undefined ? (data.usageLimit ? Number(data.usageLimit) : null) : undefined,
      },
    });
    revalidatePath("/admin/promotions");
    return { success: true, promo };
  } catch (error) {
    console.error("UPDATE_PROMOTION_ERROR:", error);
    return { success: false, error: "Failed to update promotion" };
  }
}

export async function deletePromotion(id: string) {
  try {
    await prisma.promotion.delete({
      where: { id },
    });
    revalidatePath("/admin/promotions");
    return { success: true };
  } catch (error) {
    console.error("DELETE_PROMOTION_ERROR:", error);
    return { success: false, error: "Failed to delete promotion" };
  }
}
