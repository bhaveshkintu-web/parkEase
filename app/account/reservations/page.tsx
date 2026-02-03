"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getUserBookings } from "@/lib/actions/booking-actions";
import { formatCurrency, formatDate } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  MapPin,
  Car,
  Clock,
  ChevronRight,
  Plus,
  QrCode,
  Loader2,
} from "lucide-react";

type TabValue = "upcoming" | "past" | "cancelled";

export default function ReservationsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("upcoming");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const response = await getUserBookings();
      if (response.success && response.data) {
        setBookings(response.data);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const now = new Date();
  // Get start of today for proper date comparison
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getFilteredBookings = () => {
    switch (activeTab) {
      case "upcoming":
        // Include bookings where checkIn is today or in the future
        return bookings.filter(
          (b) => 
            (b.status === "CONFIRMED" || b.status === "PENDING") && 
            new Date(b.checkIn) >= startOfToday
        );
      case "past":
        // Include bookings where checkOut is before today
        return bookings.filter(
          (b) => 
            (b.status === "CONFIRMED" || b.status === "COMPLETED") && 
            new Date(b.checkOut) < startOfToday
        );
      case "cancelled":
        return bookings.filter((b) => b.status === "CANCELLED");
      default:
        return [];
    }
  };

  const filteredBookings = getFilteredBookings();

  // Calculate counts for each tab
  const upcomingCount = bookings.filter(
    (b) => 
      (b.status === "CONFIRMED" || b.status === "PENDING") && 
      new Date(b.checkIn) >= startOfToday
  ).length;

  const pastCount = bookings.filter(
    (b) => 
      (b.status === "CONFIRMED" || b.status === "COMPLETED") && 
      new Date(b.checkOut) < startOfToday
  ).length;

  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;

  const getStatusBadge = (status: string, checkOut: string) => {
    const isPast = new Date(checkOut) < startOfToday;
    
    switch (status) {
      case "CONFIRMED":
        return isPast ? (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
            Completed
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Confirmed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your reservations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
          <p className="text-muted-foreground">Manage your parking reservations</p>
        </div>
        <Link href="/parking">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Book Parking
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            Upcoming
            {upcomingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {upcomingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            Past
            {pastCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pastCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            Cancelled
            {cancelledCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {cancelledCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  No {activeTab} reservations
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "upcoming"
                    ? "Book your next parking spot and save money"
                    : activeTab === "past"
                    ? "Your completed trips will appear here"
                    : "Cancelled reservations will appear here"}
                </p>
                {activeTab === "upcoming" && (
                  <Link href="/parking">
                    <Button>Find Parking</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Location image */}
                      <div className="w-full md:w-48 h-32 md:h-auto bg-muted">
                        <img
                          src={booking.location.images[0] || "/placeholder.svg"}
                          alt={booking.location.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {booking.location.name}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {booking.location.city}
                              {booking.location.airportCode && ` (${booking.location.airportCode})`}
                            </div>
                          </div>
                          {getStatusBadge(booking.status, booking.checkOut)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Check-in</p>
                            <p className="font-medium text-sm text-foreground">
                              {formatDate(new Date(booking.checkIn))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Check-out</p>
                            <p className="font-medium text-sm text-foreground">
                              {formatDate(new Date(booking.checkOut))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Vehicle</p>
                            <p className="font-medium text-sm text-foreground">
                              {booking.vehicleMake} {booking.vehicleModel}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Total</p>
                            <p className="font-medium text-sm text-foreground">
                              {formatCurrency(booking.totalPrice)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <QrCode className="w-4 h-4" />
                            <span>Confirmation: {booking.confirmationCode}</span>
                          </div>
                          <div className="flex gap-2">
                            {activeTab === "upcoming" && (
                              <>
                                <Link href={`/account/reservations/${booking.id}/modify`}>
                                  <Button variant="outline" size="sm">
                                    Modify
                                  </Button>
                                </Link>
                              </>
                            )}
                            <Link href={`/account/reservations/${booking.id}`}>
                              <Button size="sm">
                                View Details
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
