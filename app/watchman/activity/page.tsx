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
import { Calendar, Car, Clock, CheckCircle, XCircle, Search, Play, Pause, StopCircle, AlertTriangle, Timer, MapPin, User, Activity, FileText, Download, Filter, ArrowUpDown, Coffee, Shield, Eye } from "lucide-react";
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
  const { toast } = useToast();
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

  const [activityLogs, setActivityLogs] = useState(mockActivityLogs);
  const [shifts, setShifts] = useState(mockShifts);
  const [carTracking, setCarTracking] = useState(mockCarTimeTracking);

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

    const newShift: WatchmanShift = {
      id: `shift_${Date.now()}`,
      watchmanId: user?.id || "watch_1",
      watchmanName: `${user?.firstName || "John"} ${user?.lastName || "Doe"}`,
      parkingId: "park_1",
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

    const newActivity: WatchmanActivityLog = {
      id: `act_${Date.now()}`,
      watchmanId: user?.id || "watch_1",
      watchmanName: newShift.watchmanName,
      type: "shift_start",
      timestamp: new Date(),
      details: { parkingId: "park_1", location: "Downtown Parking" },
    };
    setActivityLogs((prev) => [newActivity, ...prev]);

    setIsStartShiftOpen(false);
    setIsLoading(false);

    toast.success("Shift Started", {
      description: "Your shift has been started successfully",
    });
  };

  const handleEndShift = async () => {
    if (!currentShift) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    setShifts((prev) =>
      prev.map((s) =>
        s.id === currentShift.id
          ? { ...s, status: "completed", actualEnd: new Date() }
          : s
      )
    );

    const newActivity: WatchmanActivityLog = {
      id: `act_${Date.now()}`,
      watchmanId: user?.id || "watch_1",
      watchmanName: currentShift.watchmanName,
      type: "shift_end",
      timestamp: new Date(),
      details: { parkingId: currentShift.parkingId, location: currentShift.parkingName },
    };
    setActivityLogs((prev) => [newActivity, ...prev]);

    setCurrentShift(null);
    setIsEndShiftOpen(false);
    setIsLoading(false);

    toast.success("Shift Ended", {
      description: "Your shift has been completed",
    });
  };

  const handleToggleBreak = async () => {
    if (!currentShift) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    const newActivity: WatchmanActivityLog = {
      id: `act_${Date.now()}`,
      watchmanId: user?.id || "watch_1",
      watchmanName: currentShift.watchmanName,
      type: isOnBreak ? "break_end" : "break_start",
      timestamp: new Date(),
      details: isOnBreak ? {} : { notes: "Break started" },
    };
    setActivityLogs((prev) => [newActivity, ...prev]);

    setIsOnBreak(!isOnBreak);
    setIsLoading(false);

    toast.success(isOnBreak ? "Break Ended" : "Break Started", {
      description: isOnBreak ? "You are back on duty" : "Enjoy your break",
    });
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
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={`p-4 border rounded-lg ${
                        shift.status === "active"
                          ? "border-green-200 bg-green-50/50"
                          : shift.status === "missed"
                          ? "border-red-200 bg-red-50/50"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              shift.status === "active"
                                ? "bg-green-100"
                                : shift.status === "completed"
                                ? "bg-blue-100"
                                : shift.status === "missed"
                                ? "bg-red-100"
                                : "bg-slate-100"
                            }`}
                          >
                            <Calendar
                              className={`w-6 h-6 ${
                                shift.status === "active"
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
