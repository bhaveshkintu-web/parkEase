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
} from "lucide-react";
import type { Reservation, AdminReview } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Loading from "./loading"; // Import the loading component

export default function OwnerBookingsPage() {
  const { user } = useAuth();
  const { reservations, adminLocations, adminReviews, initializeForOwner } = useDataStore();
  const searchParams = useSearchParams(); // Use search params

  // Initialize data
  React.useEffect(() => {
    if (user?.id) {
      initializeForOwner(user.id);
    }
  }, [user?.id, initializeForOwner]);

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
    };
  }, [safeReservations]);

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

  // Handle reply submission
  const handleReplySubmit = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setIsReplying(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setIsReplying(false);
    setReplyText("");
    setSelectedReview(null);
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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>Bookings</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.total}
              </Badge>
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
      </div>
    </Suspense>
  );
}
