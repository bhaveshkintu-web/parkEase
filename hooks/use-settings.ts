"use client";

import { useSettingsContext } from "@/lib/contexts/settings-context";
import type { PlatformSettingsData, NotificationSettingsData } from "@/lib/actions/settings-actions";

/**
 * Hook to access general platform settings
 * @returns General settings object with loading state
 */
export function useSettings() {
  const { generalSettings, isLoading, refreshSettings } = useSettingsContext();
  return {
    ...generalSettings,
    isLoading,
    refreshSettings,
  };
}

/**
 * Hook to access notification settings
 * @returns Notification settings object with loading state
 */
export function useNotificationSettings() {
  const { notificationSettings, isLoading, refreshSettings } = useSettingsContext();
  return {
    ...notificationSettings,
    isLoading,
    refreshSettings,
  };
}

/**
 * Hook to access a single setting value
 * @param key - The setting key to retrieve
 * @returns The setting value
 */
export function useSetting<K extends keyof PlatformSettingsData>(
  key: K
): PlatformSettingsData[K] | undefined {
  const { generalSettings, isLoading } = useSettingsContext();
  if (isLoading) return undefined;
  return generalSettings[key];
}

/**
 * Hook to access a single notification setting value
 * @param key - The notification setting key to retrieve
 * @returns The notification setting value
 */
export function useNotificationSetting<K extends keyof NotificationSettingsData>(
  key: K
): NotificationSettingsData[K] | undefined {
  const { notificationSettings, isLoading } = useSettingsContext();
  if (isLoading) return undefined;
  return notificationSettings[key];
}

/**
 * Hook to check if platform is in maintenance mode
 * @returns Boolean indicating maintenance mode status
 */
export function useMaintenanceMode(): boolean {
  const maintenanceMode = useSetting("maintenanceMode");
  return maintenanceMode ?? false;
}

/**
 * Hook to check if registrations are allowed
 * @returns Boolean indicating if registrations are allowed
 */
export function useRegistrationsAllowed(): boolean {
  const allowRegistrations = useSetting("allowRegistrations");
  return allowRegistrations ?? true;
}

/**
 * Hook to check if email verification is required
 * @returns Boolean indicating if email verification is required
 */
export function useEmailVerificationRequired(): boolean {
  const requireEmailVerification = useSetting("requireEmailVerification");
  return requireEmailVerification ?? true;
}

/**
 * Hook to get platform name
 * @returns Platform name string
 */
export function usePlatformName(): string {
  const platformName = useSetting("platformName");
  return platformName ?? "ParkEase";
}

/**
 * Hook to get support email
 * @returns Support email string
 */
export function useSupportEmail(): string {
  const supportEmail = useSetting("supportEmail");
  return supportEmail ?? "support@parkease.com";
}
