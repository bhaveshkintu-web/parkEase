"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDataStore } from "@/lib/data-store";
import { formatDate, formatTime } from "@/lib/data";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Calendar, Car, Clock, CheckCircle, XCircle, Search, Play, Pause, StopCircle, AlertTriangle, Timer, MapPin, User, Activity, FileText, Download, Filter, ArrowUpDown, Coffee, Shield, Eye, Printer } from "lucide-react";
import type { WatchmanActivityLog, WatchmanShift, ShiftBreak } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { toast } from "react-toastify";

// Mock activity data
const mockActivityLogs: WatchmanActivityLog[] = [
  {
    id: "act_1",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "shift_start",
    timestamp: new Date(new Date().setHours(8, 0, 0, 0)),
    details: { parkingId: "park_1", location: "Downtown Parking" },
  },
  {
    id: "act_2",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "check_in",
    timestamp: new Date(new Date().setHours(8, 15, 0, 0)),
    details: { vehiclePlate: "ABC-1234", bookingId: "book_1", parkingId: "park_1", spotNumber: "A-15" },
  },
  {
    id: "act_3",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "check_in",
    timestamp: new Date(new Date().setHours(8, 45, 0, 0)),
    details: { vehiclePlate: "XYZ-5678", bookingId: "book_2", parkingId: "park_1", spotNumber: "B-03" },
  },
  {
    id: "act_4",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "check_out",
    timestamp: new Date(new Date().setHours(9, 30, 0, 0)),
    details: { vehiclePlate: "DEF-9012", bookingId: "book_3", parkingId: "park_1", spotNumber: "A-08" },
  },
  {
    id: "act_5",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "break_start",
    timestamp: new Date(new Date().setHours(10, 0, 0, 0)),
    details: { notes: "Lunch break" },
  },
  {
    id: "act_6",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "break_end",
    timestamp: new Date(new Date().setHours(10, 30, 0, 0)),
    details: {},
  },
  {
    id: "act_7",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "incident",
    timestamp: new Date(new Date().setHours(11, 15, 0, 0)),
    details: { vehiclePlate: "GHI-3456", notes: "Vehicle parked in wrong spot, redirected to correct location", parkingId: "park_1" },
  },
  {
    id: "act_8",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "check_in",
    timestamp: new Date(new Date().setHours(11, 45, 0, 0)),
    details: { vehiclePlate: "JKL-7890", bookingId: "book_4", parkingId: "park_1", spotNumber: "C-12" },
  },
  {
    id: "act_9",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "patrol",
    timestamp: new Date(new Date().setHours(12, 0, 0, 0)),
    details: { location: "Levels A-C", notes: "Routine patrol completed, no issues" },
  },
  {
    id: "act_10",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    type: "check_out",
    timestamp: new Date(new Date().setHours(13, 30, 0, 0)),
    details: { vehiclePlate: "ABC-1234", bookingId: "book_1", parkingId: "park_1", spotNumber: "A-15" },
  },
];

const mockShifts: WatchmanShift[] = [
  {
    id: "shift_1",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    parkingId: "park_1",
    parkingName: "Downtown Parking",
    shiftDate: new Date(),
    scheduledStart: new Date(new Date().setHours(8, 0, 0, 0)),
    scheduledEnd: new Date(new Date().setHours(16, 0, 0, 0)),
    actualStart: new Date(new Date().setHours(7, 55, 0, 0)),
    status: "active",
    breaks: [
      { id: "break_1", startTime: new Date(new Date().setHours(10, 0, 0, 0)), endTime: new Date(new Date().setHours(10, 30, 0, 0)), type: "lunch" },
    ],
    activities: mockActivityLogs.filter((a) => a.watchmanId === "watch_1"),
    totalCheckIns: 4,
    totalCheckOuts: 2,
    incidentsReported: 1,
  },
  {
    id: "shift_2",
    watchmanId: "watch_1",
    watchmanName: "John Doe",
    parkingId: "park_1",
    parkingName: "Downtown Parking",
    shiftDate: new Date(Date.now() - 86400000),
    scheduledStart: new Date(new Date(Date.now() - 86400000).setHours(8, 0, 0, 0)),
    scheduledEnd: new Date(new Date(Date.now() - 86400000).setHours(16, 0, 0, 0)),
    actualStart: new Date(new Date(Date.now() - 86400000).setHours(8, 5, 0, 0)),
    actualEnd: new Date(new Date(Date.now() - 86400000).setHours(16, 10, 0, 0)),
    status: "completed",
    breaks: [
      { id: "break_2", startTime: new Date(new Date(Date.now() - 86400000).setHours(12, 0, 0, 0)), endTime: new Date(new Date(Date.now() - 86400000).setHours(12, 45, 0, 0)), type: "lunch" },
    ],
    activities: [],
    totalCheckIns: 12,
    totalCheckOuts: 10,
    incidentsReported: 0,
  },
];

