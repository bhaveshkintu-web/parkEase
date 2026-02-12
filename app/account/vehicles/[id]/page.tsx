"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft as ChevronLeftIcon, Loader2 as Loader2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditVehiclePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { vehicles, updateVehicle } = useDataStore();
  const { toast } = useToast();

  const vehicle = vehicles.find((v) => v.id === id);

  if (!vehicles.length) {
    return (
      <div className="flex justify-center py-20">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Vehicle not found
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/account/vehicles">
        <Button variant="ghost" className="mb-2">
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Back to Vehicles
        </Button>
      </Link>

      <VehicleForm
        title="Edit Vehicle"
        description="Update your vehicle information"
        submitLabel="Save Changes"
        initialData={{
          nickname: vehicle.nickname || "",
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          licensePlate: vehicle.licensePlate,
          state: vehicle.state,
          isDefault: vehicle.isDefault,
        }}
        onSubmit={async (data) => {
          await updateVehicle(id, data);
          toast({
            title: "Vehicle updated",
            description: "Your vehicle has been updated.",
          });
          router.push("/account/vehicles");
        }}
      />
    </div>
  );
}
