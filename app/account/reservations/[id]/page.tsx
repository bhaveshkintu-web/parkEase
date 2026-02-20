"use client";

import React from "react";
import Link from "next/link";
import QRCodeGenerator from "react-qr-code";
import { formatCurrency, formatDate, formatTime } from "@/lib/data";
import { getBookingDetails, cancelBooking, submitReview, sendEmailReceipt } from "@/lib/actions/booking-actions";
import { getBookingSupportStatus } from "@/lib/actions/support-actions";
import { SupportDialogs } from "@/components/support/support-dialogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Phone,
  Clock,
  Car,
  QrCode,
  Navigation,
  Calendar,
  CreditCard,
  ChevronLeft,
  Printer,
  Download,
  Bus,
  AlertCircle,
  Shield,
  CheckCircle2,
  XCircle,
  Edit,
  History,
  FileText,
  Share2,
  Copy,
  Mail,
  MessageSquare,
  Star,
  Info,
  Trash2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Handle both Promise and direct object params for compatibility
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const id = resolvedParams.id;
  const [reservation, setReservation] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("details");

  // Review state
  const [reviewRating, setReviewRating] = React.useState(0);
  const [reviewTitle, setReviewTitle] = React.useState("");
  const [reviewContent, setReviewContent] = React.useState("");
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [hasSubmittedReview, setHasSubmittedReview] = React.useState(false);

  // Email state
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [shareEmail, setShareEmail] = React.useState("");

  // Support state
  const [showSupportDialog, setShowSupportDialog] = React.useState(false);
  const [supportType, setSupportType] = React.useState<"DISPUTE" | "REFUND" | "TICKET">("DISPUTE");
  const [supportStatus, setSupportStatus] = React.useState<{ disputes: any[]; refunds: any[] }>({ disputes: [], refunds: [] });

  React.useEffect(() => {
    async function loadBooking() {
      setIsLoading(true);
      const [bookingResponse, supportResponse] = await Promise.all([
        getBookingDetails(id),
        getBookingSupportStatus(id)
      ]);

      if (bookingResponse.success && bookingResponse.data) {
        setReservation(bookingResponse.data);
      } else {
        toast({
          title: "Error",
          description: bookingResponse.error || "Failed to load reservation",
          variant: "destructive",
        });
      }

      if (supportResponse.success) {
        setSupportStatus({
          disputes: supportResponse.disputes || [],
          refunds: supportResponse.refunds || []
        });
      }

      setIsLoading(false);
    }
    loadBooking();
  }, [id, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading reservation details...</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Reservation not found</h2>
        <Link href="/account/reservations">
          <Button variant="outline">Back to Reservations</Button>
        </Link>
      </div>
    );
  }

  const now = new Date();
  const checkInDate = new Date(reservation.checkIn);
  const checkOutDate = new Date(reservation.checkOut);

  const isUpcoming = (reservation.status === "CONFIRMED" || reservation.status === "PENDING") && checkInDate > now;
  const isCheckedIn = reservation.parkingSession?.status === "checked_in" && reservation.parkingSession?.checkInTime;
  const isActive = reservation.status === "CONFIRMED" && isCheckedIn && checkOutDate >= now;
  const isPast = (reservation.status === "CONFIRMED" || reservation.status === "COMPLETED") && checkOutDate < now;
  const isCancelled = reservation.status === "CANCELLED";

  // Calculate duration
  const durationMs = checkOutDate.getTime() - checkInDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // Calculate time until check-in
  const timeUntilCheckIn = checkInDate.getTime() - now.getTime();
  const hoursUntilCheckIn = Math.floor(timeUntilCheckIn / (1000 * 60 * 60));
  const daysUntilCheckIn = Math.floor(hoursUntilCheckIn / 24);

  // Cancellation policy logic
  const policy = reservation.location?.cancellationPolicy as any;
  const deadlineHours = parseInt(policy?.hours) || 24;
  const isCancellable = isUpcoming && (policy?.type !== "strict") && (hoursUntilCheckIn >= deadlineHours);
  const cancellationDeadlinePassed = isUpcoming && (policy?.type !== "strict") && (hoursUntilCheckIn < deadlineHours);
  const isStrictPolicy = policy?.type === "strict";
  const isModifiable = isUpcoming && hoursUntilCheckIn >= 2;
  const modificationDeadlinePassed = isUpcoming && hoursUntilCheckIn < 2;

  const handleCancelReservation = async () => {
    if (!isCancellable) return;
    setIsCancelling(true);
    // ... rest of handleCancelReservation
    try {
      const response = await cancelBooking(id, cancelReason);
      if (response.success) {
        setReservation({ ...reservation, status: "CANCELLED" });
        toast({
          title: "Reservation Cancelled",
          description: "Your reservation has been cancelled successfully.",
        });
        setShowCancelDialog(false);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel reservation. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await submitReview(id, {
        rating: reviewRating,
        title: reviewTitle,
        content: reviewContent,
      });

      if (response.success) {
        setHasSubmittedReview(true);
        toast({
          title: "Review submitted!",
          description: "Thank you for sharing your experience.",
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCopyConfirmation = () => {
    navigator.clipboard.writeText(reservation.confirmationCode);
    toast({
      title: "Copied!",
      description: "Confirmation code copied to clipboard.",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmailReceipt = async () => {
    setIsSendingEmail(true);
    try {
      const response = await sendEmailReceipt(id);
      if (response.success) {
        toast({
          title: "Email Sent!",
          description: `A copy of your receipt has been sent to ${reservation.guestEmail}.`,
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleShareEmail = async () => {
    if (!shareEmail || !shareEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await sendEmailReceipt(id, shareEmail);
      if (response.success) {
        toast({
          title: "Reservation Shared!",
          description: `Details have been sent to ${shareEmail}.`,
        });
        setShowShareDialog(false);
        setShareEmail("");
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast({
        title: "Failed to share",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCallLocation = () => {
    const SUPPORT_PHONE = "(800) 555-0199";
    const phone = reservation?.location?.owner?.user?.phone || reservation?.location?.phone || reservation?.location?.shuttleInfo?.phone;
    const phoneToCall = phone || SUPPORT_PHONE;

    if (phoneToCall) {
      window.location.href = `tel:${phoneToCall.replace(/[^\d+]/g, '')}`;
    } else {
      toast({
        title: "Phone number not available",
        description: "We couldn't find a contact number for this location.",
        variant: "destructive",
      });
    }
  };

  const handleOpenMaps = () => {
    const { address, city, state, zipCode } = reservation.location;
    const fullAddress = `${address}, ${city}, ${state || ""} ${zipCode || ""}`;
    const query = encodeURIComponent(fullAddress);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(googleMapsUrl, "_blank");
  };

  const handleContactSupport = () => {
    setSupportType("TICKET");
    setShowSupportDialog(true);
  };

  const getStatusConfig = () => {
    if (isCancelled) {
      return {
        label: "Cancelled",
        variant: "destructive" as const,
        className: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
        description: "This reservation has been cancelled",
      };
    }
    if (isPast) {
      return {
        label: "Completed",
        variant: "secondary" as const,
        className: "bg-slate-100 text-slate-700 border-slate-200",
        icon: CheckCircle2,
        description: "This reservation has been completed",
      };
    }
    if (isActive) {
      return {
        label: "Active",
        variant: "default" as const,
        className: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Car,
        description: "Your vehicle is currently parked",
      };
    }
    // New status for when booking time has started but not checked in
    if (reservation.status === "CONFIRMED" && checkInDate <= now && checkOutDate >= now && !isCheckedIn) {
      return {
        label: "Ready for Check-in",
        variant: "default" as const,
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
        description: "Your booking has started. Please check in at the facility.",
      };
    }
    return {
      label: "Confirmed",
      variant: "default" as const,
      className: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle2,
      description: `Check-in ${daysUntilCheckIn > 0 ? `in ${daysUntilCheckIn} days` : hoursUntilCheckIn > 0 ? `in ${hoursUntilCheckIn} hours` : "soon"}`,
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="h-screen flex flex-col max-w-5xl mx-auto">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-6 pb-0">
        {/* Back button */}
        <Link href="/account/reservations">
          <Button variant="ghost" className="mb-2">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Reservations
          </Button>
        </Link>

        {/* Status Banner */}
        {(isActive || (isUpcoming && hoursUntilCheckIn < 24)) && (
          <Card className={isActive ? "border-blue-200 bg-blue-50/50 mb-4" : "border-amber-200 bg-amber-50/50 mb-4"}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                {isActive ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">Your vehicle is currently parked</p>
                      <p className="text-sm text-blue-700">
                        Check-out by {formatDate(reservation.checkOut)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900">Check-in opens soon!</p>
                      <p className="text-sm text-amber-700">
                        {hoursUntilCheckIn > 0 ? `${hoursUntilCheckIn} hours until check-in` : "Check-in is now available"}
                      </p>
                    </div>
                    <Button size="sm">
                      Get Directions
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{reservation.location.name}</h1>
              <Badge variant="outline" className={statusConfig.className}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {reservation.location.address}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{statusConfig.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {isUpcoming && (
              <>
                <div className="relative group">
                  <Link
                    href={isModifiable ? `/account/reservations/${id}/modify` : "#"}
                    onClick={(e) => !isModifiable && e.preventDefault()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "bg-transparent",
                        !isModifiable && "opacity-50 cursor-not-allowed hover:bg-transparent"
                      )}
                      disabled={!isModifiable}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modify
                    </Button>
                  </Link>
                  {modificationDeadlinePassed && (
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-50 text-center">
                      Modifications can only be performed at least 2 hours before check-in.
                    </div>
                  )}
                </div>
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-destructive hover:text-destructive bg-transparent",
                      !isCancellable && "opacity-50 cursor-not-allowed hover:bg-transparent"
                    )}
                    onClick={() => isCancellable && setShowCancelDialog(true)}
                    disabled={!isCancellable || isCancelling}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  {!isCancellable && (
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-50 text-center">
                      {isStrictPolicy
                        ? "This reservation is non-refundable."
                        : cancellationDeadlinePassed
                          ? `The ${deadlineHours}h cancellation window has passed.`
                          : "This reservation cannot be cancelled at this time."
                      }
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="directions">Directions</TabsTrigger>
            {(reservation.modificationHistory || []).length > 0 && (
              <TabsTrigger value="history">History</TabsTrigger>
            )}
            {isPast && <TabsTrigger value="review">Leave Review</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                {/* QR Code Card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* QR Code */}
                      <div className="w-44 h-44 bg-white rounded-xl flex items-center justify-center border-2 border-border shadow-sm overflow-hidden p-3">
                        <QRCodeGenerator
                          value={reservation.confirmationCode}
                          size={150}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox={`0 0 256 256`}
                        />
                      </div>

                      {/* Confirmation details */}
                      <div className="flex-1 text-center md:text-left">
                        <p className="text-sm text-muted-foreground mb-1">Confirmation Code</p>
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                          <p className="text-3xl font-mono font-bold text-foreground tracking-wider">
                            {reservation.confirmationCode}
                          </p>
                          <Button variant="ghost" size="icon" onClick={handleCopyConfirmation}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-4">
                          Show this QR code or confirmation number at the parking facility entrance
                        </p>
                        <div className="flex gap-2 mt-4 justify-center md:justify-start">
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <Download className="w-4 h-4 mr-2" />
                            Add to Wallet
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent"
                            onClick={handleEmailReceipt}
                            disabled={isSendingEmail}
                          >
                            {isSendingEmail ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4 mr-2" />
                            )}
                            Email Receipt
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reservation dates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Reservation Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Check-in</p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatDate(reservation.checkIn)}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(reservation.checkIn)}
                        </p>
                      </div>
                      <div className="space-y-1 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Check-out</p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatDate(reservation.checkOut)}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(reservation.checkOut)}
                        </p>
                      </div>
                      <div className="space-y-1 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="text-lg font-semibold text-foreground">
                          {durationDays} {durationDays === 1 ? "day" : "days"}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        Vehicle Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Car className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {reservation.vehicleMake} {reservation.vehicleModel}
                            </p>
                            <p className="text-sm text-muted-foreground">{reservation.vehicleColor}</p>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">License Plate</p>
                          <p className="font-mono text-xl font-bold text-foreground">
                            {reservation.vehiclePlate}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Parking Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Parking Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        {reservation.location.covered ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={reservation.location.covered ? "text-foreground" : "text-muted-foreground"}>
                          Covered Parking
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {reservation.location.shuttle ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={reservation.location.shuttle ? "text-foreground" : "text-muted-foreground"}>
                          Shuttle Service
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {reservation.location.selfPark ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={reservation.location.selfPark ? "text-foreground" : "text-muted-foreground"}>
                          Self Park
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-foreground">24/7 Security</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shuttle Information */}
                {reservation.location.shuttle && reservation.location.shuttleInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bus className="w-5 h-5" />
                        Shuttle Information
                      </CardTitle>
                      <CardDescription>Free shuttle service to and from the airport terminal</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Operating Hours</p>
                          <p className="font-medium text-foreground">{reservation.location.shuttleInfo.hours}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Frequency</p>
                          <p className="font-medium text-foreground">{reservation.location.shuttleInfo.frequency}</p>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Pickup Instructions</p>
                        <p className="text-foreground">{reservation.location.shuttleInfo.pickupInstructions}</p>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                        <Phone className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Shuttle Hotline</p>
                          <p className="font-semibold text-foreground">{reservation.location.shuttleInfo.phone}</p>
                        </div>
                        <Button variant="outline" size="sm" className="ml-auto bg-transparent">
                          <Phone className="w-4 h-4 mr-2" />
                          Call Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Special Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Important Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-900">Check-in Process</p>
                          <p className="text-sm text-blue-700">
                            Upon arrival, scan your QR code or enter your confirmation code at the entrance kiosk.
                            The gate will open automatically.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 p-3 bg-amber-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-900">Vehicle Requirements</p>
                          <p className="text-sm text-amber-700">
                            Ensure your vehicle matches the registered license plate. Different vehicles may be
                            denied entry or charged additional fees.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 p-3 bg-green-50 rounded-lg">
                        <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900">Security Notice</p>
                          <p className="text-sm text-green-700">
                            This facility is monitored 24/7. Please do not leave valuables visible in your vehicle.
                            Report any concerns to facility staff.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Price summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Payment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Parking ({durationDays} {durationDays === 1 ? "day" : "days"})
                      </span>
                      <span className="text-foreground">
                        {formatCurrency(reservation.totalPrice - reservation.taxes - reservation.fees)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes</span>
                      <span className="text-foreground">{formatCurrency(reservation.taxes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service fee</span>
                      <span className="text-foreground">{formatCurrency(reservation.fees)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span className="text-foreground">Total paid</span>
                      <span className="text-foreground">{formatCurrency(reservation.totalPrice)}</span>
                    </div>
                    {isCancelled && (
                      <>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Refund amount</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              reservation.refunds?.reduce((sum: number, refund: any) => sum + (refund.approvedAmount || 0), 0) || 0
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          See Support & Refunds section below for refund details
                        </p>
                      </>
                    )}
                    {!isCancelled && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        Payment confirmed
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Contact info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Guest Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium text-foreground">
                        {reservation.guestFirstName} {reservation.guestLastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground break-all">{reservation.guestEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium text-foreground">{reservation.guestPhone}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Cancellation policy */}
                {(isUpcoming || isActive) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Cancellation Policy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Badge
                        variant="outline"
                        className={
                          reservation.location.cancellationPolicy?.type === "free"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : reservation.location.cancellationPolicy?.type === "partial"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {reservation.location.cancellationPolicy?.type === "free"
                          ? "Free Cancellation"
                          : reservation.location.cancellationPolicy?.type === "partial"
                            ? "Partial Refund"
                            : "Non-refundable"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {reservation.location.cancellationPolicy?.description || "Refer to terminal instructions for cancellation details."}
                      </p>
                      {reservation.cancellationEligibility?.eligible && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">
                            Eligible refund: {formatCurrency(reservation.cancellationEligibility.refundAmount)}
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            Cancel before {formatDate(reservation.cancellationEligibility.deadline)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Support Status Card */}
                {(supportStatus.disputes.length > 0 || supportStatus.refunds.length > 0) && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Support & Refunds
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {supportStatus.disputes.map((d: any) => (
                        <div key={d.id} className="text-xs p-2 bg-white rounded border flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{d.status}</Badge>
                            <span className="text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="font-medium line-clamp-1">{d.subject}</p>
                        </div>
                      ))}
                      {supportStatus.refunds.map((r: any) => (
                        <div key={r.id} className="text-xs p-3 bg-white rounded border space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">Status</span>
                            <Badge
                              variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}
                              className="text-[10px] h-4 px-1"
                            >
                              {r.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">Requested</span>
                            <span className="font-medium">{formatCurrency(r.amount)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">Approved</span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(r.status === 'REJECTED' ? 0 : (r.approvedAmount || 0))}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground text-right">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Location Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={handleCallLocation}
                    >
                      <Phone className="w-4 h-4 mr-3" />
                      Call Location
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={handleContactSupport}
                    >
                      <MessageSquare className="w-4 h-4 mr-3" />
                      Get Help
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="directions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Getting There
                </CardTitle>
                <CardDescription>{reservation.location.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64 bg-muted rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${reservation.location.latitude},${reservation.location.longitude}&z=15&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleOpenMaps}>
                    <Navigation className="w-4 h-4 mr-2" />
                    Open in Maps
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={handleCallLocation}>
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Driving Directions</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Take the airport exit from the highway</p>
                    <p>2. Follow signs for "Airport Parking"</p>
                    <p>3. Turn right at the second traffic light</p>
                    <p>4. The parking facility is on your left</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(reservation.modificationHistory || []).length > 0 && (
            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Modification History
                  </CardTitle>
                  <CardDescription>Changes made to this reservation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(reservation.modificationHistory || []).map((mod: any, index: number) => (
                      <div key={mod.id} className="flex gap-4">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-muted-foreground" />
                          </div>
                          {index < (reservation.modificationHistory || []).length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground capitalize">
                              {mod.type.replace("_", " ")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(mod.createdAt)}
                            </p>
                          </div>
                          {mod.priceDifference !== 0 && (
                            <p className={`text-sm ${mod.priceDifference > 0 ? "text-red-600" : "text-green-600"}`}>
                              {mod.priceDifference > 0 ? "+" : ""}{formatCurrency(mod.priceDifference)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Original booking */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">Original Booking</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(reservation.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Reservation created
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isPast && (
            <TabsContent value="review" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Leave a Review
                  </CardTitle>
                  <CardDescription>Share your experience with other travelers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasSubmittedReview ? (
                    <div className="py-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Review Submitted!</h3>
                        <p className="text-muted-foreground">Thank you for your feedback. It helps our community of travelers.</p>
                      </div>
                      <Button variant="outline" onClick={() => setHasSubmittedReview(false)}>
                        Write another review
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Your rating:</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-1 hover:scale-110 transition-transform focus:outline-none"
                            >
                              <Star
                                className={`w-8 h-8 ${star <= reviewRating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-muted-foreground hover:text-amber-400"
                                  }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="review-title">Review Title</Label>
                        <Input
                          id="review-title"
                          value={reviewTitle}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewTitle(e.target.value)}
                          className="w-full mt-1"
                          placeholder="Summarize your experience"
                        />
                      </div>
                      <div>
                        <Label htmlFor="review-content">Your Review</Label>
                        <Textarea
                          id="review-content"
                          value={reviewContent}
                          onChange={(e) => setReviewContent(e.target.value)}
                          className="mt-1"
                          rows={4}
                          placeholder="Tell others about your parking experience..."
                        />
                      </div>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview || reviewRating === 0}
                      >
                        {isSubmittingReview ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Review"
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <SupportDialogs
          bookingId={reservation.id}
          totalPrice={reservation.totalPrice}
          isOpen={showSupportDialog}
          onClose={async () => {
            setShowSupportDialog(false);
            // Refresh status
            const res = await getBookingSupportStatus(id);
            if (res.success) {
              setSupportStatus({
                disputes: res.disputes || [],
                refunds: res.refunds || []
              });
            }
          }}
          defaultType={supportType}
          customerEmail={reservation.user?.email || ""}
          customerName={`${reservation.user?.firstName || ""} ${reservation.user?.lastName || ""}`.trim()}
        />
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this reservation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {reservation.cancellationEligibility?.eligible && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="font-medium text-green-800">
                You will receive a refund of {formatCurrency(reservation.cancellationEligibility.refundAmount)}
              </p>
              <p className="text-sm text-green-700 mt-1">
                Refund will be processed within 5-7 business days
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tell us why you're cancelling..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Reservation
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelReservation}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel Reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Reservation</DialogTitle>
            <DialogDescription>
              Share your reservation details with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Confirmation Code</p>
              <p className="font-mono font-bold text-lg">{reservation.confirmationCode}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="share-email"
                  placeholder="friend@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <Button
                  onClick={handleShareEmail}
                  disabled={isSendingEmail || !shareEmail}
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="w-full bg-transparent" onClick={handleCopyConfirmation}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Confirmation Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
