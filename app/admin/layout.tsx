"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login?redirect=/admin");
      } else {
        const role = user?.role?.toLowerCase();
        if (role !== "admin" && role !== "support") {
          router.push("/account");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

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

  const role = user?.role?.toLowerCase();
  if (!isAuthenticated || (role !== "admin" && role !== "support")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <AdminSidebar role={role as "admin" | "owner" | "watchman"} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
