"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ===== Types =====
export interface PlatformSettingsData {
  platformName: string;
  supportEmail: string;
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  requireEmailVerification: boolean;
  minBookingDuration: number;
  modificationGapMinutes: number;
}

export interface NotificationSettingsData {
  emailEnabled: boolean;
  bookingConfirmations: boolean;
  bookingReminders: boolean;
  marketingEmails: boolean;
  smsEnabled: boolean;
  checkInReminders: boolean;
  checkOutAlerts: boolean;
}

interface SettingValue {
  key: string;
  value: string;
  type: string;
  category: string;
  description?: string;
}

// ===== Default Settings =====
const DEFAULT_SETTINGS: SettingValue[] = [
  // General Settings
  { key: "platform.name", value: "ParkEase", type: "string", category: "general", description: "Platform display name" },
  { key: "platform.supportEmail", value: "support@parkease.com", type: "string", category: "general", description: "Support contact email" },
  { key: "platform.termsUrl", value: "/terms", type: "string", category: "general", description: "Terms of Service URL" },
  { key: "platform.privacyUrl", value: "/privacy", type: "string", category: "general", description: "Privacy Policy URL" },
  { key: "platform.maintenanceMode", value: "false", type: "boolean", category: "general", description: "Enable maintenance mode" },
  { key: "platform.allowRegistrations", value: "true", type: "boolean", category: "general", description: "Allow new user registrations" },
  { key: "platform.requireEmailVerification", value: "true", type: "boolean", category: "general", description: "Require email verification for bookings" },
  { key: "booking.minDuration", value: "120", type: "number", category: "general", description: "Minimum booking duration (minutes)" },
  { key: "booking.modificationGap", value: "120", type: "number", category: "general", description: "Minutes before check-in that a reservation can be modified" },

  // Notification Settings
  { key: "notifications.emailEnabled", value: "true", type: "boolean", category: "notifications", description: "Enable email notifications" },
  { key: "notifications.bookingConfirmations", value: "true", type: "boolean", category: "notifications", description: "Send booking confirmation emails" },
  { key: "notifications.bookingReminders", value: "true", type: "boolean", category: "notifications", description: "Send booking reminder emails" },
  { key: "notifications.marketingEmails", value: "false", type: "boolean", category: "notifications", description: "Send marketing emails" },
  { key: "notifications.smsEnabled", value: "true", type: "boolean", category: "notifications", description: "Enable SMS notifications" },
  { key: "notifications.checkInReminders", value: "true", type: "boolean", category: "notifications", description: "Send check-in reminder SMS" },
  { key: "notifications.checkOutAlerts", value: "true", type: "boolean", category: "notifications", description: "Send check-out alert SMS" },
];

