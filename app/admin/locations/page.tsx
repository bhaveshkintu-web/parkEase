"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Power,
  Wrench,
  Loader2,
  MapPin,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AdminParkingLocation } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function AdminLocationsPage() {
  const { adminLocations, deleteLocation, setLocationStatus } = useDataStore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const filteredLocations = adminLocations.filter((location) => {
    const matchesSearch =
      location.name.toLowerCase().includes(search.toLowerCase()) ||
      location.airport.toLowerCase().includes(search.toLowerCase()) ||
      location.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || location.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    await deleteLocation(deleteId);
    setIsDeleting(false);
    setDeleteId(null);
    toast({
      title: "Location deleted",
      description: "The location has been removed.",
    });
  };

  const handleStatusChange = async (id: string, status: AdminParkingLocation["status"]) => {
    setUpdatingStatus(id);
    await setLocationStatus(id, status);
    setUpdatingStatus(null);
    toast({
      title: "Status updated",
      description: `Location is now ${status}.`,
    });
  };

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
                <SelectItem value="maintenance">Maintenance</SelectItem>
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
                <TableHead>Airport</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
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
                filteredLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          <img
                            src={location.images[0] || "/placeholder.svg"}
                            alt={location.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{location.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {location.address}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{location.airportCode}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(location.pricePerDay)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>{location.rating.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{location.analytics.totalBookings}</TableCell>
                    <TableCell>{formatCurrency(location.analytics.revenue)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          location.status === "active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : location.status === "maintenance"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {updatingStatus === location.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          location.status
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/parking/${location.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Public Page
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/locations/${location.id}`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {location.status !== "active" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(location.id, "active")}>
                              <Power className="w-4 h-4 mr-2" />
                              Set Active
                            </DropdownMenuItem>
                          )}
                          {location.status !== "maintenance" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(location.id, "maintenance")}>
                              <Wrench className="w-4 h-4 mr-2" />
                              Set Maintenance
                            </DropdownMenuItem>
                          )}
                          {location.status !== "inactive" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(location.id, "inactive")}>
                              <Power className="w-4 h-4 mr-2" />
                              Set Inactive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(location.id)}
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
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this location? This will also remove all associated
              bookings and reviews. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Loading = () => null;
