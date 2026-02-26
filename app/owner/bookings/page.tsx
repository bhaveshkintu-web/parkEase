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
import type { Reservation, AdminReview, Booking } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useCallback } from "react";
import Loading from "./loading";
import { useToast } from "@/hooks/use-toast";
import type { WatchmanBookingRequest } from "@/lib/types";
import { approveBooking, rejectBooking } from "@/lib/actions/booking-actions";

export default function OwnerBookingsPage() {
  const { user } = useAuth();
  const { reservations, adminLocations, adminReviews, initializeForOwner } = useDataStore();
  const searchParams = useSearchParams(); // Use search params

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
  const [isBookingApproveOpen, setIsBookingApproveOpen] = useState(false);
  const [isBookingRejectOpen, setIsBookingRejectOpen] = useState(false);
  const [selectedBookingForAction, setSelectedBookingForAction] = useState<Reservation | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

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
  }, [toast]);

  // Initialize data
  useEffect(() => {
    if (user) {
      const isOwnerRole = user.role === "owner" || user.role === "OWNER" || user.role === "ADMIN";
      if (isOwnerRole) {
        fetchBookingRequests();
        const idToUse = user.ownerId || user.id;
        if (idToUse) {
          initializeForOwner(idToUse);
        }
      }
    }
  }, [user, initializeForOwner, fetchBookingRequests]);

  // Safe data access
  const safeReservations = reservations || [];
  const safeLocations = adminLocations || [];
  const safeReviews = adminReviews || [];

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...safeReservations];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status.toLowerCase() === statusFilter.toLowerCase());
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
      pending: safeReservations.filter((b) => b.status.toLowerCase() === "pending").length,
      confirmed: safeReservations.filter((b) => b.status.toLowerCase() === "confirmed").length,
      cancelled: safeReservations.filter((b) => b.status.toLowerCase() === "cancelled").length,
      completed: safeReservations.filter((b) => b.status.toLowerCase() === "completed").length,
      expired: safeReservations.filter((b) => b.status.toLowerCase() === "expired").length,
      todayCheckIns: safeReservations.filter(
        (b) => new Date(b.checkIn) >= today && new Date(b.checkIn) < tomorrow && b.status.toLowerCase() === "confirmed"
      ).length,
      revenue: safeReservations
        .filter((b) => ["confirmed", "completed"].includes(b.status.toLowerCase()))
        .reduce((sum, b) => sum + b.totalPrice, 0),
      pendingRequests: bookingRequests.filter(r => r.status.toUpperCase() === "PENDING").length,
    };
  }, [safeReservations, bookingRequests]);

  // Status badge component
  const getStatusBadge = (status: Booking["status"] | string) => {
    const normalizedStatus = status.toLowerCase();
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
      completed: {
        variant: "outline" as const,
        icon: CheckCircle2,
        label: "Completed",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      },
      cancelled: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Cancelled",
        className: "bg-red-100 text-red-700 border-red-200",
      },
      rejected: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Rejected",
        className: "bg-rose-100 text-rose-700 border-rose-200",
      },
      expired: {
        variant: "outline" as const,
        icon: XCircle,
        label: "Expired",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      },
    };
    const item = (config as any)[normalizedStatus] || config.pending;
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

  const handleBookingApprove = async () => {
    if (!selectedBookingForAction) return;
    setIsLoadingRequests(true);
    try {
      const result = await approveBooking(selectedBookingForAction.id);
      if (result.success) {
        toast({
          title: "Booking Approved",
          description: "The reservation has been confirmed and the owner wallet updated.",
        });
        setIsBookingApproveOpen(false);
        setSelectedBookingForAction(null);
        const idToUse = user?.ownerId || user?.id;
        if (idToUse) await initializeForOwner(idToUse);
      } else {
        toast({
          title: "Approval Failed",
          description: result.error || "Failed to approve booking",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleBookingReject = async () => {
    if (!selectedBookingForAction || !rejectionReason.trim()) return;
    setIsLoadingRequests(true);
    try {
      const result = await rejectBooking(selectedBookingForAction.id, rejectionReason);
      if (result.success) {
        toast({
          title: "Booking Rejected",
          description: "The reservation has been rejected and the spot restored.",
        });
        setIsBookingRejectOpen(false);
        setSelectedBookingForAction(null);
        setRejectionReason("");
        const idToUse = user?.ownerId || user?.id;
        if (idToUse) await initializeForOwner(idToUse);
      } else {
        toast({
          title: "Rejection Failed",
          description: result.error || "Failed to reject booking",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
                      <SelectItem value="completed">Completed</SelectItem>
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
                  <Badge
                    variant={statusFilter === "completed" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter("completed")}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed ({stats.completed})
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
                              <div className="flex items-center justify-end gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {booking.status === "pending" && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedBookingForAction(booking);
                                            setIsBookingApproveOpen(true);
                                          }}
                                          className="text-emerald-600"
                                        >
                                          <CheckCircle2 className="w-4 h-4 mr-2" />
                                          Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedBookingForAction(booking);
                                            setIsBookingRejectOpen(true);
                                          }}
                                          className="text-red-600"
                                        >
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Reject
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem onClick={() => setSelectedBooking(booking)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
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
                        <TableHead>Location</TableHead>
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
                              <div className="text-sm">
                                <p className="font-medium">{request.parkingName}</p>
                                {request.status === "PENDING" && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {(() => {
                                      const loc = safeLocations.find(l => l.id === request.parkingId);
                                      if (!loc) return "Checking slots...";
                                      return loc.availableSpots > 0
                                        ? `${loc.availableSpots} spots available`
                                        : "No spots available";
                                    })()}
                                  </p>
                                )}
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
                              <Badge variant={request.status === "PENDING" ? "outline" : "secondary"}>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === "PENDING" ? (
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
          <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-2xl border-none shadow-2xl">
            <DialogHeader className="p-6 bg-primary/[0.02] border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-black">Booking Details</DialogTitle>
                  <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
                    Manage and review reservation information
                  </DialogDescription>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Status</p>
                  {selectedBooking && getStatusBadge(selectedBooking.status)}
                </div>
              </div>
            </DialogHeader>

            {selectedBooking && (
              <div className="overflow-y-auto max-h-[70vh] p-6 space-y-6 custom-scrollbar">
                {/* Header with Confirmation */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1.5">Confirmation Code</p>
                    <p className="text-2xl font-black text-foreground tracking-tight leading-none">#{selectedBooking.confirmationCode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Customer & Vehicle */}
                  <div className="space-y-8">
                    {/* Customer Info */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        Customer Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                              {selectedBooking.guestInfo.firstName[0]}{selectedBooking.guestInfo.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-black text-foreground text-lg leading-tight">
                              {selectedBooking.guestInfo.firstName} {selectedBooking.guestInfo.lastName}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-1">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{selectedBooking.guestInfo.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground bg-muted/40 p-2.5 rounded-lg w-fit">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          <span>{selectedBooking.guestInfo.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Car className="w-3.5 h-3.5" />
                        Vehicle Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                          <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">Make/Model</p>
                          <p className="font-bold text-sm truncate">{selectedBooking.vehicleInfo.make} {selectedBooking.vehicleInfo.model}</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50 text-right">
                          <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">Color</p>
                          <p className="font-bold text-sm">{selectedBooking.vehicleInfo.color}</p>
                        </div>
                        <div className="col-span-2 bg-primary/[0.02] border-2 border-dashed border-primary/20 rounded-xl p-3.5 flex flex-col items-center justify-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">License Plate Number</p>
                          <p className="text-2xl font-black text-primary tracking-tighter leading-none">{selectedBooking.vehicleInfo.licensePlate}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Parking & Payment */}
                  <div className="space-y-8">
                    {/* Parking Details */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        Parking Details
                      </h4>
                      <div className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                          <p className="text-[9px] text-emerald-600/70 uppercase font-black mb-1">Verified Location</p>
                          <p className="font-black text-foreground">{selectedBooking.location?.name}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-orange-500" />
                              </div>
                              <div>
                                <p className="text-[9px] text-muted-foreground uppercase font-black">Check-in</p>
                                <p className="font-bold text-xs">{formatDate(new Date(selectedBooking.checkIn))}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-[9px] text-muted-foreground uppercase font-black">Check-out</p>
                                <p className="font-bold text-xs">{formatDate(new Date(selectedBooking.checkOut))}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Payment Summary
                      </h4>
                      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-10 -mt-10 rounded-full" />

                        <div className="relative z-10 space-y-2.5">
                          <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5"><Star className="w-3 h-3" /> Subtotal</span>
                            <span>{formatCurrency(selectedBooking.totalPrice - selectedBooking.taxes - selectedBooking.fees)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>Taxes</span>
                            <span>{formatCurrency(selectedBooking.taxes)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 font-medium pb-2 border-b border-slate-800">
                            <span>Platform Fees</span>
                            <span>{formatCurrency(selectedBooking.fees)}</span>
                          </div>
                          <div className="flex justify-between items-end pt-1">
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Total Payout</p>
                              <p className="text-2xl font-black text-white leading-none">{formatCurrency(selectedBooking.totalPrice)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 py-1 px-2 rounded-full font-black border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              SECURE
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="p-4 bg-muted/30 border-t flex sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl px-8 font-bold border-2 hover:bg-background"
              >
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
        {/* Booking Approval Dialog */}
        <Dialog open={isBookingApproveOpen} onOpenChange={setIsBookingApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Reservation</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this reservation for {selectedBookingForAction?.guestInfo.firstName} {selectedBookingForAction?.guestInfo.lastName}?
                This will confirm the booking and credit the earnings to your wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmation Code:</span>
                <span className="font-medium">#{selectedBookingForAction?.confirmationCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-emerald-600 font-bold">{formatCurrency(selectedBookingForAction?.totalPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dates:</span>
                <span className="font-medium">
                  {selectedBookingForAction && formatDate(new Date(selectedBookingForAction.checkIn))} to {selectedBookingForAction && formatDate(new Date(selectedBookingForAction.checkOut))}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingApproveOpen(false)}>Cancel</Button>
              <Button onClick={handleBookingApprove} disabled={isLoadingRequests} className="bg-emerald-600 hover:bg-emerald-700">
                {isLoadingRequests ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm & Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Booking Rejection Dialog */}
        <Dialog open={isBookingRejectOpen} onOpenChange={setIsBookingRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Reservation</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this reservation. This action will cancel the booking and release the parking spot.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reject-reason">Rejection Reason</Label>
                <Textarea
                  id="reject-reason"
                  placeholder="e.g., Maintenance issue, location full, etc."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingRejectOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleBookingReject}
                disabled={isLoadingRequests || !rejectionReason.trim()}
              >
                {isLoadingRequests ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                Reject Reservation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
