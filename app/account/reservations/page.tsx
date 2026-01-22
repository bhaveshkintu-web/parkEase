"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
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
  AlertTriangle,
} from "lucide-react";

type TabValue = "upcoming" | "past" | "cancelled";

export default function ReservationsPage() {
  const { reservations } = useDataStore();
  const [activeTab, setActiveTab] = useState<TabValue>("upcoming");

  const now = new Date();

  const upcomingReservations = reservations.filter(
    (r) => r.status === "confirmed" && new Date(r.checkIn) > now
  );
  const pastReservations = reservations.filter(
    (r) => r.status === "confirmed" && new Date(r.checkOut) < now
  );
  const cancelledReservations = reservations.filter((r) => r.status === "cancelled");

  const getTabReservations = () => {
    switch (activeTab) {
      case "upcoming":
        return upcomingReservations;
      case "past":
        return pastReservations;
      case "cancelled":
        return cancelledReservations;
    }
  };

  const tabReservations = getTabReservations();

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
            {upcomingReservations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {upcomingReservations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {tabReservations.length === 0 ? (
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
              {tabReservations.map((reservation) => (
                <Card key={reservation.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Location image */}
                      <div className="w-full md:w-48 h-32 md:h-auto bg-muted">
                        <img
                          src={reservation.location.images[0] || "/placeholder.svg"}
                          alt={reservation.location.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {reservation.location.name}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {reservation.location.airport}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              reservation.status === "confirmed"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : reservation.status === "cancelled"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }
                          >
                            {reservation.status === "confirmed"
                              ? activeTab === "past"
                                ? "Completed"
                                : "Confirmed"
                              : "Cancelled"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Check-in</p>
                            <p className="font-medium text-sm text-foreground">
                              {formatDate(reservation.checkIn)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Check-out</p>
                            <p className="font-medium text-sm text-foreground">
                              {formatDate(reservation.checkOut)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Vehicle</p>
                            <p className="font-medium text-sm text-foreground">
                              {reservation.vehicleInfo.make} {reservation.vehicleInfo.model}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Total</p>
                            <p className="font-medium text-sm text-foreground">
                              {formatCurrency(reservation.totalPrice)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <QrCode className="w-4 h-4" />
                            <span>Confirmation: {reservation.confirmationCode}</span>
                          </div>
                          <div className="flex gap-2">
                            {activeTab === "upcoming" && (
                              <>
                                <Link href={`/account/reservations/${reservation.id}/modify`}>
                                  <Button variant="outline" size="sm">
                                    Modify
                                  </Button>
                                </Link>
                                <Link href={`/account/reservations/${reservation.id}/cancel`}>
                                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive bg-transparent">
                                    Cancel
                                  </Button>
                                </Link>
                              </>
                            )}
                            <Link href={`/account/reservations/${reservation.id}`}>
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
