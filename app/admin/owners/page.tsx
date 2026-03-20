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
  Building2,
  MapPin,
  MoreVertical,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/admin/stat-card";
import { formatCurrency } from "@/lib/data";
import { PaginationFooter } from "@/components/ui/pagination-footer";

interface Owner {
  id: string;
  businessName: string;
  businessType: string;
  status: string;
  verificationStatus: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
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
  createdAt: string;
}

export default function OwnersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 10;
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

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

      if (!response.ok) throw new Error("Failed to approve");

      toast({
        title: "Owner Approved",
        description: `${owner.businessName} has been approved.`,
      });
      fetchOwners();
    } catch {
      toast({ title: "Error", description: "Failed to approve owner", variant: "destructive" });
    }
  };

  const normalizeStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === "active") return "approved"; // Map 'active' to 'approved' for consistency
    return s;
  };

  const filteredOwners = owners.filter((owner) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      owner.businessName.toLowerCase().includes(searchLower) ||
      owner.user.email.toLowerCase().includes(searchLower) ||
      owner.user.firstName.toLowerCase().includes(searchLower) ||
      owner.user.lastName.toLowerCase().includes(searchLower);
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && normalizeStatus(owner.status) === activeTab;
  });

  const totalPages = Math.ceil(filteredOwners.length / ITEMS_PER_PAGE);
  const paginatedOwners = filteredOwners.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page on tab or search change
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);

  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status);
    const variants: Record<string, { className: string; label: string }> = {
      approved: { className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", label: "Active" },
      pending: { className: "bg-amber-100 text-amber-700 hover:bg-amber-100", label: "Pending" },
      suspended: { className: "bg-red-100 text-red-700 hover:bg-red-100", label: "Suspended" },
      rejected: { className: "bg-slate-100 text-slate-700 hover:bg-slate-100", label: "Rejected" },
    };
    // Default to the status string if not found in variants
    const item = variants[normalized] || { className: "bg-slate-100 text-slate-700", label: status };
    return <Badge className={item.className} variant="outline">{item.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Owner Management</h1>
          <p className="text-muted-foreground">Manage partners, view analytics, and handle approvals.</p>
        </div>
        <div className="flex items-center w-full sm:w-auto">
          <Button asChild className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
            <Link href="/admin/owners/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Owner
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Partners", value: owners.length, sub: "+2 from last month", icon: Users },
          { label: "Pending Approval", value: owners.filter(o => normalizeStatus(o.status) === 'pending').length, sub: "Needs attention", icon: CheckCircle2 },
          { label: "Active Locations", value: owners.reduce((acc, curr) => acc + (curr.locations?.length || 0), 0), sub: "Across partners", icon: MapPin },
          { label: "Total Revenue", value: "$0.00", sub: "+0% from last month", icon: Building2 }
        ].map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
              <p className="text-[9px] sm:text-xs text-muted-foreground uppercase">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-0">
          <div className="flex flex-col gap-4 px-4 sm:px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col gap-4">
                <TabsList className="bg-transparent h-auto grid grid-cols-2 sm:flex sm:flex-row items-stretch gap-1.5 w-full p-0 border-none">
                  <TabsTrigger value="all" className="h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm border rounded-lg sm:border-none flex-1">All ({owners.length})</TabsTrigger>
                  <TabsTrigger value="approved" className="h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm border rounded-lg sm:border-none flex-1">Active ({owners.filter(o => normalizeStatus(o.status) === "approved").length})</TabsTrigger>
                  <TabsTrigger value="pending" className="h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm border rounded-lg sm:border-none flex-1">Pending ({owners.filter(o => normalizeStatus(o.status) === "pending").length})</TabsTrigger>
                  <TabsTrigger value="suspended" className="h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm border rounded-lg sm:border-none flex-1">Suspended ({owners.filter(o => normalizeStatus(o.status) === "suspended").length})</TabsTrigger>
                  <TabsTrigger value="rejected" className="h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm border rounded-lg sm:border-none flex-1 col-span-2 sm:col-span-1">Rejected ({owners.filter(o => normalizeStatus(o.status) === "rejected").length})</TabsTrigger>
                </TabsList>
                
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search owners by name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50/80 h-10 w-full border-slate-100"
                  />
                </div>
              </div>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px] sm:w-[300px]">Business Name</TableHead>
                  <TableHead className="hidden md:table-cell">Primary Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Locations</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOwners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No owners found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOwners.map((owner) => (
                    <TableRow key={owner.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/owners/${owner.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${owner.businessName}`} />
                            <AvatarFallback>{owner.businessName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{owner.businessName}</span>
                            <span className="text-xs text-muted-foreground capitalize">{owner.businessType}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm">{owner.user.firstName} {owner.user.lastName}</span>
                          <span className="text-xs text-muted-foreground">{owner.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(owner.status)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="font-normal">
                          {owner.locations?.length || 0} Locations
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {new Date(owner.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/admin/owners/${owner.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/owners/${owner.id}/edit`)}>
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {owner.status === "pending" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleApprove(owner); }}>
                                Approve
                              </DropdownMenuItem>
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
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOwners.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
