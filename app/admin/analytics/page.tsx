"use client";

import React from "react"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  MapPin,
  Users,
  Car,
  Clock,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

// Mock data for charts
const revenueData = [
  { date: "Jan", revenue: 45000, bookings: 890, commissions: 4500 },
  { date: "Feb", revenue: 52000, bookings: 1020, commissions: 5200 },
  { date: "Mar", revenue: 48000, bookings: 940, commissions: 4800 },
  { date: "Apr", revenue: 61000, bookings: 1180, commissions: 6100 },
  { date: "May", revenue: 55000, bookings: 1070, commissions: 5500 },
  { date: "Jun", revenue: 67000, bookings: 1290, commissions: 6700 },
  { date: "Jul", revenue: 72000, bookings: 1380, commissions: 7200 },
];

const occupancyData = [
  { hour: "6am", rate: 15 },
  { hour: "8am", rate: 45 },
  { hour: "10am", rate: 72 },
  { hour: "12pm", rate: 85 },
  { hour: "2pm", rate: 78 },
  { hour: "4pm", rate: 65 },
  { hour: "6pm", rate: 88 },
  { hour: "8pm", rate: 70 },
  { hour: "10pm", rate: 45 },
];

const bookingsByType = [
  { name: "Airport", value: 45, color: "#0d9488" },
  { name: "Daily", value: 25, color: "#f59e0b" },
  { name: "Monthly", value: 20, color: "#6366f1" },
  { name: "Event", value: 10, color: "#ec4899" },
];

const topLocations = [
  { name: "LAX Economy Parking", bookings: 2340, revenue: 87500, occupancy: 92 },
  { name: "JFK Terminal Parking", bookings: 1890, revenue: 72300, occupancy: 88 },
  { name: "SFO Airport Lot", bookings: 1650, revenue: 61200, occupancy: 85 },
  { name: "ORD Express Park", bookings: 1420, revenue: 53100, occupancy: 79 },
  { name: "DFW Value Parking", bookings: 1180, revenue: 44600, occupancy: 74 },
];

const ownerPerformance = [
  { name: "Michael Chen", locations: 5, bookings: 3240, revenue: 125000, rating: 4.8, responseRate: 98 },
  { name: "Sarah Williams", locations: 3, bookings: 1890, revenue: 72000, rating: 4.6, responseRate: 95 },
  { name: "David Kim", locations: 4, bookings: 2100, revenue: 89000, rating: 4.9, responseRate: 99 },
  { name: "Lisa Chen", locations: 2, bookings: 980, revenue: 38000, rating: 4.5, responseRate: 92 },
];

const watchmanActivity = [
  { name: "Robert Garcia", checkIns: 456, checkOuts: 421, violations: 3, avgResponse: "2.3 min", shifts: 28 },
  { name: "Maria Santos", checkIns: 389, checkOuts: 367, violations: 1, avgResponse: "1.8 min", shifts: 26 },
  { name: "James Wilson", checkIns: 312, checkOuts: 298, violations: 5, avgResponse: "3.1 min", shifts: 24 },
  { name: "Emily Davis", checkIns: 278, checkOuts: 265, violations: 2, avgResponse: "2.5 min", shifts: 22 },
];

const heatmapData = [
  { day: "Mon", hours: [20, 35, 55, 72, 85, 78, 65, 88, 70, 45, 30, 15] },
  { day: "Tue", hours: [18, 32, 52, 68, 82, 75, 62, 85, 68, 42, 28, 12] },
  { day: "Wed", hours: [22, 38, 58, 75, 88, 80, 68, 90, 72, 48, 32, 18] },
  { day: "Thu", hours: [25, 42, 62, 78, 90, 82, 70, 92, 75, 50, 35, 20] },
  { day: "Fri", hours: [30, 48, 68, 85, 95, 88, 78, 96, 82, 58, 42, 28] },
  { day: "Sat", hours: [35, 52, 72, 88, 92, 85, 75, 90, 78, 55, 40, 25] },
  { day: "Sun", hours: [28, 45, 65, 80, 88, 80, 70, 85, 72, 48, 35, 20] },
];

