"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { use, useState, useMemo } from "react";
import {
  ArrowLeft,
  Edit,
  Ban,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  AlertTriangle,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Trash2,
  Eye,
  CreditCard,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/lib/data-store";
import { StatCard } from "@/components/admin/stat-card";

export default function OwnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const {
    ownerProfiles,
    adminLocations,
    watchmen,
    disputes,
    transactions,
    suspendOwner,
    reactivateOwner,
    verifyOwnerDocument,
    approveOwner,
  } = useDataStore();

  const ownerId = params.id as string;
  const owner = ownerProfiles.find((o) => o.id === ownerId);

  // Dialogs
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [documentDialog, setDocumentDialog] = useState<{ open: boolean; docId: string | null; action: "verify" | "reject" }>({
    open: false,
    docId: null,
    action: "verify",
  });
  const [rejectReason, setRejectReason] = useState("");

  // Get related data
  const ownerLocations = useMemo(() => {
    return adminLocations.filter((loc) => loc.createdBy === ownerId || loc.id.includes("loc"));
  }, [adminLocations, ownerId]);

  const ownerWatchmen = useMemo(() => {
    return watchmen.filter((w) => w.ownerId === ownerId);
  }, [watchmen, ownerId]);

  const ownerDisputes = useMemo(() => {
    return disputes.filter((d) => d.userId === owner?.userId);
  }, [disputes, owner?.userId]);

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

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    try {
      await suspendOwner(owner.id, suspendReason);
      toast({ title: "Owner Suspended", description: `${owner.businessName} has been suspended.` });
      setSuspendDialog(false);
      setSuspendReason("");
    } catch {
      toast({ title: "Error", description: "Failed to suspend owner", variant: "destructive" });
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateOwner(owner.id);
      toast({ title: "Owner Reactivated", description: `${owner.businessName} has been reactivated.` });
    } catch {
      toast({ title: "Error", description: "Failed to reactivate owner", variant: "destructive" });
    }
  };

  const handleApprove = async () => {
    try {
      await approveOwner(owner.id, "admin_1");
      toast({ title: "Owner Approved", description: `${owner.businessName} has been approved.` });
    } catch {
      toast({ title: "Error", description: "Failed to approve owner", variant: "destructive" });
    }
  };

  const handleDocumentAction = async () => {
    if (!documentDialog.docId) return;
    try {
      await verifyOwnerDocument(
        owner.id,
        documentDialog.docId,
        documentDialog.action,
        documentDialog.action === "reject" ? rejectReason : undefined
      );
      toast({
        title: documentDialog.action === "verify" ? "Document Verified" : "Document Rejected",
        description: `The document has been ${documentDialog.action === "verify" ? "verified" : "rejected"}.`,
      });
      setDocumentDialog({ open: false, docId: null, action: "verify" });
      setRejectReason("");
    } catch {
      toast({ title: "Error", description: "Failed to process document", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: typeof owner.status) => {
    const variants: Record<typeof status, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      approved: { variant: "default", label: "Approved" },
      pending: { variant: "secondary", label: "Pending" },
      suspended: { variant: "destructive", label: "Suspended" },
      rejected: { variant: "outline", label: "Rejected" },
    };
    const item = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const getVerificationBadge = (status: typeof owner.verificationStatus) => {
    const config: Record<typeof status, { className: string; label: string }> = {
      verified: { className: "bg-emerald-100 text-emerald-700", label: "Verified" },
      in_review: { className: "bg-amber-100 text-amber-700", label: "In Review" },
      unverified: { className: "bg-slate-100 text-slate-700", label: "Unverified" },
      failed: { className: "bg-red-100 text-red-700", label: "Failed" },
    };
    const item = config[status] || { className: "bg-slate-100 text-slate-700", label: status };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/owners">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{owner.businessName}</h1>
              {getStatusBadge(owner.status)}
              {getVerificationBadge(owner.verificationStatus)}
            </div>
            <p className="text-muted-foreground">
              Owner ID: {owner.id} | Created: {owner.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-12 sm:ml-0">
          {owner.status === "pending" && (
            <Button onClick={handleApprove}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Owner
            </Button>
          )}
          {owner.status === "suspended" ? (
            <Button onClick={handleReactivate}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Reactivate
            </Button>
          ) : owner.status !== "pending" ? (
            <Button variant="outline" onClick={() => setSuspendDialog(true)} className="bg-transparent">
              <Ban className="w-4 h-4 mr-2" />
              Suspend
            </Button>
          ) : null}
          <Button variant="outline" asChild className="bg-transparent">
            <Link href={`/admin/owners/${owner.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Suspended Alert */}
      {owner.status === "suspended" && owner.suspendedReason && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Ban className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Account Suspended</p>
                <p className="text-sm text-muted-foreground mt-1">{owner.suspendedReason}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Suspended on: {owner.suspendedAt?.toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={`$${owner.stats.totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Total Bookings" value={owner.stats.totalBookings} icon={Calendar} />
        <StatCard title="Active Locations" value={`${owner.stats.activeLocations}/${owner.stats.totalLocations}`} icon={MapPin} />
        <StatCard
          title="Average Rating"
          value={owner.stats.avgRating.toFixed(1)}
          icon={Star}
          trend={owner.stats.avgRating >= 4 ? { value: 0, isPositive: true } : undefined}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations ({ownerLocations.length})</TabsTrigger>
          <TabsTrigger value="watchmen">Watchmen ({owner.stats.watchmenCount})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({owner.documents.length})</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({owner.stats.disputeCount})</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Owner Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-medium text-primary">
                      {owner.user.firstName[0]}{owner.user.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{owner.user.firstName} {owner.user.lastName}</p>
                    <p className="text-sm text-muted-foreground capitalize">{owner.user.role}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{owner.user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{owner.user.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Joined: {owner.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{owner.businessName}</p>
                    <p className="text-sm text-muted-foreground capitalize">{owner.businessType}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  {owner.taxId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tax ID</span>
                      <span>{owner.taxId}</span>
                    </div>
                  )}
                  {owner.registrationNumber && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Registration #</span>
                      <span>{owner.registrationNumber}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Address</p>
                    <p>{owner.address.street}</p>
                    <p>{owner.address.city}, {owner.address.state} {owner.address.zipCode}</p>
                    <p>{owner.address.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            {owner.bankDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bank Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Account Name</span>
                    <span>{owner.bankDetails.accountName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bank Name</span>
                    <span>{owner.bankDetails.bankName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Account Number</span>
                    <span>{owner.bankDetails.accountNumber}</span>
                  </div>
                  {owner.bankDetails.routingNumber && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Routing Number</span>
                      <span>{owner.bankDetails.routingNumber}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Earnings</span>
                  <span className="font-medium">{`$${owner.stats.totalEarnings.toLocaleString()}`}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Commission Paid</span>
                  <span className="font-medium">{`$${owner.stats.totalCommissionPaid.toLocaleString()}`}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending Withdrawals</span>
                  <span className="font-medium">{`$${owner.stats.pendingWithdrawals.toLocaleString()}`}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Disputes Resolved</span>
                  <span className="font-medium">{owner.stats.resolvedDisputes}/{owner.stats.disputeCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Watchmen</span>
                  <span className="font-medium">{owner.stats.watchmenCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Parking Locations</CardTitle>
                <CardDescription>All parking locations owned by this owner</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/admin/locations/new?owner=${owner.id}`}>Add Location</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Spots</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerLocations.slice(0, 5).map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{location.name}</p>
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.status === "active" ? "default" : "secondary"}>
                          {location.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{location.availableSpots}/{location.totalSpots}</TableCell>
                      <TableCell>{`$${location.analytics.revenue.toLocaleString()}`}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          {location.rating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/locations/${location.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Watchmen Tab */}
        <TabsContent value="watchmen">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Watchmen</CardTitle>
                <CardDescription>Staff members assigned to this owner's locations</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead>Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerWatchmen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No watchmen assigned to this owner
                      </TableCell>
                    </TableRow>
                  ) : (
                    ownerWatchmen.map((watchman) => (
                      <TableRow key={watchman.id}>
                        <TableCell className="font-medium">{watchman.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{watchman.email}</p>
                            <p className="text-muted-foreground">{watchman.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{watchman.shift}</TableCell>
                        <TableCell>
                          <Badge variant={watchman.status === "active" ? "default" : "secondary"}>
                            {watchman.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{watchman.assignedParkingIds.length}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{watchman.todayCheckIns} check-ins</p>
                            <p className="text-muted-foreground">{watchman.todayCheckOuts} check-outs</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Verification documents submitted by the owner</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owner.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{doc.type.replace("_", " ")}</TableCell>
                      <TableCell>{doc.uploadedAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDocumentStatusIcon(doc.status)}
                          <span className="capitalize">{doc.status}</span>
                        </div>
                        {doc.rejectionReason && (
                          <p className="text-xs text-destructive mt-1">{doc.rejectionReason}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {doc.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setDocumentDialog({ open: true, docId: doc.id, action: "verify" })}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Verify
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDocumentDialog({ open: true, docId: doc.id, action: "reject" })}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>Disputes</CardTitle>
              <CardDescription>Customer disputes related to this owner's locations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerDisputes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No disputes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    ownerDisputes.map((dispute) => (
                      <TableRow key={dispute.id}>
                        <TableCell className="font-mono text-sm">{dispute.id}</TableCell>
                        <TableCell className="font-medium">{dispute.subject}</TableCell>
                        <TableCell className="capitalize">{dispute.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              dispute.priority === "urgent" || dispute.priority === "high"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {dispute.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              dispute.status === "resolved"
                                ? "default"
                                : dispute.status === "open"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {dispute.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{dispute.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/disputes?id=${dispute.id}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Revenue" value={`$${owner.stats.totalRevenue.toLocaleString()}`} icon={DollarSign} />
              <StatCard title="Net Earnings" value={`$${owner.stats.totalEarnings.toLocaleString()}`} icon={CreditCard} />
              <StatCard title="Commission Paid" value={`$${owner.stats.totalCommissionPaid.toLocaleString()}`} icon={AlertTriangle} />
              <StatCard title="Pending Withdrawal" value={`$${owner.stats.pendingWithdrawals.toLocaleString()}`} icon={Clock} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest financial transactions for this owner</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 10).map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{txn.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{txn.type}</TableCell>
                        <TableCell>{txn.description}</TableCell>
                        <TableCell className={txn.type === "credit" ? "text-emerald-600" : "text-red-600"}>
                          {txn.type === "credit" ? "+" : "-"}{`$${txn.amount.toFixed(2)}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={txn.status === "completed" ? "default" : "secondary"}>
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
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Owner</DialogTitle>
            <DialogDescription>
              This will suspend {owner.businessName} and disable all their parking locations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspendReason">Reason for suspension</Label>
              <Textarea
                id="suspendReason"
                placeholder="Enter the reason..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!suspendReason.trim()}>
              Suspend Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Verification Dialog */}
      <Dialog open={documentDialog.open} onOpenChange={(open) => setDocumentDialog({ ...documentDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {documentDialog.action === "verify" ? "Verify Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription>
              {documentDialog.action === "verify"
                ? "Confirm that this document has been reviewed and verified."
                : "Provide a reason for rejecting this document."}
            </DialogDescription>
          </DialogHeader>
          {documentDialog.action === "reject" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Rejection Reason</Label>
                <Textarea
                  id="rejectReason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDocumentDialog({ open: false, docId: null, action: "verify" })}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              variant={documentDialog.action === "verify" ? "default" : "destructive"}
              onClick={handleDocumentAction}
              disabled={documentDialog.action === "reject" && !rejectReason.trim()}
            >
              {documentDialog.action === "verify" ? "Verify Document" : "Reject Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
