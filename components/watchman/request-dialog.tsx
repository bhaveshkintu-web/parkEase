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
  const { adminLocations, addBookingRequest } = useDataStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
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
      const parking = adminLocations.find((l) => l.id === formData.parkingId);
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
        description: `${formData.requestType.replace("_", " ")} request submitted successfully.`,
      });
      onOpenChange(false);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {formData.requestType === "EXTENSION" ? "Extend Parking" : "New Request"}
          </DialogTitle>
          <DialogDescription>
            {formData.requestType === "EXTENSION" 
              ? "Submit a request to extend the current parking session."
              : "Create a walk-in booking or other session modification."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Tabs 
              value={formData.requestType} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, requestType: v as any }))}
            >
              <TabsList className="grid grid-cols-2 h-auto">
                <TabsTrigger value="WALK_IN" className="py-2 text-xs">Walk-in</TabsTrigger>
                <TabsTrigger value="EXTENSION" className="py-2 text-xs">Extension</TabsTrigger>
                <TabsTrigger value="MODIFICATION" className="py-2 text-xs">Modify</TabsTrigger>
                <TabsTrigger value="EARLY_CHECKOUT" className="py-2 text-xs">Early Out</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                placeholder="Name"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                disabled={formData.requestType === "EXTENSION"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">Plate *</Label>
              <Input
                id="vehiclePlate"
                placeholder="ABC-1234"
                value={formData.vehiclePlate}
                onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                disabled={formData.requestType === "EXTENSION"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select
                value={formData.parkingId}
                onValueChange={(v) => setFormData(prev => ({ ...prev, parkingId: v }))}
                disabled={formData.requestType === "EXTENSION"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {adminLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Select
                value={formData.duration}
                onValueChange={(v) => setFormData(prev => ({ ...prev, duration: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="2">2 Hours</SelectItem>
                  <SelectItem value="4">4 Hours</SelectItem>
                  <SelectItem value="8">8 Hours</SelectItem>
                  <SelectItem value="24">24 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
