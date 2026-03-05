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
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/owner">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Monitor your parking performance and insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Slots</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {metrics.totalSpots}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-green-600 text-sm font-medium">{metrics.availableSpots}</span>
                  <span className="text-muted-foreground text-sm">available</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <ParkingCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Booked</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {metrics.occupiedSpots}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-sm font-medium ${metrics.occupancyRate >= 70 ? "text-green-600" : "text-amber-600"}`}>
                    {metrics.occupancyRate}%
                  </span>
                  <span className="text-muted-foreground text-sm">occupancy</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Car className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {metrics.availableSpots}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-muted-foreground text-sm">
                    {metrics.totalLocations} locations
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Future Bookings</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {metrics.futureBookings}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-blue-600 text-sm font-medium">{metrics.todayBookings}</span>
                  <span className="text-muted-foreground text-sm">today</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Overview + Booking Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Occupancy Gauge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Current Occupancy</CardTitle>
            <CardDescription>Real-time parking utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  data={occupancyRadialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ChartContainer>
            </div>
            <div className="text-center -mt-8">
              <p className="text-4xl font-bold text-foreground">{metrics.occupancyRate}%</p>
              <p className="text-sm text-muted-foreground">
                {metrics.occupiedSpots} of {metrics.totalSpots} spots occupied
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{metrics.availableSpots}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{metrics.occupiedSpots}</p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Booking Status Overview</CardTitle>
            <CardDescription>Current reservation status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics.confirmedBookings}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics.pendingBookings}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics.cancelledBookings}</p>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Confirmation Rate</span>
                  <span className="font-medium text-foreground">
                    {metrics.totalBookings > 0
                      ? Math.round((metrics.confirmedBookings / metrics.totalBookings) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress
                  value={metrics.totalBookings > 0 ? (metrics.confirmedBookings / metrics.totalBookings) * 100 : 0}
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Cancellation Rate</span>
                  <span className="font-medium text-foreground">
                    {metrics.totalBookings > 0
                      ? Math.round((metrics.cancelledBookings / metrics.totalBookings) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress
                  value={metrics.totalBookings > 0 ? (metrics.cancelledBookings / metrics.totalBookings) * 100 : 0}
                  className="h-2 [&>div]:bg-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Booking Trends</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Occupancy</TabsTrigger>
          <TabsTrigger value="locations">Location Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Booking Trends</CardTitle>
              <CardDescription>Daily bookings, check-ins, and check-outs</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
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
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
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
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">Bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Check-ins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm text-muted-foreground">Check-outs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Occupancy Pattern</CardTitle>
              <CardDescription>Average occupancy rate throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={hourlyOccupancy} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval={2}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
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
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-foreground">7AM - 10AM</p>
                  <p className="text-sm text-muted-foreground">Morning Peak</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-foreground">4PM - 7PM</p>
                  <p className="text-sm text-muted-foreground">Evening Peak</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-foreground">10PM - 5AM</p>
                  <p className="text-sm text-muted-foreground">Low Traffic</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Location Performance</CardTitle>
              <CardDescription>Compare performance across your parking locations</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Watchmen Activity Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
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
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{metrics.totalWatchmen}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{metrics.activeWatchmen}</p>
              <p className="text-sm text-muted-foreground">Active Now</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {watchmen.reduce((sum, w) => sum + w.todayCheckIns, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Today's Check-ins</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">
                {watchmen.reduce((sum, w) => sum + w.todayCheckOuts, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Today's Check-outs</p>
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