// Mock car time tracking data
const mockCarTimeTracking = [
  { id: "car_1", vehiclePlate: "ABC-1234", vehicleType: "sedan", timeIn: new Date(new Date().setHours(8, 15, 0, 0)), timeOut: new Date(new Date().setHours(13, 30, 0, 0)), duration: "5h 15m", spotNumber: "A-15", status: "completed" },
  { id: "car_2", vehiclePlate: "XYZ-5678", vehicleType: "suv", timeIn: new Date(new Date().setHours(8, 45, 0, 0)), timeOut: null, duration: "4h 30m+", spotNumber: "B-03", status: "active" },
  { id: "car_3", vehiclePlate: "DEF-9012", vehicleType: "compact", timeIn: new Date(new Date().setHours(7, 30, 0, 0)), timeOut: new Date(new Date().setHours(9, 30, 0, 0)), duration: "2h 0m", spotNumber: "A-08", status: "completed" },
  { id: "car_4", vehiclePlate: "JKL-7890", vehicleType: "truck", timeIn: new Date(new Date().setHours(11, 45, 0, 0)), timeOut: null, duration: "1h 30m+", spotNumber: "C-12", status: "active" },
  { id: "car_5", vehiclePlate: "MNO-2345", vehicleType: "sedan", timeIn: new Date(new Date().setHours(9, 0, 0, 0)), timeOut: new Date(new Date().setHours(11, 0, 0, 0)), duration: "2h 0m", spotNumber: "A-22", status: "completed" },
];

