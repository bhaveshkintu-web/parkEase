"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Mail,
  Car,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  QrCode,
} from "lucide-react";
import { findBookingByLicensePlate, findBookingByConfirmationCode, resendBookingConfirmation } from "@/lib/actions/find-booking-actions";
import { formatCurrency, formatDate } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

type BookingResult = {
  id: string;
  confirmationCode: string;
  status: string;
  checkIn: Date;
  checkOut: Date;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  totalPrice: number;
  taxes: number;
  fees: number;
  qrCode: string | null;
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: Date;
};

export default function FindBookingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form states
  const [licensePlate, setLicensePlate] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  
  // UI states
  const [isSearching, setIsSearching] = useState(false);
  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingResult | null>(null);
  const [isResendDialogOpen, setIsResendDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const handleSearchByPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setBookings([]);

    try {
      const result = await findBookingByLicensePlate(licensePlate, phone);
      
      if (result.success && result.data) {
        setBookings(result.data as BookingResult[]);
        if (result.data.length === 0) {
          toast({
            title: "No bookings found",
            description: "Please check your license plate and phone number",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Search failed",
          description: result.error || "Could not find booking",
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
      setIsSearching(false);
    }
  };

  const handleSearchByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setBookings([]);

    try {
      const result = await findBookingByConfirmationCode(confirmationCode);
      
      if (result.success && result.data) {
        setBookings(result.data as BookingResult[]);
        if (result.data.length === 0) {
          toast({
            title: "No booking found",
            description: "Please check your confirmation code",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Search failed",
          description: result.error || "Could not find booking",
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
      setIsSearching(false);
    }
  };

  const handleResendEmail = async () => {
    if (!selectedBooking) return;
    
    setIsResending(true);
    try {
      const result = await resendBookingConfirmation(selectedBooking.id, newEmail);
      
      if (result.success) {
        toast({
          title: "Email sent",
          description: result.message || "Confirmation email has been sent",
        });
        setIsResendDialogOpen(false);
        setNewEmail("");
      } else {
        toast({
          title: "Failed to send email",
          description: result.error || "Could not send confirmation email",
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
      setIsResending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any; className: string }> = {
      pending: {
        variant: "secondary",
        icon: AlertCircle,
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
      confirmed: {
        variant: "default",
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      cancelled: {
        variant: "destructive",
        icon: XCircle,
        className: "bg-red-100 text-red-700 border-red-200",
      },
      rejected: {
        variant: "destructive",
        icon: XCircle,
        className: "bg-rose-100 text-rose-700 border-rose-200",
      },
    };
    
    const item = config[status.toLowerCase()] || config.pending;
    const Icon = item.icon;
    
    return (
      <Badge variant="outline" className={item.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Find My Booking</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Retrieve your parking reservation details using your license plate and phone number, or your confirmation code
          </p>
        </div>

        {/* Search Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Search for Your Booking</CardTitle>
            <CardDescription>
              Choose a method to look up your reservation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="plate" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plate">License Plate & Phone</TabsTrigger>
                <TabsTrigger value="code">Confirmation Code</TabsTrigger>
              </TabsList>
              
              <TabsContent value="plate" className="space-y-4 mt-6">
                <form onSubmit={handleSearchByPlate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">License Plate Number</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="licensePlate"
                        placeholder="ABC 1234"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isSearching}>
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Find My Booking
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="code" className="space-y-4 mt-6">
                <form onSubmit={handleSearchByCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirmationCode">Confirmation Code</Label>
                    <Input
                      id="confirmationCode"
                      placeholder="PK-XXXXXX-XXXX"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the confirmation code from your booking email
                    </p>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isSearching}>
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Find My Booking
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Search Results */}
        {bookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your Bookings</h2>
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {booking.location.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Confirmation Code: <span className="font-mono font-semibold">{booking.confirmationCode}</span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Location Info */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {booking.location.address}, {booking.location.city}, {booking.location.state} {booking.location.zipCode}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Check-in</p>
                          <p className="text-muted-foreground">{formatDate(new Date(booking.checkIn))}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Check-out</p>
                          <p className="text-muted-foreground">{formatDate(new Date(booking.checkOut))}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Vehicle</p>
                          <p className="text-muted-foreground">
                            {booking.vehicleColor} {booking.vehicleMake} {booking.vehicleModel}
                          </p>
                          <p className="text-muted-foreground font-mono">{booking.vehiclePlate}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Guest Info */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Guest Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Name:</span> {booking.guestFirstName} {booking.guestLastName}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Email:</span> {booking.guestEmail}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Phone:</span> {booking.guestPhone}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(booking.totalPrice - booking.taxes - booking.fees)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes</span>
                      <span>{formatCurrency(booking.taxes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fees</span>
                      <span>{formatCurrency(booking.fees)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-lg">{formatCurrency(booking.totalPrice)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setNewEmail(booking.guestEmail);
                        setIsResendDialogOpen(true);
                      }}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Confirmation
                    </Button>
                    {booking.qrCode && (
                      <Button variant="outline" className="flex-1">
                        <QrCode className="w-4 h-4 mr-2" />
                        View QR Code
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resend Email Dialog */}
        <Dialog open={isResendDialogOpen} onOpenChange={setIsResendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resend Confirmation Email</DialogTitle>
              <DialogDescription>
                Enter the email address where you'd like to receive the confirmation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResendDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResendEmail} disabled={isResending || !newEmail}>
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
