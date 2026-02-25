"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, MapPin, MessageSquare, Users, Wallet, Settings, BarChart3, Tag, Percent, FileText, AlertTriangle, QrCode, Car, Clock, Shield, Menu, ChevronRight, LogOut, Type as type, LucideIcon, Building2, Banknote } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePlatformName } from "@/hooks/use-settings";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// System Admin Navigation
const systemAdminNav: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "All Users", href: "/admin/users", icon: Users },
      { label: "Owners", href: "/admin/owners", icon: Building2 },
      { label: "Owner Lead Approvals", href: "/admin/approvals/owners", icon: Building2 },
      // { label: "Locations", href: "/admin/locations", icon: MapPin },
      { label: "Location Approvals", href: "/admin/approvals", icon: Shield },
      { label: "Reviews", href: "/admin/reviews", icon: MessageSquare },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
      { label: "Refunds", href: "/admin/refunds", icon: Wallet },
      { label: "Withdrawals", href: "/admin/withdrawals", icon: Banknote },
      { label: "Support Tickets", href: "/admin/support", icon: MessageSquare },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Commissions", href: "/admin/commissions", icon: Percent },
      { label: "Pricing Rules", href: "/admin/pricing", icon: Tag },
      { label: "Promotions", href: "/admin/promotions", icon: FileText },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "CMS Pages", href: "/admin/content", icon: FileText },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "System Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Owner Admin Navigation
const ownerAdminNav: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/owner", icon: LayoutDashboard },
      { label: "Analytics", href: "/owner/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Parking",
    items: [
      { label: "My Locations", href: "/owner/locations", icon: MapPin },
      { label: "Bookings", href: "/owner/bookings", icon: Car },
      { label: "Reviews", href: "/owner/reviews", icon: MessageSquare },
    ],
  },
  {
    title: "Team",
    items: [
      { label: "Watchmen", href: "/owner/watchmen", icon: Shield },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Wallet", href: "/owner/wallet", icon: Wallet },
      { label: "Earnings", href: "/owner/earnings", icon: BarChart3 },
    ],
  },
];

// Watchman Admin Navigation
const watchmanAdminNav: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/watchman", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Today's Bookings", href: "/watchman/bookings", icon: Car },
      { label: "Scan QR", href: "/watchman/scan", icon: QrCode },
      { label: "Check-In/Out", href: "/watchman/sessions", icon: Clock },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "My Activity", href: "/watchman/activity", icon: BarChart3 },
    ],
  },
];

interface AdminSidebarProps {
  role: "admin" | "owner" | "watchman" | "support";
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const platformName = usePlatformName();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState<any>({});

  useEffect(() => {
    if (user?.id && (user.role?.toLowerCase() === "admin" || user.role?.toLowerCase() === "support")) {
      fetchCounts();
      // Refresh counts every 30 seconds
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, user?.role]);

  const fetchCounts = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch("/api/admin/analytics/dashboard");
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setCounts(data.stats || {});
        }
      } else {
        console.warn(`Failed to fetch sidebar counts: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Failed to fetch sidebar counts:", error);
      }
    }
  };

  const getNavBadge = (label: string) => {
    switch (label) {
      case "Owner Lead Approvals": return counts.pendingOwners > 0 ? counts.pendingOwners : undefined;
      case "Location Approvals": return counts.pendingLocations > 0 ? counts.pendingLocations : undefined;
      case "Disputes": return counts.openDisputes > 0 ? counts.openDisputes : undefined;
      case "Refunds": return counts.pendingRefunds > 0 ? counts.pendingRefunds : undefined;
      case "Withdrawals": return counts.pendingWithdrawals > 0 ? counts.pendingWithdrawals : undefined;
      case "Support Tickets": return counts.openTickets > 0 ? counts.openTickets : undefined;
      case "Reviews": return counts.pendingReviews > 0 ? counts.pendingReviews : undefined;
      default: return undefined;
    }
  };

  const navigation =
    role === "admin" || role === "support"
      ? systemAdminNav.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          badge: getNavBadge(item.label)
        }))
      }))
      : role === "owner"
        ? ownerAdminNav
        : watchmanAdminNav;

  const roleLabels = {
    admin: "System Admin",
    support: "Support Agent",
    owner: "Owner Portal",
    watchman: "Watchman Portal",
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">{platformName?.[0] || 'P'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{platformName}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 py-4">
        <div className="px-3 space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" &&
                      item.href !== "/admin/approvals" &&
                      item.href !== `/${role}` &&
                      pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "px-2 py-0.5 text-xs rounded-full",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium text-foreground">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start bg-transparent"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="rounded-full shadow-lg w-12 h-12">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 flex flex-col h-full">
            <SheetHeader className="sr-only p-0 h-0 overflow-hidden">
              <SheetTitle>Admin Navigation</SheetTitle>
              <SheetDescription>Access administrative navigation links.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
