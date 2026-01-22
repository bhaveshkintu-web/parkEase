"use client";

import React from "react"

import { use, useState, useEffect } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { vehicleSchema, type VehicleInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CAR_MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge",
  "Ford", "GMC", "Honda", "Hyundai", "Infiniti", "Jeep", "Kia", "Lexus",
  "Lincoln", "Mazda", "Mercedes-Benz", "Nissan", "Porsche", "Ram", "Subaru",
  "Tesla", "Toyota", "Volkswagen", "Volvo", "Other"
];

const COLORS = [
  "Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown",
  "Beige", "Gold", "Orange", "Yellow", "Purple", "Other"
];

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 30 }, (_, i) => currentYear + 1 - i);

export default function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { vehicles, updateVehicle } = useDataStore();
  const { toast } = useToast();

  const vehicle = vehicles.find((v) => v.id === id);

  const [formData, setFormData] = useState<VehicleInput>({
    nickname: "",
    make: "",
    model: "",
    year: currentYear,
    color: "",
    licensePlate: "",
    state: "",
    isDefault: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        nickname: vehicle.nickname || "",
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        licensePlate: vehicle.licensePlate,
        state: vehicle.state,
        isDefault: vehicle.isDefault,
      });
    }
  }, [vehicle]);

  if (!vehicle) {
    notFound();
  }

  const handleChange = (name: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = vehicleSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const error of result.error.errors) {
        const path = error.path[0];
        if (path) fieldErrors[path] = error.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    await updateVehicle(id, formData);
    setIsSubmitting(false);

    toast({
      title: "Vehicle updated",
      description: "Your vehicle has been updated.",
    });

    router.push("/account/vehicles");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/account/vehicles">
        <Button variant="ghost" className="mb-2">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Vehicles
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Vehicle</h1>
        <p className="text-muted-foreground">Update your vehicle information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
          <CardDescription>Edit your vehicle details</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (optional)</Label>
              <Input
                id="nickname"
                placeholder="e.g., Daily Driver, Weekend Car"
                value={formData.nickname}
                onChange={(e) => handleChange("nickname", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Select value={formData.make} onValueChange={(v) => handleChange("make", v)}>
                  <SelectTrigger className={errors.make ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAR_MAKES.map((make) => (
                      <SelectItem key={make} value={make}>
                        {make}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.make && <p className="text-sm text-destructive">{errors.make}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="e.g., Camry, Civic"
                  value={formData.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  className={errors.model ? "border-destructive" : ""}
                />
                {errors.model && <p className="text-sm text-destructive">{errors.model}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select value={String(formData.year)} onValueChange={(v) => handleChange("year", Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select value={formData.color} onValueChange={(v) => handleChange("color", v)}>
                  <SelectTrigger className={errors.color ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.color && <p className="text-sm text-destructive">{errors.color}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input
                  id="licensePlate"
                  placeholder="ABC1234"
                  value={formData.licensePlate}
                  onChange={(e) => handleChange("licensePlate", e.target.value.toUpperCase())}
                  className={errors.licensePlate ? "border-destructive" : ""}
                />
                {errors.licensePlate && <p className="text-sm text-destructive">{errors.licensePlate}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
                  <SelectTrigger className={errors.state ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => handleChange("isDefault", checked === true)}
              />
              <label htmlFor="isDefault" className="text-sm text-muted-foreground">
                Set as my default vehicle
              </label>
            </div>
          </CardContent>

          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
