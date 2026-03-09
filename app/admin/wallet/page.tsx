"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/data";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Clock,
  Download,
  Building,
  Loader2,
  AlertCircle,
  Search,
  ShieldCheck,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function AdminWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txMeta, setTxMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("transactions");

  const [txFilters, setTxFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    type: "ALL"
  });

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [datePreset, setDatePreset] = useState<string>("all");

  // Withdrawal Logic
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Bank details dialog
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingNumber: ""
  });

  const handlePresetChange = (value: string) => {
    setDatePreset(value);
    const now = new Date();

    switch (value) {
      case "all":
        setDateRange({ from: undefined, to: undefined });
        setTxFilters(prev => ({ ...prev, page: 1 }));
        break;
      case "this-month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        setTxFilters(prev => ({ ...prev, page: 1 }));
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        setTxFilters(prev => ({ ...prev, page: 1 }));
        break;
      case "this-year":
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        setTxFilters(prev => ({ ...prev, page: 1 }));
        break;
      default:
        break;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      let walletUrl = `/api/admin/wallet?t=${timestamp}`;
      if (dateRange.from) walletUrl += `&from=${dateRange.from.toISOString()}`;
      if (dateRange.to) walletUrl += `&to=${dateRange.to.toISOString()}`;

      let txUrl = `/api/admin/wallet/transactions?page=${txFilters.page}&limit=${txFilters.limit}&search=${txFilters.search}&type=${txFilters.type}&t=${timestamp}`;
      if (dateRange.from) txUrl += `&startDate=${dateRange.from.toISOString()}`;
      if (dateRange.to) txUrl += `&endDate=${dateRange.to.toISOString()}`;

      const [walletRes, txRes] = await Promise.all([
        fetch(walletUrl),
        fetch(txUrl)
      ]);

      if (!walletRes.ok || !txRes.ok) throw new Error("Failed to fetch admin wallet data");

      const walletData = await walletRes.json();
      const txData = await txRes.json();

      setWallet(walletData);
      setTransactions(txData.transactions || []);
      setTxMeta(txData.meta || { total: 0, page: 1, totalPages: 1 });

      if (walletData) {
        setBankDetails({
          bankName: walletData.bankName || "",
          accountName: walletData.accountName || "",
          accountNumber: walletData.accountNumber || "",
          routingNumber: walletData.routingNumber || ""
        });
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load platform financial data.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, txFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > (wallet?.balance || 0)) {
      toast.error("Invalid withdrawal amount");
      return;
    }

    try {
      setIsWithdrawing(true);
      const res = await fetch("/api/admin/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Withdrawal failed");
      }

      toast.success("Revenue transferred successfully!");
      setWithdrawAmount("");
      setIsWithdrawDialogOpen(false);
      fetchData(); // Refresh data
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    try {
      setIsUpdatingBank(true);
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankDetails),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update bank details");
      }

      toast.success("System bank details updated successfully!");
      setIsBankDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdatingBank(false);
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount < 0) {
      return <ArrowUpRight className="w-4 h-4 text-red-600" />;
    }
    switch (type) {
      case "COMMISSION":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "WITHDRAWAL":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <ArrowDownLeft className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading && !wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading platform financial data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Date Filtering */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            System Wallet
          </h1>
          <p className="text-muted-foreground mt-1 italic">
            {dateRange.from && dateRange.to ? (
              <>Showing data from {format(dateRange.from, "PP")} to {format(dateRange.to, "PP")}</>
            ) : "Showing lifetime data"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[160px] bg-background">
              <Filter className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal h-10 px-3", !dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}</>
                    ) : (
                      format(dateRange.from, "MMM d")
                    )
                  ) : (
                    <span>Pick dates</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <div className="h-8 w-[1px] bg-border mx-1 hidden md:block" />

          <div className="flex gap-2">
            {!wallet?.accountNumber && (
              <Button variant="outline" size="lg" onClick={() => setIsBankDialogOpen(true)}>
                <Building className="w-4 h-4 mr-2" />
                Link Corporate Bank
              </Button>
            )}
            <Button size="lg" className="shadow-lg" onClick={() => setIsWithdrawDialogOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Transfer Revenue
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Platform Balance"
          value={formatCurrency(wallet?.balance || 0)}
          icon={Wallet}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          subtitle="Available platform revenue"
        />
        <StatCard
          title="Total Commission"
          value={formatCurrency(wallet?.totalCommissionEarnings || 0)}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          subtitle={datePreset === 'all' ? "All time commission earned" : "Earnings for selected period"}
        />
        <StatCard
          title="Revenue Transfers"
          value={formatCurrency(0)}
          icon={ArrowUpRight}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          subtitle="Total withdrawals"
        />
      </div>

      <Card>
        <CardHeader className="border-b pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle>System Transactions</CardTitle>
              <CardDescription>Recent commission and revenue events</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ref..."
                  className="pl-9 h-9"
                  value={txFilters.search}
                  onChange={(e) => setTxFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                />
              </div>
              <Select
                value={txFilters.type}
                onValueChange={(value) => setTxFilters(prev => ({ ...prev, type: value, page: 1 }))}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="COMMISSION">Commission</SelectItem>
                  <SelectItem value="WITHDRAWAL">Revenue Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {!transactions.length ? (
              <div className="text-center py-10 text-muted-foreground">No system transactions yet</div>
            ) : (
              transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 px-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.amount < 0
                      ? "bg-red-50"
                      : tx.type === "COMMISSION"
                        ? "bg-green-50"
                        : "bg-blue-50"
                      }`}>
                      {getTransactionIcon(tx.type, tx.amount)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)} • Ref: {tx.reference || "N/A"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.amount < 0
                      ? "text-foreground"
                      : "text-green-600"
                      }`}>
                      {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </p>
                    <StatusBadge status={tx.status} variant={tx.status === "COMPLETED" ? "success" : "warning"} />
                  </div>
                </div>
              ))
            )}
          </div>

          {txMeta.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 flex-wrap p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(txMeta.page - 1) * txFilters.limit + 1} to{" "}
                {Math.min(txMeta.page * txFilters.limit, txMeta.total)} of{" "}
                {txMeta.total} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={txMeta.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, txMeta.totalPages) }, (_, i) => {
                    let page: number;
                    if (txMeta.totalPages <= 5) {
                      page = i + 1;
                    } else if (txMeta.page <= 3) {
                      page = i + 1;
                    } else if (txMeta.page >= txMeta.totalPages - 2) {
                      page = txMeta.totalPages - 4 + i;
                    } else {
                      page = txMeta.page - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={txMeta.page === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setTxFilters(prev => ({ ...prev, page }))}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxFilters(prev => ({ ...prev, page: Math.min(txMeta.totalPages, prev.page + 1) }))}
                  disabled={txMeta.page === txMeta.totalPages}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Platform Revenue</DialogTitle>
            <DialogDescription>Move funds from the platform wallet to corporate accounts.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Platform Revenue</p>
              <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(wallet?.balance || 0)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Transfer Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-8 h-12 text-lg"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
            </div>

            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {wallet?.bankName || "No Bank Linked"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {wallet?.accountNumber ? `****${wallet.accountNumber.slice(-4)}` : "Click link button to add"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-primary"
                    onClick={() => {
                      setIsWithdrawDialogOpen(false);
                      setIsBankDialogOpen(true);
                    }}
                  >
                    {wallet?.accountNumber ? "Edit" : "Link"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground italic">Note: Administrative transfers are processed instantly to the target account.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsWithdrawDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (wallet?.balance || 0)}
            >
              {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Initiate Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Details Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Corporate Bank Account</DialogTitle>
            <DialogDescription>
              Provide platform bank details for revenue transfers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g. JPMorgan Chase"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Holder Name</Label>
              <Input
                id="accountName"
                placeholder="e.g. ParkEase Corporate"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter your account number"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing Number (Optional)</Label>
              <Input
                id="routingNumber"
                placeholder="9-digit routing number"
                value={bankDetails.routingNumber}
                onChange={(e) => setBankDetails(prev => ({ ...prev, routingNumber: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBankDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBankDetails}
              disabled={isUpdatingBank || !bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName}
            >
              {isUpdatingBank ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
