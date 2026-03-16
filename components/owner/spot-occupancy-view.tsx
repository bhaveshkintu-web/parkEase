import { useEffect, useState } from "react";
import { getSpotsForLocation, toggleSpotStatus } from "@/lib/actions/spot-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Calendar as CalendarIcon,
  Grid,
  List,
  Car,
  Clock,
  ChevronRight,
  User,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatTime } from "@/lib/data";
import { cn } from "@/lib/utils";
import { format, isSameDay, isWithinInterval } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SpotOccupancyViewProps {
  locationId: string;
}

export function SpotOccupancyView({ locationId }: SpotOccupancyViewProps) {
  const [spots, setSpots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [date, setDate] = useState<Date>(new Date());

  const fetchSpots = async (selectedDate: Date = date) => {
    setIsLoading(true);
    const result = await getSpotsForLocation(locationId, selectedDate);
    if (result.success) {
      setSpots(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSpots(date);
  }, [locationId, date]);

  const handleToggleStatus = async (spotId: string, currentStatus: string) => {
    setTogglingId(spotId);
    try {
      const result = await toggleSpotStatus(spotId, currentStatus);
      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Spot status changed to ${result.status}`,
        });
        fetchSpots();
      } else {
        throw new Error(result.error || "Failed to toggle status");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const filteredSpots = spots.filter(spot =>
    spot.identifier.toLowerCase().includes(search.toLowerCase()) ||
    (spot.currentBooking?.guestFirstName?.toLowerCase().includes(search.toLowerCase())) ||
    (spot.currentBooking?.guestLastName?.toLowerCase().includes(search.toLowerCase())) ||
    (spot.upcomingBooking?.guestFirstName?.toLowerCase().includes(search.toLowerCase())) ||
    (spot.upcomingBooking?.guestLastName?.toLowerCase().includes(search.toLowerCase())) ||
    (spot.allDailyBookings?.some((b: any) =>
      b.guestFirstName.toLowerCase().includes(search.toLowerCase()) ||
      b.guestLastName.toLowerCase().includes(search.toLowerCase())
    ))
  );

  const occupiedCount = spots.filter(s => s.isOccupied).length;
  const availableCount = spots.length - occupiedCount;
  const occupancyRate = spots.length > 0 ? Math.round((occupiedCount / spots.length) * 100) : 0;

  const isToday = isSameDay(date, new Date());

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center bg-muted/20 p-4 rounded-xl border border-dashed">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1">View Occupancy For</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal bg-background h-10",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="h-10 w-[1px] bg-border mx-2 hidden md:block" />

          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1">Stats</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-background text-green-700 border-green-200 h-7">
                  {availableCount} Available
                </Badge>
                <Badge variant="outline" className="bg-background text-blue-700 border-blue-200 h-7">
                  {occupiedCount} Occupied
                </Badge>
                <Badge variant="secondary" className="bg-primary/5 text-primary border-none h-7 hidden sm:flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {occupancyRate}% Full
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto justify-end">
          <div className="flex flex-col flex-1 min-w-[200px] lg:w-64">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search spots, guests..."
                className="pl-9 bg-background h-10 border-muted-foreground/20 focus-visible:ring-primary/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1">View</span>
            <div className="flex border rounded-md overflow-hidden bg-background h-10">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none h-full w-10"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none h-full w-10"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1 opacity-0 pointer-events-none select-none">Action</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchSpots(date)}
              disabled={isLoading}
              className="h-10 w-10 bg-background hover:bg-muted/50 transition-colors border-muted-foreground/20 shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Date Context Warning */}
      {!isToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-amber-800 text-sm animate-in fade-in slide-in-from-top-2">
          <CalendarIcon className="h-4 w-4 text-amber-600" />
          <span>Viewing projected occupancy for <strong>{format(date, "MMMM d, yyyy")}</strong>. Guest presence is based on scheduled check-ins/outs.</span>
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())} className="ml-auto text-amber-900 hover:bg-amber-100 h-7 text-xs font-bold">
            Back to Today
          </Button>
        </div>
      )}

      {isLoading && spots.length === 0 ? (
        <div className="flex items-center justify-center p-24">
          <RefreshCw className="h-10 w-10 animate-spin text-primary opacity-50" />
        </div>
      ) : filteredSpots.length === 0 ? (
        <Card className="border-dashed bg-muted/5">
          <CardContent className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Car className="h-12 w-12 opacity-20" />
            </div>
            <p className="font-medium">No results found</p>
            <p className="text-xs max-w-[240px] mt-1">Try adjusting your search criteria or choosing a different date.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSpots.map((spot) => (
            <SpotScheduleDialog key={spot.id} spot={spot} date={date} togglingId={togglingId} handleToggleStatus={handleToggleStatus}>
              <Card
                className={cn(
                  "group transition-all duration-300 relative cursor-pointer h-full",
                  spot.isOccupied
                    ? "border-blue-200 bg-blue-50/20 shadow-sm ring-1 ring-blue-100/50"
                    : "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                  spot.allDailyBookings?.length > 1 && "border-amber-200 bg-amber-50/10",
                  spot.status === 'INACTIVE' && "opacity-60 grayscale-[0.5]"
                )}
              >
                {/* Management Header Bar */}
                <div className="flex items-start justify-between px-2 pt-1.5 pb-0 z-30 gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    {spot.allDailyBookings?.length > 1 && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[8px] h-4 border-amber-200 whitespace-nowrap">
                        {spot.allDailyBookings.length} Bookings
                      </Badge>
                    )}
                    {spot.isOccupied && (
                      <Badge variant="secondary" className="bg-blue-100/50 text-blue-800 text-[8px] h-4 font-bold border-blue-200/50 whitespace-nowrap">
                        {spot.currentBooking.status}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end group/toggle relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="opacity-0 group-hover/toggle:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold uppercase pointer-events-none border border-border/50 shadow-md text-foreground absolute top-full mt-2 right-0 z-50 whitespace-nowrap">
                      {spot.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </div>
                    <Switch
                      checked={spot.status === 'INACTIVE'}
                      onCheckedChange={() => handleToggleStatus(spot.id, spot.status)}
                      disabled={togglingId === spot.id}
                      className="scale-75 h-4 w-7 data-[state=checked]:bg-destructive"
                    />
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="px-4 py-1.5 flex flex-col items-center">
                    <span className="text-2xl font-bold text-foreground mb-0 group-hover:scale-105 transition-transform">
                      {spot.identifier}
                    </span>

                    {spot.isOccupied ? (
                      <div className="w-full mt-1.5 pt-2 border-t border-blue-100 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-[10px] font-black text-blue-800 rounded-full uppercase tracking-tighter">
                          <Car className="h-3 w-3" />
                          Occupied
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground truncate max-w-full">
                            {spot.currentBooking.guestFirstName} {spot.currentBooking.guestLastName}
                          </p>
                          <div className="flex items-center justify-center gap-1 text-[9px] font-medium text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>Depart: {formatTime(new Date(spot.currentBooking.checkOut))}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full mt-1.5 pt-2 border-t flex flex-col items-center gap-2">
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-tighter",
                          spot.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {spot.status === 'ACTIVE' ? 'Available' : 'Retired'}
                        </div>

                        {spot.upcomingBooking ? (
                          <div className="bg-muted/30 rounded-md p-1.5 w-full group-hover:bg-primary/5 transition-colors border border-dashed border-primary/10">
                            <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-primary/70 uppercase">
                              <ChevronRight className="h-3 w-3" />
                              Next Customer
                            </div>
                            <p className="text-[11px] font-black text-center truncate px-1">
                              {spot.upcomingBooking.guestFirstName}
                            </p>
                            <div className="text-[8px] text-center text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                              <span className="font-medium text-foreground/70">
                                Arriving at {format(new Date(spot.upcomingBooking.checkIn), "h:mm aa")}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[9px] text-muted-foreground italic">No upcoming bookings</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SpotScheduleDialog>
          ))}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground w-20">Spot</th>
                <th className="text-left py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</th>
                <th className="text-left py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Current Occupant</th>
                <th className="text-left py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSpots.map((spot) => (
                <tr key={spot.id} className="group hover:bg-muted/30 transition-colors">
                  <Dialog>
                    <td className="py-4 px-6">
                      <DialogTrigger asChild>
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold group-hover:bg-primary/10 group-hover:text-primary transition-colors cursor-pointer">
                          {spot.identifier}
                        </div>
                      </DialogTrigger>
                    </td>
                    <td className="py-4 px-6">
                      <DialogTrigger asChild>
                        <div className="cursor-pointer h-full w-full">
                          {spot.isOccupied ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold px-2 py-0 h-6 text-[10px] uppercase w-fit">
                                Occupied
                              </Badge>
                              {spot.allDailyBookings?.length > 1 && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold px-2 py-0 h-5 text-[9px] uppercase w-fit">
                                  +{spot.allDailyBookings.length - 1} more today
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-bold px-2 py-0 h-6 text-[10px] uppercase w-fit",
                                  spot.status === 'ACTIVE' ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"
                                )}
                              >
                                {spot.status === 'ACTIVE' ? 'Available' : 'Retired'}
                              </Badge>
                              {spot.allDailyBookings?.length > 1 && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold px-2 py-0 h-5 text-[9px] uppercase w-fit">
                                  {spot.allDailyBookings.length} Today
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </DialogTrigger>
                    </td>
                    <td className="py-4 px-6">
                      <DialogTrigger asChild>
                        <div className="cursor-pointer h-full w-full">
                          {spot.isOccupied ? (
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-1.5 rounded-full">
                                <User className="h-3 w-3 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground leading-tight">
                                  {spot.currentBooking.guestFirstName} {spot.currentBooking.guestLastName}
                                </p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  Until {formatTime(new Date(spot.currentBooking.checkOut))}
                                </p>
                              </div>
                            </div>
                          ) : spot.upcomingBooking ? (
                            <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                              <div className="bg-muted p-1.5 rounded-full">
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground leading-tight">
                                  Next: {spot.upcomingBooking.guestFirstName}
                                </p>
                                <p className="text-[10px] text-muted-foreground flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-2.5 w-2.5" />
                                    Arriving at {format(new Date(spot.upcomingBooking.checkIn), "h:mm aa")}
                                  </span>
                                  <span className="ml-3.5 opacity-60">
                                    (stays until {format(new Date(spot.upcomingBooking.checkOut), "h:mm aa")})
                                  </span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Clear for today</span>
                          )}
                        </div>
                      </DialogTrigger>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {spot.isOccupied && (
                          <Badge variant="secondary" className="bg-blue-100/50 text-blue-800 text-[9px] font-bold px-2 py-0 h-4">
                            {spot.currentBooking.status}
                          </Badge>
                        )}
                        <div className="group/toggle-list relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                          <div className="absolute top-full mt-1 opacity-0 group-hover/toggle-list:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold uppercase pointer-events-none border border-border/50 shadow-md text-foreground whitespace-nowrap z-50 left-1/2 -translate-x-1/2">
                            {spot.status === 'ACTIVE' ? 'Deactivate Spot' : 'Activate Spot'}
                          </div>
                          <Switch
                            checked={spot.status === 'INACTIVE'}
                            onCheckedChange={() => handleToggleStatus(spot.id, spot.status)}
                            disabled={togglingId === spot.id}
                            className="scale-75 data-[state=checked]:bg-destructive"
                          />
                        </div>
                      </div>
                    </td>
                    <SpotScheduleDialogContent spot={spot} date={date} />
                  </Dialog>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const SpotScheduleDialog = ({ spot, date, togglingId, handleToggleStatus, children }: any) => (
  <div className="relative group/spot">
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <SpotScheduleDialogContent spot={spot} date={date} />
    </Dialog>
  </div>
);

const SpotScheduleDialogContent = ({ spot, date }: any) => {
  const isToday = isSameDay(date, new Date());
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Spot {spot.identifier} Schedule
          <Badge variant="outline" className="ml-2 font-normal">
            {format(date, "MMM dd, yyyy")}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          All scheduled bookings for this spot on the selected date.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        {spot.allDailyBookings?.length > 0 ? (
          <div className="relative border-l-2 border-primary/20 ml-2 pl-6 space-y-6 py-2">
            {spot.allDailyBookings.map((booking: any) => {
              const isCurrent = spot.currentBooking?.id === booking.id;
              const isActiveNow = isCurrent && isToday && isWithinInterval(new Date(), { 
                start: new Date(booking.checkIn), 
                end: new Date(booking.checkOut) 
              });
              
              return (
                <div key={booking.id} className="relative">
                  <div className={cn(
                    "absolute -left-[33px] top-1 h-3 w-3 rounded-full border-2 border-background",
                    isActiveNow ? "bg-primary scale-125" : "bg-muted-foreground/30"
                  )} />
                  <div className={cn(
                    "p-3 rounded-lg border",
                    isActiveNow ? "bg-primary/5 border-primary/20" : "bg-card shadow-sm"
                  )}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm">
                          {booking.guestFirstName} {booking.guestLastName}
                        </p>
                        {isActiveNow && (
                          <Badge className="text-[8px] h-4 py-0 bg-emerald-500 text-white border-none">Active Now</Badge>
                        )}
                      </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 opacity-70" />
                        <span>{formatTime(new Date(booking.checkIn))} - {formatTime(new Date(booking.checkOut))}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold opacity-60">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground italic">
            No bookings scheduled for this date.
          </div>
        )}
      </div>
    </DialogContent>
  );
};
