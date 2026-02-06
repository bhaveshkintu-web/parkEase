"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Calendar,
  MapPin,
  Car,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type {
  OverviewMetrics,
  RevenueTrendDataPoint,
  BookingCategory,
  TopLocationData,
  DateRangePeriod,
} from "@/lib/types/analytics.types";

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  prefix = "",
  suffix = "",
  loading = false,
}: {
  title: string;
  value: string | number;
  change: number;
  changeType: "positive" | "negative";
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-card/80">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
            </p>
            <div
              className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                changeType === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {changeType === "positive" ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>{changeType === "positive" ? "+" : ""}{Math.abs(change).toFixed(1)}% vs previous period</span>
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-inner">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Revenue Trend Chart Component
function RevenueTrendChart({
  data,
  loading,
}: {
  data: RevenueTrendDataPoint[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Revenue Trend</CardTitle>
        <CardDescription>Monthly revenue and bookings overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No revenue data available for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  className="text-xs"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0d9488"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  dot={{ fill: "#0d9488", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#0d9488" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Booking Distribution Chart Component
function BookingDistributionChart({
  data,
  totalBookings,
  loading,
}: {
  data: BookingCategory[];
  totalBookings: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const CustomLabel = ({ viewBox, value }: { viewBox?: { cx: number; cy: number }; value: number }) => {
    if (!viewBox) return null;
    const { cx, cy } = viewBox;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
        <tspan x={cx} y={cy - 10} className="fill-foreground text-2xl font-bold">
          {value.toLocaleString()}
        </tspan>
        <tspan x={cx} y={cy + 14} className="fill-muted-foreground text-sm">
          Total
        </tspan>
      </text>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Bookings by Type</CardTitle>
        <CardDescription>Distribution of parking types</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center">
          {totalBookings === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No booking data available for the selected period
            </div>
          ) : (
            <>
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend content={() => null} />
                  {/* @ts-expect-error - Custom label component */}
                  <text>
                    <CustomLabel viewBox={{ cx: 100, cy: 150 }} value={totalBookings} />
                  </text>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {data.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <span className="text-sm text-foreground font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.count})</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Top Locations Table Component
function TopLocationsTable({
  data,
  loading,
}: {
  data: TopLocationData[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Performing Locations</CardTitle>
        <CardDescription>Locations ranked by revenue and bookings</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No location data available for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-sm">Location</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-sm">Bookings</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-sm">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-sm">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {data.map((location) => (
                  <tr
                    key={location.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                          #{location.rank}
                        </span>
                        <div>
                          <span className="font-medium text-foreground">{location.name}</span>
                          <p className="text-xs text-muted-foreground">
                            {location.city}{location.state ? `, ${location.state}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4 font-medium">
                      {location.bookings.toLocaleString()}
                    </td>
                    <td className="text-right py-4 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                      ${location.revenue.toLocaleString()}
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end gap-3">
                        <Progress value={location.occupancy} className="w-20 h-2" />
                        <span className="text-sm font-medium w-12 text-right">{location.occupancy}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// CSV Export Utility
function exportToCSV(
  overview: OverviewMetrics | null,
  revenueTrend: RevenueTrendDataPoint[],
  bookingDistribution: BookingCategory[],
  topLocations: TopLocationData[]
) {
  let csv = "Admin Analytics Report\n\n";

  // Overview Section
  csv += "OVERVIEW METRICS\n";
  csv += "Metric,Current Value,Previous Value,Change %\n";
  if (overview) {
    csv += `Total Revenue,$${overview.totalRevenue.current.toLocaleString()},$${overview.totalRevenue.previous.toLocaleString()},${overview.totalRevenue.change.percentage}%\n`;
    csv += `Total Bookings,${overview.totalBookings.current},${overview.totalBookings.previous},${overview.totalBookings.change.percentage}%\n`;
    csv += `Active Locations,${overview.activeLocations.current},${overview.activeLocations.previous},${overview.activeLocations.change.percentage}%\n`;
    csv += `Average Occupancy,${overview.averageOccupancy.current}%,${overview.averageOccupancy.previous}%,${overview.averageOccupancy.change.percentage}%\n`;
  }

  // Revenue Trend Section
  csv += "\nREVENUE TREND\n";
  csv += "Month,Revenue,Bookings\n";
  revenueTrend.forEach((item) => {
    csv += `${item.monthLabel} ${item.year},$${item.revenue.toLocaleString()},${item.bookings}\n`;
  });

  // Booking Distribution Section
  csv += "\nBOOKING DISTRIBUTION\n";
  csv += "Category,Count,Percentage\n";
  bookingDistribution.forEach((item) => {
    csv += `${item.name},${item.count},${item.value}%\n`;
  });

  // Top Locations Section
  csv += "\nTOP PERFORMING LOCATIONS\n";
  csv += "Rank,Location,City,Revenue,Bookings,Occupancy %\n";
  topLocations.forEach((loc) => {
    csv += `${loc.rank},${loc.name},${loc.city},$${loc.revenue.toLocaleString()},${loc.bookings},${loc.occupancy}%\n`;
  });

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `analytics-report-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

// Main Analytics Page Component
export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangePeriod>("30d");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Data states
  const [overviewData, setOverviewData] = useState<OverviewMetrics | null>(null);
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendDataPoint[]>([]);
  const [bookingDistributionData, setBookingDistributionData] = useState<BookingCategory[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [topLocationsData, setTopLocationsData] = useState<TopLocationData[]>([]);

  // Fetch all analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [overviewRes, trendRes, distributionRes, locationsRes] = await Promise.all([
        fetch(`/api/admin/analytics/overview?period=${dateRange}`),
        fetch(`/api/admin/analytics/revenue-trend?period=${dateRange}`),
        fetch(`/api/admin/analytics/booking-distribution?period=${dateRange}`),
        fetch(`/api/admin/analytics/top-locations?period=${dateRange}&limit=5`),
      ]);

      if (overviewRes.ok) {
        const overviewJson = await overviewRes.json();
        setOverviewData(overviewJson.data);
      }

      if (trendRes.ok) {
        const trendJson = await trendRes.json();
        setRevenueTrendData(trendJson.data || []);
      }

      if (distributionRes.ok) {
        const distributionJson = await distributionRes.json();
        setBookingDistributionData(distributionJson.categories || []);
        setTotalBookings(distributionJson.totalBookings || 0);
      }

      if (locationsRes.ok) {
        const locationsJson = await locationsRes.json();
        setTopLocationsData(locationsJson.locations || []);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Handle export
  const handleExport = async () => {
    setExporting(true);
    try {
      exportToCSV(overviewData, revenueTrendData, bookingDistributionData, topLocationsData);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePeriod)}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || loading}
            className="bg-transparent"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={overviewData ? `$${overviewData.totalRevenue.current.toLocaleString()}` : "$0"}
          change={overviewData?.totalRevenue.change.percentage || 0}
          changeType={overviewData?.totalRevenue.change.isPositive ? "positive" : "negative"}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Total Bookings"
          value={overviewData?.totalBookings.current || 0}
          change={overviewData?.totalBookings.change.percentage || 0}
          changeType={overviewData?.totalBookings.change.isPositive ? "positive" : "negative"}
          icon={Calendar}
          loading={loading}
        />
        <StatCard
          title="Active Locations"
          value={overviewData?.activeLocations.current || 0}
          change={overviewData?.activeLocations.change.percentage || 0}
          changeType={overviewData?.activeLocations.change.isPositive ? "positive" : "negative"}
          icon={MapPin}
          loading={loading}
        />
        <StatCard
          title="Avg Occupancy"
          value={overviewData?.averageOccupancy.current || 0}
          suffix="%"
          change={overviewData?.averageOccupancy.change.percentage || 0}
          changeType={overviewData?.averageOccupancy.change.isPositive ? "positive" : "negative"}
          icon={Car}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueTrendChart data={revenueTrendData} loading={loading} />
        <BookingDistributionChart
          data={bookingDistributionData}
          totalBookings={totalBookings}
          loading={loading}
        />
      </div>

      {/* Top Locations Table */}
      <TopLocationsTable data={topLocationsData} loading={loading} />
    </div>
  );
}
