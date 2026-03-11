import { useEffect, useState } from "react";
import { getSpotsForLocation } from "@/lib/actions/spot-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Car,
  User,
  Clock,
  RefreshCw,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  ChevronRight,
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
import { format, isSameDay } from "date-fns";

interface SpotOccupancyViewProps {
  locationId: string;
}

export function SpotOccupancyView({ locationId }: SpotOccupancyViewProps) {
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [date, setDate] = useState<Date>(new Date());

  const fetchSpots = async (selectedDate: Date) => {
    setLoading(true);
    const result = await getSpotsForLocation(locationId, selectedDate);
    if (result.success) {
      setSpots(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSpots(date);
  }, [locationId, date]);

  const filteredSpots = spots.filter(spot =>
    spot.identifier.toLowerCase().includes(search.toLowerCase()) ||
    (spot.currentBooking?.guestFirstName?.toLowerCase().includes(search.toLowerCase())) ||
    (spot.currentBooking?.guestLastName?.toLowerCase().includes(search.toLowerCase())) ||
    (spot.upcomingBooking?.guestFirstName?.toLowerCase().includes(search.toLowerCase())) ||
    (spot.upcomingBooking?.guestLastName?.toLowerCase().includes(search.toLowerCase()))
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

        <div className="flex items-end gap-2 w-full lg:w-auto">
          <div className="flex flex-col flex-1 lg:w-64">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1">Search</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search spots, guests..."
                className="pl-8 bg-background h-10"
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
                <LayoutGrid className="h-4 w-4" />
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

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchSpots(date)}
            disabled={loading}
            className="h-10 w-10 bg-background self-end"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
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

      {loading && spots.length === 0 ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredSpots.map((spot) => (
            <Card
              key={spot.id}
              className={cn(
                "group transition-all duration-300 relative overflow-hidden",
                spot.isOccupied
                  ? "border-blue-200 bg-blue-50/20 shadow-sm ring-1 ring-blue-100/50"
                  : "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <CardContent className="p-0">
                <div className="p-4 flex flex-col items-center">
                  <span className="text-2xl font-black text-foreground mb-1 group-hover:scale-110 transition-transform">
                    {spot.identifier}
                  </span>

                  {spot.isOccupied ? (
                    <div className="w-full mt-2 pt-3 border-t border-blue-100 flex flex-col items-center gap-2">
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
                    <div className="w-full mt-2 pt-3 border-t flex flex-col items-center gap-2">
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
                            <span className="opacity-60 italic">
                              Until {format(new Date(spot.upcomingBooking.checkOut), "h:mm aa")}
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
                  <td className="py-4 px-6">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-black group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {spot.identifier}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {spot.isOccupied ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold px-2 py-0 h-6 text-[10px] uppercase">
                        Occupied
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold px-2 py-0 h-6 text-[10px] uppercase",
                          spot.status === 'ACTIVE' ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        {spot.status === 'ACTIVE' ? 'Available' : 'Retired'}
                      </Badge>
                    )}
                  </td>
                  <td className="py-4 px-6">
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
                  </td>
                  <td className="py-4 px-6 text-right">
                    {spot.isOccupied && (
                      <Badge variant="secondary" className="bg-blue-100/50 text-blue-800 text-[9px] font-bold px-2 py-0 h-4">
                        {spot.currentBooking.status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
