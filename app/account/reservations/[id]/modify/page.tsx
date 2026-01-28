"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBookingDetails, updateBookingVehicle, updateBookingDates } from "@/lib/actions/booking-actions";
import { formatDate } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, Car, Save, Clock } from "lucide-react";

export default function ModifyReservationPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = React.use(params instanceof Promise ? params : Promise.resolve(params));
  const id = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [reservation, setReservation] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    make: "",
    model: "",
    color: "",
    plate: "",
    checkIn: "",
    checkOut: "",
  });

  React.useEffect(() => {
    async function loadBooking() {
      setIsLoading(true);
      const response = await getBookingDetails(id);
      if (response.success && response.data) {
        setReservation(response.data);
        setFormData({
          make: response.data.vehicleMake,
          model: response.data.vehicleModel,
          color: response.data.vehicleColor,
          plate: response.data.vehiclePlate,
          checkIn: new Date(response.data.checkIn).toISOString().slice(0, 16),
          checkOut: new Date(response.data.checkOut).toISOString().slice(0, 16),
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load reservation",
          variant: "destructive",
        });
        router.push("/account/reservations");
      }
      setIsLoading(false);
    }
    loadBooking();
  }, [id, toast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Update Vehicle Info
      const vehicleResponse = await updateBookingVehicle(id, {
        make: formData.make,
        model: formData.model,
        color: formData.color,
        plate: formData.plate,
      });

      if (!vehicleResponse.success) throw new Error(vehicleResponse.error);

      // 2. Update Dates (Only if they changed)
      const originalCheckIn = new Date(reservation.checkIn).getTime();
      const originalCheckOut = new Date(reservation.checkOut).getTime();
      const newCheckIn = new Date(formData.checkIn).getTime();
      const newCheckOut = new Date(formData.checkOut).getTime();

      if (newCheckIn !== originalCheckIn || newCheckOut !== originalCheckOut) {
        const dateResponse = await updateBookingDates(
          id, 
          new Date(formData.checkIn), 
          new Date(formData.checkOut)
        );
        if (!dateResponse.success) throw new Error(dateResponse.error);
      }

      toast({
        title: "Reservation Updated",
        description: "Your changes have been saved successfully.",
      });
      router.push(`/account/reservations/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update reservation",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading reservation details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link href={`/account/reservations/${id}`}>
        <Button variant="ghost" className="mb-2">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Details
        </Button>
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Modify Reservation</h1>
        <p className="text-muted-foreground">
          Update your vehicle details for your booking at {reservation?.location?.name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Vehicle Information
            </CardTitle>
            <CardDescription>
              Ensure your vehicle details are correct for entry into the parking facility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Vehicle Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g. Toyota"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Vehicle Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. Camry"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Vehicle Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g. Silver"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">License Plate</Label>
                <Input
                  id="plate"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  placeholder="ABC-1234"
                  required
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Reservation Dates
            </CardTitle>
            <CardDescription>
              Modify your check-in and check-out times. Note: Price changes may apply in a production environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check-in</Label>
                <Input
                  id="checkIn"
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check-out</Label>
                <Input
                  id="checkOut"
                  type="datetime-local"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800">
                <strong>Current Dates:</strong> {formatDate(new Date(reservation.checkIn))} to {formatDate(new Date(reservation.checkOut))}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/account/reservations/${id}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
