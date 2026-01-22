"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useDataStore } from "@/lib/data-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/data";
import {
  Calendar,
  Car,
  CreditCard,
  MapPin,
  Clock,
  ChevronRight,
  Plus,
  Star,
  Settings,
  Shield
} from "lucide-react";

export default function AccountDashboard() {
  const { user } = useAuth();
  const { reservations, vehicles, payments } = useDataStore();

  const upcomingReservations = reservations.filter(
    (r) => r.status === "confirmed" && new Date(r.checkIn) > new Date()
  );
  const pastReservations = reservations.filter(
    (r) => r.status === "confirmed" && new Date(r.checkOut) < new Date()
  );

  const nextReservation = upcomingReservations[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your reservations, vehicles, and account settings
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{upcomingReservations.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming trips</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pastReservations.length}</p>
                <p className="text-sm text-muted-foreground">Past trips</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{vehicles.length}</p>
                <p className="text-sm text-muted-foreground">Saved vehicles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{payments.length}</p>
                <p className="text-sm text-muted-foreground">Payment methods</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next reservation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Next Reservation</CardTitle>
                <CardDescription>Your upcoming parking reservation</CardDescription>
              </div>
              <Link href="/account/reservations">
                <Button variant="ghost" size="sm">
                  View all
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {nextReservation ? (
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {nextReservation.location.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        {nextReservation.location.airport}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Confirmed
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Check-in</p>
                      <p className="font-medium text-foreground">
                        {formatDate(nextReservation.checkIn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Check-out</p>
                      <p className="font-medium text-foreground">
                        {formatDate(nextReservation.checkOut)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {nextReservation.vehicleInfo.make} {nextReservation.vehicleInfo.model}
                      </span>
                    </div>
                    <Link href={`/account/reservations/${nextReservation.id}`}>
                      <Button size="sm">View Details</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No upcoming reservations</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Book your next parking spot and save money
                  </p>
                  <Link href="/parking">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Book Parking
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/parking" className="block">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Plus className="w-4 h-4 mr-3" />
                  Book New Parking
                </Button>
              </Link>
              <Link href="/account/vehicles/new" className="block">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Car className="w-4 h-4 mr-3" />
                  Add Vehicle
                </Button>
              </Link>
              <Link href="/account/payments/new" className="block">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <CreditCard className="w-4 h-4 mr-3" />
                  Add Payment Method
                </Button>
              </Link>
              <Link href="/account/settings" className="block">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Settings className="w-4 h-4 mr-3" />
                  Account Settings
                </Button>
              </Link>
              <Link href="/account/security" className="block">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Shield className="w-4 h-4 mr-3" />
                  Security Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Saved Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicles.length > 0 ? (
                <div className="space-y-3">
                  {vehicles.slice(0, 2).map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Car className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground">{vehicle.licensePlate}</p>
                        </div>
                      </div>
                      {vehicle.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No saved vehicles yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
