"use server";

import { prisma } from "@/lib/prisma";
import { createSettingsAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/* =======================
   NOTIFICATION SETTINGS
======================= */

export async function getUserNotificationSettings(userId: string) {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: {
          startsWith: `user:${userId}:notifications.`,
        },
      },
    });

    const result = {
      email: true,
      sms: false,
      marketing: false,
    };

    settings.forEach((s) => {
      const field = s.key.split(".").pop();
      if (field === "email") result.email = s.value === "true";
      if (field === "sms") result.sms = s.value === "true";
      if (field === "marketing") result.marketing = s.value === "true";
    });

    return result;
  } catch (error) {
    console.error("GET_USER_NOTIFICATION_SETTINGS_ERROR:", error);
    return { email: true, sms: false, marketing: false };
  }
}

export async function updateUserNotificationSetting(
  userId: string,
  field: "email" | "sms" | "marketing",
  value: boolean
) {
  const key = `user:${userId}:notifications.${field}`;
  const stringValue = value ? "true" : "false";

  try {
    const existing = await prisma.platformSettings.findUnique({
      where: { key },
    });

    await prisma.platformSettings.upsert({
      where: { key },
      update: {
        value: stringValue,
        updatedBy: userId,
      },
      create: {
        key,
        value: stringValue,
        type: "boolean",
        category: "user_notifications",
        updatedBy: userId,
      },
    });

    await createSettingsAuditLog({
      entityType: "user_notification_settings",
      entityId: userId,
      action: "update",
      previousValue: existing ? { [field]: existing.value === "true" } : null,
      newValue: { [field]: value },
      changedBy: userId,
    });

    revalidatePath("/account/settings");
    return { success: true };
  } catch (error) {
    console.error("UPDATE_USER_NOTIFICATION_SETTING_ERROR:", error);
    return { success: false, error: "Failed to update notification setting" };
  }
}

/* =======================
   DEFAULT PREFERENCES
======================= */

export async function setDefaultVehicle(userId: string, vehicleId: string | null) {
  try {
    const previousDefault = await prisma.savedVehicle.findFirst({
      where: { userId, isDefault: true },
    });

    await prisma.$transaction([
      prisma.savedVehicle.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      ...(vehicleId && vehicleId !== "no-default"
        ? [
            prisma.savedVehicle.update({
              where: { id: vehicleId },
              data: { isDefault: true },
            }),
          ]
        : []),
    ]);

    await createSettingsAuditLog({
      entityType: "user_preferences",
      entityId: userId,
      action: "update_default_vehicle",
      previousValue: previousDefault ? { vehicleId: previousDefault.id } : null,
      newValue: { vehicleId },
      changedBy: userId,
    });

    revalidatePath("/account/settings");
    return { success: true };
  } catch (error) {
    console.error("SET_DEFAULT_VEHICLE_ERROR:", error);
    return { success: false, error: "Failed to update default vehicle" };
  }
}

export async function setDefaultPaymentMethod(userId: string, paymentMethodId: string | null) {
  try {
    const previousDefault = await prisma.paymentMethod.findFirst({
      where: { userId, isDefault: true },
    });

    await prisma.$transaction([
      prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      ...(paymentMethodId && paymentMethodId !== "no-default"
        ? [
            prisma.paymentMethod.update({
              where: { id: paymentMethodId },
              data: { isDefault: true },
            }),
          ]
        : []),
    ]);

    await createSettingsAuditLog({
      entityType: "user_preferences",
      entityId: userId,
      action: "update_default_payment",
      previousValue: previousDefault ? { paymentMethodId: previousDefault.id } : null,
      newValue: { paymentMethodId },
      changedBy: userId,
    });

    revalidatePath("/account/settings");
    return { success: true };
  } catch (error) {
    console.error("SET_DEFAULT_PAYMENT_ERROR:", error);
    return { success: false, error: "Failed to update default payment method" };
  }
}

/* =======================
   ACCOUNT MANAGEMENT
======================= */

export async function exportUserData(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: { include: { location: true } },
        savedVehicles: true,
        paymentMethods: true,
      },
    });

    if (!user) throw new Error("User not found");

    const exportData = {
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      bookings: user.bookings,
      savedVehicles: user.savedVehicles,
      paymentMethods: user.paymentMethods.map(pm => ({
        brand: pm.brand,
        last4: pm.last4,
        expiry: `${pm.expiryMonth}/${pm.expiryYear}`,
      })),
      exportedAt: new Date().toISOString(),
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error("EXPORT_USER_DATA_ERROR:", error);
    return { success: false, error: "Failed to export data" };
  }
}

