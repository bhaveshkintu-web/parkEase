"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from "react";
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
  Eye,
  Timer,
  FileText,
} from "lucide-react";
import type { WatchmanBookingRequest } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { RequestDialog } from "@/components/watchman/request-dialog";

const Loading = () => null;

export default function WatchmanBookingsPage() {
  const { user } = useAuth();
  const { reservations } = useDataStore();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState("today");
  const [requestTab, setRequestTab] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WatchmanBookingRequest | null>(null);

  const [bookingRequests, setBookingRequests] = useState<WatchmanBookingRequest[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch(`/api/watchman/bookings?date=${dateFilter}`);
      const data = await response.json();
      if (data.success) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }, [dateFilter]);

  // Fetch booking requests
  const fetchBookingRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/watchman/requests");
      const data = await response.json();
      if (Array.isArray(data)) {
        setBookingRequests(data);
      } else if (data.success && Array.isArray(data.requests)) {
        setBookingRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching booking requests:", error);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchBookings(), fetchBookingRequests()]);
    setIsLoading(false);
  }, [fetchBookings, fetchBookingRequests]);

  useEffect(() => {
    loadAllData();

    // Polling every 30 seconds for live updates
    const interval = setInterval(() => {
      fetchBookings();
      fetchBookingRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAllData, fetchBookings, fetchBookingRequests]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "today" || tab === "requests") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Filter today's bookings
  const today = useMemo(() => new Date(), []);
  const todayBookings = useMemo(() => {
    // If we have actual bookings from API, use them
    if (bookings.length > 0) return bookings;

    // Fallback/Legacy filter for data-store reservations
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
  }, [reservations, bookings, dateFilter, today]);

  const filteredBookings = useMemo(() => {
    let filtered = todayBookings;

    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (b) => {
          const plate = b.vehicleInfo?.licensePlate || b.vehiclePlate || "";
          const id = b.id || "";
          return plate.toLowerCase().includes(searchLower) || id.toLowerCase().includes(searchLower);
        }
      );
    }

    return filtered;
  }, [todayBookings, statusFilter, search]);

  const filteredRequests = useMemo(() => {
    if (requestTab === "all") return bookingRequests;
    return bookingRequests.filter((r) => r.status === requestTab);
  }, [bookingRequests, requestTab]);

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    const config: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
      PENDING: { variant: "warning", label: "Pending" },
      CONFIRMED: { variant: "success", label: "Confirmed" },
      CANCELLED: { variant: "error", label: "Cancelled" },
      COMPLETED: { variant: "info", label: "Completed" },
      APPROVED: { variant: "success", label: "Approved" },
      REJECTED: { variant: "error", label: "Rejected" },
    };
    const item = config[s] || { variant: "default" as const, label: status };
    return <StatusBadge status={item.label} variant={item.variant} />;
  };

  const getRequestTypeBadge = (type: WatchmanBookingRequest["requestType"]) => {
    const config: Record<WatchmanBookingRequest["requestType"], { className: string; label: string }> = {
      WALK_IN: { className: "bg-blue-100 text-blue-700", label: "Walk-in" },
      EXTENSION: { className: "bg-purple-100 text-purple-700", label: "Extension" },
      MODIFICATION: { className: "bg-amber-100 text-amber-700", label: "Modification" },
      EARLY_CHECKOUT: { className: "bg-slate-100 text-slate-700", label: "Early Checkout" },
    };
    const item = config[type] || { className: "bg-slate-100 text-slate-700", label: type };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  const updateRequestStatus = async (id: string, status: string, reason?: string) => {
    try {
      const response = await fetch("/api/watchman/booking-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, rejectionReason: reason }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }
      return true;
    } catch (error: any) {
      console.error("Update status error:", error);
      throw error;
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    setIsLoading(true);
    try {
      await updateRequestStatus(selectedRequest.id, "APPROVED");
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      toast({
        title: "Request Approved",
        description: "A real booking and active session have been created automatically.",
      });
      fetchBookingRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
    try {
      await updateRequestStatus(selectedRequest.id, "REJECTED", rejectionReason);
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      toast({
        title: "Request Rejected",
        description: "The booking request has been rejected",
      });
      fetchBookingRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = bookingRequests.filter((r) => r.status === "PENDING").length;
  const urgentCount = bookingRequests.filter((r) => r.status === "PENDING" && r.priority === "URGENT").length; // URGENT matched from Prisma enum

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
                    {todayBookings.filter((b) => b.status === "confirmed" || b.status === "CONFIRMED").length}
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
                      const checkInDate = new Date(booking.checkIn);
                      const checkOutDate = new Date(booking.checkOut);
                      const isCheckIn = checkInDate.toDateString() === today.toDateString();
                      // Graceful handling of vehicle info if missing
                      const plate = booking.vehicleInfo?.licensePlate || booking.vehiclePlate || "N/A";
                      const make = booking.vehicleInfo?.make || booking.vehicleMake || "";
                      const model = booking.vehicleInfo?.model || booking.vehicleModel || "";

                      return (
                        <div
                          key={booking.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isCheckIn ? "bg-green-100" : "bg-blue-100"
                                }`}
                            >
                              <Car className={`w-6 h-6 ${isCheckIn ? "text-green-600" : "text-blue-600"}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-foreground">{plate}</p>
                                {getStatusBadge(booking.status)}
                                <Badge variant="outline" className="text-xs">
                                  {isCheckIn ? "Check-in" : "Check-out"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {make} {model} - Code: {booking.confirmationCode}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(checkInDate)} - {formatTime(checkOutDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {booking.location?.name || booking.placeName || "Unknown Location"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-foreground">{formatCurrency(booking.totalPrice)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(checkInDate)}</p>
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
                      <TabsTrigger value="PENDING" className="text-xs sm:text-sm">
                        Pending
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                            {pendingCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="APPROVED" className="text-xs sm:text-sm">Approved</TabsTrigger>
                      <TabsTrigger value="REJECTED" className="text-xs sm:text-sm">Rejected</TabsTrigger>
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
                        className={`p-4 border rounded-lg ${request.priority === "URGENT" && request.status === "PENDING"
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
                                {request.priority === "URGENT" && (
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
                                {request.customerPhone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {request.customerPhone}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {request.parkingName}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(new Date(request.requestedStart))} - {formatTime(new Date(request.requestedEnd))}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  Requested {formatDate(new Date(request.requestedAt))}
                                </span>
                                {request.requestedBy && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {/* Handle potentially nested or missing user name */}
                                    By {(request.requestedBy as any)?.firstName || "Watchman"}
                                  </span>
                                )}
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
                            {request.status === "PENDING" ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
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
                                  {request.bookingId && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/watchman/sessions?search=${request.vehiclePlate}`}>
                                        <Timer className="w-4 h-4 mr-2" />
                                        View Active Session
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
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

        {/* Request Dialog */}
        <RequestDialog
          open={isNewRequestOpen}
          onOpenChange={(val) => {
            setIsNewRequestOpen(val);
            // Refresh data when dialog closes (assuming success)
            if (!val) fetchBookingRequests();
          }}
        />

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
                      {formatTime(new Date(selectedRequest.requestedStart))} - {formatTime(new Date(selectedRequest.requestedEnd))}
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
                Approving this will automatically create a live booking and start an active parking session for this vehicle.
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
