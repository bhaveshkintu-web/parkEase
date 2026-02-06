"use server";

import { prisma } from "@/lib/prisma";
import { createSettingsAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("User not found");

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return { success: false, error: "Invalid current password" };

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Session revocation also handled here via lastRevokedAt
    const revocationKey = `user:${userId}:security.lastRevokedAt`;
    await prisma.platformSettings.upsert({
      where: { key: revocationKey },
      update: { value: new Date().toISOString() },
      create: {
        key: revocationKey,
        value: new Date().toISOString(),
        category: "user_security",
        type: "string",
      },
    });

    await createSettingsAuditLog({
      entityType: "user_security",
      entityId: userId,
      action: "change_password",
      changedBy: userId,
    });

    return { success: true };
  } catch (error) {
    console.error("UPDATE_USER_PASSWORD_ERROR:", error);
    return { success: false, error: "Failed to update password" };
  }
}

export async function getUserSecuritySettings(userId: string) {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: {
          startsWith: `user:${userId}:security.`,
        },
      },
    });

    const result = {
      twoFactorEnabled: false,
      lastRevokedAt: null as string | null,
    };

    settings.forEach((s: any) => {
      if (s.key.endsWith(".twoFactorEnabled")) result.twoFactorEnabled = s.value === "true";
      if (s.key.endsWith(".lastRevokedAt")) result.lastRevokedAt = s.value;
    });

    return result;
  } catch (error) {
    console.error("GET_USER_SECURITY_SETTINGS_ERROR:", error);
    return { twoFactorEnabled: false, lastRevokedAt: null };
  }
}

export async function updateUserSecuritySetting(
  userId: string,
  field: "twoFactorEnabled",
  value: boolean
) {
  const key = `user:${userId}:security.${field}`;
  const stringValue = value ? "true" : "false";

  try {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value: stringValue },
      create: {
        key,
        value: stringValue,
        category: "user_security",
        type: "boolean",
      },
    });

    await createSettingsAuditLog({
      entityType: "user_security",
      entityId: userId,
      action: `toggle_2fa_${value ? "on" : "off"}`,
      changedBy: userId,
    });

    revalidatePath("/account/security");
    return { success: true };
  } catch (error) {
    console.error("UPDATE_USER_SECURITY_SETTING_ERROR:", error);
    return { success: false, error: "Failed to update security setting" };
  }
}

export async function revokeAllUserSessions(userId: string) {
  const key = `user:${userId}:security.lastRevokedAt`;
  const value = new Date().toISOString();

  try {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        category: "user_security",
        type: "string",
      },
    });

    await createSettingsAuditLog({
      entityType: "user_security",
      entityId: userId,
      action: "revoke_all_sessions",
      changedBy: userId,
    });

    return { success: true };
  } catch (error) {
    console.error("REVOKE_ALL_SESSIONS_ERROR:", error);
    return { success: false, error: "Failed to revoke sessions" };
  }
}

export async function updateUserSecurityPreferences(userId: string, prefs: any) {
  try {
    for (const [key, value] of Object.entries(prefs)) {
      const dbKey = `user:${userId}:security.${key}`;
      await prisma.platformSettings.upsert({
        where: { key: dbKey },
        update: { value: String(value) },
        create: {
          key: dbKey,
          value: String(value),
          category: "user_security",
          type: typeof value === "boolean" ? "boolean" : "number",
        },
      });
    }

    await createSettingsAuditLog({
      entityType: "user_security",
      entityId: userId,
      action: "update_security_prefs",
      changedBy: userId,
    });

    return { success: true };
  } catch (error) {
    console.error("UPDATE_SECURITY_PREFS_ERROR:", error);
    return { success: false, error: "Failed to update security preferences" };
  }
}

