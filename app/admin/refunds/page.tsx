"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  CreditCard,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    totalPendingAmount: 0,
    approved: 0,
    processed: 0,
    rejected: 0,
    totalPendingApprovals: 0
  });

  useEffect(() => {
    fetchRefunds();
  }, [search, statusTab]);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (statusTab !== "all") queryParams.set("status", statusTab.toUpperCase());

      const response = await fetch(`/api/admin/refunds?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRefunds(data.refunds);

        if (data.stats) {
          setStats({
            pending: data.stats.pending,
            totalPendingAmount: data.stats.totalPendingAmount,
            approved: data.stats.approved,
            processed: data.stats.processed,
            rejected: data.stats.rejected,
            totalPendingApprovals: data.stats.totalPendingApprovals
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch refunds:", error);
      toast.error("Failed to load refund requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async (action: "APPROVED" | "REJECTED" | "PROCESSED") => {
    if (!selectedRefund) return;

    try {
      setIsProcessing(true);
      const amount = (action === "APPROVED" && partialAmount) ? parseFloat(partialAmount) : selectedRefund.amount;

      const response = await fetch(`/api/admin/refunds/${selectedRefund.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          approvedAmount: amount,
          notes: `Handled via Refunds dashboard as ${action}`
        }),
      });

      if (response.ok) {
        toast.success(`Refund request ${action.toLowerCase()} successfully`);
        setSelectedRefund(null);
        setPartialAmount("");
        fetchRefunds();
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to process refund");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING": return "warning";
      case "APPROVED": return "info";
      case "PROCESSED": return "success";
      case "REJECTED": return "error";
      default: return "default";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Refund Processing</h1>
          <p className="text-muted-foreground mt-1">
            Review and process customer refund requests across the platform
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="border-none shadow-sm bg-white border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Pending</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "..." : stats.totalPendingApprovals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pending</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Volume</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalPendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Approved</p>
                <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Processed</p>
                <p className="text-2xl font-bold text-foreground">{stats.processed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Rejected</p>
                <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Booking ID, Email, Customer..."
                className="pl-10 h-10 border-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full md:w-auto">
              <TabsList className="bg-slate-100 h-10">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="processed">Processed</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Refunds List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : refunds.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-foreground">No refunds found</h3>
              <p className="text-muted-foreground">Everything is processed for this criteria.</p>
            </CardContent>
          </Card>
        ) : (
          refunds.map((refund) => (
            <Card key={refund.id} className="border-none shadow-sm bg-white hover:ring-1 hover:ring-primary/20 transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-foreground">
                          {formatCurrency(refund.amount)}
                        </h3>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                          {refund.reason}
                        </Badge>
                      </div>
                      <StatusBadge status={refund.status} variant={getStatusVariant(refund.status)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium">{refund.booking.user.firstName} {refund.booking.user.lastName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Booking:</span>
                        <span className="font-mono font-medium">{refund.booking.confirmationCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Requested:</span>
                        <span className="font-medium">{format(new Date(refund.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      {refund.dispute && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-primary" />
                          <Link href={`/admin/disputes?search=${refund.booking.confirmationCode}`} className="text-primary hover:underline">
                            View Dispute
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {refund.status === "PENDING" && (
                    <Button
                      onClick={() => {
                        setSelectedRefund(refund);
                        // Use suggested amount if calculated by backend, otherwise default to full or 0 based on older logic
                        setPartialAmount(refund.approvedAmount?.toString() || refund.amount.toString());
                      }}
                      className="w-full lg:w-auto h-11 px-8"
                    >
                      Process Refund
                    </Button>
                  )}
                  {refund.status === "APPROVED" && (
                    <Button
                      variant="outline"
                      onClick={() => handleProcess("PROCESSED")}
                      className="border-primary text-primary hover:bg-primary/5 h-11 px-8"
                    >
                      Mark Processed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Process Refund Dialog */}
      <Dialog open={!!selectedRefund} onOpenChange={() => { setSelectedRefund(null); setPartialAmount(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Handle Refund Request</DialogTitle>
            <DialogDescription>
              Review and approve refund for {selectedRefund?.booking?.user?.firstName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Original Booking Total</span>
                <span className="font-bold">{formatCurrency(selectedRefund?.booking?.totalPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Requested Amount</span>
                <span className="font-bold text-red-600">{formatCurrency(selectedRefund?.amount || 0)}</span>
              </div>
              {selectedRefund?.booking?.location?.cancellationPolicy && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3 h-3 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Policy: {selectedRefund.booking.location.cancellationPolicy.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(selectedRefund.booking.location.cancellationPolicy as any).description}
                  </p>
                  {selectedRefund.approvedAmount !== undefined && selectedRefund.status === "PENDING" && (
                    <div className="mt-2 bg-green-50 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Suggested Refund: {formatCurrency(selectedRefund.approvedAmount)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Adjust Approval Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-8"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  max={selectedRefund?.booking?.totalPrice}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                You can approve a partial amount or the full request.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleProcess("REJECTED")}
              disabled={isProcessing}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Reject
            </Button>
            <Button
              onClick={() => handleProcess("APPROVED")}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
