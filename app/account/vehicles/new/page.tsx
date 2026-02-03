"use client";

import { useRouter } from "next/navigation";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { addVehicle } from "@/lib/actions/vehicle-actions";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function AddVehiclePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <VehicleForm
      title="Add Vehicle"
      description="Add a new vehicle"
      submitLabel="Save Vehicle"
      initialData={{
        nickname: "",
        make: "",
        model: "",
        year: new Date().getFullYear(),
        color: "",
        licensePlate: "",
        state: "",
        isDefault: false,
      }}
      onSubmit={async (data) => {
        if (!user) return;

        const fd = new FormData();
        // Object.entries(data).forEach(([k, v]) => {
        //   if (v !== undefined) fd.append(k, String(v));
        // });
        fd.append("nickname", data.nickname || "");
        fd.append("make", data.make);
        fd.append("model", data.model);
        fd.append("year", String(data.year));
        fd.append("color", data.color);
        fd.append("licensePlate", data.licensePlate);
        fd.append("state", data.state);
        fd.append("isDefault", data.isDefault ? "true" : "false");
        fd.append("userId", user.id);
        fd.append("userId", user.id);

        const res = await addVehicle(null, fd);
        if (res.success) {
          toast({ title: "Vehicle added" });
          router.push("/account/vehicles/");
        }
      }}
    />
  );
}