export default function WatchmanActivityPage() {
  const { user } = useAuth();
  const { parkingSessions } = useDataStore();
  const { toast: toastShadcn } = useToast();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState("activity");
  const [dateFilter, setDateFilter] = useState("today");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Shift management states
  const [currentShift, setCurrentShift] = useState<WatchmanShift | null>(
    mockShifts.find((s) => s.status === "active") || null
  );
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with empty or mock if loading
  const [activityLogs, setActivityLogs] = useState<WatchmanActivityLog[]>([]);
  const [shifts, setShifts] = useState(mockShifts);
  const [carTracking, setCarTracking] = useState(mockCarTimeTracking);

  // Fetch activities and active shift on mount
  React.useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/watchman/activity?limit=100");
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            setActivityLogs(data.logs);
          }
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      }
    };

    const fetchActiveShift = async () => {
      try {
        const res = await fetch("/api/watchman/shifts?activeOnly=true");
        if (res.ok) {
          const data = await res.json();
          if (data.shifts && data.shifts.length > 0) {
            const active = data.shifts[0];
            // Adapt to frontend model
            setCurrentShift({
              id: active.id,
              watchmanId: active.watchmanId,
              watchmanName: `${user?.firstName || ""} ${user?.lastName || ""}`,
              parkingId: active.locationId,
              parkingName: active.location?.name || "Unknown Location",
              shiftDate: new Date(active.scheduledStart),
              scheduledStart: new Date(active.scheduledStart),
              scheduledEnd: new Date(active.scheduledEnd),
              actualStart: active.actualStart ? new Date(active.actualStart) : undefined,
              actualEnd: active.actualEnd ? new Date(active.actualEnd) : undefined,
              status: active.status.toLowerCase(),
              breaks: [], // TODO: fetch breaks
              activities: [],
              totalCheckIns: 0,
              totalCheckOuts: 0,
              incidentsReported: 0
            });
          } else {
            setCurrentShift(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch active shift:", error);
      }
    };

    const fetchCarTracking = async () => {
      try {
        const res = await fetch("/api/watchman/sessions");
        if (res.ok) {
          const data = await res.json();
          if (data.sessions) {
            const tracking = data.sessions
              .filter((s: any) => s.checkInTime)
              .map((s: any) => {
                const start = new Date(s.checkInTime);
                const end = s.checkOutTime ? new Date(s.checkOutTime) : (s.status === "active" || s.status === "checked_in" ? null : new Date());

                // Duration calc
                let duration = "-";
                if (start) {
                  const e = end || new Date();
                  const diff = Math.max(0, e.getTime() - start.getTime());
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  duration = `${hours}h ${minutes}m`;
                }

                return {
                  id: s.id,
                  vehiclePlate: s.vehiclePlate,
                  vehicleType: s.vehicleType,
                  timeIn: start,
                  timeOut: end,
                  duration: duration,
                  spotNumber: s.spotNumber || "General",
                  status: (s.status === "active" || s.status === "checked_in" || s.status === "overstay") ? "active" : "completed"
                };
              });
            setCarTracking(tracking);
          }
        }
      } catch (e) {
        console.error("Failed to fetch car tracking", e);
      }
    };

    if (user?.role === "WATCHMAN") {
      fetchActivities();
      fetchActiveShift();
      fetchCarTracking();
    }
  }, [user]);

  // Helper to post new activity
  const logActivity = async (type: string, details: any = {}) => {
    try {
      // Optimistic update
      const newActivity: WatchmanActivityLog = {
        id: `temp_${Date.now()}`,
        watchmanId: user?.id || "",
        watchmanName: `${user?.firstName} ${user?.lastName}`,
        type: type as any,
        timestamp: new Date(),
        details
      };
      setActivityLogs(prev => [newActivity, ...prev]);

      await fetch("/api/watchman/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details })
      });

      // Refetch to sync IDs etc
      const res = await fetch("/api/watchman/activity?limit=50");
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = [...activityLogs];

    if (activityTypeFilter !== "all") {
      filtered = filtered.filter((a) => a.type === activityTypeFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.details.vehiclePlate?.toLowerCase().includes(searchLower) ||
          a.watchmanName.toLowerCase().includes(searchLower) ||
          a.details.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });

    return filtered;
  }, [activityLogs, activityTypeFilter, search, sortOrder]);

  // Filter car tracking
  const filteredCarTracking = useMemo(() => {
    let filtered = [...carTracking];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.vehiclePlate.toLowerCase().includes(searchLower) ||
          c.spotNumber.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [carTracking, search]);

  const getActivityIcon = (type: WatchmanActivityLog["type"]) => {
    const iconMap: Record<WatchmanActivityLog["type"], React.ReactNode> = {
      shift_start: <Play className="w-4 h-4 text-green-600" />,
      shift_end: <StopCircle className="w-4 h-4 text-red-600" />,
      check_in: <CheckCircle className="w-4 h-4 text-green-600" />,
      check_out: <XCircle className="w-4 h-4 text-blue-600" />,
      booking_request: <FileText className="w-4 h-4 text-purple-600" />,
      incident: <AlertTriangle className="w-4 h-4 text-red-600" />,
      break_start: <Coffee className="w-4 h-4 text-amber-600" />,
      break_end: <Coffee className="w-4 h-4 text-green-600" />,
      patrol: <Shield className="w-4 h-4 text-blue-600" />,
    };
    return iconMap[type] || <Activity className="w-4 h-4 text-muted-foreground" />;
  };

  const getActivityLabel = (type: WatchmanActivityLog["type"]) => {
    const labelMap: Record<WatchmanActivityLog["type"], string> = {
      shift_start: "Shift Started",
      shift_end: "Shift Ended",
      check_in: "Vehicle Check-in",
      check_out: "Vehicle Check-out",
      booking_request: "Booking Request",
      incident: "Incident Report",
      break_start: "Break Started",
      break_end: "Break Ended",
      patrol: "Patrol Completed",
    };
    return labelMap[type] || type;
  };

  const getActivityBadgeColor = (type: WatchmanActivityLog["type"]) => {
    const colorMap: Record<WatchmanActivityLog["type"], string> = {
      shift_start: "bg-green-100 text-green-700",
      shift_end: "bg-red-100 text-red-700",
      check_in: "bg-emerald-100 text-emerald-700",
      check_out: "bg-blue-100 text-blue-700",
      booking_request: "bg-purple-100 text-purple-700",
      incident: "bg-red-100 text-red-700",
      break_start: "bg-amber-100 text-amber-700",
      break_end: "bg-green-100 text-green-700",
      patrol: "bg-slate-100 text-slate-700",
    };
    return colorMap[type] || "bg-slate-100 text-slate-700";
  };

  const handleStartShift = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    try {
      const res = await fetch("/api/watchman/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (res.ok) {
        const data = await res.json();
        const active = data.shift;
        if (active) {
          const newShift: WatchmanShift = {
            id: active.id,
            watchmanId: user?.id || "watch_1",
            watchmanName: `${user?.firstName || ""} ${user?.lastName || ""}`,
            parkingId: active.locationId || "park_1",
            parkingName: "Downtown Parking",
            shiftDate: new Date(),
            scheduledStart: new Date(),
            scheduledEnd: new Date(Date.now() + 8 * 3600000),
            actualStart: new Date(),
            status: "active",
            breaks: [],
            activities: [],
            totalCheckIns: 0,
            totalCheckOuts: 0,
            incidentsReported: 0,
          };
          setCurrentShift(newShift);
          setShifts((prev) => [newShift, ...prev]);

          await logActivity("shift_start", { parkingId: newShift.parkingId });

          toast.success("Shift Started: Your shift has been started successfully");
        }
      } else {
        const err = await res.json();
        toast.error("Failed to start shift: " + (err.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      toast.error("Error starting shift");
    }

    setIsStartShiftOpen(false);
    setIsLoading(false);
  };

  const handleEndShift = async () => {
    if (!currentShift) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    try {
      const res = await fetch(`/api/watchman/shifts/${currentShift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" })
      });

      if (res.ok) {
        setShifts((prev) =>
          prev.map((s) =>
            s.id === currentShift.id
              ? { ...s, status: "completed", actualEnd: new Date() }
              : s
          )
        );

        await logActivity("shift_end", { parkingId: currentShift.parkingId, location: currentShift.parkingName });

        setCurrentShift(null);
        toast.success("Shift Ended: Your shift has been completed");
      } else {
        toast.error("Failed to end shift");
      }
    } catch (e) {
      toast.error("Error ending shift");
    }

    setIsEndShiftOpen(false);
    setIsLoading(false);
  };

  const handleToggleBreak = async () => {
    if (!currentShift) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    await logActivity(isOnBreak ? "break_end" : "break_start", isOnBreak ? {} : { notes: "Break started" });

    setIsOnBreak(!isOnBreak);
    setIsLoading(false);

    const msg = isOnBreak ? "Break Ended: You are back on duty" : "Break Started: Enjoy your break";
    toast.success(msg);
  };

  // Calculate shift statistics
  const shiftDuration = currentShift?.actualStart
    ? Math.round((Date.now() - new Date(currentShift.actualStart).getTime()) / 60000)
    : 0;
  const shiftHours = Math.floor(shiftDuration / 60);
  const shiftMinutes = shiftDuration % 60;

  const todayStats = useMemo(() => {
    const todayActivities = activityLogs.filter(
      (a) => new Date(a.timestamp).toDateString() === new Date().toDateString()
    );
    return {
      checkIns: todayActivities.filter((a) => a.type === "check_in").length,
      checkOuts: todayActivities.filter((a) => a.type === "check_out").length,
      incidents: todayActivities.filter((a) => a.type === "incident").length,
      patrols: todayActivities.filter((a) => a.type === "patrol").length,
    };
  }, [activityLogs]);

  return (
    <Suspense fallback={null}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Activity Log</h1>
            <p className="text-muted-foreground mt-1">
              Track shift activities, check-ins, and parking time logs
            </p>
          </div>
          <div className="flex gap-2">
            {!currentShift ? (
              <Button onClick={() => setIsStartShiftOpen(true)}>
                <Play className="w-4 h-4 mr-2" />
                Start Shift
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="hidden sm:flex"
                  onClick={() => logActivity("patrol", { notes: "Patrol completed" }).then(() => toast.success("Patrol Logged"))}
                  disabled={isLoading}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Patrol
                </Button>
                <Button
                  variant="outline"
                  className="hidden sm:flex text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    const note = prompt("Describe the incident:");
                    if (note) {
                      logActivity("incident", { notes: note }).then(() => toast.success("Incident Reported"));
                    }
                  }}
                  disabled={isLoading}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Incident
                </Button>

                <Button
                  variant={isOnBreak ? "default" : "outline"}
                  onClick={handleToggleBreak}
                  disabled={isLoading}
                >
                  {isOnBreak ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      End Break
                    </>
                  ) : (
                    <>
                      <Coffee className="w-4 h-4 mr-2" />
                      Take Break
                    </>
                  )}
                </Button>
                <Button variant="destructive" onClick={() => setIsEndShiftOpen(true)}>
                  <StopCircle className="w-4 h-4 mr-2" />
                  End Shift
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Current Shift Status */}
        {currentShift && (
          <Card className={isOnBreak ? "border-amber-200 bg-amber-50/50" : "border-green-200 bg-green-50/50"}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnBreak ? "bg-amber-100" : "bg-green-100"}`}>
                    {isOnBreak ? (
                      <Coffee className="w-6 h-6 text-amber-600" />
                    ) : (
                      <Activity className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">Current Shift</p>
                      <Badge className={isOnBreak ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                        {isOnBreak ? "On Break" : "Active"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Started at {formatTime(currentShift.actualStart!)} - {currentShift.parkingName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{shiftHours}h {shiftMinutes}m</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{todayStats.checkIns}</p>
                    <p className="text-xs text-muted-foreground">Check-ins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{todayStats.checkOuts}</p>
                    <p className="text-xs text-muted-foreground">Check-outs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-ins</p>
                  <p className="text-2xl font-bold text-green-600">{todayStats.checkIns}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-outs</p>
                  <p className="text-2xl font-bold text-blue-600">{todayStats.checkOuts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Incidents</p>
                  <p className="text-2xl font-bold text-red-600">{todayStats.incidents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patrols</p>
                  <p className="text-2xl font-bold text-slate-600">{todayStats.patrols}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="activity" className="flex-1 sm:flex-none">
              <Activity className="w-4 h-4 mr-2" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="time" className="flex-1 sm:flex-none">
              <Timer className="w-4 h-4 mr-2" />
              Car Time Tracking
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 mr-2" />
              Shift History
            </TabsTrigger>
          </TabsList>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">Activity Timeline</CardTitle>
                    <CardDescription>All activities performed during shifts</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activities</SelectItem>
                        <SelectItem value="check_in">Check-ins</SelectItem>
                        <SelectItem value="check_out">Check-outs</SelectItem>
                        <SelectItem value="incident">Incidents</SelectItem>
                        <SelectItem value="patrol">Patrols</SelectItem>
                        <SelectItem value="break_start">Breaks</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-full sm:w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No activities found</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

                      {filteredActivities.map((activity, index) => (
                        <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
                          {/* Timeline dot */}
                          <div className="relative z-10 w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center shrink-0">
                            {getActivityIcon(activity.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={getActivityBadgeColor(activity.type)}>
                                  {getActivityLabel(activity.type)}
                                </Badge>
                                {activity.details.vehiclePlate && (
                                  <span className="text-sm font-medium text-foreground">
                                    {activity.details.vehiclePlate}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatTime(activity.timestamp)}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {activity.details.spotNumber && (
                                <span className="mr-3">
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  Spot {activity.details.spotNumber}
                                </span>
                              )}
                              {activity.details.location && (
                                <span className="mr-3">
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  {activity.details.location}
                                </span>
                              )}
                              {activity.details.bookingId && (
                                <span>
                                  <FileText className="w-3 h-3 inline mr-1" />
                                  #{activity.details.bookingId.slice(-6)}
                                </span>
                              )}
                            </div>
                            {activity.details.notes && (
                              <p className="mt-1 text-sm italic text-muted-foreground">
                                &quot;{activity.details.notes}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Car Time Tracking Tab */}
          <TabsContent value="time" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Vehicle Time In/Out Log</CardTitle>
                    <CardDescription>Track parking duration for each vehicle</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search plate or spot..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 w-full sm:w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Spot</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCarTracking.map((car) => (
                        <TableRow key={car.id}>
                          <TableCell className="font-medium">{car.vehiclePlate}</TableCell>
                          <TableCell className="capitalize">{car.vehicleType}</TableCell>
                          <TableCell>{car.spotNumber}</TableCell>
                          <TableCell>{formatTime(car.timeIn)}</TableCell>
                          <TableCell>{car.timeOut ? formatTime(car.timeOut) : "-"}</TableCell>
                          <TableCell className="font-medium">{car.duration}</TableCell>
                          <TableCell>
                            <StatusBadge
                              status={car.status === "active" ? "Active" : "Completed"}
                              variant={car.status === "active" ? "success" : "info"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredCarTracking.map((car) => (
                    <div key={car.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Car className="w-5 h-5 text-muted-foreground" />
                          <span className="font-bold">{car.vehiclePlate}</span>
                        </div>
                        <StatusBadge
                          status={car.status === "active" ? "Active" : "Completed"}
                          variant={car.status === "active" ? "success" : "info"}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Spot</p>
                          <p className="font-medium">{car.spotNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium capitalize">{car.vehicleType}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time In</p>
                          <p className="font-medium">{formatTime(car.timeIn)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time Out</p>
                          <p className="font-medium">{car.timeOut ? formatTime(car.timeOut) : "-"}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-bold text-lg">{car.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift History Tab */}
          <TabsContent value="shifts" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Shift History</CardTitle>
                    <CardDescription>View past and scheduled shifts</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;

                      const html = `
                          <html>
                            <head>
                              <title>Shift Report</title>
                              <style>
                                body { font-family: sans-serif; padding: 20px; color: #333; }
                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                th { background-color: #f8f9fa; font-weight: bold; }
                                tr:nth-child(even) { background-color: #f9f9f9; }
                                h1 { margin-bottom: 0.5rem; }
                                .header { margin-bottom: 2rem; border-bottom: 2px solid #eee; padding-bottom: 1rem; }
                                .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 2rem; }
                                .timestamp { color: #666; font-size: 0.9em; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>Shift Activity Report</h1>
                                <p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>
                              </div>

                              <table>
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Location</th>
                                    <th>Shift Time</th>
                                    <th>Actual Time</th>
                                    <th>Activities</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${shifts.map(s => `
                                    <tr>
                                      <td>${new Date(s.shiftDate).toLocaleDateString()}</td>
                                      <td><strong>${s.status.toUpperCase()}</strong></td>
                                      <td>${s.parkingName}</td>
                                      <td>
                                        ${new Date(s.scheduledStart).toLocaleTimeString()} - 
                                        ${new Date(s.scheduledEnd).toLocaleTimeString()}
                                      </td>
                                      <td>
                                        ${s.actualStart ? new Date(s.actualStart).toLocaleTimeString() : "-"} - 
                                        ${s.actualEnd ? new Date(s.actualEnd).toLocaleTimeString() : "ongoing"}
                                      </td>
                                      <td>
                                        Check-ins: ${s.totalCheckIns}<br>
                                        Check-outs: ${s.totalCheckOuts}<br>
                                        Incidents: ${s.incidentsReported}
                                      </td>
                                    </tr>
                                  `).join('')}
                                </tbody>
                              </table>
                              <script>
                                window.onload = () => { setTimeout(() => window.print(), 500); };
                              </script>
                            </body>
                          </html>
                        `;

                      printWindow.document.write(html);
                      printWindow.document.close();
                    }}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" onClick={() => {
                      const headers = ["Date", "Status", "Location", "Scheduled Start", "Scheduled End", "Actual Start", "Actual End", "Check-ins", "Check-outs", "Incidents"];
                      const rows = shifts.map(s => [
                        new Date(s.shiftDate).toLocaleDateString(),
                        s.status,
                        s.parkingName,
                        new Date(s.scheduledStart).toLocaleTimeString(),
                        new Date(s.scheduledEnd).toLocaleTimeString(),
                        s.actualStart ? new Date(s.actualStart).toLocaleTimeString() : "-",
                        s.actualEnd ? new Date(s.actualEnd).toLocaleTimeString() : "-",
                        s.totalCheckIns,
                        s.totalCheckOuts,
                        s.incidentsReported
                      ]);

                      const csvContent = "data:text/csv;charset=utf-8,"
                        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "shift_report.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={`p-4 border rounded-lg ${shift.status === "active"
                        ? "border-green-200 bg-green-50/50"
                        : shift.status === "missed"
                          ? "border-red-200 bg-red-50/50"
                          : ""
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${shift.status === "active"
                              ? "bg-green-100"
                              : shift.status === "completed"
                                ? "bg-blue-100"
                                : shift.status === "missed"
                                  ? "bg-red-100"
                                  : "bg-slate-100"
                              }`}
                          >
                            <Calendar
                              className={`w-6 h-6 ${shift.status === "active"
                                ? "text-green-600"
                                : shift.status === "completed"
                                  ? "text-blue-600"
                                  : shift.status === "missed"
                                    ? "text-red-600"
                                    : "text-slate-600"
                                }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground">{formatDate(shift.shiftDate)}</p>
                              <Badge
                                className={
                                  shift.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : shift.status === "completed"
                                      ? "bg-blue-100 text-blue-700"
                                      : shift.status === "missed"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-slate-100 text-slate-700"
                                }
                              >
                                {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {shift.parkingName}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>
                                Scheduled: {formatTime(shift.scheduledStart)} - {formatTime(shift.scheduledEnd)}
                              </span>
                              {shift.actualStart && (
                                <span>
                                  Actual: {formatTime(shift.actualStart)}
                                  {shift.actualEnd ? ` - ${formatTime(shift.actualEnd)}` : " - ongoing"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{shift.totalCheckIns}</p>
                            <p className="text-xs text-muted-foreground">Check-ins</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{shift.totalCheckOuts}</p>
                            <p className="text-xs text-muted-foreground">Check-outs</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-red-600">{shift.incidentsReported}</p>
                            <p className="text-xs text-muted-foreground">Incidents</p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Start Shift Dialog */}
        <Dialog open={isStartShiftOpen} onOpenChange={setIsStartShiftOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Shift</DialogTitle>
              <DialogDescription>
                Begin your shift at the assigned location
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Downtown Parking</p>
                    <p className="text-sm text-muted-foreground">123 Main Street</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Scheduled: 8:00 AM - 4:00 PM</p>
                  <p className="text-sm text-muted-foreground">8 hour shift</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStartShiftOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartShift} disabled={isLoading}>
                {isLoading ? "Starting..." : "Start Shift"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* End Shift Dialog */}
        <Dialog open={isEndShiftOpen} onOpenChange={setIsEndShiftOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>End Shift</DialogTitle>
              <DialogDescription>
                Are you sure you want to end your shift?
              </DialogDescription>
            </DialogHeader>
            {currentShift && (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{shiftHours}h {shiftMinutes}m</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{todayStats.checkIns}</p>
                    <p className="text-xs text-muted-foreground">Check-ins</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{todayStats.checkOuts}</p>
                    <p className="text-xs text-muted-foreground">Check-outs</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEndShiftOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleEndShift} disabled={isLoading}>
                {isLoading ? "Ending..." : "End Shift"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