function StatCard({ title, value, change, changeType, icon: Icon, prefix = "" }: {
  title: string;
  value: string | number;
  change: number;
  changeType: "positive" | "negative";
  icon: React.ElementType;
  prefix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{prefix}{typeof value === "number" ? value.toLocaleString() : value}</p>
            <div className={`flex items-center gap-1 mt-1 text-sm ${changeType === "positive" ? "text-green-600" : "text-red-600"}`}>
              {changeType === "positive" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(change)}% vs last period</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeatmapCell({ value }: { value: number }) {
  const getColor = (val: number) => {
    if (val >= 90) return "bg-primary";
    if (val >= 70) return "bg-primary/80";
    if (val >= 50) return "bg-primary/60";
    if (val >= 30) return "bg-primary/40";
    return "bg-primary/20";
  };
  return (
    <div
      className={`w-6 h-6 sm:w-8 sm:h-8 rounded ${getColor(value)} flex items-center justify-center text-[10px] sm:text-xs font-medium text-primary-foreground`}
      title={`${value}% occupancy`}
    >
      {value}
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
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
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="owners">Owners</TabsTrigger>
          <TabsTrigger value="watchmen">Watchmen</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value="$400,000"
              change={12.5}
              changeType="positive"
              icon={DollarSign}
            />
            <StatCard
              title="Total Bookings"
              value={7770}
              change={8.3}
              changeType="positive"
              icon={Calendar}
            />
            <StatCard
              title="Active Locations"
              value={156}
              change={5.2}
              changeType="positive"
              icon={MapPin}
            />
            <StatCard
              title="Avg Occupancy"
              value="78%"
              change={-2.1}
              changeType="negative"
              icon={Car}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue and bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0d9488"
                        fill="#0d9488"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Booking Types Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Bookings by Type</CardTitle>
                <CardDescription>Distribution of parking types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingsByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {bookingsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 min-w-[120px]">
                    {bookingsByType.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="text-sm font-medium ml-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Locations */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Locations</CardTitle>
              <CardDescription>Locations ranked by bookings and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Bookings</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Occupancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLocations.map((location, index) => (
                      <tr key={location.name} className="border-b border-border last:border-0">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                            <span className="font-medium">{location.name}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{location.bookings.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{`$${location.revenue.toLocaleString()}`}</td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={location.occupancy} className="w-20 h-2" />
                            <span className="text-sm w-10">{location.occupancy}%</span>
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

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Gross Revenue" value="$400,000" change={12.5} changeType="positive" icon={DollarSign} />
            <StatCard title="Commissions Earned" value="$40,000" change={15.2} changeType="positive" icon={TrendingUp} />
            <StatCard title="Avg Order Value" value="$51.48" change={3.1} changeType="positive" icon={BarChart3} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue & Commissions</CardTitle>
              <CardDescription>Monthly breakdown of revenue and platform commissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="commissions" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Commissions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupancy Tab */}
        <TabsContent value="occupancy" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Avg Occupancy" value="78%" change={-2.1} changeType="negative" icon={Car} />
            <StatCard title="Peak Hours" value="12pm-2pm" change={0} changeType="positive" icon={Clock} />
            <StatCard title="Total Spots" value={12450} change={8.5} changeType="positive" icon={MapPin} />
          </div>

          {/* Hourly Occupancy */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Occupancy Rate</CardTitle>
              <CardDescription>Average occupancy throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" className="text-xs" />
                    <YAxis className="text-xs" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#0d9488"
                      strokeWidth={3}
                      dot={{ fill: "#0d9488", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Booking Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Heatmap</CardTitle>
              <CardDescription>Occupancy rates by day and time (6am - 6pm)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="flex gap-1 mb-2 ml-12">
                    {["6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm", "12am"].map((hour) => (
                      <div key={hour} className="w-6 sm:w-8 text-center text-xs text-muted-foreground">
                        {hour}
                      </div>
                    ))}
                  </div>
                  {heatmapData.map((row) => (
                    <div key={row.day} className="flex items-center gap-1 mb-1">
                      <div className="w-10 text-sm text-muted-foreground">{row.day}</div>
                      {row.hours.slice(0, 10).map((val, i) => (
                        <HeatmapCell key={i} value={val} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Owners Tab */}
        <TabsContent value="owners" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Active Owners" value={89} change={12.3} changeType="positive" icon={Users} />
            <StatCard title="Total Locations" value={156} change={8.5} changeType="positive" icon={MapPin} />
            <StatCard title="Avg Rating" value="4.7" change={0.2} changeType="positive" icon={TrendingUp} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Owner Performance</CardTitle>
              <CardDescription>Top performing parking lot owners</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Owner</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Locations</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Bookings</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Rating</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerPerformance.map((owner) => (
                      <tr key={owner.name} className="border-b border-border last:border-0">
                        <td className="py-3 px-4 font-medium">{owner.name}</td>
                        <td className="text-center py-3 px-4">{owner.locations}</td>
                        <td className="text-right py-3 px-4">{owner.bookings.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{`$${owner.revenue.toLocaleString()}`}</td>
                        <td className="text-center py-3 px-4">
                          <Badge variant={owner.rating >= 4.7 ? "default" : "secondary"}>
                            {owner.rating}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={owner.responseRate >= 95 ? "text-green-600" : "text-muted-foreground"}>
                            {owner.responseRate}%
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

        {/* Watchmen Tab */}
        <TabsContent value="watchmen" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Active Watchmen" value={45} change={5.0} changeType="positive" icon={Users} />
            <StatCard title="Total Check-ins" value={1435} change={12.1} changeType="positive" icon={Car} />
            <StatCard title="Avg Response Time" value="2.4 min" change={-8.3} changeType="positive" icon={Clock} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Watchman Activity Log</CardTitle>
              <CardDescription>Performance metrics for parking attendants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Watchman</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Check-ins</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Check-outs</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Violations</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Avg Response</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Shifts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchmanActivity.map((watchman) => (
                      <tr key={watchman.name} className="border-b border-border last:border-0">
                        <td className="py-3 px-4 font-medium">{watchman.name}</td>
                        <td className="text-right py-3 px-4">{watchman.checkIns}</td>
                        <td className="text-right py-3 px-4">{watchman.checkOuts}</td>
                        <td className="text-center py-3 px-4">
                          <Badge variant={watchman.violations > 3 ? "destructive" : "secondary"}>
                            {watchman.violations}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">{watchman.avgResponse}</td>
                        <td className="text-center py-3 px-4">{watchman.shifts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