// ===== In-Memory Cache =====
let settingsCache: Map<string, { value: any; type: string; expiresAt: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedValue(key: string): any | undefined {
  const cached = settingsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  settingsCache.delete(key);
  return undefined;
}

function setCachedValue(key: string, value: any, type: string): void {
  settingsCache.set(key, {
    value,
    type,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

function invalidateCache(): void {
  settingsCache.clear();
}

// ===== Helper Functions =====
function parseValue(value: string, type: string): any {
  switch (type) {
    case "boolean":
      return value === "true";
    case "number":
      return Number(value);
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

function stringifyValue(value: any, type: string): string {
  switch (type) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return String(value);
    case "json":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

// ===== Seed Default Settings =====
export async function seedDefaultSettings(): Promise<{ success: boolean; seeded: number }> {
  try {
    let seededCount = 0;

    for (const setting of DEFAULT_SETTINGS) {
      const existing = await prisma.platformSettings.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        await prisma.platformSettings.create({
          data: setting,
        });
        seededCount++;
      }
    }

    invalidateCache();
    return { success: true, seeded: seededCount };
  } catch (error) {
    console.error("SEED_SETTINGS_ERROR:", error);
    return { success: false, seeded: 0 };
  }
}

// ===== Get Single Setting =====
export async function getSetting(key: string): Promise<any> {
  try {
    // Check cache first
    const cached = getCachedValue(key);
    if (cached !== undefined) {
      return cached;
    }

    const setting = await prisma.platformSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      // Return default if exists
      const defaultSetting = DEFAULT_SETTINGS.find((s) => s.key === key);
      if (defaultSetting) {
        return parseValue(defaultSetting.value, defaultSetting.type);
      }
      return null;
    }

    const parsedValue = parseValue(setting.value, setting.type);
    setCachedValue(key, parsedValue, setting.type);
    return parsedValue;
  } catch (error) {
    console.error(`GET_SETTING_ERROR [${key}]:`, error);
    return null;
  }
}

// ===== Get All Settings by Category =====
export async function getSettingsByCategory(category: string): Promise<Record<string, any>> {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: { category },
    });

    const result: Record<string, any> = {};

    // First, add defaults for this category
    for (const defaultSetting of DEFAULT_SETTINGS.filter((s) => s.category === category)) {
      const shortKey = defaultSetting.key.split(".").pop() || defaultSetting.key;
      result[shortKey] = parseValue(defaultSetting.value, defaultSetting.type);
    }

    // Override with actual values
    for (const setting of settings) {
      const shortKey = setting.key.split(".").pop() || setting.key;
      result[shortKey] = parseValue(setting.value, setting.type);
    }

    return result;
  } catch (error) {
    console.error(`GET_SETTINGS_BY_CATEGORY_ERROR [${category}]:`, error);
    return {};
  }
}

// ===== Get General Settings =====
export async function getGeneralSettings(): Promise<PlatformSettingsData> {
  try {
    const settings = await getSettingsByCategory("general");

    return {
      platformName: settings.name || "ParkEase",
      supportEmail: settings.supportEmail || "support@parkease.com",
      termsOfServiceUrl: settings.termsUrl || "/terms",
      privacyPolicyUrl: settings.privacyUrl || "/privacy",
      maintenanceMode: settings.maintenanceMode ?? false,
      allowRegistrations: settings.allowRegistrations ?? true,
      requireEmailVerification: settings.requireEmailVerification ?? true,
      minBookingDuration: settings.minDuration ?? 120,
      modificationGapMinutes: (settings.modificationGap as number) ?? 120,
    };
  } catch (error) {
    console.error("GET_GENERAL_SETTINGS_ERROR:", error);
    return {
      platformName: "ParkEase",
      supportEmail: "support@parkease.com",
      termsOfServiceUrl: "/terms",
      privacyPolicyUrl: "/privacy",
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: true,
      minBookingDuration: 120,
      modificationGapMinutes: 120,
    };
  }
}

// ===== Get Notification Settings =====
export async function getNotificationSettings(): Promise<NotificationSettingsData> {
  try {
    const settings = await getSettingsByCategory("notifications");

    return {
      emailEnabled: settings.emailEnabled ?? true,
      bookingConfirmations: settings.bookingConfirmations ?? true,
      bookingReminders: settings.bookingReminders ?? true,
      marketingEmails: settings.marketingEmails ?? false,
      smsEnabled: settings.smsEnabled ?? true,
      checkInReminders: settings.checkInReminders ?? true,
      checkOutAlerts: settings.checkOutAlerts ?? true,
    };
  } catch (error) {
    console.error("GET_NOTIFICATION_SETTINGS_ERROR:", error);
    return {
      emailEnabled: true,
      bookingConfirmations: true,
      bookingReminders: true,
      marketingEmails: false,
      smsEnabled: true,
      checkInReminders: true,
      checkOutAlerts: true,
    };
  }
}

// ===== Update Setting =====
export async function updateSetting(
  key: string,
  value: any,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.platformSettings.findUnique({
      where: { key },
    });

    const defaultSetting = DEFAULT_SETTINGS.find((s) => s.key === key);
    const type = existing?.type || defaultSetting?.type || "string";
    const category = existing?.category || defaultSetting?.category || "general";
    const description = existing?.description || defaultSetting?.description;

    const stringValue = stringifyValue(value, type);

    // Audit log
    await prisma.settingsAuditLog.create({
      data: {
        entityType: "platform_settings",
        entityId: key,
        action: existing ? "update" : "create",
        previousValue: existing ? { value: existing.value } : null,
        newValue: { value: stringValue },
        changedBy: adminId,
      } as any,
    });

    // Upsert the setting
    await prisma.platformSettings.upsert({
      where: { key },
      update: {
        value: stringValue,
        updatedBy: adminId,
        version: existing ? { increment: 1 } : 1,
      },
      create: {
        key,
        value: stringValue,
        type,
        category,
        description,
        updatedBy: adminId,
      },
    });

    invalidateCache();
    revalidatePath("/admin/settings");

    return { success: true };
  } catch (error) {
    console.error(`UPDATE_SETTING_ERROR [${key}]:`, error);
    return { success: false, error: "Failed to update setting" };
  }
}

// ===== Bulk Update Settings =====
export async function updateGeneralSettings(
  data: Partial<PlatformSettingsData>,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const keyMap: Record<keyof PlatformSettingsData, string> = {
      platformName: "platform.name",
      supportEmail: "platform.supportEmail",
      termsOfServiceUrl: "platform.termsUrl",
      privacyPolicyUrl: "platform.privacyUrl",
      maintenanceMode: "platform.maintenanceMode",
      allowRegistrations: "platform.allowRegistrations",
      requireEmailVerification: "platform.requireEmailVerification",
      minBookingDuration: "booking.minDuration",
      modificationGapMinutes: "booking.modificationGap",
    };

    for (const [field, value] of Object.entries(data)) {
      const key = keyMap[field as keyof PlatformSettingsData];
      if (key && value !== undefined) {
        await updateSetting(key, value, adminId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("UPDATE_GENERAL_SETTINGS_ERROR:", error);
    return { success: false, error: "Failed to update general settings" };
  }
}

export async function updateNotificationSettings(
  data: Partial<NotificationSettingsData>,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const keyMap: Record<keyof NotificationSettingsData, string> = {
      emailEnabled: "notifications.emailEnabled",
      bookingConfirmations: "notifications.bookingConfirmations",
      bookingReminders: "notifications.bookingReminders",
      marketingEmails: "notifications.marketingEmails",
      smsEnabled: "notifications.smsEnabled",
      checkInReminders: "notifications.checkInReminders",
      checkOutAlerts: "notifications.checkOutAlerts",
    };

    for (const [field, value] of Object.entries(data)) {
      const key = keyMap[field as keyof NotificationSettingsData];
      if (key && value !== undefined) {
        await updateSetting(key, value, adminId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("UPDATE_NOTIFICATION_SETTINGS_ERROR:", error);
    return { success: false, error: "Failed to update notification settings" };
  }
}

// ===== Get Settings Audit Log =====
export async function getSettingsAuditLog(
  entityType?: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const logs = await prisma.settingsAuditLog.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { changedAt: "desc" },
      take: limit,
    });

    // Enrich with admin names
    const adminIds = [...new Set(logs.map((l) => l.changedBy))];
    const admins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const adminMap = new Map(admins.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

    return logs.map((log) => ({
      ...log,
      changedByName: adminMap.get(log.changedBy) || "Unknown",
    }));
  } catch (error) {
    console.error("GET_SETTINGS_AUDIT_LOG_ERROR:", error);
    return [];
  }
}

// ===== Quick Access Helpers =====
export async function isMaintenanceMode(): Promise<boolean> {
  return await getSetting("platform.maintenanceMode") === true;
}

export async function isRegistrationEnabled(): Promise<boolean> {
  return await getSetting("platform.allowRegistrations") !== false;
}

export async function isEmailVerificationRequired(): Promise<boolean> {
  return await getSetting("platform.requireEmailVerification") !== false;
}

export async function isEmailNotificationsEnabled(): Promise<boolean> {
  return await getSetting("notifications.emailEnabled") !== false;
}

export async function isSmsNotificationsEnabled(): Promise<boolean> {
  return await getSetting("notifications.smsEnabled") !== false;
}

export async function getModificationGap(): Promise<number> {
  const gap = await getSetting("booking.modificationGap");
  return typeof gap === "number" ? gap : 120;
}