export async function deleteUserAccount(userId: string) {
  try {
    // 1. Audit log before deletion
    await createSettingsAuditLog({
      entityType: "user",
      entityId: userId,
      action: "delete_account",
      changedBy: userId,
    });

    // 2. Fetch dependencies that need manual cleanup
    // Get all user bookings to clean up their related records
    const userBookings = await prisma.booking.findMany({
      where: { userId },
      select: { id: true },
    });
    const bookingIds = userBookings.map((b: { id: string }) => b.id);

    // 3. Perform transaction with correct deletion order
    await prisma.$transaction(async (tx) => {
      // A. Clean up Booking dependencies
      if (bookingIds.length > 0) {
        await tx.payment.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await tx.refundRequest.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await tx.parkingSession.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        
        // Delete dispute audit logs for these bookings
        await tx.disputeAuditLog.deleteMany({
          where: { dispute: { bookingId: { in: bookingIds } } }
        });

        // Delete disputes related to these bookings
        await tx.dispute.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
      }

      // B. Clean up Owner Profile & Watchman (if they exist)
      // 1. Owner Profile
      const ownerProfile = await tx.ownerProfile.findUnique({ where: { userId } });
      if (ownerProfile) {
        // Delete owner documents
        await tx.ownerDocument.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
        // Delete parking approvals
        await tx.parkingApproval.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
        // Delete wallet & transactions
        const wallet = await tx.wallet.findUnique({ where: { ownerId: ownerProfile.id } });
        if (wallet) {
            await tx.withdrawalRequest.deleteMany({ where: { walletId: wallet.id } });
            await tx.walletTransaction.deleteMany({ where: { walletId: wallet.id } });
            await tx.wallet.delete({ where: { id: wallet.id } });
        }
        // NOTE: If they have active ParkingLocations with bookings from OTHER users, this might still fail.
        // Assuming strictly "Customer" deletion or "Clean Owner" deletion for now.
        // If we need to cascade locations, we'd need to fetch them and delete their dependencies too.
        // For now, let's try deleting the profile. If locations exist, this will error, but that's a bigger specific case.
        
        await tx.ownerProfile.delete({ where: { id: ownerProfile.id } });
      }

      // 2. Watchman Profile
      const watchman = await tx.watchman.findUnique({ where: { userId } });
      if (watchman) {
        await tx.watchmanActivityLog.deleteMany({ where: { watchmanId: watchman.id } });
        await tx.watchmanShift.deleteMany({ where: { watchmanId: watchman.id } });
        await tx.watchman.delete({ where: { id: watchman.id } });
      }

      // C. Clean up User direct dependencies
      // 1. Notification
      await tx.notification.deleteMany({ where: { userId } });
      
      // 2. Reviews (and their AdminReviews)
      await tx.adminReview.deleteMany({
        where: { review: { userId } }
      });
      await tx.review.deleteMany({ where: { userId } });

      // 3. Booking Requests (Created by user)
      await tx.bookingRequest.deleteMany({ where: { requestedById: userId } });

      // 4. Disputes (Created by user - if not caught above)
      // First clean audit logs for these disputes
      await tx.disputeAuditLog.deleteMany({
         where: { dispute: { userId } }
      });
      await tx.dispute.deleteMany({ where: { userId } });

      // 5. Saved Vehicles
      await tx.savedVehicle.deleteMany({ where: { userId } });

      // 6. Payment Methods
      await tx.paymentMethod.deleteMany({ where: { userId } });

      // 7. Trusted Devices (Explicit delete in case cascade is missing)
      await tx.trustedDevice.deleteMany({ where: { userId } });

      // 8. Bookings
      await tx.booking.deleteMany({ where: { userId } });

      // 9. Nullify Admin/Support roles in other records
      await tx.dispute.updateMany({
        where: { assignedAdminId: userId },
        data: { assignedAdminId: null }
      });
      await tx.bookingRequest.updateMany({
        where: { processedById: userId },
        data: { processedById: null }
      });
      await tx.adminReview.updateMany({
        where: { moderatedById: userId },
        data: { moderatedById: null }
      });
      // Also nullify dispute audit logs where user was the admin
      await tx.disputeAuditLog.updateMany({
        where: { adminId: userId },
        data: { adminId: null }
      });

      // 5. Saved Vehicles
      await tx.savedVehicle.deleteMany({ where: { userId } });

      // 6. Payment Methods
      await tx.paymentMethod.deleteMany({ where: { userId } });

      // 7. Trusted Devices (Explicit delete in case cascade is missing)
      await tx.trustedDevice.deleteMany({ where: { userId } });

      // 8. Bookings
      await tx.booking.deleteMany({ where: { userId } });

      // 9. Nullify Admin/Support roles in other records
      await tx.dispute.updateMany({
        where: { assignedAdminId: userId },
        data: { assignedAdminId: null }
      });
      await tx.bookingRequest.updateMany({
        where: { processedById: userId },
        data: { processedById: null }
      });
      await tx.adminReview.updateMany({
        where: { moderatedById: userId },
        data: { moderatedById: null }
      });

      // 10. Finally, delete the user
      // Note: If user is an Owner, this might still fail if OwnerProfile exists
      // and isn't handled. Assuming standard user for now.
      await tx.user.delete({ where: { id: userId } });
    });

    return { success: true };
  } catch (error) {
    console.error("DELETE_ACCOUNT_ERROR:", error);
    return { success: false, error: "Failed to delete account. Please associate with admin if this persists." };
  }
}
