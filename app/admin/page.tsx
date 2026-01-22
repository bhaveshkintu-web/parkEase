"use client";

import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/data";
import { StatCard } from "@/components/admin/stat-card";
import { QuickActions } from "@/components/admin/quick-actions";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Users,
  MapPin,
  MessageSquare,
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
} from "lucide-react";

export default function SystemAdminDashboard() {
  const { adminLocations, adminReviews, reservations, watchmen, disputes, users } = useDataStore();

  // Calculate stats
  const activeLocations = adminLocations.filter((l) => l.status === "active").length;
  const totalRevenue = adminLocations.reduce((sum, l) => sum + l.analytics.revenue, 0);
  const totalBookings = adminLocations.reduce((sum, l) => sum + l.analytics.totalBookings, 0);
  const pendingReviews = adminReviews.filter((r) => r.status === "pending").length;
  const flaggedReviews = adminReviews.filter((r) => r.status === "flagged").length;
  const openDisputes = disputes.filter((d) => d.status === "open" || d.status === "in_progress").length;
  const totalUsers = users.length;
  const activeWatchmen = watchmen.filter((w) => w.status === "active").length;

  // Calculate occupancy
  const totalCapacity = adminLocations.reduce((sum, l) => sum + l.totalSpots, 0);
  const totalOccupied = adminLocations.reduce((sum, l) => sum + (l.totalSpots - l.availableSpots), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

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
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          trend={{ value: 15, label: "vs last month" }}
        />
        <StatCard
          title="Total Bookings"
          value={totalBookings}
          icon={Car}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          trend={{ value: 12, label: "vs last month" }}
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          trend={{ value: 8, label: "vs last month" }}
        />
        <StatCard
          title="Active Locations"
          value={`${activeLocations}/${adminLocations.length}`}
          icon={MapPin}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          subtitle={`${totalCapacity} total spots`}
        />
      </div>

      {/* Alerts Row */}
      {(pendingReviews > 0 || flaggedReviews > 0 || openDisputes > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {pendingReviews > 0 && (
            <Link href="/admin/reviews?status=pending">
              <Card className="border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-900">{pendingReviews} Pending Reviews</p>
                    <p className="text-xs text-amber-700">Require moderation</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {flaggedReviews > 0 && (
            <Link href="/admin/reviews?status=flagged">
              <Card className="border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900">{flaggedReviews} Flagged Reviews</p>
                    <p className="text-xs text-red-700">Urgent attention needed</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {openDisputes > 0 && (
            <Link href="/admin/disputes">
              <Card className="border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-orange-900">{openDisputes} Open Disputes</p>
                    <p className="text-xs text-orange-700">Need resolution</p>
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
            label: "Commissions",
            description: "Set rates",
            href: "/admin/commissions",
            icon: Percent,
            iconColor: "text-purple-600",
            iconBgColor: "bg-purple-100",
          },
          {
            label: "Promotions",
            description: "Manage coupons",
            href: "/admin/promotions",
            icon: Tag,
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-100",
          },
        ]}
      />

      {/* Occupancy & Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Platform Occupancy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Occupancy</CardTitle>
            <CardDescription>Overall parking utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl sm:text-4xl font-bold text-foreground">{occupancyRate}%</span>
              <span className="text-sm text-muted-foreground">occupied</span>
            </div>
            <Progress value={occupancyRate} className="h-3 mb-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{totalCapacity}</p>
                <p className="text-xs text-muted-foreground">Total Spots</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">{totalCapacity - totalOccupied}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{totalOccupied}</p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Watchman Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Workforce Overview</CardTitle>
              <CardDescription>Watchmen across all locations</CardDescription>
            </div>
            <Link href="/admin/users?role=watchman">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-green-50 text-center">
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{activeWatchmen}</p>
                <p className="text-xs text-muted-foreground">Active Watchmen</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{watchmen.length}</p>
                <p className="text-xs text-muted-foreground">Total Watchmen</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Today&apos;s Activity</p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm">Total Check-ins</span>
                <span className="font-bold text-green-600">
                  {watchmen.reduce((sum, w) => sum + w.todayCheckIns, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm">Total Check-outs</span>
                <span className="font-bold text-blue-600">
                  {watchmen.reduce((sum, w) => sum + w.todayCheckOuts, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Locations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top Locations</CardTitle>
              <CardDescription>By revenue this month</CardDescription>
            </div>
            <Link href="/admin/locations">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adminLocations
                .sort((a, b) => b.analytics.revenue - a.analytics.revenue)
                .slice(0, 5)
                .map((location, index) => (
                  <div key={location.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{location.name}</p>
                        <p className="text-xs text-muted-foreground">{location.airport}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(location.analytics.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {location.analytics.totalBookings} bookings
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Reviews</CardTitle>
              <CardDescription>Reviews requiring attention</CardDescription>
            </div>
            <Link href="/admin/reviews">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adminReviews
                .filter((r) => r.status === "pending" || r.status === "flagged")
                .slice(0, 5)
                .map((review) => (
                  <div key={review.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">{review.author}</p>
                        <StatusBadge
                          status={review.status}
                          variant={review.status === "flagged" ? "error" : "warning"}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{review.content}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 ml-2 flex-shrink-0">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>
                  </div>
                ))}
              {adminReviews.filter((r) => r.status === "pending" || r.status === "flagged").length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>All reviews are moderated</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
