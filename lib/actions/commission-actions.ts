"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CommissionRule } from "@/lib/types";

export interface CommissionResult {
  ruleId: string;
  ruleName: string;
  commissionAmount: number;
  commissionRate: number;
  appliedType: "percentage" | "fixed";
}

export async function getCommissionRules() {
  try {
    const rules = await prisma.commissionRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return rules;
  } catch (error) {
    console.error("GET_COMMISSION_RULES_ERROR:", error);
    return [];
  }
}

export async function getActiveCommissionRule(bookingType: string = "all") {
  try {
    // Get rules matching the booking type or "all", ordered by priority
    const rules = await prisma.commissionRule.findMany({
      where: {
        isActive: true,
        OR: [
          { appliesTo: bookingType },
          { appliesTo: "all" },
        ],
      },
      orderBy: { priority: "desc" },
      take: 1,
    });
    
    return rules[0] || null;
  } catch (error) {
    console.error("GET_ACTIVE_COMMISSION_RULE_ERROR:", error);
    return null;
  }
}

export async function calculateCommission(
  bookingAmount: number,
  bookingType: string = "all"
): Promise<CommissionResult | null> {
  try {
    const rule = await getActiveCommissionRule(bookingType);
    
    if (!rule) {
      return null;
    }
    
    // Check minimum booking value
    if (rule.minBookingValue && bookingAmount < rule.minBookingValue) {
      return null;
    }
    
    let commissionAmount: number;
    
    if (rule.type === "percentage") {
      commissionAmount = (bookingAmount * rule.value) / 100;
    } else {
      commissionAmount = rule.value;
    }
    
    // Apply max commission cap if set
    if (rule.maxCommission && commissionAmount > rule.maxCommission) {
      commissionAmount = rule.maxCommission;
    }
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      commissionRate: rule.value,
      appliedType: rule.type as "percentage" | "fixed",
    };
  } catch (error) {
    console.error("CALCULATE_COMMISSION_ERROR:", error);
    return null;
  }
}

export async function addCommissionRule(data: any, adminId?: string) {
  try {
    const rule = await prisma.commissionRule.create({
      data: {
        name: data.name,
        type: data.type,
        value: Number(data.value),
        appliesTo: data.appliesTo,
        minBookingValue: data.minBookingValue ? Number(data.minBookingValue) : null,
        maxCommission: data.maxCommission ? Number(data.maxCommission) : null,
        priority: data.priority ? Number(data.priority) : 0,
        isActive: data.isActive ?? true,
      },
    });
    
    // Audit log
    if (adminId) {
      await prisma.settingsAuditLog.create({
        data: {
          entityType: "commission_rule",
          entityId: rule.id,
          action: "create",
          previousValue: null,
          newValue: rule,
          changedBy: adminId,
        },
      });
    }
    
    revalidatePath("/admin/commissions");
    revalidatePath("/admin/settings");
    return { success: true, rule };
  } catch (error) {
    console.error("ADD_COMMISSION_RULE_ERROR:", error);
    return { success: false, error: "Failed to add commission rule" };
  }
}

export async function updateCommissionRule(id: string, data: any, adminId?: string) {
  try {
    const existing = await prisma.commissionRule.findUnique({ where: { id } });
    
    const rule = await prisma.commissionRule.update({
      where: { id },
      data: {
        ...data,
        value: data.value !== undefined ? Number(data.value) : undefined,
        minBookingValue: data.minBookingValue !== undefined ? (data.minBookingValue ? Number(data.minBookingValue) : null) : undefined,
        maxCommission: data.maxCommission !== undefined ? (data.maxCommission ? Number(data.maxCommission) : null) : undefined,
        priority: data.priority !== undefined ? Number(data.priority) : undefined,
      },
    });
    
    // Audit log
    if (adminId) {
      await prisma.settingsAuditLog.create({
        data: {
          entityType: "commission_rule",
          entityId: rule.id,
          action: data.isActive !== undefined && data.isActive !== existing?.isActive ? "toggle" : "update",
          previousValue: existing,
          newValue: rule,
          changedBy: adminId,
        },
      });
    }
    
    revalidatePath("/admin/commissions");
    revalidatePath("/admin/settings");
    return { success: true, rule };
  } catch (error) {
    console.error("UPDATE_COMMISSION_RULE_ERROR:", error);
    return { success: false, error: "Failed to update commission rule" };
  }
}

export async function deleteCommissionRule(id: string, adminId?: string) {
  try {
    const existing = await prisma.commissionRule.findUnique({ where: { id } });
    
    await prisma.commissionRule.delete({
      where: { id },
    });
    
    // Audit log
    if (adminId) {
      await prisma.settingsAuditLog.create({
        data: {
          entityType: "commission_rule",
          entityId: id,
          action: "delete",
          previousValue: existing,
          newValue: null,
          changedBy: adminId,
        },
      });
    }
    
    revalidatePath("/admin/commissions");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("DELETE_COMMISSION_RULE_ERROR:", error);
    return { success: false, error: "Failed to delete commission rule" };
  }
}

