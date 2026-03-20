"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import {
  Car,
  MapPin,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  BarChart3,
  Activity,
  ParkingCircle,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function OwnerAnalyticsPage() {
  const { user } = useAuth();
  const { adminLocations, reservations, watchmen, initializeForOwner } = useDataStore();
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedLocation, setSelectedLocation] = useState("all");

  // Initialize owner data
  React.useEffect(() => {
    if (user?.ownerId) {
      initializeForOwner(user.ownerId);
    }
  }, [user?.ownerId, initializeForOwner]);

  const myLocations = adminLocations.filter((l) => l.createdBy === user?.id || true);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalSpots = myLocations.reduce((sum, l) => sum + l.totalSpots, 0);
    const availableSpots = myLocations.reduce((sum, l) => sum + l.availableSpots, 0);
    const occupiedSpots = totalSpots - availableSpots;
    const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;

    const totalBookings = myLocations.reduce((sum, l) => sum + l.analytics.totalBookings, 0);
    const totalRevenue = myLocations.reduce((sum, l) => sum + l.analytics.revenue, 0);
    const avgRating = myLocations.length > 0
      ? myLocations.reduce((sum, l) => sum + l.analytics.averageRating, 0) / myLocations.length
      : 0;

    // Future bookings (upcoming)
    const now = new Date();
    const futureBookings = reservations.filter((r) => new Date(r.checkIn) > now).length;
    const todayBookings = reservations.filter(
      (r) => new Date(r.checkIn).toDateString() === now.toDateString()
    ).length;

    // Booking status breakdown
    const confirmedBookings = reservations.filter((r) => r.status === "confirmed").length;
    const pendingBookings = reservations.filter((r) => r.status === "pending").length;
    const cancelledBookings = reservations.filter((r) => r.status === "cancelled").length;

    return {
      totalSpots,
      availableSpots,
      occupiedSpots,
      occupancyRate,
      totalBookings,
      totalRevenue,
      avgRating: Math.round(avgRating * 10) / 10,
      futureBookings,
      todayBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      activeLocations: myLocations.filter((l) => l.status === "ACTIVE").length,
      totalLocations: myLocations.length,
      activeWatchmen: watchmen.filter((w) => w.status === "active").length,
      totalWatchmen: watchmen.length,
    };
  }, [myLocations, reservations, watchmen]);

  const [bookingTrendData, setBookingTrendData] = useState<any[]>([]);
  const [hourlyOccupancy, setHourlyOccupancy] = useState<any[]>([]);

  // Generate booking trend data and occupancy on client mount
  React.useEffect(() => {
    // Trend Data
    const now = new Date();
    const trendData = [];
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayLabel = timeRange === "7d"
        ? date.toLocaleDateString("en-US", { weekday: "short" })
        : date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

      const bookings = Math.floor(3 + Math.random() * 12);
      const checkIns = Math.floor(bookings * 0.8);
      const checkOuts = Math.floor(bookings * 0.7);

      trendData.push({
        date: dayLabel,
        bookings,
        checkIns,
        checkOuts,
      });
    }
    setBookingTrendData(trendData);

    // Hourly Occupancy
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, "0") + ":00";
      // Simulate higher occupancy during peak hours
      let occupancy;
      if (i >= 7 && i <= 10) {
        occupancy = 70 + Math.random() * 25; // Morning peak
      } else if (i >= 16 && i <= 19) {
        occupancy = 75 + Math.random() * 20; // Evening peak
      } else if (i >= 22 || i <= 5) {
        occupancy = 30 + Math.random() * 20; // Night
      } else {
        occupancy = 50 + Math.random() * 25; // Normal hours
      }
      hours.push({
        hour,
        occupancy: Math.round(occupancy),
      });
    }
    setHourlyOccupancy(hours);
  }, [timeRange]);

  // Location performance data
  const locationPerformance = useMemo(() => {
    return myLocations.map((loc) => ({
      id: loc.id,
      name: loc.name.length > 20 ? loc.name.substring(0, 20) + "..." : loc.name,
      fullName: loc.name,
      bookings: loc.analytics.totalBookings,
      revenue: loc.analytics.revenue,
      rating: loc.analytics.averageRating,
      occupancy: loc.analytics.occupancyRate,
      spots: loc.totalSpots,
      available: loc.availableSpots,
    }));
  }, [myLocations]);

  // Radial chart data for occupancy
  const occupancyRadialData = useMemo(() => {
    return [
      {
        name: "Occupancy",
        value: metrics.occupancyRate,
        fill: metrics.occupancyRate >= 70 ? "hsl(142 76% 36%)" : metrics.occupancyRate >= 40 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)",
      },
    ];
  }, [metrics.occupancyRate]);

  // ── Full dashboard ──
  const chartConfig = {
    bookings: { label: "Bookings", color: "hsl(221 83% 53%)" },
    checkIns: { label: "Check-ins", color: "hsl(142 76% 36%)" },
    checkOuts: { label: "Check-outs", color: "hsl(262 83% 58%)" },
    occupancy: { label: "Occupancy", color: "hsl(38 92% 50%)" },
    value: { label: "Occupancy Rate", color: "hsl(142 76% 36%)" },
    date: { label: "Date", color: "hsl(0 0% 50%)" },
    hour: { label: "Hour", color: "hsl(0 0% 50%)" },
  };

  return (
    <div className="py-3 sm:py-6 space-y-5 sm:space-y-6 w-full overflow-x-hidden px-4 box-border">
      {/* Header Row: back arrow + title only */}
      <div className="flex items-center gap-2">
        <Link href="/owner">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">Analytics</h1>
      </div>

      {/* Full-width date selector row — centered on mobile */}
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="w-full max-w-md mx-auto h-11 px-4 border border-border/30 bg-card rounded-xl shadow-sm text-sm font-medium gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      {/* Metric Cards — single column stack on mobile, grid on wider screens */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Slots */}
        <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-border/15 flex items-center justify-between gap-4 overflow-hidden">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-amber-600">Total Slots</p>
            <p className="text-[26px] font-bold text-foreground leading-snug mt-1">{metrics.totalSpots}</p>
            <p className="text-sm mt-0.5">
              <span className="text-green-600 font-semibold">{metrics.availableSpots}</span>
              <span className="text-muted-foreground"> available</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ParkingCircle className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Total Booked */}
        <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-border/15 flex items-center justify-between gap-4 overflow-hidden">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-amber-600">Total Booked</p>
            <p className="text-[26px] font-bold text-foreground leading-snug mt-1">{metrics.occupiedSpots}</p>
            <p className="text-sm mt-0.5">
              <span className={`font-semibold ${metrics.occupancyRate >= 70 ? "text-green-600" : "text-amber-500"}`}>{metrics.occupancyRate}%</span>
              <span className="text-muted-foreground"> occupancy</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
            <Car className="w-6 h-6 text-green-600" />
          </div>
        </div>

        {/* Remaining */}
        <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-border/15 flex items-center justify-between gap-4 overflow-hidden">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-amber-600">Remaining</p>
            <p className="text-[26px] font-bold text-foreground leading-snug mt-1">{metrics.availableSpots}</p>
            <p className="text-sm mt-0.5 text-muted-foreground">{metrics.totalLocations} locations</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Future Bookings */}
        <div className="bg-card rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-border/15 flex items-center justify-between gap-4 overflow-hidden">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-amber-600">Future Bookings</p>
            <p className="text-[26px] font-bold text-foreground leading-snug mt-1">{metrics.futureBookings}</p>
            <p className="text-sm mt-0.5">
              <span className="text-blue-600 font-semibold">{metrics.todayBookings}</span>
              <span className="text-muted-foreground"> today</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-purple-600" />
          </div>
        </div>

      </div>

      {/* Current Occupancy + Booking Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Occupancy Gauge */}
        <div className="bg-card rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] ring-1 ring-border/15 p-4">
          <p className="text-base font-semibold text-foreground">Current Occupancy</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">Real-time parking utilization</p>

          <div className="h-[190px] relative bg-muted/5 rounded-xl overflow-hidden">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <RadialBarChart
                cx="50%"
                cy="75%"
                innerRadius="80%"
                outerRadius="110%"
                data={occupancyRadialData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ChartContainer>
            <div className="absolute top-[62%] left-1/2 -translate-x-1/2 text-center w-full px-2">
              <p className="text-[28px] font-bold text-foreground leading-tight">{metrics.occupancyRate}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {metrics.occupiedSpots} of {metrics.totalSpots} spots
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="flex items-center justify-between px-3 py-2.5 bg-green-50 border border-green-100 rounded-xl overflow-hidden">
              <p className="text-[11px] text-green-800 font-bold uppercase tracking-wide">Avail.</p>
              <p className="text-lg font-bold text-green-600">{metrics.availableSpots}</p>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
              <p className="text-[11px] text-blue-800 font-bold uppercase tracking-wide">Occup.</p>
              <p className="text-lg font-bold text-blue-600">{metrics.occupiedSpots}</p>
            </div>
          </div>
        </div>

        {/* Booking Status */}
        <div className="bg-card rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] ring-1 ring-border/15 p-4 overflow-hidden lg:col-span-2">
          <p className="text-base font-semibold text-foreground">Booking Status Overview</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Current reservation status breakdown</p>

          <div className="space-y-2 mb-5">
            {[
              { label: "Confirmed", icon: <CheckCircle className="w-4 h-4 text-green-600" />, count: metrics.confirmedBookings, bg: "bg-green-50", border: "border-green-100" },
              { label: "Pending",   icon: <AlertCircle className="w-4 h-4 text-amber-600" />, count: metrics.pendingBookings,   bg: "bg-amber-50", border: "border-amber-100" },
              { label: "Cancelled", icon: <XCircle     className="w-4 h-4 text-red-500"   />, count: metrics.cancelledBookings, bg: "bg-red-50",   border: "border-red-100" },
            ].map(({ label, icon, count, bg, border }) => (
              <div key={label} className={`flex items-center justify-between px-3 py-2.5 ${bg} border ${border} rounded-xl overflow-hidden`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0">{icon}</span>
                  <span className="text-sm font-medium text-foreground truncate">{label}</span>
                </div>
                <span className="text-base font-bold text-foreground shrink-0 ml-2">{count}</span>
              </div>
            ))}
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Confirmation Rate</span>
                <span className="font-semibold text-foreground">
                  {metrics.totalBookings > 0 ? Math.round((metrics.confirmedBookings / metrics.totalBookings) * 100) : 0}%
                </span>
              </div>
              <Progress value={metrics.totalBookings > 0 ? (metrics.confirmedBookings / metrics.totalBookings) * 100 : 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Cancellation Rate</span>
                <span className="font-semibold text-foreground">
                  {metrics.totalBookings > 0 ? Math.round((metrics.cancelledBookings / metrics.totalBookings) * 100) : 0}%
                </span>
              </div>
              <Progress value={metrics.totalBookings > 0 ? (metrics.cancelledBookings / metrics.totalBookings) * 100 : 0} className="h-2 [&>div]:bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="flex w-full justify-start overflow-x-auto no-scrollbar bg-transparent h-auto p-0 gap-2 border-0">
          <TabsTrigger value="bookings" className="data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent text-muted-foreground rounded-full px-4 py-2 text-[13px] font-medium transition-all shrink-0">Booking Trends</TabsTrigger>
          <TabsTrigger value="hourly" className="data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent text-muted-foreground rounded-full px-4 py-2 text-[13px] font-medium transition-all shrink-0">Hourly Occupancy</TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent text-muted-foreground rounded-full px-4 py-2 text-[13px] font-medium transition-all shrink-0">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <div className="bg-card rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] ring-1 ring-border/15 p-4">
            <p className="text-base font-semibold text-foreground">Booking Trends</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Daily bookings, check-ins, and check-outs</p>
            <ChartContainer config={chartConfig} className="h-[200px] sm:h-[320px] w-full shrink-1">
                <AreaChart data={bookingTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="checkInsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    minTickGap={20}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    stroke="hsl(221 83% 53%)"
                    strokeWidth={2}
                    fill="url(#bookingsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="checkIns"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    fill="url(#checkInsGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="checkOuts"
                    stroke="hsl(262 83% 58%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Bookings</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Check-ins</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Check-outs</span>
                </div>
              </div>
          </div>
        </TabsContent>

        <TabsContent value="hourly">
          <div className="bg-card rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] ring-1 ring-border/15 p-4 box-border w-full">
            <p className="text-base font-semibold text-foreground">Hourly Occupancy Pattern</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Average occupancy rate throughout the day</p>
            <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full shrink-1">
                <BarChart data={hourlyOccupancy} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 9 }}
                    minTickGap={20}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium">{payload[0].payload.hour}</p>
                            <p className="text-sm text-muted-foreground">
                              Occupancy: <span className="font-medium text-foreground">{payload[0].value}%</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="occupancy"
                    fill="hsl(38 92% 50%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
            </ChartContainer>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm font-bold text-foreground">7AM–10AM</p>
                <p className="text-[11px] text-muted-foreground">Morning Peak</p>
              </div>
              <div className="text-center p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-sm font-bold text-foreground">4PM–7PM</p>
                <p className="text-[11px] text-muted-foreground">Evening Peak</p>
              </div>
              <div className="text-center p-2.5 bg-muted/50 rounded-xl">
                <p className="text-sm font-bold text-foreground">10PM–5AM</p>
                <p className="text-[11px] text-muted-foreground">Low Traffic</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <div className="bg-card rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] ring-1 ring-border/15 p-4 box-border w-full">
            <p className="text-base font-semibold text-foreground">Location Performance</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Compare performance across your parking locations</p>
            <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Spots</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Available</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Occupancy</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Bookings</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationPerformance.map((loc) => (
                      <tr key={loc.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-foreground" title={loc.fullName}>
                              {loc.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4 text-foreground">{loc.spots}</td>
                        <td className="text-center py-4 px-4">
                          <span className="text-green-600 font-medium">{loc.available}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={loc.occupancy} className="w-16 h-2" />
                            <span className={`text-sm font-medium ${loc.occupancy >= 70 ? "text-green-600" : loc.occupancy >= 40 ? "text-amber-600" : "text-red-600"
                              }`}>
                              {loc.occupancy}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-medium text-foreground">{loc.bookings}</td>
                        <td className="text-right py-4 px-4 font-medium text-foreground">
                          {formatCurrency(loc.revenue)}
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-amber-500">★</span>
                            <span className="font-medium text-foreground">{loc.rating.toFixed(1)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Watchmen Activity Summary */}
      <Card className="w-full box-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Watchmen Overview</CardTitle>
            <CardDescription>Staff activity and performance summary</CardDescription>
          </div>
          <Link href="/owner/watchmen">
            <Button variant="outline" size="sm" className="bg-transparent">
              Manage Staff
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 text-center sm:text-left">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-2xl flex flex-col justify-center">
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{metrics.totalWatchmen}</p>
              <p className="text-xs sm:text-sm mt-1 text-muted-foreground break-words">Total Staff</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-2xl flex flex-col justify-center">
              <p className="text-2xl lg:text-3xl font-bold text-green-600">{metrics.activeWatchmen}</p>
              <p className="text-xs sm:text-sm mt-1 text-muted-foreground break-words">Active Now</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-2xl flex flex-col justify-center">
              <p className="text-2xl lg:text-3xl font-bold text-blue-600">
                {watchmen.reduce((sum, w) => sum + w.todayCheckIns, 0)}
              </p>
              <p className="text-xs sm:text-sm mt-1 text-muted-foreground break-words">Check-ins</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-2xl flex flex-col justify-center">
              <p className="text-2xl lg:text-3xl font-bold text-purple-600">
                {watchmen.reduce((sum, w) => sum + w.todayCheckOuts, 0)}
              </p>
              <p className="text-xs sm:text-sm mt-1 text-muted-foreground break-words">Check-outs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchmen.slice(0, 6).map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {w.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{w.shift} shift</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${w.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                  {w.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
