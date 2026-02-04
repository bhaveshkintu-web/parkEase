"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPricingRules() {
  try {
    const rules = await prisma.pricingRule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rules;
  } catch (error) {
    console.error("GET_PRICING_RULES_ERROR:", error);
    return [];
  }
}

export async function addPricingRule(data: any) {
  try {
    const rule = await prisma.pricingRule.create({
      data: {
        name: data.name,
        type: data.type,
        multiplier: Number(data.multiplier),
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        daysOfWeek: data.daysOfWeek || [],
        isActive: data.isActive ?? true,
        locationId: data.locationId || null,
      },
    });
    revalidatePath("/admin/pricing");
    return { success: true, rule };
  } catch (error: any) {
    console.error("ADD_PRICING_RULE_ERROR:", error);
    return { success: false, error: error.message || "Failed to add pricing rule" };
  }
}

export async function updatePricingRule(id: string, data: any) {
  try {
    const { id: _, ...updateData } = data; // Ensure id is not passed to data block
    const rule = await prisma.pricingRule.update({
      where: { id },
      data: {
        ...updateData,
        multiplier: data.multiplier !== undefined ? Number(data.multiplier) : undefined,
        startDate: data.startDate !== undefined ? (data.startDate ? (data.startDate instanceof Date ? data.startDate : new Date(data.startDate)) : null) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? (data.endDate instanceof Date ? data.endDate : new Date(data.endDate)) : null) : undefined,
      },
    });
    revalidatePath("/admin/pricing");
    return { success: true, rule };
  } catch (error: any) {
    console.error("UPDATE_PRICING_RULE_ERROR:", error);
    return { success: false, error: error.message || "Failed to update pricing rule" };
  }
}

export async function deletePricingRule(id: string) {
  try {
    await prisma.pricingRule.delete({
      where: { id },
    });
    revalidatePath("/admin/pricing");
    return { success: true };
  } catch (error: any) {
    console.error("DELETE_PRICING_RULE_ERROR:", error);
    return { success: false, error: error.message || "Failed to delete pricing rule" };
  }
}
