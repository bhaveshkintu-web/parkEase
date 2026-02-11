"use client";

import { useState, useEffect } from "react";
import { vehicleSchema, type VehicleInput } from "@/lib/validations";
import { fetchModelsByMake } from "@/lib/vehicle-api";
import { CAR_MAKES } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  title: string;
  description: string;
  initialData: VehicleInput;
  submitLabel: string;
  onSubmit: (data: VehicleInput) => Promise<void>;
  loading?: boolean;
};

const COLORS = [
  "Black",
  "White",
  "Silver",
  "Gray",
  "Red",
  "Blue",
  "Green",
  "Brown",
  "Beige",
  "Gold",
  "Orange",
  "Yellow",
  "Purple",
  "Other",
];

const STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

export function VehicleForm({
  title,
  description,
  initialData,
  submitLabel,
  onSubmit,
  loading = false,
}: Props) {
  const [formData, setFormData] = useState<VehicleInput>(initialData);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadModels = async () => {
      if (!formData.make || formData.make === "Other") {
        setModels([]);
        return;
      }

      setIsFetchingModels(true);
      try {
        const fetchedModels = await fetchModelsByMake(formData.make);
        setModels(fetchedModels);
      } catch (error) {
        console.error("Error loading models:", error);
        setModels([]);
      } finally {
        setIsFetchingModels(false);
      }
    };

    loadModels();
  }, [formData.make]);

  const handleChange = <K extends keyof VehicleInput>(
    key: K,
    value: VehicleInput[K],
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [key]: value };
      // Clear model if make changes
      if (key === "make") {
        newData.model = "";
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("formdata======================", formData);
    const parsed = vehicleSchema.safeParse(formData);
    if (!parsed.success) {
      toast({
        title: "Invalid data",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await onSubmit(formData);
    } catch (err) {
      toast({
        title: "Error",
        description: "Something went wrong while saving vehicle.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Label>Nickname</Label>
            <Input
              value={formData.nickname ?? ""}
              onChange={(e) => handleChange("nickname", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Make</Label>
              <Select
                value={formData.make}
                onValueChange={(v) => handleChange("make", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {CAR_MAKES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Model</Label>
              {isFetchingModels ? (
                <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fetching models...</span>
                </div>
              ) : models.length > 0 ? (
                <Select
                  value={formData.model}
                  onValueChange={(v) => handleChange("model", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  placeholder={formData.make ? "Enter model name" : "Select make first"}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Year</Label>
              <Select
                value={String(formData.year)}
                onValueChange={(v) => handleChange("year", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Color</Label>
              <Select
                value={formData.color}
                onValueChange={(v) => handleChange("color", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>License Plate</Label>
              <Input
                value={formData.licensePlate}
                onChange={(e) =>
                  handleChange("licensePlate", e.target.value.toUpperCase())
                }
              />
            </div>

            <div>
              <Label>State</Label>
              <Select
                value={formData.state}
                onValueChange={(v) => handleChange("state", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(v) => handleChange("isDefault", v === true)}
            />
            <Label htmlFor="isDefault" className="text-sm">
              Set as default
            </Label>
          </div>

          <Button type="submit" disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
