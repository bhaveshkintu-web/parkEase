"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 1 * 60 * 1000; // Every 1 minutes
const STORAGE_KEY = "parkzipply_last_cleanup";

/**
 * Silent background component — mounted in root layout.
 * Calls /api/cron/cleanup every 1 minutes from any user's browser.
 * No login required. No UI. Completely invisible to users.
 * Works for any role: customer, owner, admin, or even logged-out visitors.
 */
export function BookingCleanupPoller() {
  useEffect(() => {
    const runCleanup = async () => {
      try {
        const lastRun = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
        const now = Date.now();

        // Skip if cleanup already ran within the last 10 minutes (tab dedup)
        if (now - lastRun < POLL_INTERVAL_MS) return;

        // Mark timestamp before fetch to prevent concurrent tabs from double-firing
        localStorage.setItem(STORAGE_KEY, String(now));

        // No auth token needed — the route whitelists localhost automatically
        await Promise.all([
          fetch("/api/cron/cleanup"),
          fetch("/api/cron/check-expiry")
        ]);
      } catch {
        // Silent fail — this is a background task, never impacts the user's UI
      }
    };

    // Fire immediately when the app loads
    runCleanup();

    // Then repeat on interval
    const interval = setInterval(runCleanup, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
