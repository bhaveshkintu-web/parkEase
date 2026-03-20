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
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";

export default function OwnerWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txMeta, setTxMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [datePreset, setDatePreset] = useState<string>("all");

  // Bank details dialog
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    bankAccountName: "",
    accountNumber: "",
    routingNumber: ""
  });

  const [txFilters, setTxFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    type: "ALL"
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

      let walletUrl = `/api/owner/wallet?t=${timestamp}`;
      if (dateRange.from) walletUrl += `&from=${dateRange.from.toISOString()}`;
      if (dateRange.to) walletUrl += `&to=${dateRange.to.toISOString()}`;

      let txUrl = `/api/owner/wallet/transactions?page=${txFilters.page}&limit=${txFilters.limit}&search=${txFilters.search}&type=${txFilters.type}&t=${timestamp}`;
      if (dateRange.from) txUrl += `&startDate=${dateRange.from.toISOString()}`;
      if (dateRange.to) txUrl += `&endDate=${dateRange.to.toISOString()}`;

      const [walletRes, txRes, withdrawalRes] = await Promise.all([
        fetch(walletUrl),
        fetch(txUrl),
        fetch(`/api/owner/wallet/withdraw?t=${timestamp}`),
      ]);

      if (!walletRes.ok || !txRes.ok || !withdrawalRes.ok) {
        throw new Error("Failed to fetch wallet data");
      }

      const walletData = await walletRes.json();
      const txData = await txRes.json();
      const withdrawalData = await withdrawalRes.json();

      setWallet(walletData);
      setTransactions(txData.transactions || []);
      setTxMeta(txData.meta || { total: 0, page: 1, totalPages: 1 });
      setWithdrawals(withdrawalData.withdrawals || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load your financial data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [txFilters, dateRange]);

  useEffect(() => {
    if (wallet?.owner) {
      setBankDetails({
        bankName: wallet.owner.bankName || "",
        bankAccountName: wallet.owner.bankAccountName || "",
        accountNumber: wallet.owner.accountNumber || "",
        routingNumber: wallet.owner.routingNumber || ""
      });
    }
  }, [wallet]);

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
      const res = await fetch("/api/owner/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bankDetails: {
            accountName: wallet?.owner?.bankAccountName || "Main Business Account",
            bankName: wallet?.owner?.bankName || "Linked Bank",
            accountNumber: wallet?.owner?.accountNumber || "****"
          }
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Withdrawal failed");
      }

      toast.success("Withdrawal request submitted successfully!");
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
      if (!wallet?.owner) {
        throw new Error("Owner profile data missing. Please refresh the page.");
      }

      const res = await fetch("/api/owner/profile", {
        method: "POST", // The profile route uses POST for upsert
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...wallet.owner,
          ...bankDetails
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update bank details");
      }

      toast.success("Bank details updated successfully!");
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
      case "CREDIT":
      case "EARNED":
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "DEPOSITED":
        return <ArrowDownLeft className="w-4 h-4 text-blue-600" />;
      case "WITHDRAWAL":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case "REFUND":
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "COMMISSION":
        return <ArrowUpRight className="w-4 h-4 text-amber-600" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading && !wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading wallet data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error Loading Wallet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
          <Button onClick={() => fetchData()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  const walletBalance = wallet?.balance || 0;
  const totalEarnings = transactions
    ? transactions.filter((tx: any) => tx.type === "CREDIT").reduce((sum: number, tx: any) => sum + tx.amount, 0)
    : 0;

  const totalWithdrawn = withdrawals
    ? withdrawals.filter((w: any) => w.status === "PROCESSED" || w.status === "APPROVED").reduce((sum: number, w: any) => sum + w.amount, 0)
    : 0;

  const pendingWithdrawalsSum = withdrawals
    ? withdrawals.filter((w: any) => w.status === "PENDING").reduce((sum: number, w: any) => sum + w.amount, 0)
    : 0;

  return (
    <div className="py-2 sm:py-6 space-y-6 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Wallet</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your earnings and withdrawals
          </p>
        </div>

        {/* Action Buttons - stacked full-width on mobile, inline on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {!wallet?.owner?.accountNumber && (
            <Button
              variant="outline"
              className="w-full sm:w-auto h-10 sm:h-11 px-4 text-sm"
              onClick={() => setIsBankDialogOpen(true)}
            >
              <Building className="w-4 h-4 mr-2 shrink-0" />
              Link Bank Account
            </Button>
          )}
          <Button
            className="w-full sm:w-auto h-10 sm:h-11 px-4 text-sm bg-teal-600 hover:bg-teal-700 shadow"
            onClick={() => setIsWithdrawDialogOpen(true)}
          >
            <Download className="w-4 h-4 mr-2 shrink-0" />
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Transfer funds to your linked bank account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Available Balance</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {formatCurrency(walletBalance)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-8 h-12 text-lg"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={walletBalance}
                />
              </div>
              <div className="flex gap-2">
                {[25, 50].map((percent) => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      setWithdrawAmount(((walletBalance * percent) / 100).toFixed(2))
                    }
                  >
                    {percent}%
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setWithdrawAmount(walletBalance.toFixed(2))}
                >
                  Max
                </Button>
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
                        {wallet?.owner?.bankName || "Linked Bank"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {wallet?.owner?.accountNumber ? `****${wallet.owner.accountNumber.slice(-4)}` : "No account linked"}
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
                    {wallet?.owner?.accountNumber ? "Edit" : "Link"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              className="min-w-[120px]"
              disabled={
                isWithdrawing ||
                !withdrawAmount ||
                parseFloat(withdrawAmount) <= 0 ||
                parseFloat(withdrawAmount) > walletBalance
              }
            >
              {isWithdrawing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Withdraw ${withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Details Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bank Account Details</DialogTitle>
              <DialogDescription>
                Provide your bank details to receive payments.
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
                <Label htmlFor="bankAccountName">Account Holder Name</Label>
                <Input
                  id="bankAccountName"
                  placeholder="e.g. John Doe / Business Name"
                  value={bankDetails.bankAccountName}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, bankAccountName: e.target.value }))}
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
                disabled={isUpdatingBank || !bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.bankAccountName}
              >
                {isUpdatingBank ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      {/* Summary Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Financial Overview
          </h2>
          <p className="text-xs text-muted-foreground italic mt-0.5">
            {dateRange.from && dateRange.to ? (
              <>Showing data from {format(dateRange.from as Date, "PP")} to {format(dateRange.to as Date, "PP")}</>
            ) : "Showing lifetime data"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px] bg-background">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter Period" />
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
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(rangeItem: any) => setDateRange({ from: rangeItem?.from, to: rangeItem?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Summary Cards - 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Balance"
          value={formatCurrency(wallet?.lifetimeEarnings || 0)}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          subtitle={datePreset === 'all' ? "Total lifetime earnings" : "Earnings for selected period"}
        />
        <StatCard
          title="Available to Withdraw"
          value={formatCurrency(walletBalance)}
          icon={Wallet}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatCard
          title="Total Withdrawn"
          value={formatCurrency(wallet?.totalWithdrawn || 0)}
          icon={ArrowUpRight}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          subtitle={datePreset === 'all' ? "Total withdrawn" : "Withdrawn in selected period"}
        />
        <StatCard
          title="Pending Withdrawal"
          value={formatCurrency(wallet?.pendingWithdrawn || 0)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          subtitle={datePreset === 'all' ? "Total pending" : "Pending in selected period"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <TabsList className="bg-muted/50 w-full sm:w-auto">
                <TabsTrigger value="transactions" className="flex-1">Transactions</TabsTrigger>
                <TabsTrigger value="withdrawals" className="flex-1">Withdrawals</TabsTrigger>
              </TabsList>

              {activeTab === "transactions" && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference..."
                    className="pl-9 h-11 sm:h-10"
                    value={txFilters.search}
                    onChange={(e) => setTxFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  />
                </div>
              )}
            </div>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === "transactions" && (
            <div className="divide-y">
              {transactions.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground italic">
                  No transactions found for the selected criteria
                </div>
              ) : (
                transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-4 py-3 sm:px-6 hover:bg-muted/50 transition-colors gap-3"
                  >
                    {/* Left: icon + details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.amount < 0
                            ? "bg-red-50"
                            : tx.type === "CREDIT" || tx.type === "EARNED" || tx.type === "REFUND"
                              ? "bg-green-100"
                              : tx.type === "DEPOSITED"
                                ? "bg-blue-100"
                                : tx.type === "COMMISSION"
                                  ? "bg-amber-100"
                                  : "bg-red-50"
                        }`}
                      >
                        {getTransactionIcon(tx.type, tx.amount)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-xs sm:text-sm leading-snug line-clamp-2 break-words">
                          {tx.type === "COMMISSION" && wallet?.commissionRate && !tx.description.includes("%")
                            ? `${tx.description.replace("(Platform Commission)", "")} (Platform Commission ${wallet.commissionRate}%)`
                            : tx.description}
                        </p>
                        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono uppercase text-muted-foreground tracking-tight">
                            {tx.reference ? tx.reference.slice(0, 14) + (tx.reference.length > 14 ? "…" : "") : "N/A"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            · {formatDate(tx.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: amount + badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <p
                        className={`font-bold text-sm sm:text-base whitespace-nowrap ${
                          tx.amount < 0 || tx.type === "COMMISSION"
                            ? "text-foreground"
                            : tx.type === "CREDIT" || tx.type === "DEPOSITED"
                              ? "text-blue-600"
                              : tx.type === "EARNED" || tx.type === "REFUND"
                                ? "text-emerald-600"
                                : "text-foreground"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                      </p>
                      <StatusBadge
                        status={tx.status}
                        className="text-[10px] px-1.5 py-0"
                        variant={
                          tx.status.toLowerCase() === "completed"
                            ? "success"
                            : tx.status.toLowerCase() === "pending"
                              ? "warning"
                              : "default"
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "transactions" && txMeta.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t text-sm text-muted-foreground">
              <p className="shrink-0">
                Showing {(txMeta.page - 1) * txFilters.limit + 1}–{Math.min(txMeta.page * txFilters.limit, txMeta.total)} of {txMeta.total}
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

          {activeTab === "withdrawals" && (
            <div className="divide-y">
              {withdrawals.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground italic">
                  No withdrawal requests found
                </div>
              ) : (
                withdrawals.map((withdrawal: any) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-4 sm:px-6 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <Building className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">
                          Transfer to {withdrawal.bankName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested on {formatDate(withdrawal.requestedAt)}
                        </p>
                        {withdrawal.adminNotes && (
                          <p className="text-[11px] text-amber-600 mt-1 italic">Note: {withdrawal.adminNotes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-bold text-lg text-foreground">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                      <StatusBadge
                        status={withdrawal.status}
                        variant={
                          withdrawal.status === "PROCESSED"
                            ? "success"
                            : withdrawal.status === "PENDING"
                              ? "warning"
                              : withdrawal.status === "APPROVED"
                                ? "info"
                                : "error"
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
