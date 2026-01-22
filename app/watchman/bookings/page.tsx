"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatTime, formatCurrency } from "@/lib/data";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  AlertTriangle,
  MoreHorizontal,
  User,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Timer,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import type { WatchmanBookingRequest } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Mock booking requests data
const mockBookingRequests: WatchmanBookingRequest[] = [
  {
    id: "req_1",
    customerId: "cust_1",
    customerName: "John Smith",
    customerPhone: "+1 555-1234",
    vehiclePlate: "ABC-1234",
    vehicleType: "sedan",
    parkingId: "park_1",
    parkingName: "Downtown Parking",
    spotNumber: "A-15",
    requestType: "walk_in",
    requestedStart: new Date(),
    requestedEnd: new Date(Date.now() + 3600000 * 4),
    estimatedAmount: 20.00,
    status: "pending",
    priority: "normal",
    requestedBy: "watchman_1",
    requestedAt: new Date(Date.now() - 600000),
  },
  {
    id: "req_2",
    customerId: "cust_2",
    customerName: "Sarah Johnson",
    customerPhone: "+1 555-5678",
    vehiclePlate: "XYZ-9876",
    vehicleType: "suv",
    parkingId: "park_1",
    parkingName: "Downtown Parking",
    requestType: "extension",
    originalBookingId: "book_123",
    requestedStart: new Date(Date.now() + 3600000 * 2),
    requestedEnd: new Date(Date.now() + 3600000 * 6),
    estimatedAmount: 15.00,
    status: "pending",
    priority: "urgent",
    notes: "Customer needs to extend for a meeting",
    requestedBy: "watchman_1",
    requestedAt: new Date(Date.now() - 300000),
  },
  {
    id: "req_3",
    customerId: "cust_3",
    customerName: "Mike Chen",
    customerPhone: "+1 555-9012",
    vehiclePlate: "DEF-4567",
    vehicleType: "compact",
    parkingId: "park_2",
    parkingName: "Airport Parking",
    requestType: "walk_in",
    requestedStart: new Date(Date.now() - 3600000),
    requestedEnd: new Date(Date.now() + 3600000 * 8),
    estimatedAmount: 45.00,
    status: "approved",
    priority: "normal",
    requestedBy: "watchman_1",
    requestedAt: new Date(Date.now() - 3600000),
    processedBy: "admin_1",
    processedAt: new Date(Date.now() - 1800000),
  },
  {
    id: "req_4",
    customerId: "cust_4",
    customerName: "Lisa Park",
    customerPhone: "+1 555-3456",
    vehiclePlate: "GHI-7890",
    vehicleType: "motorcycle",
    parkingId: "park_1",
    parkingName: "Downtown Parking",
    requestType: "early_checkout",
    originalBookingId: "book_456",
    requestedStart: new Date(Date.now() - 7200000),
    requestedEnd: new Date(),
    estimatedAmount: -5.00,
    status: "rejected",
    priority: "normal",
    notes: "Customer wants early checkout",
    rejectionReason: "Booking is non-refundable within 2 hours of check-in",
    requestedBy: "watchman_1",
    requestedAt: new Date(Date.now() - 7200000),
    processedBy: "admin_1",
    processedAt: new Date(Date.now() - 5400000),
  },
];

const Loading = () => null;

