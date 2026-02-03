"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/lib/data-store";
import { Loader2 } from "lucide-react";

interface RequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    customerName?: string;
    customerPhone?: string;
    vehiclePlate?: string;
    vehicleType?: string;
    parkingId?: string;
    requestType?: "WALK_IN" | "EXTENSION" | "MODIFICATION" | "EARLY_CHECKOUT";
    originalBookingId?: string;
  };
}

export function RequestDialog({ open, onOpenChange, initialData }: RequestDialogProps) {
  const { addBookingRequest } = useDataStore(); // Removed adminLocations from here to use local state
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    vehiclePlate: "",
    vehicleType: "sedan",
    parkingId: "",
    requestType: "WALK_IN" as any,
    duration: "2",
    notes: "",
  });

  // Fetch locations when dialog opens
  useEffect(() => {
    if (open) {
      const fetchLocations = async () => {
        try {
          // Adjust this endpoint as needed, e.g., /api/locations or /api/watchman/locations
          const res = await fetch("/api/locations");
          if (res.ok) {
            const data = await res.json();
            // Handle different response structures if necessary
            const locs = Array.isArray(data) ? data : (data.locations || []);
            setLocations(locs);
          }
        } catch (e) {
          console.error("Failed to fetch locations", e);
        }
      };
      fetchLocations();
    }
  }, [open]);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        customerName: initialData.customerName || prev.customerName,
        customerPhone: initialData.customerPhone || prev.customerPhone,
        vehiclePlate: initialData.vehiclePlate || prev.vehiclePlate,
        vehicleType: initialData.vehicleType || prev.vehicleType,
        parkingId: initialData.parkingId || prev.parkingId,
        requestType: initialData.requestType || prev.requestType,
      }));
    }
  }, [initialData, open]);

  const handleSubmit = async () => {
    if (!formData.customerName || !formData.vehiclePlate || !formData.parkingId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const parking = locations.find((l) => l.id === formData.parkingId);
      await addBookingRequest({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        vehiclePlate: formData.vehiclePlate.toUpperCase(),
        vehicleType: formData.vehicleType,
        parkingId: formData.parkingId,
        parkingName: parking?.name || "Unknown",
        requestType: formData.requestType,
        requestedStart: new Date(),
        requestedEnd: new Date(Date.now() + parseInt(formData.duration) * 3600000),
        estimatedAmount: parseInt(formData.duration) * 5,
        notes: formData.notes,
        priority: "normal",
        originalBookingId: initialData?.originalBookingId,
      });

      toast({
        title: "Request Created",
        description: "Booking request submitted successfully.",
      });
      onOpenChange(false);
      // Reset form
      setFormData({
        customerName: "",
        customerPhone: "",
        vehiclePlate: "",
        vehicleType: "sedan",
        parkingId: "",
        requestType: "WALK_IN",
        duration: "2",
        notes: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Booking Request</DialogTitle>
          <DialogDescription>
            Create a walk-in booking or modification request
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                placeholder="John Smith"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                disabled={formData.requestType === "EXTENSION"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                placeholder="+1 555-1234"
                value={formData.customerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">License Plate *</Label>
              <Input
                id="vehiclePlate"
                placeholder="ABC-1234"
                value={formData.vehiclePlate}
                onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                disabled={formData.requestType === "EXTENSION"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Vehicle Type</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, vehicleType: v }))}
              >
                <SelectTrigger id="vehicleType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type</Label>
              <Select
                value={formData.requestType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, requestType: v as any }))}
              >
                <SelectTrigger id="requestType">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-in</SelectItem>
                  <SelectItem value="EXTENSION">Extension</SelectItem>
                  <SelectItem value="MODIFICATION">Modification</SelectItem>
                  <SelectItem value="EARLY_CHECKOUT">Early Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Select
                value={formData.duration}
                onValueChange={(v) => setFormData(prev => ({ ...prev, duration: v }))}
              >
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="2">2 Hours</SelectItem>
                  <SelectItem value="4">4 Hours</SelectItem>
                  <SelectItem value="8">8 Hours</SelectItem>
                  <SelectItem value="12">12 Hours</SelectItem>
                  <SelectItem value="24">24 Hours</SelectItem>
                  <SelectItem value="48">2 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parkingLocation">Parking Location *</Label>
            <Select
              value={formData.parkingId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, parkingId: v }))}
              disabled={formData.requestType === "EXTENSION"}
            >
              <SelectTrigger id="parkingLocation">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.length > 0 ? (
                  locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">No locations found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
