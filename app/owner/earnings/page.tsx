"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Wallet,
  CreditCard,
  PiggyBank,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Car,
  MapPin,
} from "lucide-react";
import { getOwnerEarningsOverview, getEarningsBreakdown, getLocationMetrics } from "@/app/actions/owner-earnings";

export default function OwnerEarningsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [overview, setOverview] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [ovData, brData, locData] = await Promise.all([
        getOwnerEarningsOverview(),
        getEarningsBreakdown(),
        getLocationMetrics()
      ]);
      setOverview(ovData);
      setBreakdown(brData);
      setLocations(locData);
    } catch (err) {
      console.error(err);
      setError("Failed to load earnings data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading earnings...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-destructive">
        <AlertCircle className="w-10 h-10 mb-2" />
        <p>{error || "No data available"}</p>
        <Button onClick={fetchAllData} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  // Charts
  const chartConfig = {
    amount: { label: "Revenue", color: "hsl(var(--primary))" },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/owner">
            <Button variant="ghost" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">Earnings</h1>
        </div>
        <div className="flex gap-2">
           <Select defaultValue="this_month">
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
           </Select>
           <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Total Earnings</p>
                  <p className="text-xl font-bold">{formatCurrency(overview.totalEarnings)}</p>
                </div>
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign className="w-5 h-5"/></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">This Month</p>
                  <p className="text-xl font-bold">{formatCurrency(overview.thisMonthEarnings)}</p>
                </div>
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
              </CardContent>
            </Card>
            <Card>
               <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Pending</p>
                  <p className="text-xl font-bold">{formatCurrency(overview.pendingEarnings)}</p>
                </div>
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><PiggyBank className="w-5 h-5"/></div>
              </CardContent>
            </Card>
            <Card>
               <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Total Bookings</p>
                  <p className="text-xl font-bold">{overview.totalBookings}</p>
                </div>
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Car className="w-5 h-5"/></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest financial milestones.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                       <span className="text-sm font-medium">Last Month Earnings</span>
                       <span className="font-bold">{formatCurrency(overview.lastMonthEarnings)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                       <span className="text-sm font-medium">Completed Bookings</span>
                       <span className="font-bold">{overview.completedBookings}</span>
                    </div>
                 </div>
              </CardContent>
            </Card>

             <Card className="bg-[#00a680] text-white">
                <CardContent className="p-8 flex flex-col justify-between h-full">
                   <div>
                      <p className="text-xs font-black uppercase opacity-75">Wallet Balance</p>
                      <p className="text-4xl font-black mt-2">{formatCurrency(overview.totalEarnings)}</p> {/* Using total as proxy for balance in this task script */}
                      <p className="text-sm mt-2 opacity-90">Available for withdrawal</p>
                   </div>
                   <div className="flex gap-2 mt-6">
                      <Button variant="secondary" className="w-full font-bold">Withdraw Funds</Button>
                   </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
             <Card className="md:col-span-2">
                <CardHeader>
                   <CardTitle>Monthly Earnings</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={breakdown?.earningsByMonth || []}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                         <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                         <Tooltip />
                         <Bar dataKey="amount" fill="#00a680" radius={[4, 4, 0, 0]} />
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>
             
             <Card>
                <CardHeader><CardTitle>Net Revenue</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Revenue</span>
                      <span className="font-bold">{formatCurrency(overview.totalEarnings)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes</span>
                      <span className="font-bold text-red-500">-{formatCurrency(breakdown?.summary.totalTax || 0)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fees</span>
                      <span className="font-bold text-red-500">-{formatCurrency(breakdown?.summary.totalFees || 0)}</span>
                   </div>
                   <div className="border-t pt-4 flex justify-between font-bold text-lg">
                      <span>Net Income</span>
                      <span className="text-[#00a680]">{formatCurrency(breakdown?.summary.netRevenue || 0)}</span>
                   </div>
                </CardContent>
             </Card>
          </div>

          <Card>
             <CardHeader><CardTitle>Revenue by Location</CardTitle></CardHeader>
             <CardContent>
                <div className="space-y-4">
                   {breakdown?.earningsByLocation.map((loc: any) => (
                      <div key={loc.locationId} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                         <span className="font-medium">{loc.name}</span>
                         <div className="text-right">
                            <p className="font-bold">{formatCurrency(loc.grossRevenue)}</p>
                            <p className="text-xs text-muted-foreground">Net: {formatCurrency(loc.netRevenue)}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
           {locations.map((loc) => (
              <Card key={loc.id} className="hover:shadow-md transition-shadow">
                 <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-full text-primary">
                          <MapPin className="w-6 h-6" />
                       </div>
                       <div>
                          <h3 className="font-bold text-lg">{loc.name}</h3>
                          <Badge variant="secondary" className="mt-1">{loc.occupancyRate}% Occupancy</Badge>
                       </div>
                    </div>
                    <div className="flex gap-8 text-center md:text-right">
                       <div>
                          <p className="text-xs text-muted-foreground uppercase font-bold">Bookings</p>
                          <p className="text-xl font-bold">{loc.totalBookings}</p>
                          <p className="text-xs text-green-600">{loc.completedBookings} Completed</p>
                       </div>
                       <div>
                          <p className="text-xs text-muted-foreground uppercase font-bold">Revenue</p>
                          <p className="text-xl font-bold text-[#00a680]">{formatCurrency(loc.revenue)}</p>
                          <p className="text-xs text-muted-foreground">Avg: {formatCurrency(loc.avgBookingValue)}</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           ))}
           {locations.length === 0 && (
              <p className="text-center text-muted-foreground py-10">No locations found.</p>
           )}
        </TabsContent>
        
      </Tabs>
    </div>
  );
}

