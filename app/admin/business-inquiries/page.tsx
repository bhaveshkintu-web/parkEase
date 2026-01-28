// N
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Eye,
  Trash2,
  Download,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Loading from "./loading";

interface BusinessInquiry {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  businessType: string;
  status: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AdminInquiriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [inquiries, setInquiries] = useState<BusinessInquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInquiries();
  }, [searchQuery, typeFilter, statusFilter]);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (typeFilter !== "all") params.set("businessType", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/business-inquiries?${params.toString()}`);
      const data = await response.json();
      setInquiries(data.inquiries || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inquiries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "NEW":
        return "default";
      case "CONTACTED":
        return "secondary";
      case "QUALIFIED":
        return "default";
      case "CONVERTED":
        return "default";
      case "REJECTED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "NEW":
        return <AlertCircle className="w-3 h-3 mr-1" />;
      case "CONTACTED":
        return <Clock className="w-3 h-3 mr-1" />;
      case "QUALIFIED":
        return <CheckCircle className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Business Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track B2B inquiries and potential partnerships
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Leads
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Inquiries</CardDescription>
            <CardTitle className="text-3xl">{inquiries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New Leads</CardDescription>
            <CardTitle className="text-3xl text-primary">
              {inquiries.filter((i) => i.status === "NEW").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {inquiries.filter((i) => i.status === "QUALIFIED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Response Rate</CardDescription>
            <CardTitle className="text-3xl">85%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Business Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="AUTO_REPAIR">Auto Repair</SelectItem>
                <SelectItem value="BANKING">Banking</SelectItem>
                <SelectItem value="CAR_WASH">Car Wash</SelectItem>
                <SelectItem value="INSURANCE">Insurance</SelectItem>
                <SelectItem value="PARKING">Parking</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="QUALIFIED">Qualified</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company & Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Business Type</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading inquiries...
                    </TableCell>
                  </TableRow>
                ) : inquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No inquiries found
                    </TableCell>
                  </TableRow>
                ) : (
                  inquiries.map((inquiry) => (
                    <TableRow key={inquiry.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {inquiry.companyName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {inquiry.fullName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="capitalize">
                          {inquiry.businessType.toLowerCase().replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={getStatusBadgeVariant(inquiry.status)} className="flex items-center w-fit">
                          {getStatusIcon(inquiry.status)}
                          {inquiry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-2" />
                          {formatDate(inquiry.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/admin/business-inquiries/${inquiry.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Phone className="mr-2 h-4 w-4" />
                              Call Lead
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Archive
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminInquiriesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminInquiriesContent />
    </Suspense>
  );
}