export default function WatchmanBookingsPage() {
  const { user } = useAuth();
  const { reservations, adminLocations } = useDataStore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState("today");
  const [requestTab, setRequestTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dialog states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WatchmanBookingRequest | null>(null);
  const [bookingRequests, setBookingRequests] = useState(mockBookingRequests);
  const [isLoading, setIsLoading] = useState(false);
  
  // New request form
  const [newRequest, setNewRequest] = useState({
    customerName: "",
    customerPhone: "",
    vehiclePlate: "",
    vehicleType: "sedan",
    parkingId: "",
    requestType: "walk_in" as WatchmanBookingRequest["requestType"],
    duration: "2",
    notes: "",
  });
  const [rejectionReason, setRejectionReason] = useState("");

  // Filter today's bookings
  const today = new Date();
  const todayBookings = useMemo(() => {
    return reservations.filter((r) => {
      const checkInDate = new Date(r.checkIn);
      const checkOutDate = new Date(r.checkOut);
      const isToday = 
        checkInDate.toDateString() === today.toDateString() ||
        checkOutDate.toDateString() === today.toDateString();
      
      if (dateFilter === "today") return isToday;
      if (dateFilter === "tomorrow") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return checkInDate.toDateString() === tomorrow.toDateString();
      }
      if (dateFilter === "week") {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return checkInDate >= today && checkInDate <= weekFromNow;
      }
      return true;
    });
  }, [reservations, dateFilter, today]);

  const filteredBookings = useMemo(() => {
    let filtered = todayBookings;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.vehicleInfo.licensePlate.toLowerCase().includes(searchLower) ||
          b.id.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [todayBookings, statusFilter, search]);

  const filteredRequests = useMemo(() => {
    if (requestTab === "all") return bookingRequests;
    return bookingRequests.filter((r) => r.status === requestTab);
  }, [bookingRequests, requestTab]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
      pending: { variant: "warning", label: "Pending" },
      confirmed: { variant: "success", label: "Confirmed" },
      cancelled: { variant: "error", label: "Cancelled" },
      completed: { variant: "info", label: "Completed" },
      approved: { variant: "success", label: "Approved" },
      rejected: { variant: "error", label: "Rejected" },
    };
    const item = config[status] || { variant: "default" as const, label: status };
    return <StatusBadge status={item.label} variant={item.variant} />;
  };

  const getRequestTypeBadge = (type: WatchmanBookingRequest["requestType"]) => {
    const config: Record<WatchmanBookingRequest["requestType"], { className: string; label: string }> = {
      walk_in: { className: "bg-blue-100 text-blue-700", label: "Walk-in" },
      extension: { className: "bg-purple-100 text-purple-700", label: "Extension" },
      modification: { className: "bg-amber-100 text-amber-700", label: "Modification" },
      early_checkout: { className: "bg-slate-100 text-slate-700", label: "Early Checkout" },
    };
    const item = config[type] || { className: "bg-slate-100 text-slate-700", label: type };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  const handleCreateRequest = async () => {
    if (!newRequest.customerName || !newRequest.vehiclePlate || !newRequest.parkingId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    const parking = adminLocations.find((l) => l.id === newRequest.parkingId);
    const newReq: WatchmanBookingRequest = {
      id: `req_${Date.now()}`,
      customerId: `cust_${Date.now()}`,
      customerName: newRequest.customerName,
      customerPhone: newRequest.customerPhone,
      vehiclePlate: newRequest.vehiclePlate.toUpperCase(),
      vehicleType: newRequest.vehicleType,
      parkingId: newRequest.parkingId,
      parkingName: parking?.name || "Unknown",
      requestType: newRequest.requestType,
      requestedStart: new Date(),
      requestedEnd: new Date(Date.now() + parseInt(newRequest.duration) * 3600000),
      estimatedAmount: parseInt(newRequest.duration) * 5,
      status: "pending",
      priority: "normal",
      notes: newRequest.notes,
      requestedBy: user?.id || "watchman_1",
      requestedAt: new Date(),
    };

    setBookingRequests((prev) => [newReq, ...prev]);
    setIsNewRequestOpen(false);
    setNewRequest({
      customerName: "",
      customerPhone: "",
      vehiclePlate: "",
      vehicleType: "sedan",
      parkingId: "",
      requestType: "walk_in",
      duration: "2",
      notes: "",
    });
    setIsLoading(false);

    toast({
      title: "Request Created",
      description: "Booking request submitted for approval",
    });
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    setBookingRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequest.id
          ? { ...r, status: "approved", processedBy: user?.id, processedAt: new Date() }
          : r
      )
    );
    setIsApproveDialogOpen(false);
    setSelectedRequest(null);
    setIsLoading(false);

    toast({
      title: "Request Approved",
      description: "The booking request has been approved",
    });
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    setBookingRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequest.id
          ? {
              ...r,
              status: "rejected",
              processedBy: user?.id,
              processedAt: new Date(),
              rejectionReason,
            }
          : r
      )
    );
    setIsRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectionReason("");
    setIsLoading(false);

    toast({
      title: "Request Rejected",
      description: "The booking request has been rejected",
    });
  };

  const handleCancelRequest = async (request: WatchmanBookingRequest) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    setBookingRequests((prev) =>
      prev.map((r) =>
        r.id === request.id ? { ...r, status: "cancelled" } : r
      )
    );

    toast({
      title: "Request Cancelled",
      description: "The booking request has been cancelled",
    });
  };

  const pendingCount = bookingRequests.filter((r) => r.status === "pending").length;
  const urgentCount = bookingRequests.filter((r) => r.status === "pending" && r.priority === "urgent").length;

  return (
    <Suspense fallback={<Loading />}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bookings Management</h1>
            <p className="text-muted-foreground mt-1">
              View bookings, create requests, and manage approvals
            </p>
          </div>
          <Button onClick={() => setIsNewRequestOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today&apos;s Bookings</p>
                  <p className="text-2xl font-bold text-foreground">{todayBookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {todayBookings.filter((b) => b.status === "confirmed").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="today" className="flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 sm:flex-none">
              <FileText className="w-4 h-4 mr-2" />
              Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="today" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">Scheduled Bookings</CardTitle>
                    <CardDescription>View and manage upcoming bookings</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="tomorrow">Tomorrow</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search plate..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-full sm:w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No bookings found for the selected filters</p>
                    </div>
                  ) : (
                    filteredBookings.map((booking) => {
                      const isCheckIn = new Date(booking.checkIn).toDateString() === today.toDateString();
                      return (
                        <div
                          key={booking.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                isCheckIn ? "bg-green-100" : "bg-blue-100"
                              }`}
                            >
                              <Car className={`w-6 h-6 ${isCheckIn ? "text-green-600" : "text-blue-600"}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-foreground">{booking.vehicleInfo.licensePlate}</p>
                                {getStatusBadge(booking.status)}
                                <Badge variant="outline" className="text-xs">
                                  {isCheckIn ? "Check-in" : "Check-out"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {booking.vehicleInfo.type} - Booking #{booking.id.slice(-8)}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(booking.checkIn)} - {formatTime(booking.checkOut)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {booking.locationName}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-foreground">{formatCurrency(booking.total)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(booking.checkIn)}</p>
                            </div>
                            <Link href="/watchman/scan">
                              <Button size="sm" variant={isCheckIn ? "default" : "secondary"}>
                                {isCheckIn ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Check In
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Check Out
                                  </>
                                )}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Booking Requests</CardTitle>
                    <CardDescription>Walk-ins, extensions, and modifications</CardDescription>
                  </div>
                  <Tabs value={requestTab} onValueChange={setRequestTab}>
                    <TabsList>
                      <TabsTrigger value="pending" className="text-xs sm:text-sm">
                        Pending
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                            {pendingCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="approved" className="text-xs sm:text-sm">Approved</TabsTrigger>
                      <TabsTrigger value="rejected" className="text-xs sm:text-sm">Rejected</TabsTrigger>
                      <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No requests found</p>
                      <Button
                        variant="outline"
                        className="mt-4 bg-transparent"
                        onClick={() => setIsNewRequestOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Request
                      </Button>
                    </div>
                  ) : (
                    filteredRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`p-4 border rounded-lg ${
                          request.priority === "urgent" && request.status === "pending"
                            ? "border-red-200 bg-red-50/50"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-foreground">{request.customerName}</p>
                                {getRequestTypeBadge(request.requestType)}
                                {getStatusBadge(request.status)}
                                {request.priority === "urgent" && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Urgent
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Car className="w-3 h-3" />
                                  {request.vehiclePlate}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {request.customerPhone}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {request.parkingName}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(request.requestedStart)} - {formatTime(request.requestedEnd)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  Requested {formatDate(request.requestedAt)}
                                </span>
                              </div>
                              {request.notes && (
                                <p className="mt-2 text-sm text-muted-foreground italic">
                                  &quot;{request.notes}&quot;
                                </p>
                              )}
                              {request.rejectionReason && (
                                <p className="mt-2 text-sm text-red-600">
                                  <span className="font-medium">Rejection reason:</span> {request.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-semibold ${request.estimatedAmount < 0 ? "text-red-600" : "text-foreground"}`}>
                                {request.estimatedAmount < 0 ? "-" : "+"}{formatCurrency(Math.abs(request.estimatedAmount))}
                              </p>
                              <p className="text-xs text-muted-foreground">Est. Amount</p>
                            </div>
                            {request.status === "pending" ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsViewDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Request Dialog */}
        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Booking Request</DialogTitle>
              <DialogDescription>
                Create a walk-in booking or modification request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    placeholder="John Smith"
                    value={newRequest.customerName}
                    onChange={(e) => setNewRequest((prev) => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    placeholder="+1 555-1234"
                    value={newRequest.customerPhone}
                    onChange={(e) => setNewRequest((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">License Plate *</Label>
                  <Input
                    id="vehiclePlate"
                    placeholder="ABC-1234"
                    value={newRequest.vehiclePlate}
                    onChange={(e) => setNewRequest((prev) => ({ ...prev, vehiclePlate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select
                    value={newRequest.vehicleType}
                    onValueChange={(v) => setNewRequest((prev) => ({ ...prev, vehicleType: v }))}
                  >
                    <SelectTrigger id="vehicleType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestType">Request Type</Label>
                  <Select
                    value={newRequest.requestType}
                    onValueChange={(v) => setNewRequest((prev) => ({ ...prev, requestType: v as WatchmanBookingRequest["requestType"] }))}
                  >
                    <SelectTrigger id="requestType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="extension">Extension</SelectItem>
                      <SelectItem value="modification">Modification</SelectItem>
                      <SelectItem value="early_checkout">Early Checkout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Select
                    value={newRequest.duration}
                    onValueChange={(v) => setNewRequest((prev) => ({ ...prev, duration: v }))}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parkingId">Parking Location *</Label>
                <Select
                  value={newRequest.parkingId}
                  onValueChange={(v) => setNewRequest((prev) => ({ ...prev, parkingId: v }))}
                >
                  <SelectTrigger id="parkingId">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminLocations.slice(0, 3).map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRequest} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Request Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  {getRequestTypeBadge(selectedRequest.requestType)}
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{selectedRequest.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{selectedRequest.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium">{selectedRequest.vehiclePlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{selectedRequest.parkingName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {formatTime(selectedRequest.requestedStart)} - {formatTime(selectedRequest.requestedEnd)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{formatCurrency(selectedRequest.estimatedAmount)}</span>
                  </div>
                </div>
                {selectedRequest.notes && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{selectedRequest.notes}</p>
                  </div>
                )}
                {selectedRequest.rejectionReason && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-600">{selectedRequest.rejectionReason}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this booking request?
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="py-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Customer:</span> {selectedRequest.customerName}</p>
                <p><span className="text-muted-foreground">Vehicle:</span> {selectedRequest.vehiclePlate}</p>
                <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(selectedRequest.estimatedAmount)}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApproveRequest} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? "Approving..." : "Approve Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {selectedRequest && (
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Customer:</span> {selectedRequest.customerName}</p>
                  <p><span className="text-muted-foreground">Vehicle:</span> {selectedRequest.vehiclePlate}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRejectRequest} disabled={isLoading}>
                {isLoading ? "Rejecting..." : "Reject Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
