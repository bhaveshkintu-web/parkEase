"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getOwnerLocations,
  updateLocationStatus,
  deleteLocation as removeLocation
} from "@/lib/actions/parking-actions";
import { formatCurrency } from "@/lib/data";
import { DataTable, StatusBadge, type Column, type Action } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { AdminParkingLocation } from "@/lib/types";
import {
  Plus,
  MapPin,
  Star,
  Car,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Wrench,
  Search,
  Filter,
} from "lucide-react";

export default function OwnerLocationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<AdminParkingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    revenue: 0
  });

  const fetchLocations = async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await getOwnerLocations(user.id);
    if (result.success) {
      const data = result.data as unknown as AdminParkingLocation[];
      setLocations(data);
      
      // Calculate stats
      setCounts({
        total: data.length,
        active: data.filter(l => l.status === "ACTIVE").length,
        maintenance: data.filter(l => l.status === "MAINTENANCE").length,
        revenue: data.reduce((sum, l) => sum + (l.analytics?.revenue || 0), 0)
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to fetch locations",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLocations();
  }, [user]);

  // Filter logic
  const filteredLocations = locations.filter((location) => {
    // 1. Search Filter
    const matchesSearch = searchQuery === "" || 
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Status Filter
    const matchesStatus = statusFilter === "all" || 
      location.status === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const columns: Column<AdminParkingLocation>[] = [
    {
      key: "name",
      header: "Location",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{item.airport}</p>
          </div>
        </div>
      ),
    },
    {
      key: "pricePerDay",
      header: "Price/Day",
      sortable: true,
      hideOnMobile: true,
      render: (item) => (
        <span className="font-medium">{formatCurrency(item.pricePerDay)}</span>
      ),
    },
    {
      key: "availableSpots",
      header: "Availability",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-muted-foreground" />
          <span>
            {item.availableSpots}/{item.totalSpots}
          </span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      hideOnMobile: true,
      render: (item) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>{(item.rating || 0).toFixed(1)}</span>
          <span className="text-muted-foreground text-xs">({item.reviewCount || 0})</span>
        </div>
      ),
    },
    {
      key: "analytics.revenue",
      header: "Revenue",
      sortable: true,
      hideOnMobile: true,
      render: (item) => (
        <span className="font-medium text-green-600">
          {formatCurrency(item.analytics?.revenue || 0)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge
          status={item.status}
          variant={
            item.status === "ACTIVE"
              ? "success"
              : item.status === "MAINTENANCE"
                ? "warning"
                : item.status === "PENDING"
                  ? "info"
                  : "default"
          }
        />
      ),
    },
  ];

  const getActions = (item: AdminParkingLocation): Action<AdminParkingLocation>[] => [
    {
      label: "View",
      icon: <Eye className="w-4 h-4 mr-2" />,
      onClick: (item) => router.push(`/owner/locations/${item.id}`),
    },
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4 mr-2" />,
      onClick: (item) => router.push(`/owner/locations/${item.id}/edit`),
    },
    {
      label: item.status === "ACTIVE" ? "Deactivate" : (item.status === "PENDING" ? "Awaiting Approval" : "Activate"),
      icon: item.status === "ACTIVE" ? (
        <ToggleLeft className="w-4 h-4 mr-2" />
      ) : (
        <ToggleRight className="w-4 h-4 mr-2" />
      ),
      disabled: item.status === "PENDING",
      onClick: async (item) => {
        const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const result = await updateLocationStatus(item.id, newStatus);
        if (result.success) {
          toast({ title: `Location ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}` });
          fetchLocations();
        } else {
          toast({ title: "Error", description: result.error, variant: "destructive" });
        }
      },
    },
    {
      label: "Maintenance",
      icon: <Wrench className="w-4 h-4 mr-2" />,
      // Show only if not already in maintenance
      disabled: item.status === "MAINTENANCE",
      onClick: async (item) => {
        if (item.status === "MAINTENANCE") return;

        const result = await updateLocationStatus(item.id, "MAINTENANCE");
        if (result.success) {
          toast({ title: "Location set to maintenance" });
          fetchLocations();
        } else {
          toast({ title: "Error", description: result.error, variant: "destructive" });
        }
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4 mr-2" />,
      onClick: async (item) => {
        if (confirm("Are you sure you want to delete this location?")) {
          const result = await removeLocation(item.id);
          if (result.success) {
            toast({ title: "Location deleted" });
            fetchLocations();
          } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          }
        }
      },
      variant: "destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">My Locations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your parking locations and pricing
          </p>
        </div>
        <Link href="/owner/locations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Locations</CardDescription>
            <CardTitle className="text-3xl">{counts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-primary">{counts.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Maintenance</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{counts.maintenance}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(counts.revenue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredLocations}
            columns={columns}
            actions={getActions}
            emptyMessage="No locations found"
            onRowClick={(item) => router.push(`/owner/locations/${item.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
