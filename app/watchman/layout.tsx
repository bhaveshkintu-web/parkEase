"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDataStore } from "@/lib/data-store";
import { Navbar } from "@/components/navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Loader2 } from "lucide-react";

export default function WatchmanLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const { initializeForWatchman } = useDataStore();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login?redirect=/watchman");
      } else if (user?.role !== "watchman" && user?.role !== "admin") {
        router.push("/account");
      } else if (user) {
        initializeForWatchman(user.id);
      }
    }
  }, [isLoading, isAuthenticated, user, router, initializeForWatchman]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "watchman" && user?.role !== "admin")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <AdminSidebar role="watchman" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
