import { prisma as globalPrisma } from "./prisma";
import { Prisma } from "@prisma/client";

export type NotificationType = "info" | "success" | "warning" | "error";

type PrismaClientType = Prisma.TransactionClient | typeof globalPrisma;

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  prisma?: PrismaClientType;
}

/**
 * Creates a single notification for a specific user.
 */
export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
  prisma = globalPrisma,
}: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Creates notifications for all users with the ADMIN role.
 */
export async function notifyAdmins({
  title,
  message,
  type = "info",
  link,
  prisma = globalPrisma,
}: Omit<CreateNotificationParams, "userId">) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length === 0) return [];

    return await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title,
        message,
        type,
        link,
      })),
    });
  } catch (error) {
    console.error("Error notifying admins:", error);
    return null;
  }
}

/**
 * Utility to notify multiple users at once.
 */
export async function notifyUsers(
  userIds: string[],
  { title, message, type = "info", link, prisma = globalPrisma }: Omit<CreateNotificationParams, "userId">
) {
  if (userIds.length === 0) return [];

  try {
    return await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title,
        message,
        type,
        link,
      })),
    });
  } catch (error) {
    console.error("Error notifying users:", error);
    return null;
  }
}
