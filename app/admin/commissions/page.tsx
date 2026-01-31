"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getCommissionRules,
  addCommissionRule as createRule,
  updateCommissionRule as updateRule,
  deleteCommissionRule as removeRule
} from "@/lib/actions/commission-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Percent, DollarSign } from "lucide-react";
import type { CommissionRule } from "@/lib/types";

export default function CommissionsPage() {
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRules = async () => {
    setIsLoading(true);
    const data = await getCommissionRules();
    setCommissionRules(data as unknown as CommissionRule[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    type: "percentage" as CommissionRule["type"],
    value: 0,
    appliesTo: "all" as CommissionRule["appliesTo"],
    minBookingValue: undefined as number | undefined,
    maxCommission: undefined as number | undefined,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "percentage",
      value: 0,
      appliesTo: "all",
      minBookingValue: undefined,
      maxCommission: undefined,
      isActive: true,
    });
    setEditingRule(null);
  };

  const handleEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      type: rule.type,
      value: rule.value,
      appliesTo: rule.appliesTo,
      minBookingValue: rule.minBookingValue,
      maxCommission: rule.maxCommission,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    let result;
    if (editingRule) {
      result = await updateRule(editingRule.id, formData);
    } else {
      result = await createRule(formData);
    }

    if (result.success) {
      await fetchRules();
      setIsDialogOpen(false);
      resetForm();
    } else {
      alert(result.error);
    }
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    const result = await removeRule(deleteId);
    if (result.success) {
      await fetchRules();
      setDeleteId(null);
    } else {
      alert(result.error);
    }
    setIsProcessing(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const result = await updateRule(id, { isActive });
    if (result.success) {
      await fetchRules();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Commission Rules</h1>
            <p className="text-muted-foreground">Configure platform commission rates</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Commission Rule" : "Add Commission Rule"}</DialogTitle>
              <DialogDescription>Configure commission settings for bookings</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  placeholder="e.g., Standard Commission"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as CommissionRule["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {formData.type === "percentage" ? "%" : "$"}
                    </span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select
                  value={formData.appliesTo}
                  onValueChange={(v) => setFormData({ ...formData, appliesTo: v as CommissionRule["appliesTo"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bookings</SelectItem>
                    <SelectItem value="airport">Airport Parking Only</SelectItem>
                    <SelectItem value="hourly">Hourly Parking Only</SelectItem>
                    <SelectItem value="monthly">Monthly Parking Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Booking Value (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-8"
                      placeholder="0"
                      value={formData.minBookingValue || ""}
                      onChange={(e) => setFormData({ ...formData, minBookingValue: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Max Commission (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-8"
                      placeholder="No limit"
                      value={formData.maxCommission || ""}
                      onChange={(e) => setFormData({ ...formData, maxCommission: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isProcessing || !formData.name}>
                {isProcessing ? "Saving..." : editingRule ? "Update Rule" : "Add Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Commission Rules Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {commissionRules.map((rule) => (
          <Card key={rule.id} className={`${!rule.isActive ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {rule.type === "percentage" ? (
                      <Percent className="w-5 h-5 text-primary" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-green-600" />
                    )}
                    {rule.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Applies to: {rule.appliesTo === "all" ? "All bookings" : `${rule.appliesTo} parking`}
                  </CardDescription>
                </div>
                <Badge variant={rule.isActive ? "default" : "outline"}>
                  {rule.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-foreground">
                  {rule.type === "percentage" ? `${rule.value}%` : `$${rule.value.toFixed(2)}`}
                </span>
                <span className="text-muted-foreground text-sm">
                  {rule.type === "percentage" ? "of booking value" : "flat fee"}
                </span>
              </div>

              {(rule.minBookingValue || rule.maxCommission) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {rule.minBookingValue && (
                    <Badge variant="outline" className="text-xs">
                      {`Min: $${rule.minBookingValue}`}
                    </Badge>
                  )}
                  {rule.maxCommission && (
                    <Badge variant="outline" className="text-xs">
                      {`Max: $${rule.maxCommission}`}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {rule.isActive ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(rule.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Commission Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the commission rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
