"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { VehicleInput } from "@/lib/validations";
import { useToast } from "@/hooks/use-toast";

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<VehicleInput | null>(null);

  useEffect(() => {
    fetch(`/api/vehicles/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        toast({
          title: "Error",
          description: "Vehicle not found",
          variant: "destructive",
        }),
      );
  }, [id]);

  if (!data) return null;

  return (
    <VehicleForm
      title="Edit Vehicle"
      description="Update your vehicle details"
      submitLabel="Update Vehicle"
      initialData={data}
      onSubmit={async (updated) => {
        const res = await fetch(`/api/vehicles/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });

        if (res.ok) {
          toast({ title: "Vehicle updated" });
          router.push("/account/vehicles");
        }
      }}
    />
  );
}
