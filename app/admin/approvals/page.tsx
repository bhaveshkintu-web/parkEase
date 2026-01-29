"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  User,
  Calendar,
  Eye,
  Clock,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParkingLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
  createdAt: string;
  owner: {
    id: string;
    businessName: string;
    user: {
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

export default function ParkingApprovalsPage() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch parking locations
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/approvals");
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast({
        title: "Error",
        description: "Failed to load parking locations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (locationId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/locations/${locationId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", notes: reviewNotes }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve location");
      }

      toast({
        title: "Location Approved",
        description: "The parking location has been approved successfully.",
      });

      setSelectedLocation(null);
      setReviewNotes("");
      fetchLocations(); // Refresh list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve location",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (locationId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/locations/${locationId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", notes: reviewNotes }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject location");
      }

      toast({
        title: "Location Rejected",
        description: "The parking location has been rejected.",
      });

      setSelectedLocation(null);
      setReviewNotes("");
      fetchLocations(); // Refresh list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject location",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name?.toLowerCase().includes(search.toLowerCase()) ||
      loc.owner?.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = locations.filter((l) => l.status?.toUpperCase() === "PENDING").length;
  const activeCount = locations.filter((l) => l.status?.toUpperCase() === "ACTIVE").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Parking Approvals</h1>
            <p className="text-muted-foreground">Review and approve new parking location submissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="py-1.5">
            <Clock className="w-3 h-3 mr-1" />
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="py-1.5">
            <CheckCircle className="w-3 h-3 mr-1" />
            {activeCount} Active
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by location or owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Locations List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({locations.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
        </TabsList>

        {["all", "pending", "active"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="grid gap-4">
              {filteredLocations
                .filter((loc) => tab === "all" || loc.status?.toUpperCase() === tab.toUpperCase())
                .map((location) => (
                  <Card key={location.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg text-foreground">
                                {location.name}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-4 h-4" />
                                {location.address}, {location.city}
                              </div>
                            </div>
                            <Badge variant={location.status === "active" ? "default" : "secondary"}>
                              {location.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Owner:</span>
                              <span className="font-medium">{location.owner?.businessName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">
                                {new Date(location.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row lg:flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 lg:flex-none bg-transparent"
                            onClick={() => setSelectedLocation(location)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                          {location.status?.toUpperCase() === "PENDING" && (
                            <Button
                              size="sm"
                              className="flex-1 lg:flex-none"
                              onClick={() => {
                                setSelectedLocation(location);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {filteredLocations.filter((loc) => tab === "all" || loc.status?.toUpperCase() === tab.toUpperCase()).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No locations found</h3>
                    <p className="text-muted-foreground mt-1">
                      {tab === "pending" ? "No pending locations at this time" : "No locations match your search"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Parking Location</DialogTitle>
            <DialogDescription>
              {selectedLocation?.name} - Submitted by {selectedLocation?.owner?.businessName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Location Details */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Location Details</CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address:</span>
                  <span>{selectedLocation?.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City:</span>
                  <span>{selectedLocation?.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner Email:</span>
                  <span>{selectedLocation?.owner?.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge>{selectedLocation?.status}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Review Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Review Notes</label>
              <Textarea
                placeholder="Add notes about this approval..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedLocation && handleReject(selectedLocation.id)}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Reject"}
            </Button>
            <Button
              onClick={() => selectedLocation && handleApprove(selectedLocation.id)}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
