"use client";

import React from "react";

import { useState } from "react";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, formatDate } from "@/lib/data";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  CreditCard,
  Building,
} from "lucide-react";

export default function OwnerWalletPage() {
  const { wallet, transactions, requestWithdrawal, initializeForOwner } = useDataStore();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");
  const walletTransactions = transactions || []; // Declare walletTransactions variable

  // Initialize wallet data
  React.useEffect(() => {
    initializeForOwner("owner_1");
  }, [initializeForOwner]);

  // Safe access to transactions with fallback
  const safeTransactions = transactions || [];

  const totalEarnings = safeTransactions
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalWithdrawn = safeTransactions
    .filter((tx) => tx.type === "withdrawal")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Get withdrawal transactions as "withdrawal requests"
  const withdrawalRequests = safeTransactions.filter((tx) => tx.type === "withdrawal");

  const pendingWithdrawals = withdrawalRequests
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + Math.abs(w.amount), 0);

  const walletBalance = wallet?.balance || 0;

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (amount > 0 && amount <= walletBalance) {
      requestWithdrawal(amount, {
        accountName: "John Doe",
        accountNumber: "****4567",
        bankName: "Chase Bank",
        routingNumber: "****1234",
      });
      setWithdrawAmount("");
      setIsWithdrawDialogOpen(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "withdrawal":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case "refund":
        return <ArrowDownLeft className="w-4 h-4 text-blue-600" />;
      case "commission":
        return <ArrowUpRight className="w-4 h-4 text-amber-600" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground mt-1">
            Manage your earnings and withdrawals
          </p>
        </div>
        <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Transfer funds to your linked bank account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-foreground">
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
                    className="pl-8"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    max={walletBalance}
                  />
                </div>
                <div className="flex gap-2">
                  {[25, 50, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
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
                    className="flex-1 bg-transparent"
                    onClick={() => setWithdrawAmount(walletBalance.toFixed(2))}
                  >
                    Max
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Chase Bank</p>
                    <p className="text-xs text-muted-foreground">****4567</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  parseFloat(withdrawAmount) > walletBalance
                }
              >
                Withdraw {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Available Balance"
          value={formatCurrency(walletBalance)}
          icon={Wallet}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatCard
          title="Total Earnings"
          value={formatCurrency(totalEarnings)}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          trend={{ value: 15, label: "this month" }}
        />
        <StatCard
          title="Total Withdrawn"
          value={formatCurrency(totalWithdrawn)}
          icon={ArrowUpRight}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(pendingWithdrawals)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          subtitle={`${withdrawalRequests.filter((w) => w.status === "pending").length} requests`}
        />
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {activeTab === "transactions" && (
            <div className="space-y-3">
              {safeTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              ) : (
                safeTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 sm:p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === "credit" || tx.type === "refund"
                            ? "bg-green-100"
                            : tx.type === "commission"
                            ? "bg-amber-100"
                            : "bg-red-100"
                        }`}
                      >
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`font-semibold ${
                          tx.type === "credit" || tx.type === "refund"
                            ? "text-green-600"
                            : "text-foreground"
                        }`}
                      >
                        {tx.type === "credit" || tx.type === "refund" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </p>
                      <StatusBadge
                        status={tx.status}
                        variant={
                          tx.status === "completed"
                            ? "success"
                            : tx.status === "pending"
                            ? "warning"
                            : "error"
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "withdrawals" && (
            <div className="space-y-3">
              {withdrawalRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No withdrawal requests yet
                </div>
              ) : (
                withdrawalRequests.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-3 sm:p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">
                          To {withdrawal.bankDetails.bankName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(withdrawal.requestedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                      <StatusBadge
                        status={withdrawal.status}
                        variant={
                          withdrawal.status === "completed"
                            ? "success"
                            : withdrawal.status === "pending"
                            ? "warning"
                            : withdrawal.status === "processing"
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
