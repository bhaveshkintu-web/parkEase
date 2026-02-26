"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  promotion?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
    maxDiscount?: number | null;
  };
}

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

export async function getActivePromotions() {
  try {
    const now = new Date();
    const promos = await prisma.promotion.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });
    return promos;
  } catch (error) {
    console.error("GET_ACTIVE_PROMOTIONS_ERROR:", error);
    return [];
  }
}

export async function getApplicablePromotions(
  bookingAmount: number,
  userId?: string
) {
  try {
    const now = new Date();
    const promos = await prisma.promotion.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { value: "desc" }, // Start with highest value
    });

    return promos.map((promo) => {
      let isApplicable = true;
      let error = "";

      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        isApplicable = false;
        error = "Usage limit reached";
      }

      if (promo.minBookingValue && bookingAmount < promo.minBookingValue) {
        isApplicable = false;
        error = `Add ${(promo.minBookingValue - bookingAmount).toFixed(2)} more to unlock`;
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (promo.type === "percentage") {
        discountAmount = (bookingAmount * promo.value) / 100;
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount;
        }
      } else if (promo.type === "fixed") {
        discountAmount = promo.value;
      }

      return {
        ...promo,
        isApplicable,
        error,
        potentialDiscount: Math.round(discountAmount * 100) / 100,
      };
    });
  } catch (error) {
    console.error("GET_APPLICABLE_PROMOTIONS_ERROR:", error);
    return [];
  }
}

export async function validatePromoCode(
  code: string,
  bookingAmount: number,
  userId?: string,
  skipValidation: boolean = false
): Promise<PromoValidationResult> {
  try {
    const promo = await prisma.promotion.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo) {
      return { valid: false, error: "Invalid promo code" };
    }

    if (!skipValidation) {
      if (!promo.isActive) {
        return { valid: false, error: "This promo code is no longer active" };
      }

      const now = new Date();
      if (now < new Date(promo.validFrom)) {
        return { valid: false, error: "This promo code is not yet valid" };
      }

      if (now > new Date(promo.validUntil)) {
        return { valid: false, error: "This promo code has expired" };
      }

      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        return { valid: false, error: "This promo code has reached its usage limit" };
      }

      if (promo.minBookingValue && bookingAmount < promo.minBookingValue) {
        return {
          valid: false,
          error: `Minimum booking value of $${promo.minBookingValue.toFixed(2)} required`,
        };
      }
    }

    // Calculate discount amount
    let discountAmount: number;
    if (promo.type === "percentage") {
      discountAmount = (bookingAmount * promo.value) / 100;
      if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
        discountAmount = promo.maxDiscount;
      }
    } else if (promo.type === "fixed") {
      discountAmount = promo.value;
    } else if (promo.type === "free_day") {
      // For free_day type, the value represents number of free days
      // This should be calculated based on daily rate, approximate here
      discountAmount = promo.value * 10; // Approximate, actual calculation in booking flow
    } else {
      discountAmount = 0;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      valid: true,
      promotion: {
        id: promo.id,
        code: promo.code,
        name: promo.name,
        type: promo.type,
        value: promo.value,
        discountAmount,
        maxDiscount: promo.maxDiscount,
      },
    };
  } catch (error) {
    console.error("VALIDATE_PROMO_CODE_ERROR:", error);
    return { valid: false, error: "Failed to validate promo code" };
  }
}

export async function applyPromotion(
  code: string,
  bookingId: string,
  discountAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const promo = await prisma.promotion.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo) {
      return { success: false, error: "Invalid promo code" };
    }

    // Increment usage count
    await prisma.promotion.update({
      where: { id: promo.id },
      data: {
        usedCount: { increment: 1 },
      },
    });

    revalidatePath("/admin/promotions");
    return { success: true };
  } catch (error) {
    console.error("APPLY_PROMOTION_ERROR:", error);
    return { success: false, error: "Failed to apply promotion" };
  }
}

export async function addPromotion(data: any, adminId?: string) {
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

    // Audit log
    if (adminId) {
      await prisma.settingsAuditLog.create({
        data: {
          entityType: "promotion",
          entityId: promo.id,
          action: "create",
          previousValue: undefined,
          newValue: promo as any,
          changedBy: adminId,
        },
      });
    }

    revalidatePath("/admin/promotions");
    revalidatePath("/admin/settings");
    return { success: true, promo };
  } catch (error) {
    console.error("ADD_PROMOTION_ERROR:", error);
    if (error instanceof Error && error.message.includes("unique-constraint")) {
      return { success: false, error: "Promotion code already exists" };
    }
    return { success: false, error: "Failed to create promotion" };
  }
}

export async function updatePromotion(id: string, data: any, adminId?: string) {
  try {
    const existing = await prisma.promotion.findUnique({ where: { id } });

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

    // Audit log
    if (adminId) {
      await prisma.settingsAuditLog.create({
        data: {
          entityType: "promotion",
          entityId: promo.id,
          action: data.isActive !== undefined && data.isActive !== existing?.isActive ? "toggle" : "update",
          previousValue: existing as any,
          newValue: promo as any,
          changedBy: adminId,
        },
      });
    }

    revalidatePath("/admin/promotions");
    revalidatePath("/admin/settings");
    return { success: true, promo };
  } catch (error) {
    console.error("UPDATE_PROMOTION_ERROR:", error);
    return { success: false, error: "Failed to update promotion" };
  }
}

export async function deletePromotion(id: string, adminId?: string) {
  try {
    const existing = await prisma.promotion.findUnique({ where: { id } });

    await prisma.promotion.delete({
      where: { id },
    });

    // Audit log
    if (adminId) {
      await prisma.settingsAuditLog.create({
        data: {
          entityType: "promotion",
          entityId: id,
          action: "delete",
          previousValue: existing as any,
          newValue: undefined,
          changedBy: adminId,
        },
      });
    }

    revalidatePath("/admin/promotions");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("DELETE_PROMOTION_ERROR:", error);
    return { success: false, error: "Failed to delete promotion" };
  }
}

