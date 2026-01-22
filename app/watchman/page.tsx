"use client";

import Link from "next/link";
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
  Activity, // Added import for Activity
} from "lucide-react";

export default function WatchmanDashboard() {
  const { user } = useAuth();
  const { reservations, parkingSessions, adminLocations } = useDataStore();

  // Get today's bookings
  const today = new Date();
  const todayBookings = reservations.filter(
    (r) =>
      new Date(r.checkIn).toDateString() === today.toDateString() ||
      new Date(r.checkOut).toDateString() === today.toDateString()
  );

  // Get current watchman stats
  const todayCheckIns = parkingSessions.filter(
    (s) => s.checkInTime && new Date(s.checkInTime).toDateString() === today.toDateString()
  ).length;

  const todayCheckOuts = parkingSessions.filter(
    (s) => s.checkOutTime && new Date(s.checkOutTime).toDateString() === today.toDateString()
  ).length;

  const pendingSessions = parkingSessions.filter((s) => s.status === "pending");
  const activeOversays = parkingSessions.filter((s) => s.status === "overstay");

  // Assigned locations (demo: first 2 locations)
  const assignedLocations = adminLocations.slice(0, 2);
  const totalCapacity = assignedLocations.reduce((sum, l) => sum + l.totalSpots, 0);
  const totalOccupied = assignedLocations.reduce(
    (sum, l) => sum + (l.totalSpots - l.availableSpots),
    0
  );
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

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
          value={todayCheckIns}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Check-outs Today"
          value={todayCheckOuts}
          icon={XCircle}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Pending Arrivals"
          value={pendingSessions.length}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
        <StatCard
          title="Overstays"
          value={activeOversays.length}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          subtitle={activeOversays.length > 0 ? "Action required" : "None"}
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
            description: `${todayBookings.length} reservations`,
            href: "/watchman/bookings",
            icon: Calendar,
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-100",
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
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalCapacity}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-green-50">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {totalCapacity - totalOccupied}
                  </p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                  <p className="text-xl sm:text-2xl font-bold text-primary">{totalOccupied}</p>
                  <p className="text-xs text-muted-foreground">Occupied</p>
                </div>
              </div>

              {/* Assigned Locations */}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Assigned Locations</p>
                {assignedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{location.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {location.availableSpots}/{location.totalSpots}
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
              {todayBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings scheduled for today
                </div>
              ) : (
                todayBookings.slice(0, 5).map((booking) => {
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
                            {booking.vehicleInfo.licensePlate}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {isCheckIn
                                ? `Check-in: ${formatTime(booking.checkIn)}`
                                : `Check-out: ${formatTime(booking.checkOut)}`}
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
      {activeOversays.length > 0 && (
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
              {activeOversays.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        {session.vehiclePlate}
                      </p>
                      <p className="text-xs text-red-600">
                        Overstay since {formatTime(session.checkInTime!)}
                      </p>
                    </div>
                  </div>
                  <Link href={`/watchman/sessions/${session.id}`}>
                    <Button variant="destructive" size="sm">
                      Handle
                    </Button>
                  </Link>
                </div>
              ))}
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
            {parkingSessions
              .filter((s) => s.checkInTime || s.checkOutTime)
              .slice(0, 4)
              .map((session) => (
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
                          ? `Checked in ${formatTime(session.checkInTime!)}`
                          : `Checked out ${formatTime(session.checkOutTime!)}`}
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
            {parkingSessions.filter((s) => s.checkInTime || s.checkOutTime).length === 0 && (
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
