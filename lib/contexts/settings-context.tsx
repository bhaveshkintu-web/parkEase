"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  getGeneralSettings,
  getNotificationSettings,
  type PlatformSettingsData,
  type NotificationSettingsData,
} from "@/lib/actions/settings-actions";

interface SettingsContextType {
  generalSettings: PlatformSettingsData;
  notificationSettings: NotificationSettingsData;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultGeneralSettings: PlatformSettingsData = {
  platformName: "ParkZipply",
  supportEmail: "support@parkzipply.com",
  termsOfServiceUrl: "/terms",
  privacyPolicyUrl: "/privacy",
  maintenanceMode: false,
  allowRegistrations: true,
  requireEmailVerification: true,
  minBookingDuration: 120,
  modificationGapMinutes: 60,
  gracePeriodMinutes: 30,
  taxRate: 0.1,
  serviceFee: 5.99,
};

const defaultNotificationSettings: NotificationSettingsData = {
  emailEnabled: true,
  bookingConfirmations: true,
  bookingReminders: true,
  marketingEmails: false,
  smsEnabled: true,
  checkInReminders: true,
  checkOutAlerts: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [generalSettings, setGeneralSettings] = useState<PlatformSettingsData>(defaultGeneralSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsData>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const [general, notifications] = await Promise.all([
        getGeneralSettings(),
        getNotificationSettings(),
      ]);
      setGeneralSettings(general);
      setNotificationSettings(notifications);
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Keep default settings on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const contextValue = useMemo(() => ({
    generalSettings,
    notificationSettings,
    isLoading,
    refreshSettings,
  }), [generalSettings, notificationSettings, isLoading, refreshSettings]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettingsContext must be used within a SettingsProvider");
  }
  return context;
}
