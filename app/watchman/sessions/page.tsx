"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { formatDate, formatTime } from "@/lib/data";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Loading from "./loading"; // Import the Loading component
import {
  Car,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  QrCode,
  AlertTriangle,
  Timer,
} from "lucide-react";

export default function WatchmanSessionsPage() {
  const { parkingSessions, reservations } = useDataStore();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const searchParams = useSearchParams();

  const filteredSessions =
    activeTab === "all"
      ? parkingSessions
      : parkingSessions.filter((s) => s.status === activeTab);

  const searchedSessions = search
    ? filteredSessions.filter(
        (s) =>
          s.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
          s.bookingId.toLowerCase().includes(search.toLowerCase())
      )
    : filteredSessions;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "checked_in":
        return "success";
      case "checked_out":
        return "info";
      case "overstay":
        return "error";
      case "violation":
        return "error";
      default:
        return "warning";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "checked_in":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "checked_out":
        return <XCircle className="w-5 h-5 text-blue-600" />;
      case "overstay":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <Timer className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <Suspense fallback={<Loading />}> {/* Wrap the component in a Suspense boundary */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Parking Sessions</h1>
            <p className="text-muted-foreground mt-1">
              Manage check-ins, check-outs, and active sessions
            </p>
          </div>
          <Link href="/watchman/scan">
            <Button>
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="text-2xl font-bold text-foreground">{parkingSessions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {parkingSessions.filter((s) => s.status === "checked_in").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-600">
                {parkingSessions.filter((s) => s.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Overstays</p>
              <p className="text-2xl font-bold text-red-600">
                {parkingSessions.filter((s) => s.status === "overstay").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sessions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs sm:text-sm">
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="checked_in" className="text-xs sm:text-sm">
                    Active
                  </TabsTrigger>
                  <TabsTrigger value="overstay" className="text-xs sm:text-sm">
                    Overstay
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search plate or booking..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchedSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions found
                </div>
              ) : (
                searchedSessions.map((session) => {
                  const booking = reservations.find((r) => r.id === session.bookingId);
                  return (
                    <div
                      key={session.id}
                      className={`p-4 border rounded-lg ${
                        session.status === "overstay" ? "border-red-200 bg-red-50/50" : ""
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              session.status === "checked_in"
                                ? "bg-green-100"
                                : session.status === "overstay"
                                ? "bg-red-100"
                                : session.status === "pending"
                                ? "bg-amber-100"
                                : "bg-blue-100"
                            }`}
                          >
                            {getStatusIcon(session.status)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground">{session.vehiclePlate}</p>
                              <StatusBadge
                                status={session.status.replace("_", " ")}
                                variant={getStatusVariant(session.status)}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {session.vehicleType} - Booking #{session.bookingId.slice(-6)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {session.checkInTime && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-muted-foreground">In:</span>
                              <span className="font-medium">{formatTime(session.checkInTime)}</span>
                            </div>
                          )}
                          {session.checkOutTime && (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-blue-600" />
                              <span className="text-muted-foreground">Out:</span>
                              <span className="font-medium">{formatTime(session.checkOutTime)}</span>
                            </div>
                          )}
                          {booking && !session.checkInTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span className="text-muted-foreground">Expected:</span>
                              <span className="font-medium">{formatTime(booking.checkIn)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {(session.status === "pending" || session.status === "checked_in" || session.status === "overstay") && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          {session.status === "pending" && (
                            <Link href="/watchman/scan" className="flex-1 sm:flex-none">
                              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Check In
                              </Button>
                            </Link>
                          )}
                          {(session.status === "checked_in" || session.status === "overstay") && (
                            <Link href="/watchman/scan" className="flex-1 sm:flex-none">
                              <Button
                                size="sm"
                                className={`w-full ${
                                  session.status === "overstay"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                                }`}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Check Out
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}

                      {session.notes && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Notes:</span> {session.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}