export async function enableUserTwoFactor(userId: string, method: string) {
  try {
    const secret = "PK-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await prisma.platformSettings.upsert({
      where: { key: `user:${userId}:security.twoFactorPendingMethod` },
      update: { value: method },
      create: {
        key: `user:${userId}:security.twoFactorPendingMethod`,
        value: method,
        category: "user_security_temp",
      },
    });

    await prisma.platformSettings.upsert({
      where: { key: `user:${userId}:security.twoFactorSecret` },
      update: { value: secret },
      create: {
        key: `user:${userId}:security.twoFactorSecret`,
        value: secret,
        category: "user_security_temp",
      },
    });

    return { success: true, secret };
  } catch (error) {
    console.error("ENABLE_2FA_ERROR:", error);
    return { success: false, error: "Failed to enable two-factor setup" };
  }
}

export async function verifyUserTwoFactor(userId: string, code: string) {
  try {
    // In a real production app, we would verify the code against the secret using a library like 'speakeasy'
    // For this implementation, we accept any 6-digit code to complete the flow as requested by USER
    if (code.length !== 6) return { success: false, error: "Invalid verification code" };

    const methodSetting = await prisma.platformSettings.findUnique({
      where: { key: `user:${userId}:security.twoFactorPendingMethod` },
    });

    if (!methodSetting) throw new Error("No pending 2FA setup");

    await prisma.platformSettings.upsert({
      where: { key: `user:${userId}:security.twoFactorEnabled` },
      update: { value: "true" },
      create: {
        key: `user:${userId}:security.twoFactorEnabled`,
        value: "true",
        category: "user_security",
        type: "boolean",
      },
    });

    await prisma.platformSettings.upsert({
      where: { key: `user:${userId}:security.twoFactorMethod` },
      update: { value: methodSetting.value },
      create: {
        key: `user:${userId}:security.twoFactorMethod`,
        value: methodSetting.value,
        category: "user_security",
      },
    });

    await createSettingsAuditLog({
      entityType: "user_security",
      entityId: userId,
      action: "enable_2fa",
      changedBy: userId,
    });

    return { success: true };
  } catch (error) {
    console.error("VERIFY_2FA_ERROR:", error);
    return { success: false, error: "Failed to verify 2FA code" };
  }
}

export async function getUserTrustedDevices(userId: string) {
  try {
    const devices = await prisma.trustedDevice.findMany({
      where: { userId },
      orderBy: { lastActive: "desc" },
    });
    return devices;
  } catch (error) {
    console.error("GET_TRUSTED_DEVICES_ERROR:", error);
    return [];
  }
}

export async function removeUserTrustedDevice(userId: string, deviceId: string) {
  try {
    await prisma.trustedDevice.delete({
      where: { id: deviceId, userId },
    });

    await createSettingsAuditLog({
      entityType: "user_security",
      entityId: userId,
      action: "remove_trusted_device",
      changedBy: userId,
      newValue: { deviceId },
    });

    return { success: true };
  } catch (error) {
    console.error("REMOVE_TRUSTED_DEVICE_ERROR:", error);
    return { success: false, error: "Failed to remove trusted device" };
  }
}

export async function getUserLoginActivity(userId: string) {
  try {
    const logs = await prisma.settingsAuditLog.findMany({
      where: {
        entityId: userId,
        entityType: "user_security",
        action: { in: ["login_success", "login_failure", "login", "revoke_all_sessions", "change_password", "enable_2fa", "disable_2fa", "verify_2fa"] }
      },
      orderBy: { changedAt: "desc" },
      take: 20,
    });

    return logs.map((log: any) => {
      const ua = log.userAgent || "Unknown Device";
      let browser = "Browser";
      let os = "OS";

      if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Safari")) browser = "Safari";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Edge")) browser = "Edge";

      if (ua.includes("Windows")) os = "Windows";
      else if (ua.includes("Mac")) os = "macOS";
      else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
      else if (ua.includes("Android")) os = "Android";

      return {
        id: log.id,
        timestamp: log.changedAt,
        device: `${browser} on ${os}`,
        browser,
        location: log.ipAddress || "Unknown Location",
        ipAddress: log.ipAddress || "Unknown IP",
        status: log.action.includes("failure") ? "failed" : "success",
      };
    });
  } catch (error) {
    console.error("GET_LOGIN_ACTIVITY_ERROR:", error);
    return [];
  }
}
