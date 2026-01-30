"use client";

import React from "react";

import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate } from "@/lib/data";
import { StatCard } from "@/components/admin/stat-card";
import { QuickActions } from "@/components/admin/quick-actions";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Car,
  MapPin,
  Users,
  TrendingUp,
  ChevronRight,
  Plus,
  Wallet,
  Calendar,
  Clock,
} from "lucide-react";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { adminLocations, reservations, watchmen, wallet, transactions, initializeForOwner } = useDataStore();
  const walletTransactions = transactions; // Declare walletTransactions variable

  // Initialize owner data
  React.useEffect(() => {
    if (user?.ownerId) {
      initializeForOwner(user.ownerId);
    }
  }, [user?.ownerId, initializeForOwner]);

  // Calculate stats
  const myLocations = adminLocations.filter((l) => l.ownerId === user?.id || l.ownerId === user?.ownerProfile?.id || true); // Demo: still show all but prioritizing real ownerId
  const activeLocations = myLocations.filter((l) => l.status === "active").length;
  const totalCapacity = myLocations.reduce((sum, l) => sum + l.totalSpots, 0);
  const totalOccupied = myLocations.reduce((sum, l) => sum + (l.totalSpots - l.availableSpots), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const todayBookings = reservations.filter(
    (r) => new Date(r.checkIn).toDateString() === new Date().toDateString()
  );
  const totalRevenue = myLocations.reduce((sum, l) => sum + l.analytics.revenue, 0);
  const totalBookings = myLocations.reduce((sum, l) => sum + l.analytics.totalBookings, 0);

  const activeWatchmen = watchmen.filter((w) => w.status === "active").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Owner Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.firstName}! Here&apos;s your parking overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/owner/locations/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Location</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          trend={{ value: 12, label: "vs last month" }}
        />
        <StatCard
          title="Total Bookings"
          value={totalBookings}
          icon={Car}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          trend={{ value: 8, label: "vs last month" }}
        />
        <StatCard
          title="Active Locations"
          value={`${activeLocations}/${myLocations.length}`}
          icon={MapPin}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          subtitle={`${totalCapacity} total spots`}
        />
        <StatCard
          title="Active Watchmen"
          value={activeWatchmen}
          icon={Users}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          subtitle={`${watchmen.length} total`}
        />
      </div>

      {/* Wallet & Occupancy Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Wallet Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Wallet Balance</CardTitle>
              <CardDescription>Available for withdrawal</CardDescription>
            </div>
            <Link href="/owner/wallet">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl sm:text-4xl font-bold text-foreground">
                {formatCurrency(wallet?.balance || 0)}
              </span>
              <span className="text-sm text-muted-foreground">{wallet?.currency || "USD"}</span>
            </div>
            <div className="flex gap-2">
              <Link href="/owner/wallet/withdraw" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  <Wallet className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </Link>
              <Link href="/owner/wallet" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  History
                </Button>
              </Link>
            </div>
            {/* Recent Transactions */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Recent Transactions</p>
              {(transactions || []).slice(0, 3).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{tx.description}</span>
                  <span
                    className={
                      tx.type === "credit" || tx.type === "refund"
                        ? "text-green-600 font-medium"
                        : "text-foreground"
                    }
                  >
                    {tx.type === "credit" || tx.type === "refund" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Occupancy Overview</CardTitle>
            <CardDescription>Current parking utilization</CardDescription>
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
      </div>

      {/* Quick Actions */}
      <QuickActions
        title="Quick Actions"
        description="Common tasks and operations"
        columns={4}
        actions={[
          {
            label: "View Earnings",
            description: "Revenue & finances",
            href: "/owner/earnings",
            icon: DollarSign,
            iconColor: "text-green-600",
            iconBgColor: "bg-green-100",
          },
          {
            label: "Bookings",
            description: "Manage reservations",
            href: "/owner/bookings",
            icon: Calendar,
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-100",
          },
          {
            label: "Manage Watchmen",
            description: "Staff assignments",
            href: "/owner/watchmen",
            icon: Users,
            iconColor: "text-purple-600",
            iconBgColor: "bg-purple-100",
          },
          {
            label: "Withdraw Funds",
            description: "Transfer to bank",
            href: "/owner/wallet/withdraw",
            icon: Wallet,
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-100",
          },
        ]}
      />

      {/* Today's Bookings & Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Today&apos;s Bookings</CardTitle>
              <CardDescription>{todayBookings.length} reservations today</CardDescription>
            </div>
            <Link href="/owner/bookings">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings scheduled for today
                </div>
              ) : (
                todayBookings.slice(0, 4).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {booking.vehicleInfo.licensePlate}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      status={booking.status}
                      variant={
                        booking.status === "confirmed"
                          ? "success"
                          : booking.status === "pending"
                            ? "warning"
                            : "error"
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Locations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">My Locations</CardTitle>
              <CardDescription>Parking spots you manage</CardDescription>
            </div>
            <Link href="/owner/locations">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myLocations.slice(0, 4).map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{location.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {location.availableSpots}/{location.totalSpots} available
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={location.status}
                      variant={
                        location.status === "active"
                          ? "success"
                          : location.status === "maintenance"
                            ? "warning"
                            : "default"
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Watchmen Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Watchmen Activity</CardTitle>
            <CardDescription>Today&apos;s check-ins and check-outs by staff</CardDescription>
          </div>
          <Link href="/owner/watchmen">
            <Button variant="ghost" size="sm">
              Manage
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchmen.slice(0, 6).map((watchman) => (
              <div
                key={watchman.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-foreground">
                      {watchman.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{watchman.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{watchman.shift} shift</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-green-600">
                    {watchman.todayCheckIns} in / {watchman.todayCheckOuts} out
                  </p>
                  <StatusBadge
                    status={watchman.status}
                    variant={watchman.status === "active" ? "success" : "default"}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
