"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
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
  Calendar,
  Download,
  Wallet,
  CreditCard,
  PiggyBank,
  MapPin,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Filter,
  Search,
  Percent,
} from "lucide-react";

export default function OwnerEarningsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [breakdownData, setBreakdownData] = useState<any[]>([]);
  const [locationsData, setLocationsData] = useState<any[]>([]);

  // Filter States
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOverview = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      
      const res = await fetch(`/api/owner/earnings/overview?${params}`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      setOverviewData(await res.json());
    } catch (err) {
      console.error(err);
      setError("Failed to load overview data.");
    }
  }, [dateRange]);

  const fetchBreakdown = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      if (selectedLocation !== "all") params.append("locationId", selectedLocation);
      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const res = await fetch(`/api/owner/earnings/breakdown?${params}`);
      if (!res.ok) throw new Error("Failed to fetch breakdown");
      setBreakdownData(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [dateRange, selectedLocation, selectedStatus]);

  const fetchLocations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      
      const res = await fetch(`/api/owner/earnings/locations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch locations performance");
      setLocationsData(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [dateRange]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      await fetchOverview();
      if (activeTab === "breakdown") await fetchBreakdown();
      if (activeTab === "locations") await fetchLocations();
      setLoading(false);
    };
    loadAll();
  }, [activeTab, fetchOverview, fetchBreakdown, fetchLocations]);

  const chartConfig = {
    amount: { label: "Revenue", color: "hsl(142 76% 36%)" },
  };

  const filteredBreakdown = useMemo(() => {
    if (!searchQuery) return breakdownData;
    return breakdownData.filter(item => 
      item.confirmationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [breakdownData, searchQuery]);

  const distributionData = useMemo(() => {
    if (locationsData.length === 0) return [];
    return locationsData.slice(0, 5).map((loc, i) => ({
      name: loc.name,
      value: loc.grossRevenue,
      fill: `hsl(var(--chart-${(i % 5) + 1}))`
    }));
  }, [locationsData]);

  if (loading && !overviewData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium text-lg">Loading financial records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button size="lg" onClick={() => fetchOverview()}>Retry Loading</Button>
      </div>
    );
  }

  const { stats, chartData } = overviewData;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b">
        <div className="flex items-center gap-3">
          <Link href="/owner">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Earnings</h1>
            <p className="text-xs text-muted-foreground">Track your revenue and financial performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Select defaultValue="30">
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <Calendar className="w-3.5 h-3.5 mr-2" />
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
           </Select>
           <Button variant="outline" size="sm" className="h-9 text-xs">
              <Download className="w-3.5 h-3.5 mr-2" /> Export
           </Button>
        </div>
      </div>

      {/* Summary Cards Row - Row 1 in Screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Earnings</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(stats.totalEarnings)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Net Earnings</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(stats.netEarnings)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-rose-500">Commission</p>
              <p className="text-xl font-bold text-rose-600">{formatCurrency(stats.totalCommission)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-rose-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(stats.availableBalance)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Highlights Card - Teal full width */}
      <Card className="bg-[#00a680] text-white border-0 shadow-lg p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">AVAILABLE BALANCE</p>
            <p className="text-4xl sm:text-5xl font-black mt-2">{formatCurrency(stats.availableBalance)}</p>
            <p className="text-xs mt-3 flex items-center gap-1.5 opacity-90 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Ready to be withdrawn to your bank account
            </p>
          </div>
          <div className="flex gap-3">
             <Link href="/owner/wallet">
               <Button variant="outline" className="bg-[#ffffff15] hover:bg-[#ffffff25] text-white border-0 px-6 h-11 font-bold">
                 Manage Wallet
               </Button>
             </Link>
             <Link href="/owner/wallet">
               <Button className="bg-white text-[#00a680] hover:bg-white/90 px-8 h-11 font-black shadow-md">
                 Withdraw
               </Button>
             </Link>
          </div>
        </div>
      </Card>

      {/* Tabs Menu */}
      <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
        <div className="bg-muted/30 p-1 rounded-lg w-fit">
          <TabsList className="bg-transparent h-9">
            <TabsTrigger value="overview" className="px-6 h-7 rounded-md font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="breakdown" className="px-6 h-7 rounded-md font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Breakdown</TabsTrigger>
            <TabsTrigger value="locations" className="px-6 h-7 rounded-md font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Locations</TabsTrigger>
          </TabsList>
        </div>

        {/* --- OVERVIEW TAB CONTENT (Matches Screenshot) --- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings Distribution Card */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Earnings Distribution</CardTitle>
                <CardDescription className="text-xs">Revenue share by top locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-center justify-center">
                  {distributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-xs italic">No location data available</p>
                  )}
                </div>
                <div className="mt-6 space-y-3">
                  {distributionData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] px-2">
                       <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="font-medium text-muted-foreground">{item.name}</span>
                       </div>
                       <span className="font-bold">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary Card */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Financial Summary</CardTitle>
                <CardDescription className="text-xs">Detailed deductions for the period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 pt-2">
                   <div className="flex justify-between items-center text-xs">
                     <span className="font-medium text-muted-foreground">Gross Revenue</span>
                     <span className="font-bold">{formatCurrency(stats.totalEarnings)}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="font-medium text-muted-foreground">Commission Fee</span>
                     <span className="font-bold text-rose-500">-{formatCurrency(stats.totalCommission)}</span>
                   </div>
                   <div className="pt-5 border-t flex justify-between items-end">
                     <span className="font-black text-sm uppercase tracking-tight">Net Earnings</span>
                     <span className="font-black text-2xl text-[#00a680]">{formatCurrency(stats.netEarnings)}</span>
                   </div>
                </div>

                <div className="bg-muted/20 p-4 rounded-xl space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                         <CreditCard className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider leading-none">AVG PER BOOKING</p>
                        <p className="text-sm font-black">{formatCurrency(stats.netEarnings / (stats.totalBookings || 1))}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                         <Calendar className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider leading-none">TOTAL BOOKINGS</p>
                        <p className="text-sm font-black">{stats.totalBookings}</p>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- BREAKDOWN TAB CONTENT (Logic for Transactions) --- */}
        <TabsContent value="breakdown" className="space-y-6">
           {/* <Card className="border shadow-sm">
             <CardHeader>
               <div className="flex items-center justify-between">
                 <div>
                   <CardTitle className="text-lg">Revenue Trend</CardTitle>
                   <CardDescription className="text-xs">Daily earning fluctuations</CardDescription>
                 </div>
               </div>
             </CardHeader>
             <CardContent className="h-[300px] w-full px-2">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00a680" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#00a680" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={(str) => {
                        const d = new Date(str);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <ChartTooltip />
                    <Area type="monotone" dataKey="amount" stroke="#00a680" strokeWidth={3} fill="url(#colorAmt)" />
                 </AreaChart>
               </ResponsiveContainer>
             </CardContent>
           </Card> */}

          {/* Detailed Transaction Table below the summary cards in Breakdown */}
          <div className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search ID, Location..." 
                    className="pl-9 h-9 text-xs" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                   <SelectTrigger className="w-[140px] h-9 text-xs font-medium">
                      <SelectValue placeholder="Status" />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="all">Any Status</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                   </SelectContent>
                </Select>
             </div>

             <Card className="border-0 shadow-sm overflow-hidden rounded-xl border-t">
               <div className="overflow-x-auto">
                 <table className="w-full text-[11px]">
                   <thead className="bg-muted/30 text-muted-foreground border-b italic">
                     <tr>
                       <th className="px-6 py-4 text-left font-bold uppercase tracking-widest">ID / Date</th>
                       <th className="px-6 py-4 text-left font-bold uppercase tracking-widest">Location</th>
                       <th className="px-6 py-4 text-right font-bold uppercase tracking-widest">Gross</th>
                       <th className="px-6 py-4 text-right font-bold uppercase tracking-widest">Commission</th>
                       <th className="px-6 py-4 text-right font-bold uppercase tracking-widest">Net</th>
                       <th className="px-6 py-4 text-center font-bold uppercase tracking-widest">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y">
                     {filteredBreakdown.length > 0 ? filteredBreakdown.map((row) => (
                       <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                         <td className="px-6 py-4 font-bold">
                           <div className="flex flex-col">
                             <span className="text-muted-foreground mb-0.5 font-mono">#{row.confirmationCode}</span>
                             <span className="text-foreground">{new Date(row.date).toLocaleDateString()}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 font-bold text-foreground">{row.location}</td>
                         <td className="px-6 py-4 text-right font-medium">{formatCurrency(row.gross)}</td>
                         <td className="px-6 py-4 text-right font-medium text-rose-500">-{formatCurrency(row.commission)}</td>
                         <td className="px-6 py-4 text-right font-black text-emerald-600">{formatCurrency(row.net)}</td>
                         <td className="px-6 py-4 text-center">
                            <Badge variant={row.status === "COMPLETED" ? "default" : "secondary"} className="text-[9px] font-black uppercase rounded-full px-2 py-0">
                               {row.status}
                            </Badge>
                         </td>
                       </tr>
                     )) : (
                       <tr>
                         <td colSpan={6} className="py-12 text-center text-muted-foreground italic">No records found matching your filters.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </Card>
          </div>
        </TabsContent>

        {/* --- LOCATIONS TAB CONTENT --- */}
        <TabsContent value="locations" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locationsData.map(loc => (
                <Card key={loc.id} className="border shadow-sm hover:border-[#00a680] transition-colors overflow-hidden flex flex-col">
                  <div className="p-4 bg-muted/20 border-b flex items-center justify-between font-bold">
                     <span className="text-sm truncate pr-4">{loc.name}</span>
                     <Badge className="bg-[#00a680] shrink-0 text-[10px] font-black">{loc.occupancyRate}% Occ.</Badge>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-black text-muted-foreground uppercase">Net Earnings</p>
                           <p className="text-lg font-black text-[#00a680]">{formatCurrency(loc.netEarnings)}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                           <p className="text-[9px] font-black text-muted-foreground uppercase">Gross Rev</p>
                           <p className="text-lg font-black text-foreground">{formatCurrency(loc.grossRevenue)}</p>
                        </div>
                     </div>
                     <div className="pt-3 border-t flex items-center justify-between text-xs pt-4">
                        <div className="flex flex-col">
                           <span className="text-muted-foreground font-medium uppercase text-[9px] tracking-wider mb-0.5">AVG Value</span>
                           <span className="font-bold">{formatCurrency(loc.avgBookingValue)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-muted-foreground font-medium uppercase text-[9px] tracking-wider mb-0.5">Bookings</span>
                           <span className="font-bold">{loc.bookingsCount}</span>
                        </div>
                     </div>
                  </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

