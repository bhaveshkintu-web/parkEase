"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Ban,
  Users,
  DollarSign,
  MapPin,
  Star,
  AlertTriangle,
  Building2,
  Loader2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/admin/stat-card";

interface Owner {
  id: string;
  businessName: string;
  businessType: string;
  status: string;
  verificationStatus: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  locations: {
    id: string;
    name: string;
    status: string;
  }[];
}

export default function OwnersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/owners");
      if (response.ok) {
        const data = await response.json();
        setOwners(data.owners || []);
      }
    } catch (error) {
      console.error("Failed to fetch owners:", error);
      toast({
        title: "Error",
        description: "Failed to load owners",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (owner: Owner) => {
    try {
      const response = await fetch(`/api/admin/owners/${owner.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve owner");
      }

      toast({
        title: "Owner Approved",
        description: `${owner.businessName} has been approved and can now add locations.`,
      });

      fetchOwners(); // Refresh list
    } catch {
      toast({ title: "Error", description: "Failed to approve owner", variant: "destructive" });
    }
  };

  const handleReject = async (owner: Owner) => {
    try {
      const response = await fetch(`/api/admin/owners/${owner.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject owner");
      }

      toast({
        title: "Owner Rejected",
        description: `${owner.businessName} has been rejected.`,
      });

      fetchOwners();
    } catch {
      toast({ title: "Error", description: "Failed to reject owner", variant: "destructive" });
    }
  };

  const filteredOwners = owners.filter((owner) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      owner.businessName.toLowerCase().includes(searchLower) ||
      owner.user.email.toLowerCase().includes(searchLower) ||
      owner.user.firstName.toLowerCase().includes(searchLower) ||
      owner.user.lastName.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === "all" || owner.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: owners.length,
    approved: owners.filter((o) => o.status === "approved").length,
    pending: owners.filter((o) => o.status === "pending").length,
    suspended: owners.filter((o) => o.status === "suspended").length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      approved: { variant: "default", label: "Approved" },
      pending: { variant: "secondary", label: "Pending" },
      suspended: { variant: "destructive", label: "Suspended" },
      rejected: { variant: "outline", label: "Rejected" },
    };
    const item = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const getVerificationBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      verified: { className: "bg-emerald-100 text-emerald-700", label: "Verified" },
      in_review: { className: "bg-amber-100 text-amber-700", label: "In Review" },
      unverified: { className: "bg-slate-100 text-slate-700", label: "Unverified" },
      failed: { className: "bg-red-100 text-red-700", label: "Failed" },
    };
    const item = config[status] || { className: "bg-slate-100 text-slate-700", label: status };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Owner Management</h1>
          <p className="text-muted-foreground">Manage parking lot owners and their accounts</p>
        </div>
        <Button asChild>
          <Link href="/admin/owners/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Owner
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Owners" value={stats.total} icon={Users} />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} />
        <StatCard title="Pending" value={stats.pending} icon={AlertTriangle} />
        <StatCard title="Suspended" value={stats.suspended} icon={Ban} />
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOwners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No owners found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOwners.map((owner) => (
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
                          <span>{owner.locations?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/owners/${owner.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {owner.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(owner)} className="text-green-600 focus:text-green-600">
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(owner)} className="text-red-600 focus:text-red-600">
                                  <Ban className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
