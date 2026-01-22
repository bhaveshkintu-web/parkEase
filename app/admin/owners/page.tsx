"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle2,
  MapPin,
  Users,
  DollarSign,
  Star,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/lib/data-store";
import type { OwnerProfile } from "@/lib/types";
import { StatCard } from "@/components/admin/stat-card";
import Loading from "./loading";

const ITEMS_PER_PAGE = 10;

export default function OwnersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OwnersPageContent />
    </Suspense>
  );
}

function OwnersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { ownerProfiles, suspendOwner, reactivateOwner, deleteOwnerProfile } = useDataStore();

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [verificationFilter, setVerificationFilter] = useState(searchParams.get("verification") || "all");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialogs
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; owner: OwnerProfile | null }>({ open: false, owner: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; owner: OwnerProfile | null }>({ open: false, owner: null });
  const [suspendReason, setSuspendReason] = useState("");

  // Filter and search
  const filteredOwners = useMemo(() => {
    return ownerProfiles.filter((owner) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        owner.businessName.toLowerCase().includes(searchLower) ||
        owner.user.email.toLowerCase().includes(searchLower) ||
        owner.user.firstName.toLowerCase().includes(searchLower) ||
        owner.user.lastName.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "all" || owner.status === statusFilter;

      // Verification filter
      const matchesVerification = verificationFilter === "all" || owner.verificationStatus === verificationFilter;

      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [ownerProfiles, searchQuery, statusFilter, verificationFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOwners.length / ITEMS_PER_PAGE);
  const paginatedOwners = filteredOwners.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => {
    return {
      total: ownerProfiles.length,
      approved: ownerProfiles.filter((o) => o.status === "approved").length,
      pending: ownerProfiles.filter((o) => o.status === "pending").length,
      suspended: ownerProfiles.filter((o) => o.status === "suspended").length,
      totalRevenue: ownerProfiles.reduce((sum, o) => sum + o.stats.totalRevenue, 0),
    };
  }, [ownerProfiles]);

  const handleSuspend = async () => {
    if (!suspendDialog.owner || !suspendReason.trim()) return;
    try {
      await suspendOwner(suspendDialog.owner.id, suspendReason);
      toast({
        title: "Owner Suspended",
        description: `${suspendDialog.owner.businessName} has been suspended.`,
      });
      setSuspendDialog({ open: false, owner: null });
      setSuspendReason("");
    } catch {
      toast({ title: "Error", description: "Failed to suspend owner", variant: "destructive" });
    }
  };

  const handleReactivate = async (owner: OwnerProfile) => {
    try {
      await reactivateOwner(owner.id);
      toast({
        title: "Owner Reactivated",
        description: `${owner.businessName} has been reactivated.`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to reactivate owner", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.owner) return;
    try {
      await deleteOwnerProfile(deleteDialog.owner.id);
      toast({
        title: "Owner Deleted",
        description: `${deleteDialog.owner.businessName} has been removed.`,
      });
      setDeleteDialog({ open: false, owner: null });
    } catch {
      toast({ title: "Error", description: "Failed to delete owner", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: OwnerProfile["status"]) => {
    const variants: Record<OwnerProfile["status"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      approved: { variant: "default", label: "Approved" },
      pending: { variant: "secondary", label: "Pending" },
      suspended: { variant: "destructive", label: "Suspended" },
      rejected: { variant: "outline", label: "Rejected" },
    };
    const item = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const getVerificationBadge = (status: OwnerProfile["verificationStatus"]) => {
    const config: Record<OwnerProfile["verificationStatus"], { className: string; label: string }> = {
      verified: { className: "bg-emerald-100 text-emerald-700", label: "Verified" },
      in_review: { className: "bg-amber-100 text-amber-700", label: "In Review" },
      unverified: { className: "bg-slate-100 text-slate-700", label: "Unverified" },
      failed: { className: "bg-red-100 text-red-700", label: "Failed" },
    };
    const item = config[status] || { className: "bg-slate-100 text-slate-700", label: status };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Owner Management</h1>
          <p className="text-muted-foreground">Manage parking lot owners and their accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link href="/admin/owners/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Owner
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Owners" value={stats.total} icon={Users} />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} trend={{ value: 12, isPositive: true }} />
        <StatCard title="Pending" value={stats.pending} icon={AlertTriangle} />
        <StatCard title="Suspended" value={stats.suspended} icon={Ban} />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 8.5, isPositive: true }}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, business, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={verificationFilter} onValueChange={(v) => { setVerificationFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verification</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Owners ({filteredOwners.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Disputes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOwners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No owners found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOwners.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {owner.user.firstName[0]}{owner.user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {owner.user.firstName} {owner.user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{owner.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{owner.businessName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{owner.businessType}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(owner.status)}
                          {getVerificationBadge(owner.verificationStatus)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{owner.stats.activeLocations}/{owner.stats.totalLocations}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{`$${owner.stats.totalRevenue.toLocaleString()}`}</p>
                        <p className="text-xs text-muted-foreground">
                          Earnings: {`$${owner.stats.totalEarnings.toLocaleString()}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span>{owner.stats.avgRating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                          <span>{owner.stats.resolvedDisputes}/{owner.stats.disputeCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/owners/${owner.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/owners/${owner.id}/edit`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {owner.status === "suspended" ? (
                              <DropdownMenuItem onClick={() => handleReactivate(owner)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setSuspendDialog({ open: true, owner })}>
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteDialog({ open: true, owner })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredOwners.length)} of {filteredOwners.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => { setSuspendDialog({ open, owner: open ? suspendDialog.owner : null }); setSuspendReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Owner</DialogTitle>
            <DialogDescription>
              This will suspend {suspendDialog.owner?.businessName} and disable all their parking locations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspendReason">Reason for suspension</Label>
              <Textarea
                id="suspendReason"
                placeholder="Enter the reason for suspending this owner..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, owner: null })} className="bg-transparent">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!suspendReason.trim()}>
              Suspend Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, owner: open ? deleteDialog.owner : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Owner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog.owner?.businessName}? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, owner: null })} className="bg-transparent">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
