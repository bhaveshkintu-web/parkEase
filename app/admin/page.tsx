"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import { StatCard } from "@/components/admin/stat-card";
import { QuickActions } from "@/components/admin/quick-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Users,
  MapPin,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  Shield,
  MessageSquare,
  Percent,
  Tag,
  Settings,
  BarChart3,
  Loader2,

} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalOwners: number;
  totalLocations: number;
  totalBookings: number;
  activeLocations: number;
  pendingOwners: number;
  pendingLocations: number;
  totalRevenue: number;
  openTickets: number;
  openDisputes: number;
  pendingRefunds: number;
  pendingReviews: number;
  slaAdherence: number;
}

export default function SystemAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/analytics/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Failed to load dashboard data</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">System Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage the entire parking platform
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/analytics">
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={Car}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Active Locations"
          value={`${stats.activeLocations}/${stats.totalLocations}`}
          icon={MapPin}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
      </div>

      {/* Alerts Row */}
      {(stats.pendingOwners > 0 || stats.openDisputes > 0 || stats.openTickets > 0 || stats.pendingLocations > 0 || stats.pendingRefunds > 0 || stats.pendingReviews > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {stats.pendingOwners > 0 && (
            <Link href="/admin/approvals/owners">
              <Card className="border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-900">{stats.pendingOwners} Pending Owners</p>
                    <p className="text-xs text-amber-700">Require approval</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {stats.openDisputes > 0 && (
            <Link href="/admin/disputes?status=OPEN">
              <Card className="border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900">{stats.openDisputes} Open Disputes</p>
                    <p className="text-xs text-red-700">High priority</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {stats.openTickets > 0 && (
            <Link href="/admin/support?status=OPEN">
              <Card className="border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{stats.openTickets} Open Tickets</p>
                    <p className="text-xs text-blue-700">Awaiting response</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {stats.pendingLocations > 0 && (
            <Link href="/admin/approvals">
              <Card className="border-purple-200 bg-purple-50/50 hover:bg-purple-50 transition-colors cursor-pointer border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">{stats.pendingLocations} New Locations</p>
                    <p className="text-xs text-purple-700">Approval required</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {stats.pendingRefunds > 0 && (
            <Link href="/admin/refunds?status=pending">
              <Card className="border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors cursor-pointer border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-emerald-900">{stats.pendingRefunds} Pending Refunds</p>
                    <p className="text-xs text-emerald-700">Payment processing</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {stats.pendingReviews > 0 && (
            <Link href="/admin/reviews">
              <Card className="border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{stats.pendingReviews} New Reviews</p>
                    <p className="text-xs text-slate-700">Moderation needed</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions
        title="Quick Actions"
        description="Manage platform settings and operations"
        columns={3}
        actions={[
          {
            label: "Disputes",
            description: "Handle complaints",
            href: "/admin/disputes",
            icon: AlertTriangle,
            iconColor: "text-red-600",
            iconBgColor: "bg-red-50",
          },
          {
            label: "Refunds",
            description: "Process payments",
            href: "/admin/refunds",
            icon: DollarSign,
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-50",
          },
          {
            label: "Support",
            description: "View tickets",
            href: "/admin/support",
            icon: MessageSquare,
            iconColor: "text-green-600",
            iconBgColor: "bg-green-50",
          },
          {
            label: "User Management",
            description: "View all users",
            href: "/admin/users",
            icon: Users,
            iconColor: "text-slate-600",
            iconBgColor: "bg-slate-100",
          },
          {
            label: "Owner Approvals",
            description: "Review owners",
            href: "/admin/owners",
            icon: Shield,
            iconColor: "text-purple-600",
            iconBgColor: "bg-purple-50",
          },
          {
            label: "Parking Approvals",
            description: "Review locations",
            href: "/admin/approvals",
            icon: CheckCircle,
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-50",
          },
        ]}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Support Health</CardTitle>
            <CardDescription>SLA and resolution metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open Disputes</span>
                <Badge variant={stats.openDisputes > 0 ? "destructive" : "secondary"}>
                  {stats.openDisputes}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open Tickets</span>
                <Badge variant={stats.openTickets > 0 ? "default" : "secondary"}>
                  {stats.openTickets}
                </Badge>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>SLA Adherence</span>
                  <span className={`font-semibold ${stats.slaAdherence >= 90 ? "text-green-600" : "text-amber-600"}`}>
                    {stats.slaAdherence}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${stats.slaAdherence >= 90 ? "bg-green-500" : "bg-amber-500"}`} 
                    style={{ width: `${stats.slaAdherence}%` }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Revenue</CardTitle>
            <CardDescription>Total earnings</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-4xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">All-time platform revenue</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Platform Inventory</CardTitle>
            <CardDescription>Locations and owners</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Total Owners</span>
                <span className="font-bold">{stats.totalOwners}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Active Locations</span>
                <span className="font-bold text-green-600">{stats.activeLocations}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
