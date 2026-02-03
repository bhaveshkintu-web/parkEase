"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Car,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  state: string;
  isDefault: boolean;
};

export default function VehiclesPage() {
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  /**
   * FETCH VEHICLES
   */
  const fetchVehicles = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/vehicles");

      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: "Session expired",
            description: "Please login again",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to fetch vehicles");
      }

      const data = await res.json();
      setVehicles(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  /**
   * DELETE VEHICLE
   */
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/vehicles/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Vehicle deleted",
        description: "Vehicle removed successfully",
      });

      fetchVehicles();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  /**
   * SET DEFAULT VEHICLE
   */
  const handleSetDefault = async (id: string) => {
    try {
      setSettingDefault(id);

      const res = await fetch("/api/vehicles/default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vehicleId: id }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Default vehicle updated",
        description: "Your default vehicle has been changed",
      });

      fetchVehicles();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update default vehicle",
        variant: "destructive",
      });
    } finally {
      setSettingDefault(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Saved Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your vehicles for faster checkout
          </p>
        </div>
        <Link href="/account/vehicles/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Vehicles */}
      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>No vehicles saved</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardContent className="p-6 flex justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    {vehicle.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.year} • {vehicle.color}
                  </p>
                  <p className="font-mono text-sm">
                    {vehicle.licensePlate} ({vehicle.state})
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!vehicle.isDefault && (
                      <>
                        <DropdownMenuItem
                          disabled={settingDefault === vehicle.id}
                          onClick={() => handleSetDefault(vehicle.id)}
                        >
                          {settingDefault === vehicle.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Star className="w-4 h-4 mr-2" />
                          )}
                          Set Default
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={`/account/vehicles/edit/${vehicle.id}`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteId(vehicle.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
