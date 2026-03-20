"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MapPin,
  Star,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";
import {
  updateLocationStatus,
  deleteLocation as removeLocation
} from "@/lib/actions/parking-actions";
import { useToast } from "@/hooks/use-toast";

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
  pricePerDay: number;
  rating: number;
  reviewCount: number;
  airportCode: string | null;
  owner: {
    businessName: string;
    user: {
      email: string;
    };
  };
  _count: {
    bookings: number;
    reviews: number;
  };
}

export default function AdminLocationsPage() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not load locations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleStatusUpdate = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await updateLocationStatus(id, newStatus);
    if (result.success) {
      toast({ title: `Location ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}` });
      fetchLocations();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleMaintenance = async (id: string) => {
    const result = await updateLocationStatus(id, "MAINTENANCE");
    if (result.success) {
      toast({ title: "Location set to maintenance" });
      fetchLocations();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this location?")) {
      const result = await removeLocation(id);
      if (result.success) {
        toast({ title: "Location deleted" });
        fetchLocations();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    }
  };

  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.name.toLowerCase().includes(search.toLowerCase()) ||
      location.city.toLowerCase().includes(search.toLowerCase()) ||
      location.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || location.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLocations.length / ITEMS_PER_PAGE);
  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <p className="text-muted-foreground">Manage parking locations</p>
        </div>
        <Link href="/admin/locations/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Locations table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Airport</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No locations found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLocations.map((location) => (
                  <TableRow key={location.id} className="group">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{location.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {location.address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{location.owner?.businessName}</p>
                        <p className="text-xs text-muted-foreground">{location.owner?.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {location.airportCode ? (
                        <Badge variant="outline">{location.airportCode}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(location.pricePerDay)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>{(location.rating || 0).toFixed(1)}</span>
                        <span className="text-muted-foreground text-xs">({location.reviewCount || 0})</span>
                      </div>
                    </TableCell>
                    <TableCell>{location._count?.bookings || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          location.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : location.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : location.status === "MAINTENANCE"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-muted text-muted-foreground"
                        }
                      >
                        {location.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/locations/${location.id}`} className="flex items-center">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(location.id, location.status)}
                            disabled={location.status === "PENDING"}
                          >
                            {location.status === "ACTIVE" ? (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleRight className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMaintenance(location.id)}
                            disabled={location.status === "MAINTENANCE"}
                          >
                            <Wrench className="w-4 h-4 mr-2" />
                            Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(location.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredLocations.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
