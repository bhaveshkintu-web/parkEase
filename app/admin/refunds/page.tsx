"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
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
} from "lucide-react";
import type { RefundRequest } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Loading from "./loading";

export default function RefundsPage() {
  const { refundRequests, processRefund } = useDataStore();
  const [search, setSearch] = useState("");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [partialAmount, setPartialAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredRefunds = refundRequests.filter(
    (r) =>
      r.userName.toLowerCase().includes(search.toLowerCase()) ||
      r.bookingId.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = refundRequests.filter((r) => r.status === "pending").length;
  const approvedCount = refundRequests.filter((r) => r.status === "approved").length;
  const totalPending = refundRequests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0);

  const handleProcess = async (action: "approve" | "partial" | "reject") => {
    if (!selectedRefund) return;
    setIsProcessing(true);
    const amount = action === "partial" ? partialAmount : selectedRefund.amount;
    await processRefund(selectedRefund.id, action, amount);
    setSelectedRefund(null);
    setPartialAmount(0);
    setIsProcessing(false);
  };

  const getStatusVariant = (status: RefundRequest["status"]) => {
    switch (status) {
      case "pending": return "warning";
      case "approved": return "info";
      case "partial": return "info";
      case "processed": return "success";
      case "rejected": return "error";
    }
  };

  const getReasonLabel = (reason: RefundRequest["reason"]) => {
    switch (reason) {
      case "cancellation": return "Booking Cancellation";
      case "service_issue": return "Service Issue";
      case "duplicate_charge": return "Duplicate Charge";
      case "overcharge": return "Overcharge";
      case "no_show": return "Location No-Show";
      case "other": return "Other";
    }
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Refund Processing</h1>
              <p className="text-muted-foreground">Review and process customer refund requests</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processed</p>
                  <p className="text-2xl font-bold text-foreground">
                    {refundRequests.filter((r) => r.status === "processed").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or booking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Refunds List */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
            <TabsTrigger value="processed">Processed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {["pending", "approved", "processed", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="space-y-4">
                {filteredRefunds
                  .filter((r) => tab === "all" || r.status === tab)
                  .map((refund) => (
                    <Card key={refund.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg text-foreground">
                                    {formatCurrency(refund.amount)}
                                  </h3>
                                  <Badge variant="outline">{getReasonLabel(refund.reason)}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{refund.description}</p>
                              </div>
                              <StatusBadge status={refund.status} variant={getStatusVariant(refund.status)} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Customer:</span>
                                <span className="font-medium">{refund.userName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Booking:</span>
                                <span className="font-medium">{refund.bookingId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Payment:</span>
                                <span className="font-medium">{refund.paymentMethod}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Requested:</span>
                                <span className="font-medium">{new Date(refund.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {refund.approvedAmount !== undefined && refund.approvedAmount !== refund.amount && (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  <span className="font-medium">Approved Amount:</span> {formatCurrency(refund.approvedAmount)}
                                  <span className="text-blue-600 ml-2">
                                    (Original: {formatCurrency(refund.amount)})
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>

                          {refund.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setPartialAmount(refund.amount);
                              }}
                              className="bg-transparent"
                            >
                              Process
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {filteredRefunds.filter((r) => tab === "all" || r.status === tab).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                      <h3 className="text-lg font-medium text-foreground">No refunds found</h3>
                      <p className="text-muted-foreground mt-1">
                        {tab === "pending" ? "No pending refunds to process" : "No refunds match your criteria"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Process Refund Dialog */}
        <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Review and decide on this refund request from {selectedRefund?.userName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested Amount</span>
                    <span className="font-bold text-lg">{formatCurrency(selectedRefund?.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason</span>
                    <span>{selectedRefund && getReasonLabel(selectedRefund.reason)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking</span>
                    <span>{selectedRefund?.bookingId}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{selectedRefund?.description}</p>
              </div>

              <div className="space-y-2">
                <Label>Partial Refund Amount (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    className="pl-8"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(Number(e.target.value))}
                    max={selectedRefund?.amount}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a partial amount or approve the full {formatCurrency(selectedRefund?.amount || 0)}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                onClick={() => handleProcess("reject")}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              {partialAmount !== selectedRefund?.amount && partialAmount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => handleProcess("partial")}
                  disabled={isProcessing}
                  className="w-full sm:w-auto bg-transparent"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Partial ({formatCurrency(partialAmount)})
                </Button>
              )}
              <Button
                onClick={() => handleProcess("approve")}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Full
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}


