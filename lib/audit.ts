import { prisma } from "./prisma";
import { headers } from "next/headers";

export async function createSettingsAuditLog({
  entityType,
  entityId,
  action,
  previousValue,
  newValue,
  changedBy,
}: {
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: any;
  newValue?: any;
  changedBy: string;
}) {
  const headersList = headers();
  const ipAddress = (await headersList).get("x-forwarded-for") || (await headersList).get("x-real-ip") || "unknown";
  const userAgent = (await headersList).get("user-agent") || "unknown";

  try {
    return await prisma.settingsAuditLog.create({
      data: {
        entityType,
        entityId,
        action,
        previousValue: previousValue ? JSON.parse(JSON.stringify(previousValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        changedBy,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create settings audit log:", error);
    return null;
  }
}
