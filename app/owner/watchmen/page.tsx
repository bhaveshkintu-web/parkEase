"use client";

import { useState } from "react";
import { useDataStore } from "@/lib/data-store";
import { DataTable, StatusBadge, type Column, type Action } from "@/components/admin/data-table";
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
  const { watchmen, addWatchman, updateWatchman, deleteWatchman, adminLocations } = useDataStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWatchman, setEditingWatchman] = useState<Watchman | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    shift: "morning" as "morning" | "evening" | "night" | "all",
    assignedParkingIds: [] as string[],
  });

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

  const handleSubmit = () => {
    if (editingWatchman) {
      updateWatchman(editingWatchman.id, formData);
    } else {
      addWatchman({
        ...formData,
        userId: `user-${Date.now()}`,
        ownerId: "owner-1",
        status: "active",
        createdAt: new Date(),
        todayCheckIns: 0,
        todayCheckOuts: 0,
      });
    }
    setIsAddDialogOpen(false);
    resetForm();
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

  const actions: Action<Watchman>[] = [
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4 mr-2" />,
      onClick: (item) => openEditDialog(item),
    },
    {
      label: (item) => item.status === "active" ? "Deactivate" : "Activate",
      icon: <Clock className="w-4 h-4 mr-2" />,
      onClick: (item) => {
        const newStatus = item.status === "active" ? "inactive" : "active";
        updateWatchman(item.id, { status: newStatus });
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4 mr-2" />,
      onClick: (item) => {
        if (confirm("Are you sure you want to remove this watchman?")) {
          deleteWatchman(item.id);
        }
      },
      variant: "destructive",
    },
  ];

  const getActions = (item: Watchman) => {
    return actions.filter((action) => {
      if (action.label === "Delete") {
        return item.status !== "inactive"; // Only allow deletion if the watchman is not inactive
      }
      return true;
    });
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
                  : "Add a new watchman to manage your parking locations"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                <Label>Assigned Locations</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {adminLocations.map((location) => (
                    <label
                      key={location.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        checked={formData.assignedParkingIds.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              assignedParkingIds: [...formData.assignedParkingIds, location.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              assignedParkingIds: formData.assignedParkingIds.filter(
                                (id) => id !== location.id
                              ),
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{location.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name || !formData.phone}>
                {editingWatchman ? "Save Changes" : "Add Watchman"}
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
          <DataTable
            data={watchmen}
            columns={columns}
            actions={actions}
            searchKey="name"
            searchPlaceholder="Search watchmen..."
            emptyMessage="No watchmen added yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
