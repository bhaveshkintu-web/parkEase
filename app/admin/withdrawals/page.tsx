"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Wallet, 
  Building, 
  Banknote,
  MoreHorizontal,
  ArrowUpDown,
  Download,
  Loader2,
  AlertCircle,
  BanknoteIcon,
  CreditCard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dialog states
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"APPROVED" | "REJECTED" | "PROCESSED">("APPROVED");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/admin/withdrawals?status=${status}&search=${search}&page=${page}&t=${timestamp}`);
      if (!res.ok) throw new Error("Failed to fetch withdrawals");
      const data = await res.json();
      setWithdrawals(data.withdrawals);
      setStats(data.stats);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async () => {
    if (!selectedWithdrawal) return;
    
    try {
      setIsSubmitting(true);
      console.log(`[APPROVE_DEBUG] Attempting to ${processingStatus} withdrawal ID: ${selectedWithdrawal.id}`);
      const res = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: processingStatus, adminNotes }),
      });

      if (!res.ok) {
          const err = await res.json();
          console.error(`[APPROVE_DEBUG_ERROR] Status: ${res.status}`, err);
          throw new Error(err.error || `Server returned ${res.status}`);
      }

      toast.success(`Withdrawal ${processingStatus.toLowerCase()} successfully`);
      setIsProcessDialogOpen(false);
      setSelectedWithdrawal(null);
      setAdminNotes("");
      fetchData();
    } catch (error: any) {
      console.error("[APPROVE_DEBUG_CATCH]", error);
      toast.error(`Error: ${error.message}. ID: ${selectedWithdrawal?.id?.slice(-8)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProcessDialog = (withdrawal: any, status: "APPROVED" | "REJECTED" | "PROCESSED") => {
    setSelectedWithdrawal(withdrawal);
    setProcessingStatus(status);
    setIsProcessDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "APPROVED": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>;
      case "PROCESSED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Processed</Badge>;
      case "REJECTED": return <Badge variant="destructive">Rejected</Badge>;
      case "FAILED": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading && withdrawals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading withdrawal requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Withdrawal Requests</h1>
          <p className="text-muted-foreground">Review and process owner payout requests</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Requiring review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
              <BanknoteIcon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalPendingAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total payout volume</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processed}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground mt-1">Declined payouts</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg w-fit">
                <Button 
                  variant={status === "all" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setStatus("all")}
                >
                  All
                </Button>
                <Button 
                  variant={status === "PENDING" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setStatus("PENDING")}
                >
                  Pending
                </Button>
                <Button 
                  variant={status === "APPROVED" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setStatus("APPROVED")}
                >
                  Approved
                </Button>
                <Button 
                  variant={status === "PROCESSED" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setStatus("PROCESSED")}
                >
                  Processed
                </Button>
             </div>
             <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                   placeholder="Search owner or bank..." 
                   className="pl-9"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                       No withdrawal requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex flex-col">
                           <span className="font-semibold text-foreground">{w.wallet.owner.businessName}</span>
                           <span className="text-xs text-muted-foreground">{w.wallet.owner.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                           <span className="font-medium flex items-center gap-1">
                             <Building className="w-3 h-3" /> {w.bankName}
                           </span>
                           <span className="text-xs text-muted-foreground font-mono">
                             {w.accountNumber && w.accountNumber.length > 4 
                               ? `****${w.accountNumber.slice(-4)}` 
                               : w.accountNumber}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-base">
                        {formatCurrency(w.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(w.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(w.requestedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {w.status === "PENDING" && (
                              <>
                                <DropdownMenuItem onClick={() => openProcessDialog(w, "APPROVED")}>
                                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                  Approve Request
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openProcessDialog(w, "REJECTED")} className="text-destructive">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject Request
                                </DropdownMenuItem>
                              </>
                            )}
                            {w.status === "APPROVED" && (
                              <DropdownMenuItem onClick={() => openProcessDialog(w, "PROCESSED")}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                                Mark as Processed
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                                toast.info("View details coming soon");
                            }}>
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
             <div className="flex items-center justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {page} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
             </div>
          )}
        </CardContent>
      </Card>

      {/* Process Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {processingStatus === "APPROVED" ? "Approve Withdrawal" : 
               processingStatus === "REJECTED" ? "Reject Withdrawal" : "Mark as Processed"}
            </DialogTitle>
            <DialogDescription>
              {processingStatus === "REJECTED" 
                ? "Please provide a reason for rejection. This will be shown to the owner and their balance will be refunded."
                : `Are you sure you want to ${processingStatus.toLowerCase()} this withdrawal for $${selectedWithdrawal?.amount}?`}
            </DialogDescription>
          </DialogHeader>
          
          {processingStatus === "REJECTED" && (
            <div className="py-4">
              <Textarea 
                placeholder="Reason for rejection..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsProcessDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={processingStatus === "REJECTED" ? "destructive" : "default"}
              onClick={handleUpdateStatus}
              disabled={isSubmitting || (processingStatus === "REJECTED" && !adminNotes.trim())}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm {processingStatus.charAt(0) + processingStatus.slice(1).toLowerCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
