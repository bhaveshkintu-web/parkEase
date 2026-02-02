"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDataStore } from "@/lib/data-store";
import { formatDate, formatTime } from "@/lib/data";
import { StatCard } from "@/components/admin/stat-card";
import { QuickActions } from "@/components/admin/quick-actions";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Car,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Timer,
  Calendar,
  Activity,
  FileText,
} from "lucide-react";

export default function WatchmanDashboard() {
  const { user } = useAuth();
  const { fetchBookingRequests } = useDataStore();
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/watchman/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchBookingRequests(); // Poll for notifications too

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchBookingRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchBookingRequests]);

  if (isLoading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const { stats, occupancy, schedule, recentActivity } = dashboardData || {
    stats: { todayCheckIns: 0, todayCheckOuts: 0, pendingArrivals: 0, overstays: 0, pendingRequestsCount: 0 },
    occupancy: { totalCapacity: 0, totalOccupied: 0, locations: [] },
    schedule: [],
    recentActivity: []
  };

  const occupancyRate = occupancy.totalCapacity > 0 
    ? Math.round((occupancy.totalOccupied / occupancy.totalCapacity) * 100) 
    : 0;

  const today = new Date();

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Watchman Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {user?.firstName}! Manage check-ins and check-outs.
          </p>
        </div>
        <Link href="/watchman/scan">
          <Button size="lg" className="w-full sm:w-auto">
            <QrCode className="w-5 h-5 mr-2" />
            Scan QR Code
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Check-ins Today"
          value={stats.todayCheckIns}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Check-outs Today"
          value={stats.todayCheckOuts}
          icon={XCircle}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Pending Arrivals"
          value={stats.pendingArrivals}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
        <StatCard
          title="Overstays"
          value={stats.overstays}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          subtitle={stats.overstays > 0 ? "Action required" : "None"}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions
        title="Quick Actions"
        description="Common operations"
        columns={4}
        actions={[
          {
            label: "Scan QR Code",
            description: "Check-in or check-out",
            href: "/watchman/scan",
            icon: QrCode,
            iconColor: "text-primary",
            iconBgColor: "bg-primary/10",
          },
          {
            label: "Today's Bookings",
            description: `${schedule.length} reservations`,
            href: "/watchman/bookings?tab=today",
            icon: Calendar,
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-100",
          },
          {
            label: "Booking Requests",
            description: `${stats.pendingRequestsCount} pending`,
            href: "/watchman/bookings?tab=requests",
            icon: FileText,
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-100",
          },
          {
            label: "Active Sessions",
            description: "View all sessions",
            href: "/watchman/sessions",
            icon: Timer,
            iconColor: "text-green-600",
            iconBgColor: "bg-green-100",
          },
          {
            label: "Activity Log",
            description: "View shift activity",
            href: "/watchman/activity",
            icon: Activity,
            iconColor: "text-purple-600",
            iconBgColor: "bg-purple-100",
          },
        ]}
      />

      {/* Current Occupancy & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Current Occupancy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Occupancy</CardTitle>
            <CardDescription>Your assigned locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold text-foreground">
                  {occupancyRate}%
                </span>
                <span className="text-sm text-muted-foreground">occupied</span>
              </div>
              <Progress value={occupancyRate} className="h-3" />
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{occupancy.totalCapacity}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-green-50">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {occupancy.totalCapacity - occupancy.totalOccupied}
                  </p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                  <p className="text-xl sm:text-2xl font-bold text-primary">{occupancy.totalOccupied}</p>
                  <p className="text-xs text-muted-foreground">Occupied</p>
                </div>
              </div>

              {/* Assigned Locations */}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Assigned Locations</p>
                {occupancy.locations.map((location: any) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{location.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {location.available}/{location.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
              <CardDescription>Upcoming check-ins and check-outs</CardDescription>
            </div>
            <Link href="/watchman/bookings">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedule.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings scheduled for today
                </div>
              ) : (
                schedule.map((booking: any) => {
                  const isCheckIn =
                    new Date(booking.checkIn).toDateString() === today.toDateString();
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isCheckIn ? "bg-green-100" : "bg-blue-100"
                          }`}
                        >
                          {isCheckIn ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {booking.vehiclePlate}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {isCheckIn
                                ? `Check-in: ${formatTime(new Date(booking.checkIn))}`
                                : `Check-out: ${formatTime(new Date(booking.checkOut))}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge
                        status={isCheckIn ? "Arriving" : "Leaving"}
                        variant={isCheckIn ? "success" : "info"}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overstays Alert */}
      {stats.overstays > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-lg text-red-900">Overstay Alerts</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              These vehicles have exceeded their booking time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Note: In a real system, you'd fetch specific overstay sessions */}
              <p className="text-sm text-muted-foreground py-4 text-center">
                Review overstaying vehicles in the Sessions tab
              </p>
              <Link href="/watchman/sessions?status=overstay">
                <Button variant="destructive" className="w-full">
                  View Overstays
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Your latest check-ins and check-outs</CardDescription>
          </div>
          <Link href="/watchman/activity">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        session.status === "checked_in" ? "bg-green-100" : "bg-blue-100"
                      }`}
                    >
                      {session.status === "checked_in" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        {session.vehiclePlate}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.status === "checked_in"
                          ? `Checked in ${formatTime(new Date(session.time))}`
                          : `Checked out ${formatTime(new Date(session.time))}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={session.status.replace("_", " ")}
                    variant={
                      session.status === "checked_in"
                        ? "success"
                        : session.status === "checked_out"
                        ? "info"
                        : session.status === "overstay"
                        ? "error"
                        : "warning"
                    }
                  />
                </div>
              ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
