"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  MoreVertical, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Loader2,
  ExternalLink,
  MessageSquare,
  Shield,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { StatCard } from "@/components/admin/stat-card";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { DisputeDetails } from "@/components/admin/dispute-details";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [search, status, priority]);

  const fetchDisputes = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (status !== "all") queryParams.set("status", status);
      if (priority !== "all") queryParams.set("priority", priority);

      const response = await fetch(`/api/admin/disputes?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes);
        
        if (data.stats) {
          setStats({
            total: data.stats.total,
            open: data.stats.open,
            inProgress: data.stats.inProgress,
            resolved: data.stats.resolved,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch disputes:", error);
      toast.error("Failed to load disputes");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50">Open</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">In Progress</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 hover:bg-green-50">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <Badge className="bg-red-600">High</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-500">Medium</Badge>;
      case "LOW":
        return <Badge className="bg-slate-500">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handleManageDispute = (dispute: any) => {
    setSelectedDispute(dispute);
    setIsDetailsOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dispute Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and resolve customer disputes and refund requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Open"
          value={stats.open}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Total Count"
          value={stats.total}
          icon={Shield}
          iconColor="text-slate-600"
          iconBgColor="bg-slate-100"
        />
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Booking ID, Email, Subject..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { setSearch(""); setStatus("all"); setPriority("all"); }}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No disputes found</p>
              <p className="text-muted-foreground">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Dispute ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date Raised</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">ID: {dispute.id.slice(-6).toUpperCase()}</span>
                        <span className="font-mono text-xs">{dispute.booking.confirmationCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[150px]">
                          {dispute.user.firstName} {dispute.user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {dispute.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[200px]">{dispute.subject}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{dispute.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                    <TableCell>{getPriorityBadge(dispute.priority)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(dispute.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleManageDispute(dispute)}>
                        Manage
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dispute Details Slide-over */}
      {isDetailsOpen && selectedDispute && (
        <DisputeDetails
          disputeId={selectedDispute.id}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            fetchDisputes(); // Refresh list after managing
          }}
        />
      )}
    </div>
  );
}
