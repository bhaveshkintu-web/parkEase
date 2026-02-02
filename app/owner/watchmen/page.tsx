"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { getOwnerLocations } from "@/lib/actions/parking-actions";
import {
  getOwnerWatchmen,
  createWatchman,
  updateWatchmanAction,
  deleteWatchmanAction,
  getAllWatchmen
} from "@/lib/actions/watchman-actions";
import { DataTable, StatusBadge, type Column, type Action } from "@/components/admin/data-table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Watchman } from "@/lib/types";
import {
  Plus,
  Shield,
  Edit,
  Trash2,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function OwnerWatchmenPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [watchmen, setWatchmen] = useState<Watchman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWatchman, setEditingWatchman] = useState<Watchman | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    shift: "morning" as "morning" | "evening" | "night" | "all",
    assignedParkingIds: [] as string[],
  });
  const [allAvailableWatchmen, setAllAvailableWatchmen] = useState<any[]>([]);
  const [isManualEntry, setIsManualEntry] = useState(false);

  const fetchWatchmen = useCallback(async () => {
    if (user?.id) {
      setIsLoading(true);
      const result = await getOwnerWatchmen(user.id);
      if (result.success && result.data) {
        setWatchmen(result.data);
      } else if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchWatchmen();
  }, [fetchWatchmen]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (user?.id) {
        const result = await getOwnerLocations(user.id);
        if (result.success && result.data) {
          setLocations(result.data);
        }
      }
    };
    fetchLocations();

    const fetchAllWatchmen = async () => {
      const result = await getAllWatchmen();
      if (result.success && result.data) {
        setAllAvailableWatchmen(result.data);
      }
    };
    fetchAllWatchmen();
  }, [user]);
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      shift: "morning",
      assignedParkingIds: [],
    });
    setEditingWatchman(null);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);
    let result;
    if (editingWatchman) {
      result = await updateWatchmanAction(editingWatchman.id, formData);
    } else {
      result = await createWatchman(user.id, formData);
    }

    if (result.success) {
      toast({
        title: "Success",
        description: (result as any).message || `Watchman ${editingWatchman ? "updated" : "created"} successfully`
      });
      fetchWatchmen();
      setIsAddDialogOpen(false);
      resetForm();
    } else {
      toast({
        title: "Error",
        description: result.error || "Something went wrong",
        variant: "destructive"
      });
    }
    setIsSubmitting(false);
  };

  const openEditDialog = (watchman: Watchman) => {
    setEditingWatchman(watchman);
    setFormData({
      name: watchman.name,
      phone: watchman.phone,
      email: watchman.email,
      shift: watchman.shift,
      assignedParkingIds: watchman.assignedParkingIds,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to archive this watchman? They will be unassigned from all locations but their account will be preserved.")) {
      const result = await deleteWatchmanAction(id);
      if (result.success) {
        toast({ title: "Archived", description: (result as any).message || "Watchman archived successfully" });
        fetchWatchmen();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    }
  };

  const handleStatusToggle = async (watchman: Watchman) => {
    const newStatus = watchman.status === "active" ? "inactive" : "active";
    const result = await updateWatchmanAction(watchman.id, {
      ...watchman,
      status: newStatus
    });
    if (result.success) {
      fetchWatchmen();
    }
  };

  const columns: Column<Watchman>[] = [
    {
      key: "name",
      header: "Watchman",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">
              {item.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{item.shift} shift</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      hideOnMobile: true,
      render: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <Phone className="w-3 h-3 text-muted-foreground" />
            <span>{item.phone}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{item.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "assignedParkingIds",
      header: "Assigned",
      hideOnMobile: true,
      render: (item) => (
        <span className="text-sm">
          {item.assignedParkingIds.length} location
          {item.assignedParkingIds.length !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "todayCheckIns",
      header: "Today's Activity",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>{item.todayCheckIns}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <XCircle className="w-4 h-4" />
            <span>{item.todayCheckOuts}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge
          status={item.status}
          variant={item.status === "active" ? "success" : "default"}
        />
      ),
    },
  ];


  const getActions = (item: Watchman) => {
    const baseActions: Action<Watchman>[] = [
      {
        label: "Edit",
        icon: <Edit className="w-4 h-4 mr-2" />,
        onClick: () => openEditDialog(item),
      },
      {
        label: item.status === "active" ? "Deactivate" : "Activate",
        icon: isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />,
        onClick: () => handleStatusToggle(item),
      },
    ];

    if (item.status !== "inactive") {
      baseActions.push({
        label: "Delete",
        icon: <Trash2 className="w-4 h-4 mr-2" />,
        onClick: () => handleDelete(item.id),
        variant: "destructive",
      });
    }

    return baseActions;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Watchmen</h1>
          <p className="text-muted-foreground mt-1">
            Manage your parking staff and assignments
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Watchman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingWatchman ? "Edit Watchman" : "Add New Watchman"}
              </DialogTitle>
              <DialogDescription>
                {editingWatchman
                  ? "Update watchman details and assignments"
                  : "Add a new watchman or select from existing staff"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingWatchman && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="watchman-select">Select Existing Watchman</Label>
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 h-auto"
                      type="button"
                      onClick={() => {
                        const nextManual = !isManualEntry;
                        resetForm();
                        setIsManualEntry(nextManual);
                      }}
                    >
                      {isManualEntry ? "Select from list" : "Manual Entry"}
                    </Button>
                  </div>
                  {!isManualEntry ? (
                    <Select
                      onValueChange={(value) => {
                        const selected = allAvailableWatchmen.find(w => w.id === value);
                        if (selected) {
                          setFormData({
                            ...formData,
                            name: selected.name,
                            email: selected.email,
                            phone: selected.phone,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a watchman from the list" />
                      </SelectTrigger>
                      <SelectContent>
                        {allAvailableWatchmen.length === 0 && (
                          <div className="p-2 text-sm text-center text-muted-foreground">
                            No registered watchmen found
                          </div>
                        )}
                        {allAvailableWatchmen.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} ({w.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Entering details manually will create a new account if the email is not registered.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isManualEntry && !editingWatchman}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isManualEntry && !editingWatchman}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={(!!editingWatchman) || (!isManualEntry && !editingWatchman)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <Select
                  value={formData.shift}
                  onValueChange={(value: "morning" | "evening" | "night" | "all") =>
                    setFormData({ ...formData, shift: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6 AM - 2 PM)</SelectItem>
                    <SelectItem value="evening">Evening (2 PM - 10 PM)</SelectItem>
                    <SelectItem value="night">Night (10 PM - 6 AM)</SelectItem>
                    <SelectItem value="all">All Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-select">Assigned Location</Label>
                <Select
                  value={formData.assignedParkingIds[0] || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedParkingIds: value ? [value] : [] })
                  }
                >
                  <SelectTrigger id="location-select">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.length === 0 && (
                      <div className="p-2 text-sm text-center text-muted-foreground">
                        No locations found
                      </div>
                    )}
                    {locations.map((location: any) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name || !formData.phone}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingWatchman ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  editingWatchman ? "Save Changes" : "Add Watchman"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Watchmen</p>
            <p className="text-2xl font-bold text-foreground">{watchmen.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {watchmen.filter((w) => w.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Check-ins Today</p>
            <p className="text-2xl font-bold text-primary">
              {watchmen.reduce((sum, w) => sum + w.todayCheckIns, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Check-outs Today</p>
            <p className="text-2xl font-bold text-blue-600">
              {watchmen.reduce((sum, w) => sum + w.todayCheckOuts, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Watchmen Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Watchmen</CardTitle>
          <CardDescription>View and manage your parking staff</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading watchmen...</p>
            </div>
          ) : (
            <DataTable
              data={watchmen as any}
              columns={columns as any}
              actions={getActions as any}
              searchKey="name"
              searchPlaceholder="Search watchmen..."
              emptyMessage="No watchmen added yet"
            />
          )}
        </CardContent>
      </Card>
    </div >
  );
}
