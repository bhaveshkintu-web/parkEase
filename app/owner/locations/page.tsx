"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/data";
import { DataTable, StatusBadge, type Column, type Action } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

export default function OwnerLocationsPage() {
  const router = useRouter();
  const { adminLocations, updateLocation, deleteLocation } = useDataStore();
  const [activeTab, setActiveTab] = useState("all");

  const filteredLocations =
    activeTab === "all"
      ? adminLocations
      : adminLocations.filter((l) => l.status === activeTab);

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
          <span>{item.rating.toFixed(1)}</span>
          <span className="text-muted-foreground text-xs">({item.reviewCount})</span>
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
          {formatCurrency(item.analytics.revenue)}
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
            item.status === "active"
              ? "success"
              : item.status === "maintenance"
              ? "warning"
              : "default"
          }
        />
      ),
    },
  ];

  const actions: Action<AdminParkingLocation>[] = [
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
      label:
        adminLocations.find((l) => l.id)?.status === "active"
          ? "Deactivate"
          : "Activate",
      icon:
        adminLocations.find((l) => l.id)?.status === "active" ? (
          <ToggleLeft className="w-4 h-4 mr-2" />
        ) : (
          <ToggleRight className="w-4 h-4 mr-2" />
        ),
      onClick: (item) => {
        const newStatus = item.status === "active" ? "inactive" : "active";
        updateLocation(item.id, { status: newStatus });
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4 mr-2" />,
      onClick: (item) => {
        if (confirm("Are you sure you want to delete this location?")) {
          deleteLocation(item.id);
        }
      },
      variant: "destructive",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your parking locations and pricing
          </p>
        </div>
        <Link href="/owner/locations/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Locations</p>
            <p className="text-2xl font-bold text-foreground">{adminLocations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {adminLocations.filter((l) => l.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Maintenance</p>
            <p className="text-2xl font-bold text-amber-600">
              {adminLocations.filter((l) => l.status === "maintenance").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(adminLocations.reduce((sum, l) => sum + l.analytics.revenue, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({adminLocations.length})</TabsTrigger>
              <TabsTrigger value="active">
                Active ({adminLocations.filter((l) => l.status === "active").length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({adminLocations.filter((l) => l.status === "inactive").length})
              </TabsTrigger>
              <TabsTrigger value="maintenance">
                Maintenance ({adminLocations.filter((l) => l.status === "maintenance").length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredLocations}
            columns={columns}
            actions={actions}
            searchKey="name"
            searchPlaceholder="Search locations..."
            emptyMessage="No locations found"
            onRowClick={(item) => router.push(`/owner/locations/${item.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
