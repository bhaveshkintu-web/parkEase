"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CommissionRule } from "@/lib/types";

export async function getCommissionRules() {
  try {
    const rules = await prisma.commissionRule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rules;
  } catch (error) {
    console.error("GET_COMMISSION_RULES_ERROR:", error);
    return [];
  }
}

export async function addCommissionRule(data: any) {
  try {
    const rule = await prisma.commissionRule.create({
      data: {
        name: data.name,
        type: data.type,
        value: Number(data.value),
        appliesTo: data.appliesTo,
        minBookingValue: data.minBookingValue ? Number(data.minBookingValue) : null,
        maxCommission: data.maxCommission ? Number(data.maxCommission) : null,
        isActive: data.isActive ?? true,
      },
    });
    revalidatePath("/admin/commissions");
    return { success: true, rule };
  } catch (error) {
    console.error("ADD_COMMISSION_RULE_ERROR:", error);
    return { success: false, error: "Failed to add commission rule" };
  }
}

export async function updateCommissionRule(id: string, data: any) {
  try {
    const rule = await prisma.commissionRule.update({
      where: { id },
      data: {
        ...data,
        value: data.value !== undefined ? Number(data.value) : undefined,
        minBookingValue: data.minBookingValue !== undefined ? (data.minBookingValue ? Number(data.minBookingValue) : null) : undefined,
        maxCommission: data.maxCommission !== undefined ? (data.maxCommission ? Number(data.maxCommission) : null) : undefined,
      },
    });
    revalidatePath("/admin/commissions");
    return { success: true, rule };
  } catch (error) {
    console.error("UPDATE_COMMISSION_RULE_ERROR:", error);
    return { success: false, error: "Failed to update commission rule" };
  }
}

export async function deleteCommissionRule(id: string) {
  try {
    await prisma.commissionRule.delete({
      where: { id },
    });
    revalidatePath("/admin/commissions");
    return { success: true };
  } catch (error) {
    console.error("DELETE_COMMISSION_RULE_ERROR:", error);
    return { success: false, error: "Failed to delete commission rule" };
  }
}
