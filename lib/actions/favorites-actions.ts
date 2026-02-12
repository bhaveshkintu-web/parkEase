"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(locationId: string) {
  try {
    let userId: string;
    try {
      userId = await getAuthUserId();
    } catch (error) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.savedLocation.findUnique({
      where: {
        userId_locationId: {
          userId: userId,
          locationId: locationId,
        },
      },
    });

    if (existing) {
      await prisma.savedLocation.delete({
        where: {
          id: existing.id,
        },
      });
      revalidatePath(`/parking/${locationId}`);
      revalidatePath("/account/favorites");
      return { success: true, isFavorite: false };
    } else {
      await prisma.savedLocation.create({
        data: {
          userId: userId,
          locationId: locationId,
        },
      });
      revalidatePath(`/parking/${locationId}`);
      revalidatePath("/account/favorites");
      return { success: true, isFavorite: true };
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return { success: false, error: "Failed to toggle favorite" };
  }
}

export async function checkIsFavorite(locationId: string) {
  try {
    let userId: string;
    try {
      userId = await getAuthUserId();
    } catch (error) {
      return { isFavorite: false };
    }

    const count = await prisma.savedLocation.count({
      where: {
        userId: userId,
        locationId: locationId,
      },
    });

    return { isFavorite: count > 0 };
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return { isFavorite: false };
  }
}

export async function getFavorites() {
  try {
    let userId: string;
    try {
      userId = await getAuthUserId();
    } catch (error) {
      return { success: false, error: "Unauthorized" };
    }

    const favorites = await prisma.savedLocation.findMany({
      where: {
        userId: userId,
      },
      include: {
        location: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: favorites };
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return { success: false, error: "Failed to fetch favorites" };
  }
}
