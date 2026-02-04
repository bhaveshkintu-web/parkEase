"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import { StatCard } from "@/components/admin/stat-card";
import { QuickActions } from "@/components/admin/quick-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
          trend={{ value: 15, label: "vs last month" }}
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={Car}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          trend={{ value: 12, label: "vs last month" }}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          trend={{ value: 8, label: "vs last month" }}
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
      {(stats.pendingOwners > 0 || stats.pendingLocations > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {stats.pendingOwners > 0 && (
            <Link href="/admin/owners?status=pending">
              <Card className="border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-900">{stats.pendingOwners} Pending Owners</p>
                    <p className="text-xs text-amber-700">Require approval</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {stats.pendingLocations > 0 && (
            <Link href="/admin/approvals?status=pending">
              <Card className="border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-900">{stats.pendingLocations} Pending Locations</p>
                    <p className="text-xs text-amber-700">Require approval</p>
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
        columns={4}
        actions={[
          {
            label: "User Management",
            description: "View all users",
            href: "/admin/users",
            icon: Users,
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-100",
          },
          {
            label: "Locations",
            description: "Manage parking",
            href: "/admin/locations",
            icon: MapPin,
            iconColor: "text-green-600",
            iconBgColor: "bg-green-100",
          },
          {
            label: "Owner Approvals",
            description: "Review owners",
            href: "/admin/owners",
            icon: Shield,
            iconColor: "text-purple-600",
            iconBgColor: "bg-purple-100",
          },
          {
            label: "Parking Approvals",
            description: "Review locations",
            href: "/admin/approvals",
            icon: CheckCircle,
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-100",
          },
        ]}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Overview</CardTitle>
            <CardDescription>Key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Total Owners</span>
                <span className="font-bold text-foreground">{stats.totalOwners}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Total Locations</span>
                <span className="font-bold text-foreground">{stats.totalLocations}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Active Locations</span>
                <span className="font-bold text-green-600">{stats.activeLocations}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue</CardTitle>
            <CardDescription>Total earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">All-time revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Actions</CardTitle>
            <CardDescription>Requires attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/owners?status=pending">
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
                  <span className="text-sm">Pending Owners</span>
                  <span className="font-bold text-amber-600">{stats.pendingOwners}</span>
                </div>
              </Link>
              <Link href="/admin/approvals?status=pending">
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
                  <span className="text-sm">Pending Locations</span>
                  <span className="font-bold text-amber-600">{stats.pendingLocations}</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
