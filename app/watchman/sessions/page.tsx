"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { formatDate, formatTime } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { markOverstayAsPaidAction, sendOverstayLinkAction } from "@/lib/actions/overstay-actions";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import Loading from "./loading";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RequestDialog } from "@/components/watchman/request-dialog";

export default function WatchmanSessionsPage() {
  const { toast } = useToast();

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [overstayInfo, setOverstayInfo] = useState<any | null>(null);
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Always fetch all sessions to keep stats cards accurate
      const res = await fetch(`/api/watchman/sessions`);
      if (res.ok) {
        const data = await res.json();
        // Handle both structure formats (array or object with sessions property)
        setSessions(Array.isArray(data) ? data : (data.sessions || []));
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleAction = async (sessionId: string, action: "check-in" | "check-out") => {
    try {
      const res = await fetch(`/api/watchman/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `Vehicle ${action === "check-in" ? "checked in" : "checked out"} successfully.`,
        });
        fetchSessions();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 402 && errData.error === "OVERSTAY_DETECTED") {
          // Find the session to get booking info
          const session = sessions.find(s => s.id === sessionId);
          setOverstayInfo({
            bookingId: session.bookingId,
            ...errData.details
          });
          return;
        }
        throw new Error(errData.details || errData.error || "Failed to update session");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update session status.",
        variant: "destructive"
      });
    }
  };

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

  const searchedSessions = sessions.filter((s) => {
    // 1. Status Filter (Tab)
    const matchesTab = activeTab === "all" || s.status === activeTab;
    if (!matchesTab) return false;

    // 2. Search Filter
    if (!search) return true;

    const plate = s.booking?.vehiclePlate || s.vehiclePlate || "";
    const bookingId = s.bookingId || "";
    return plate.toLowerCase().includes(search.toLowerCase()) ||
      bookingId.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Suspense fallback={<Loading />}>
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
              <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {sessions.filter((s) => s.status === "checked_in").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-600">
                {sessions.filter((s) => s.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Overstays</p>
              <p className="text-2xl font-bold text-red-600">
                {sessions.filter((s) => s.status === "overstay").length}
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
                  const booking = session.booking || {};

                  return (
                    <div
                      key={session.id}
                      className={`p-4 border rounded-lg ${session.status === "overstay" ? "border-red-200 bg-red-50/50" : ""
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${session.status === "checked_in"
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
                              <p className="font-bold text-foreground">{booking.vehiclePlate || session.vehiclePlate}</p>
                              <StatusBadge
                                status={session.status.replace("_", " ")}
                                variant={getStatusVariant(session.status)}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {booking.vehicleType || session.vehicleType} - Booking #{session.bookingId.slice(-6)}
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
                          {session.expectedCheckIn && !session.checkInTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span className="text-muted-foreground">Expected:</span>
                              <span className="font-medium">{formatTime(session.expectedCheckIn)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {(session.status === "pending" || session.status === "checked_in" || session.status === "overstay") && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          {session.status === "pending" && (
                            <Button
                              size="sm"
                              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                              onClick={() => handleAction(session.id, "check-in")}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Check In
                            </Button>
                          )}
                          {(session.status === "checked_in" || session.status === "overstay") && (
                            <div className="flex flex-1 gap-2">
                              <Button
                                size="sm"
                                className={`flex-1 sm:flex-none ${session.status === "overstay"
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-blue-600 hover:bg-blue-700"
                                  }`}
                                onClick={() => handleAction(session.id, "check-out")}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Check Out
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                onClick={() => {
                                  setSelectedSession(session);
                                  setIsRequestOpen(true);
                                }}
                              >
                                <Timer className="w-4 h-4 mr-2" />
                                Extend
                              </Button>
                            </div>
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

        {selectedSession && (
          <RequestDialog
            open={isRequestOpen}
            onOpenChange={setIsRequestOpen}
            initialData={{
              customerName: "Current Customer",
              vehiclePlate: selectedSession.booking?.vehiclePlate || selectedSession.vehiclePlate,
              vehicleType: selectedSession.booking?.vehicleType || selectedSession.vehicleType,
              parkingId: selectedSession.locationId,
              requestType: "EXTENSION",
              originalBookingId: selectedSession.bookingId
            }}
          />
        )}

        {/* Overstay Dialog */}
        <Dialog open={!!overstayInfo} onOpenChange={() => setOverstayInfo(null)}>
          <DialogContent className="max-w-md border-2 border-red-500 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 text-2xl font-black">
                <AlertTriangle className="w-8 h-8" />
                Overstay Detected
              </DialogTitle>
              <DialogDescription className="text-red-700 font-medium">
                This vehicle has exceeded the booked duration. Payment is required before check-out.
              </DialogDescription>
            </DialogHeader>

            {overstayInfo && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-black text-muted-foreground">Original Checkout</span>
                    <p className="font-bold text-sm">{formatTime(overstayInfo.checkOutLimit)}</p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-1 text-red-700">
                    <span className="text-[10px] uppercase font-black">Overstay Time</span>
                    <p className="font-bold text-lg">{overstayInfo.overstayMinutes} Minutes</p>
                  </div>
                </div>

                <div className="p-6 bg-red-600 text-white rounded-2xl shadow-xl space-y-2 text-center">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80">Overstay Charge</p>
                  <p className="text-4xl font-black tracking-tighter">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(overstayInfo.overstayCharge)}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-center text-muted-foreground px-4">
                    Please ask the customer to pay using the link below or by scanning the QR code on their phone.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full h-12 bg-black text-white hover:bg-zinc-800 font-bold"
                      onClick={async () => {
                        const res = await sendOverstayLinkAction(overstayInfo.bookingId, overstayInfo.overstayCharge);
                        if (res.success) {
                          toast({ title: "Payment Link Sent", description: "The customer has received the payment link." });
                        } else {
                          toast({ title: "Failed", description: (res as any).error, variant: "destructive" });
                        }
                      }}
                    >
                      Send Payment Link to Email
                    </Button>

                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
