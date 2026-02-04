"use client";

import { useState, useEffect } from "react";
import { format, differenceInHours } from "date-fns";
import { 
  Mail, 
  MessageSquare, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Loader2,
  ChevronRight,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { StatCard } from "@/components/admin/stat-card";
import { TicketDetails } from "@/components/admin/ticket-details";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [search, status]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (status !== "all") queryParams.set("status", status);

      const response = await fetch(`/api/admin/support-tickets?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        
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
      console.error("Failed to fetch tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 uppercase text-[10px]">Open</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 uppercase text-[10px]">In Progress</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 uppercase text-[10px]">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSLABadge = (createdAt: string) => {
    const hours = differenceInHours(new Date(), new Date(createdAt));
    if (hours < 2) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{"< 2h"}</Badge>;
    if (hours < 8) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{"< 8h"}</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>;
  };

  const handleManageTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Support Center</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer inquiries and maintain service standards
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Tickets"
          value={stats.open}
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBgColor="bg-red-50"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
        />
        <StatCard
          title="Global SLA"
          value="--"
          icon={Shield}
          iconColor="text-slate-600"
          iconBgColor="bg-slate-50"
        />
      </div>

      {/* Filters & Search */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, subject..."
                className="pl-10 h-10 border-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px] h-10 border-slate-200">
                  <SelectValue placeholder="All Tickets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-10 px-4 border-slate-200" onClick={() => { setSearch(""); setStatus("all"); }}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-200 mb-4" />
            <p className="text-lg font-medium text-slate-900">All caught up!</p>
            <p className="text-muted-foreground">No support tickets match your criteria.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[120px] font-semibold text-slate-900">Status</TableHead>
                <TableHead className="font-semibold text-slate-900">Customer</TableHead>
                <TableHead className="font-semibold text-slate-900">Subject</TableHead>
                <TableHead className="font-semibold text-slate-900">SLA Timer</TableHead>
                <TableHead className="text-right font-semibold text-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{ticket.name}</span>
                      <span className="text-xs text-slate-500">{ticket.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col max-w-[300px]">
                      <span className="font-medium truncate">{ticket.subject}</span>
                      <span className="text-xs text-slate-500 truncate">{ticket.message}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getSLABadge(ticket.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleManageTicket(ticket)} className="text-primary hover:text-primary hover:bg-primary/5">
                      Manage
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Ticket Details Slide-over */}
      {isDetailsOpen && selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onUpdate={fetchTickets}
        />
      )}
    </div>
  );
}

function Download(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
