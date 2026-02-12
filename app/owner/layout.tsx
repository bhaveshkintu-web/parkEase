"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Loader2 } from "lucide-react";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [hasProfile, setHasProfile] = React.useState<boolean | null>(null);

  // Check if owner has a complete profile
  React.useEffect(() => {
    async function checkProfile() {
      if (user?.role?.toUpperCase() === "OWNER") {
        // Use the flag from session if available, otherwise fetch
        const isComplete = (user as any).isProfileComplete;
        if (typeof isComplete === "boolean") {
          setHasProfile(isComplete);
          return;
        }

        try {
          const response = await fetch("/api/owner/profile");
          if (response.ok) {
            const profile = await response.json();
            // A profile is complete if it exists and has real address data
            const complete = profile && profile.street !== "N/A" && profile.zipCode !== "N/A";
            setHasProfile(!!complete);
          } else {
            setHasProfile(false);
          }
        } catch {
          setHasProfile(false);
        }
      } else {
        setHasProfile(true); // Non-owners don't need this check here
      }
    }
    if (!isLoading && isAuthenticated) {
      checkProfile();
    }
  }, [user, isLoading, isAuthenticated]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login?redirect=/owner");
      } else {
        const role = user?.role?.toLowerCase();
        if (role !== "owner" && role !== "admin") {
          router.push("/account");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Redirect to profile creation if no profile exists (except on profile page itself)
  React.useEffect(() => {
    if (hasProfile === false && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (currentPath !== "/owner/profile") {
        router.push("/owner/profile");
      }
    }
  }, [hasProfile, router]);

  if (isLoading || hasProfile === null) {
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
  if (!isAuthenticated || (role !== "owner" && role !== "admin")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <AdminSidebar role="owner" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
