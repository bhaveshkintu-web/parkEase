"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendWatchmanWelcomeEmail } from "@/lib/mailer";

/**
 * Fetches all watchmen belonging to an owner's profile.
 */
export async function getOwnerWatchmen(ownerUserId: string) {
  try {
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: ownerUserId },
    });

    if (!ownerProfile) {
      return { success: false, error: "Owner profile not found" };
    }

    const watchmen = await (prisma as any).watchman.findMany({
      where: {
        ownerId: ownerProfile.id,
        status: { not: "archived" }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        assignedLocations: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch today's activities for all these watchmen to calculate in/out counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const watchmanIds = watchmen.map((w: any) => w.id);
    const todayLogs = await (prisma as any).watchmanActivityLog.findMany({
      where: {
        watchmanId: { in: watchmanIds },
        timestamp: { gte: today },
        type: { in: ["check_in", "check_out"] }
      }
    });

    const formattedWatchmen = watchmen.map((wm: any) => {
      const wmLogs = todayLogs.filter((log: any) => log.watchmanId === wm.id);
      return {
        id: wm.id,
        userId: wm.userId,
        ownerId: wm.ownerId,
        name: `${wm.user.firstName} ${wm.user.lastName}`,
        email: wm.user.email,
        phone: wm.user.phone || "N/A",
        shift: wm.shift || "morning",
        status: wm.status as "active" | "inactive",
        assignedParkingIds: wm.assignedLocations.map((loc: any) => loc.id),
        todayCheckIns: wmLogs.filter((l: any) => l.type === "check_in").length,
        todayCheckOuts: wmLogs.filter((l: any) => l.type === "check_out").length,
        createdAt: wm.createdAt,
      };
    });

    return { success: true, data: formattedWatchmen };
  } catch (error) {
    console.error("Failed to fetch watchmen:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Creates a new User and a linked Watchman record.
 */
export async function createWatchman(ownerUserId: string, data: any) {
  try {
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: ownerUserId },
    });

    if (!ownerProfile) {
      return { success: false, error: "Owner profile not found" };
    }

    const { name, email, phone, shift, assignedParkingIds } = data;

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { watchmanProfile: true } as any,
    });

    if (existingUser) {
      if (existingUser.role !== "WATCHMAN") {
        return { success: false, error: "A user with this email already exists with a different role." };
      }

      // If they are already a watchman, update their profile to link to this owner
      await (prisma as any).watchman.upsert({
        where: { userId: existingUser.id },
        update: {
          ownerId: ownerProfile.id,
          shift,
          status: "active",
          assignedLocations: {
            set: assignedParkingIds.map((id: string) => ({ id })),
          },
        },
        create: {
          userId: existingUser.id,
          ownerId: ownerProfile.id,
          shift,
          status: "active",
          assignedLocations: {
            connect: assignedParkingIds.map((id: string) => ({ id })),
          },
        },
      });

      revalidatePath("/owner/watchmen");
      return { success: true, message: "Existing watchman assigned to your team successfully." };
    }

    // 2. Hash password (provided or default)
    const defaultPassword = "Watchman@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ") || ".";

    // 3. Create User and Watchman in a transaction
    const watchman = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          password: hashedPassword,
          role: "WATCHMAN",
          status: "ACTIVE",
          emailVerified: true,
        },
      });

      return await (tx as any).watchman.create({
        data: {
          userId: user.id,
          ownerId: ownerProfile.id,
          shift,
          status: "active",
          assignedLocations: {
            connect: assignedParkingIds.map((id: string) => ({ id })),
          },
        },
        include: {
          user: true,
          assignedLocations: true,
        }
      });
    });

    // 4. Send welcome email with credentials
    try {
      await sendWatchmanWelcomeEmail(email, name, defaultPassword);
    } catch (emailError) {
      console.error("Failed to send welcome email, but watchman was created:", emailError);
      // We don't fail the whole operation if email fails, but we log it
    }

    revalidatePath("/owner/watchmen");
    return { success: true, data: watchman };
  } catch (error) {
    console.error("Failed to create watchman:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Updates watchman and user records.
 */
export async function updateWatchmanAction(id: string, data: any) {
  try {
    const { name, phone, shift, assignedParkingIds, status } = data;

    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ") || ".";

    const updatedWatchman = await prisma.$transaction(async (tx) => {
      const wm = await (tx as any).watchman.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!wm) throw new Error("Watchman not found");

      // Update User
      await tx.user.update({
        where: { id: wm.userId },
        data: {
          firstName,
          lastName,
          phone,
        }
      });

      // Update Watchman
      return await (tx as any).watchman.update({
        where: { id },
        data: {
          shift,
          status,
          assignedLocations: {
            set: assignedParkingIds.map((id: string) => ({ id })),
          }
        }
      });
    });

    revalidatePath("/owner/watchmen");
    return { success: true, data: updatedWatchman };
  } catch (error) {
    console.error("Failed to update watchman:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Archives a watchman by setting status to 'archived' and removing all location assignments.
 * This preserves the record and user account for potential re-activation or use elsewhere.
 */
export async function deleteWatchmanAction(id: string) {
  try {
    await (prisma as any).watchman.update({
      where: { id },
      data: {
        status: "archived",
        assignedLocations: {
          set: [], // Unassign from all locations
        }
      }
    });

    revalidatePath("/owner/watchmen");
    return { success: true, message: "Watchman archived successfully" };
  } catch (error) {
    console.error("Failed to archive watchman:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Fetches all users with the WATCHMAN role in the system.
 */
export async function getAllWatchmen() {
  try {
    const watchmen = await prisma.user.findMany({
      where: { role: "WATCHMAN" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: { firstName: "asc" },
    });

    const formatted = watchmen.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      phone: u.phone || "N/A",
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Failed to fetch all watchmen:", error);
    return { success: false, error: "Internal server error" };
  }
}
