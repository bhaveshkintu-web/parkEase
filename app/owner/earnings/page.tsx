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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  PiggyBank,
  MapPin,
  ChevronLeft,
} from "lucide-react";

export default function OwnerEarningsPage() {
  const { user } = useAuth();
  const { adminLocations, transactions, wallet, initializeForOwner } = useDataStore();
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedLocation, setSelectedLocation] = useState("all");

  // Initialize owner data
  React.useEffect(() => {
    if (user?.ownerId) {
      initializeForOwner(user.ownerId);
    }
  }, [user?.ownerId, initializeForOwner]);

  // Safe transactions access
  const safeTransactions = transactions || [];
  const myLocations = adminLocations.filter((l) => l.createdBy === user?.id || true);

  // Generate earnings data based on time range
  const earningsData = useMemo(() => {
    const now = new Date();
    const data = [];
    let days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = timeRange === "7d" 
        ? date.toLocaleDateString("en-US", { weekday: "short" })
        : timeRange === "30d"
        ? date.toLocaleDateString("en-US", { day: "numeric", month: "short" })
        : date.toLocaleDateString("en-US", { month: "short" });
      
      // Generate realistic earnings data
      const baseEarnings = 150 + Math.random() * 200;
      const commission = baseEarnings * 0.1;
      const bookings = Math.floor(5 + Math.random() * 15);
      
      data.push({
        date: dayName,
        fullDate: date.toLocaleDateString(),
        earnings: Math.round(baseEarnings * 100) / 100,
        commission: Math.round(commission * 100) / 100,
        net: Math.round((baseEarnings - commission) * 100) / 100,
        bookings,
      });
    }
    return data;
  }, [timeRange]);

  // Location-based earnings breakdown
  const locationEarnings = useMemo(() => {
    return myLocations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      earnings: loc.analytics.revenue,
      bookings: loc.analytics.totalBookings,
      avgPerBooking: loc.analytics.totalBookings > 0 
        ? Math.round(loc.analytics.revenue / loc.analytics.totalBookings * 100) / 100 
        : 0,
      occupancy: loc.analytics.occupancyRate,
    }));
  }, [myLocations]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalEarnings = earningsData.reduce((sum, d) => sum + d.earnings, 0);
    const totalCommission = earningsData.reduce((sum, d) => sum + d.commission, 0);
    const totalBookings = earningsData.reduce((sum, d) => sum + d.bookings, 0);
    const avgDaily = totalEarnings / earningsData.length;
    
    // Compare to previous period
    const prevPeriodEarnings = totalEarnings * (0.85 + Math.random() * 0.3);
    const growthRate = ((totalEarnings - prevPeriodEarnings) / prevPeriodEarnings) * 100;

    return {
      totalEarnings,
      totalCommission,
      netEarnings: totalEarnings - totalCommission,
      totalBookings,
      avgDaily,
      growthRate: Math.round(growthRate * 10) / 10,
    };
  }, [earningsData]);

  // Pie chart data for earnings distribution
  const distributionData = useMemo(() => {
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    return locationEarnings.slice(0, 5).map((loc, i) => ({
      name: loc.name.length > 15 ? loc.name.substring(0, 15) + "..." : loc.name,
      value: loc.earnings,
      fill: colors[i % colors.length],
    }));
  }, [locationEarnings]);

  const chartConfig = {
    earnings: { label: "Earnings", color: "hsl(142 76% 36%)" },
    commission: { label: "Commission", color: "hsl(0 84% 60%)" },
    net: { label: "Net", color: "hsl(221 83% 53%)" },
    bookings: { label: "Bookings", color: "hsl(262 83% 58%)" },
    value: { label: "Revenue", color: "hsl(221 83% 53%)" },
    date: { label: "Date", color: "hsl(0 0% 50%)" },
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Earnings</h1>
            <p className="text-muted-foreground mt-1">
              Track your revenue and financial performance
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
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(totals.totalEarnings)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {totals.growthRate >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                  <span className={totals.growthRate >= 0 ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                    {Math.abs(totals.growthRate)}%
                  </span>
                  <span className="text-muted-foreground text-sm">vs prev period</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Earnings</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(totals.netEarnings)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">After commission</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commission Paid</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(totals.totalCommission)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">10% platform fee</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Daily</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(totals.avgDaily)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{totals.totalBookings} bookings</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balance Card */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-green-100 font-medium">Available Balance</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1">
                {formatCurrency(wallet?.balance || 0)}
              </p>
              <p className="text-green-100 text-sm mt-1">Ready for withdrawal</p>
            </div>
            <div className="flex gap-2">
              <Link href="/owner/wallet">
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  View Wallet
                </Button>
              </Link>
              <Link href="/owner/wallet/withdraw">
                <Button className="bg-white text-green-600 hover:bg-white/90">
                  Withdraw
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="locations">By Location</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Earnings Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Over Time</CardTitle>
              <CardDescription>Your revenue trend for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <AreaChart data={earningsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
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
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "Earnings"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Net vs Commission Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Net vs Commission</CardTitle>
                <CardDescription>Breakdown of your earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={earningsData.slice(-14)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="net" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="commission" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bookings Trend</CardTitle>
                <CardDescription>Daily booking volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={earningsData.slice(-14)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke="hsl(262 83% 58%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(262 83% 58%)", strokeWidth: 0, r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings Distribution</CardTitle>
                <CardDescription>Revenue share by location</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-medium">{payload[0].name}</p>
                              <p className="text-sm text-muted-foreground">
                                Revenue: <span className="font-medium text-foreground">{formatCurrency(Number(payload[0].value))}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Key metrics for the period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Gross Revenue</p>
                      <p className="text-xs text-muted-foreground">Before deductions</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totals.totalEarnings)}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Platform Commission</p>
                      <p className="text-xs text-muted-foreground">10% of gross</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-red-600">-{formatCurrency(totals.totalCommission)}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Net Earnings</p>
                      <p className="text-xs text-muted-foreground">Your take-home</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totals.netEarnings)}</p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Bookings</span>
                    <span className="font-medium text-foreground">{totals.totalBookings}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Avg. per Booking</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(totals.totalBookings > 0 ? totals.totalEarnings / totals.totalBookings : 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[200px]">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {myLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Earnings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings by Location</CardTitle>
              <CardDescription>Performance breakdown for each parking location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Bookings</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg/Booking</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Occupancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationEarnings
                      .filter((loc) => selectedLocation === "all" || loc.id === selectedLocation)
                      .map((loc) => (
                        <tr key={loc.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="font-medium text-foreground">{loc.name}</span>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-foreground">
                            {formatCurrency(loc.earnings)}
                          </td>
                          <td className="text-right py-4 px-4 text-foreground">{loc.bookings}</td>
                          <td className="text-right py-4 px-4 text-foreground">
                            {formatCurrency(loc.avgPerBooking)}
                          </td>
                          <td className="text-right py-4 px-4">
                            <span className={`font-medium ${loc.occupancy >= 70 ? "text-green-600" : loc.occupancy >= 40 ? "text-amber-600" : "text-red-600"}`}>
                              {loc.occupancy}%
                            </span>
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

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest earnings and deductions</CardDescription>
          </div>
          <Link href="/owner/wallet">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {safeTransactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === "credit" ? "bg-green-100" : tx.type === "withdrawal" ? "bg-blue-100" : "bg-red-100"
                  }`}>
                    {tx.type === "credit" ? (
                      <TrendingUp className={`w-5 h-5 text-green-600`} />
                    ) : tx.type === "withdrawal" ? (
                      <Wallet className="w-5 h-5 text-blue-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`font-medium ${
                  tx.type === "credit" ? "text-green-600" : "text-foreground"
                }`}>
                  {tx.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
