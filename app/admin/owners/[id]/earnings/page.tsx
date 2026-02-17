"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataStore } from "@/lib/data-store";
import { StatCard } from "@/components/admin/stat-card";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Generate mock earnings data
function generateEarningsData() {
  const data = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    data.push({
      month: date.toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.floor(Math.random() * 15000) + 5000,
      commission: Math.floor(Math.random() * 1500) + 500,
      withdrawals: Math.floor(Math.random() * 8000) + 2000,
    });
  }
  return data;
}

export default function OwnerEarningsPage() {
  const params = useParams();
  const { ownerProfiles, transactions } = useDataStore();

  const ownerId = params.id as string;
  const owner = ownerProfiles.find((o) => o.id === ownerId);

  const earningsData = useMemo(() => generateEarningsData(), []);

  // Calculate totals from chart data
  const totals = useMemo(() => {
    return earningsData.reduce(
      (acc, item) => ({
        revenue: acc.revenue + item.revenue,
        commission: acc.commission + item.commission,
        withdrawals: acc.withdrawals + item.withdrawals,
      }),
      { revenue: 0, commission: 0, withdrawals: 0 }
    );
  }, [earningsData]);

  if (!owner) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Owner not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/owners">Back to Owners</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/owners/${ownerId}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Earnings Report</h1>
            <p className="text-muted-foreground">{owner.businessName}</p>
          </div>
        </div>
        <div className="flex gap-2 ml-12 sm:ml-0">
          <Select defaultValue="12months">
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="alltime">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${owner.stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 12.5, label: "vs last month", isPositive: true }}
        />
        <StatCard
          title="Net Earnings"
          value={`$${owner.stats.totalEarnings.toLocaleString()}`}
          icon={Wallet}
          trend={{ value: 8.3, label: "vs last month", isPositive: true }}
        />
        <StatCard
          title="Commission Paid"
          value={`$${owner.stats.totalCommissionPaid.toLocaleString()}`}
          icon={CreditCard}
        />
        <StatCard
          title="Pending Withdrawals"
          value={`$${owner.stats.pendingWithdrawals.toLocaleString()}`}
          icon={TrendingUp}
        />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue, commissions, and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
              commission: { label: "Commission", color: "hsl(var(--chart-2))" },
              withdrawals: { label: "Withdrawals", color: "hsl(var(--chart-3))" },
              month: { label: "Month", color: "hsl(0 0% 50%)" },
            }}
            className="h-[350px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="revenue" fill="var(--color-revenue)" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" fill="var(--color-commission)" name="Commission" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withdrawals" fill="var(--color-withdrawals)" name="Withdrawals" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">YTD Revenue</span>
              <span className="font-medium">{`$${totals.revenue.toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Average Monthly</span>
              <span className="font-medium">{`$${Math.round(totals.revenue / 12).toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Best Month</span>
              <span className="font-medium text-emerald-600">
                {`$${Math.max(...earningsData.map((d) => d.revenue)).toLocaleString()}`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Commission Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Commission</span>
              <span className="font-medium">{`$${totals.commission.toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Commission Rate</span>
              <span className="font-medium">10%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Effective Rate</span>
              <span className="font-medium">{((totals.commission / totals.revenue) * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Withdrawal Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Withdrawn</span>
              <span className="font-medium">{`$${totals.withdrawals.toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium">{`$${owner.stats.pendingWithdrawals.toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Available Balance</span>
              <span className="font-medium text-emerald-600">
                {`$${(totals.revenue - totals.commission - totals.withdrawals).toLocaleString()}`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest financial activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="bg-transparent">
            <Link href={`/admin/owners/${ownerId}`}>View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>{txn.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {txn.type === "credit" ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className="capitalize">{txn.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {txn.reference || "-"}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${txn.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                    {txn.type === "credit" ? "+" : "-"}{`$${txn.amount.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={txn.status === "completed" ? "default" : txn.status === "pending" ? "secondary" : "destructive"}>
                      {txn.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
