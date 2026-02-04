"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Calendar,
  Car,
  Search,
  Filter,
  ChevronDown,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Star,
  MessageSquare,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  Send,
  CalendarDays,
  TrendingUp,
  Loader2,
  FileText,
  RotateCw,
} from "lucide-react";
import type { Reservation, AdminReview } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useCallback } from "react";
import Loading from "./loading";
import { useToast } from "@/hooks/use-toast";
import type { WatchmanBookingRequest } from "@/lib/types";

export default function OwnerBookingsPage() {
  const { user } = useAuth();
  const { reservations, adminLocations, adminReviews, initializeForOwner } = useDataStore();
  const searchParams = useSearchParams(); // Use search params

  // Fetch booking requests
  const fetchBookingRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      console.log("Fetching booking requests from API...");
      const response = await fetch("/api/owner/booking-requests", {
        cache: 'no-store', // Prevent caching
      });
      const data = await response.json();
      if (data.success) {
        setBookingRequests(data.requests || []);
        console.log(`Fetched ${data.requests?.length} booking requests`);
      } else {
        console.error("Failed to fetch booking requests:", data.error);
        toast({
          title: "Fetch Failed",
          description: data.error || "Could not retrieve booking requests",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching booking requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    if (user) {
      if (user.role === "owner" || user.role === "OWNER" || user.role === "ADMIN") {
        fetchBookingRequests();
        if (user.ownerId) {
          initializeForOwner(user.ownerId);
        }
      }
    }
  }, [user, initializeForOwner, fetchBookingRequests]);

  // State
  const [activeTab, setActiveTab] = useState("bookings");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [bookingRequests, setBookingRequests] = useState<WatchmanBookingRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WatchmanBookingRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  // Safe data access
  const safeReservations = reservations || [];
  const safeLocations = adminLocations || [];
  const safeReviews = adminReviews || [];

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...safeReservations];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Location filter
    if (locationFilter !== "all") {
      result = result.filter((b) => b.locationId === locationFilter);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.confirmationCode.toLowerCase().includes(query) ||
          b.guestInfo.firstName.toLowerCase().includes(query) ||
          b.guestInfo.lastName.toLowerCase().includes(query) ||
          b.guestInfo.email.toLowerCase().includes(query) ||
          b.vehicleInfo.licensePlate.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
        case "date-desc":
          return new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime();
        case "price-asc":
          return a.totalPrice - b.totalPrice;
        case "price-desc":
          return b.totalPrice - a.totalPrice;
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return result;
  }, [safeReservations, statusFilter, locationFilter, sortBy, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      total: safeReservations.length,
      pending: safeReservations.filter((b) => b.status === "pending").length,
      confirmed: safeReservations.filter((b) => b.status === "confirmed").length,
      cancelled: safeReservations.filter((b) => b.status === "cancelled").length,
      todayCheckIns: safeReservations.filter(
        (b) => new Date(b.checkIn) >= today && new Date(b.checkIn) < tomorrow && b.status === "confirmed"
      ).length,
      revenue: safeReservations
        .filter((b) => b.status === "confirmed")
        .reduce((sum, b) => sum + b.totalPrice, 0),
      pendingRequests: bookingRequests.filter(r => r.status === "pending").length,
    };
  }, [safeReservations, bookingRequests]);

  // Status badge component
  const getStatusBadge = (status: Reservation["status"]) => {
    const config = {
      pending: {
        variant: "secondary" as const,
        icon: AlertCircle,
        label: "Pending",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
      confirmed: {
        variant: "default" as const,
        icon: CheckCircle2,
        label: "Confirmed",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      cancelled: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Cancelled",
        className: "bg-red-100 text-red-700 border-red-200",
      },
    };
    const item = config[status] || config.pending;
    const Icon = item.icon;
    return (
      <Badge variant="outline" className={item.className}>
        <Icon className="w-3 h-3 mr-1" />
        {item.label}
      </Badge>
    );
  };

  const handleReplySubmit = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setIsReplying(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setIsReplying(false);
    setReplyText("");
    setSelectedReview(null);
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    setIsLoadingRequests(true);
    try {
      const response = await fetch(`/api/watchman/booking-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Request Approved",
          description: "The booking has been successfully created.",
        });
        setIsApproveDialogOpen(false);
        setSelectedRequest(null);
        fetchBookingRequests();
        if (user?.ownerId) initializeForOwner(user.ownerId); // Refresh bookings
      } else {
        toast({
          title: "Approval Failed",
          description: data.error || "Failed to approve request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during approval",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    setIsLoadingRequests(true);
    try {
      const response = await fetch(`/api/watchman/booking-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Request Rejected",
          description: "The request has been rejected.",
        });
        setIsRejectDialogOpen(false);
        setSelectedRequest(null);
        setRejectionReason("");
        fetchBookingRequests();
      } else {
        toast({
          title: "Rejection Failed",
          description: data.error || "Failed to reject request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during rejection",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  return (
    <Suspense fallback={<Loading />}> {/* Wrap the main content in Suspense */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bookings & Reviews</h1>
            <p className="text-muted-foreground mt-1">
              Manage reservations and respond to customer feedback
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                  <p className="text-xs text-muted-foreground">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayCheckIns}</p>
                  <p className="text-xs text-muted-foreground">Today&apos;s Check-ins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>Bookings</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Requests</span>
              {stats.pendingRequests > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats.pendingRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Reviews</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {safeReviews.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, confirmation code, or plate..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full lg:w-[160px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Location Filter */}
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-full lg:w-[200px]">
                      <MapPin className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {safeLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full lg:w-[180px]">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="price-desc">Highest Price</SelectItem>
                      <SelectItem value="price-asc">Lowest Price</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge
                    variant={statusFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({stats.total})
                  </Badge>
                  <Badge
                    variant={statusFilter === "pending" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter("pending")}
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Pending ({stats.pending})
                  </Badge>
                  <Badge
                    variant={statusFilter === "confirmed" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter("confirmed")}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Confirmed ({stats.confirmed})
                  </Badge>
                  <Badge
                    variant={statusFilter === "cancelled" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter("cancelled")}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Cancelled ({stats.cancelled})
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Bookings Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking</TableHead>
                        <TableHead className="hidden md:table-cell">Customer</TableHead>
                        <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead className="hidden sm:table-cell">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No bookings found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBookings.map((booking) => (
                          <TableRow key={booking.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Calendar className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    #{booking.confirmationCode}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {booking.location?.name || "Unknown Location"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs bg-muted">
                                    {booking.guestInfo.firstName[0]}
                                    {booking.guestInfo.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {booking.guestInfo.firstName} {booking.guestInfo.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {booking.guestInfo.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm">
                                    {booking.vehicleInfo.make} {booking.vehicleInfo.model}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {booking.vehicleInfo.licensePlate}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-sm">
                                  {formatDate(new Date(booking.checkIn))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  to {formatDate(new Date(booking.checkOut))}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <p className="font-medium">{formatCurrency(booking.totalPrice)}</p>
                            </TableCell>
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setSelectedBooking(booking)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
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
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Booking Requests</CardTitle>
                    <CardDescription>
                      Review and respond to walk-in and extension requests from your watchmen
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchBookingRequests} disabled={isLoadingRequests}>
                    <RotateCw className={`w-4 h-4 mr-2 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingRequests ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mr-2" />
                            Loading requests...
                          </TableCell>
                        </TableRow>
                      ) : bookingRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No booking requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        bookingRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-sm font-medium">Watchman</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{request.customerName}</p>
                                <p className="text-xs text-muted-foreground">{request.customerPhone}</p>
                                {request.customerEmail && <p className="text-xs text-muted-foreground">{request.customerEmail}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{request.vehiclePlate}</p>
                                <p className="text-xs text-muted-foreground capitalize">{request.vehicleType}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <p>{formatDate(new Date(request.requestedStart))}</p>
                                <p className="text-muted-foreground">
                                  to {formatDate(new Date(request.requestedEnd))}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{formatCurrency(request.estimatedAmount)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={request.status === "pending" ? "outline" : "secondary"}>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === "pending" ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsApproveDialogOpen(true);
                                    }}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Processed</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>
                  View and respond to customer feedback for your parking locations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {safeReviews.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews yet</p>
                    <p className="text-sm">Customer reviews will appear here</p>
                  </div>
                ) : (
                  safeReviews.map((review) => (
                    <Card key={review.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Avatar */}
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {review.author[0]}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <div>
                                <p className="font-medium">{review.author}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(new Date(review.date))}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < review.rating
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-muted-foreground"
                                      }`}
                                  />
                                ))}
                              </div>
                            </div>

                            <h4 className="font-medium">{review.title}</h4>
                            <p className="text-sm text-muted-foreground">{review.content}</p>

                            {/* Location Tag */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>
                                {safeLocations.find((l) => l.id === review.locationId)?.name ||
                                  "Unknown Location"}
                              </span>
                            </div>

                            {/* Reply Button */}
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReview(review)}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Reply
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Booking Details Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Confirmation Code: #{selectedBooking?.confirmationCode}
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(selectedBooking.status)}
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {selectedBooking.guestInfo.firstName} {selectedBooking.guestInfo.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium truncate">{selectedBooking.guestInfo.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedBooking.guestInfo.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Vehicle</p>
                      <p className="font-medium">
                        {selectedBooking.vehicleInfo.make} {selectedBooking.vehicleInfo.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Color</p>
                      <p className="font-medium">{selectedBooking.vehicleInfo.color}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">License Plate</p>
                      <p className="font-medium">{selectedBooking.vehicleInfo.licensePlate}</p>
                    </div>
                  </div>
                </div>

                {/* Parking Details */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Parking Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedBooking.location?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-in</p>
                      <p className="font-medium">{formatDate(new Date(selectedBooking.checkIn))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-out</p>
                      <p className="font-medium">{formatDate(new Date(selectedBooking.checkOut))}</p>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-3">
                  <h4 className="font-medium">Payment Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>
                        {formatCurrency(
                          selectedBooking.totalPrice - selectedBooking.taxes - selectedBooking.fees
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxes</span>
                      <span>{formatCurrency(selectedBooking.taxes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fees</span>
                      <span>{formatCurrency(selectedBooking.fees)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(selectedBooking.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reply to Review Dialog */}
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reply to Review</DialogTitle>
              <DialogDescription>
                Respond to {selectedReview?.author}&apos;s feedback
              </DialogDescription>
            </DialogHeader>

            {selectedReview && (
              <div className="space-y-4">
                {/* Original Review */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {selectedReview.author[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{selectedReview.author}</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < selectedReview.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <h4 className="font-medium text-sm">{selectedReview.title}</h4>
                  <p className="text-sm text-muted-foreground">{selectedReview.content}</p>
                </div>

                {/* Reply Input */}
                <div className="space-y-2">
                  <Label htmlFor="reply">Your Reply</Label>
                  <Textarea
                    id="reply"
                    placeholder="Write a thoughtful response to the customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReview(null)}>
                Cancel
              </Button>
              <Button onClick={handleReplySubmit} disabled={!replyText.trim() || isReplying}>
                {isReplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Reply
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Request Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Booking Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this request for {selectedRequest?.customerName}?
                This will create a confirmed booking and occupy one parking spot.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="font-medium">{selectedRequest?.vehiclePlate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{formatCurrency(selectedRequest?.estimatedAmount || 0)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleApproveRequest} disabled={isLoadingRequests}>
                {isLoadingRequests ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Approve Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Request Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Booking Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., No spots available, invalid vehicle info..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleRejectRequest}
                disabled={!rejectionReason.trim() || isLoadingRequests}
              >
                {isLoadingRequests ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
