"use client";

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, formatDate } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Handle both Promise and direct object params for compatibility
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const id = resolvedParams.id;

  const { reservations, cancelReservation } = useDataStore();
  const { toast } = useToast();
  const reservation = reservations.find((r) => r.id === id);

  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("details");

  if (!reservation) {
    notFound();
  }

  const now = new Date();
  const checkInDate = new Date(reservation.checkIn);
  const checkOutDate = new Date(reservation.checkOut);
  
  const isUpcoming = reservation.status === "confirmed" && checkInDate > now;
  const isActive = reservation.status === "confirmed" && checkInDate <= now && checkOutDate >= now;
  const isPast = reservation.status === "confirmed" && checkOutDate < now;
  const isCancelled = reservation.status === "cancelled";

  // Calculate duration
  const durationMs = checkOutDate.getTime() - checkInDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // Calculate time until check-in
  const timeUntilCheckIn = checkInDate.getTime() - now.getTime();
  const hoursUntilCheckIn = Math.floor(timeUntilCheckIn / (1000 * 60 * 60));
  const daysUntilCheckIn = Math.floor(hoursUntilCheckIn / 24);

  const handleCancelReservation = async () => {
    setIsCancelling(true);
    try {
      await cancelReservation(id);
      toast({
        title: "Reservation Cancelled",
        description: "Your reservation has been cancelled successfully.",
      });
      setShowCancelDialog(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to cancel reservation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <Link href="/account/reservations">
        <Button variant="ghost" className="mb-2">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Reservations
        </Button>
      </Link>

      {/* Status Banner */}
      {(isActive || (isUpcoming && hoursUntilCheckIn < 24)) && (
        <Card className={isActive ? "border-blue-200 bg-blue-50/50" : "border-amber-200 bg-amber-50/50"}>
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
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
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
              <Link href={`/account/reservations/${id}/modify`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Modify
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive bg-transparent"
                onClick={() => setShowCancelDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="directions">Directions</TabsTrigger>
          {reservation.modificationHistory.length > 0 && (
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
                    <div className="w-44 h-44 bg-white rounded-xl flex items-center justify-center border-2 border-border shadow-sm">
                      <div className="text-center p-4">
                        <QrCode className="w-20 h-20 mx-auto text-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">Scan at entrance</p>
                      </div>
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
                        <Button variant="outline" size="sm" className="bg-transparent">
                          <Mail className="w-4 h-4 mr-2" />
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
                    </div>
                    <div className="space-y-1 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Check-out</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatDate(reservation.checkOut)}
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
                            {reservation.vehicleInfo.make} {reservation.vehicleInfo.model}
                          </p>
                          <p className="text-sm text-muted-foreground">{reservation.vehicleInfo.color}</p>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">License Plate</p>
                        <p className="font-mono text-xl font-bold text-foreground">
                          {reservation.vehicleInfo.licensePlate}
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
                    <span className="text-foreground">Total {isCancelled ? "refunded" : "paid"}</span>
                    <span className="text-foreground">{formatCurrency(reservation.totalPrice)}</span>
                  </div>
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
                      {reservation.guestInfo.firstName} {reservation.guestInfo.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground break-all">{reservation.guestInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">{reservation.guestInfo.phone}</p>
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
                        reservation.location.cancellationPolicy.type === "free"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : reservation.location.cancellationPolicy.type === "partial"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {reservation.location.cancellationPolicy.type === "free"
                        ? "Free Cancellation"
                        : reservation.location.cancellationPolicy.type === "partial"
                        ? "Partial Refund"
                        : "Non-refundable"}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {reservation.location.cancellationPolicy.description}
                    </p>
                    {reservation.cancellationEligibility.eligible && (
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

              {/* Location Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Phone className="w-4 h-4 mr-3" />
                    Call Location
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <MessageSquare className="w-4 h-4 mr-3" />
                    Contact Support
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
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Interactive map</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">
                  <Navigation className="w-4 h-4 mr-2" />
                  Open in Maps
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline">
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

        {reservation.modificationHistory.length > 0 && (
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
                  {reservation.modificationHistory.map((mod, index) => (
                    <div key={mod.id} className="flex gap-4">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {index < reservation.modificationHistory.length - 1 && (
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
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Your rating:</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} className="p-1 hover:scale-110 transition-transform">
                        <Star className="w-6 h-6 text-muted-foreground hover:text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="review-title">Review Title</Label>
                  <input
                    id="review-title"
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Summarize your experience"
                  />
                </div>
                <div>
                  <Label htmlFor="review-content">Your Review</Label>
                  <Textarea
                    id="review-content"
                    className="mt-1"
                    rows={4}
                    placeholder="Tell others about your parking experience..."
                  />
                </div>
                <Button>Submit Review</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this reservation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {reservation.cancellationEligibility.eligible && (
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
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="bg-transparent" onClick={handleCopyConfirmation}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Button variant="outline" className="bg-transparent">
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
