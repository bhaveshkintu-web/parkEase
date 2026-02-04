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
    customerEmail?: string;
    customerPhone?: string;
    vehiclePlate?: string;
    vehicleType?: string;
    parkingId?: string;
    requestType?: "WALK_IN" | "EXTENSION" | "MODIFICATION" | "EARLY_CHECKOUT";
    originalBookingId?: string;
  };
}

export function RequestDialog({ open, onOpenChange, initialData }: RequestDialogProps) {
  const { addBookingRequest, adminLocations } = useDataStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    vehiclePlate: "",
    vehicleType: "Sedan",
    parkingId: "",
    requestType: "WALK_IN" as any,
    duration: "2",
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        customerName: initialData.customerName || prev.customerName,
        customerEmail: initialData.customerEmail || prev.customerEmail,
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
      const parking = adminLocations.find((l) => l.id === formData.parkingId);
      await addBookingRequest({
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
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
        customerEmail: "",
        customerPhone: "",
        vehiclePlate: "",
        vehicleType: "Sedan",
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">New Booking Request</DialogTitle>
              <DialogDescription className="mt-1">
                Create a walk-in booking or modification request
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Row 1: Name & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-sm font-semibold">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="John Smith"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="text-sm font-semibold">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="text-sm font-semibold">Phone</Label>
                <Input
                  id="customerPhone"
                  placeholder="+1 555-1234"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="h-10 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Row 2: License Plate & Vehicle Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate" className="text-sm font-semibold">
                License Plate <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vehiclePlate"
                placeholder="ABC-1234"
                value={formData.vehiclePlate}
                onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                className="h-10 transition-all focus:ring-2 focus:ring-primary/20 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Vehicle Type</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, vehicleType: v }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Van">Van</SelectItem>
                  <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Request Type & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Request Type</Label>
              <Select
                value={formData.requestType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, requestType: v }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select type" />
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
              <Label className="text-sm font-semibold">Duration (hours)</Label>
              <Select
                value={formData.duration}
                onValueChange={(v) => setFormData(prev => ({ ...prev, duration: v }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Parking Location */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Parking Location <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.parkingId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, parkingId: v }))}
              disabled={formData.requestType === "EXTENSION"}
            >
              <SelectTrigger className="h-10 w-full md:w-[240px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {adminLocations.length > 0 ? (
                  adminLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">No locations found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Row 5: Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-[100px] resize-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-8">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#00A386] hover:bg-[#008F75] text-white px-8"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
