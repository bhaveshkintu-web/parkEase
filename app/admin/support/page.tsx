"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import * as React from "react";
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
  Loader2
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getSupportTickets, updateTicketStatus } from "@/lib/actions/support-actions";

export default function AdminSupportPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  React.useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const result = await getSupportTickets();
      if (result.success) {
        setTickets(result.tickets || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching tickets",
        description: error.message || "Failed to load support tickets.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: any) => {
    try {
      const result = await updateTicketStatus(ticketId, newStatus);
      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Ticket marked as ${newStatus.replace("_", " ")}.`,
        });
        // Update local state
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update ticket status.",
        variant: "destructive",
      });
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "OPEN").length,
    resolvedToday: tickets.filter(t => t.status === "RESOLVED" && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length,
    avgResponse: "1.4h", // Placeholder
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200">Open</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">In Progress</Badge>;
      case "RESOLVED":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200 uppercase">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Support Tickets</h1>
            <p className="text-slate-500">Manage and respond to customer inquiries.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolvedToday}</div>
              <p className="text-xs text-muted-foreground">Successfully closed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponse}</div>
              <p className="text-xs text-muted-foreground">Target: &lt; 2h</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name, email, or subject..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[150px] justify-between">
                  <span className="flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    {statusFilter === "ALL" ? "All Status" : statusFilter}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>All Status</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("OPEN")}>Open</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("IN_PROGRESS")}>In Progress</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("RESOLVED")}>Resolved</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                      <span>Loading tickets...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{ticket.name}</span>
                      <span className="text-xs text-slate-500">{ticket.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[400px]">
                      <span className="font-medium block truncate">{ticket.subject}</span>
                      <p className="text-xs text-slate-500 truncate">{ticket.message}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {format(new Date(ticket.createdAt), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ticket Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <a href={`mailto:${ticket.email}`}>
                            <Mail className="w-4 h-4 mr-2" />
                            Reply to User
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleUpdateStatus(ticket.id, "OPEN")}
                        >
                          Mark as Open
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-amber-600"
                          onClick={() => handleUpdateStatus(ticket.id, "IN_PROGRESS")}
                        >
                          Mark as In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-green-600"
                          onClick={() => handleUpdateStatus(ticket.id, "RESOLVED")}
                        >
                          Mark as Resolved
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && filteredTickets.length === 0 && (
            <div className="py-20 text-center">
              <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">No tickets found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
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
