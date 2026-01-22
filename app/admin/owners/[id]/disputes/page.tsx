"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Filter,
  Search,
  Eye,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StatCard } from "@/components/admin/stat-card";
import type { Dispute } from "@/lib/types";
import { Suspense } from "react";
import Loading from "./loading";

export default function OwnerDisputesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { ownerProfiles, disputes, updateDispute } = useDataStore();

  const ownerId = params.id as string;
  const owner = ownerProfiles.find((o) => o.id === ownerId);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; dispute: Dispute | null }>({ open: false, dispute: null });
  const [resolution, setResolution] = useState("");

  // Filter disputes related to owner
  const ownerDisputes = useMemo(() => {
    return disputes.filter((d) => {
      // In real app, filter by owner's location IDs
      const matchesSearch =
        !searchQuery ||
        d.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || d.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [disputes, searchQuery, statusFilter, priorityFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: ownerDisputes.length,
    open: ownerDisputes.filter((d) => d.status === "open").length,
    inProgress: ownerDisputes.filter((d) => d.status === "in_progress").length,
    resolved: ownerDisputes.filter((d) => d.status === "resolved" || d.status === "closed").length,
  }), [ownerDisputes]);

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

  const handleResolve = async () => {
    if (!resolveDialog.dispute || !resolution.trim()) return;
    try {
      await updateDispute(resolveDialog.dispute.id, {
        status: "resolved",
        resolution: resolution,
      });
      toast({
        title: "Dispute Resolved",
        description: "The dispute has been marked as resolved.",
      });
      setResolveDialog({ open: false, dispute: null });
      setResolution("");
    } catch {
      toast({ title: "Error", description: "Failed to resolve dispute", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: Dispute["status"]) => {
    const config: Record<Dispute["status"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      open: { variant: "destructive", label: "Open" },
      in_progress: { variant: "secondary", label: "In Progress" },
      resolved: { variant: "default", label: "Resolved" },
      closed: { variant: "outline", label: "Closed" },
    };
    const item = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const getPriorityBadge = (priority: Dispute["priority"]) => {
    const config: Record<Dispute["priority"], { className: string; label: string }> = {
      urgent: { className: "bg-red-100 text-red-700", label: "Urgent" },
      high: { className: "bg-orange-100 text-orange-700", label: "High" },
      medium: { className: "bg-amber-100 text-amber-700", label: "Medium" },
      low: { className: "bg-slate-100 text-slate-700", label: "Low" },
    };
    const item = config[priority] || { className: "bg-slate-100 text-slate-700", label: priority };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/owners/${ownerId}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
            <p className="text-muted-foreground">{owner.businessName}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Disputes" value={stats.total} icon={AlertTriangle} />
          <StatCard title="Open" value={stats.open} icon={Clock} trend={stats.open > 0 ? { value: stats.open, isPositive: false } : undefined} />
          <StatCard title="In Progress" value={stats.inProgress} icon={MessageSquare} />
          <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle2} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disputes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dispute List</CardTitle>
            <CardDescription>All disputes related to this owner's locations</CardDescription>
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
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ownerDisputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No disputes found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  ownerDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-mono text-sm">{dispute.id}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{dispute.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{dispute.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{dispute.type}</TableCell>
                      <TableCell>{getPriorityBadge(dispute.priority)}</TableCell>
                      <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                      <TableCell>{dispute.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>{dispute.updatedAt.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/disputes?id=${dispute.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {dispute.status !== "resolved" && dispute.status !== "closed" && (
                              <DropdownMenuItem onClick={() => setResolveDialog({ open: true, dispute })}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Resolve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/disputes?id=${dispute.id}`}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open in Disputes
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resolution Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle>Resolution Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">
                  {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">2.3</p>
                <p className="text-sm text-muted-foreground">Avg. Days to Resolve</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">4.2</p>
                <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialog.open} onOpenChange={(open) => { setResolveDialog({ open, dispute: open ? resolveDialog.dispute : null }); setResolution(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Dispute</DialogTitle>
              <DialogDescription>
                Provide a resolution for dispute: {resolveDialog.dispute?.subject}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution Details</Label>
                <Textarea
                  id="resolution"
                  placeholder="Describe how the dispute was resolved..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialog({ open: false, dispute: null })} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleResolve} disabled={!resolution.trim()}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
