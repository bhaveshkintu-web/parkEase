"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getPricingRules,
  addPricingRule as createRule,
  updatePricingRule as updateRule,
  deletePricingRule as removeRule
} from "@/lib/actions/pricing-actions";
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
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
} from "lucide-react";
import type { PricingRule } from "@/lib/types";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function PricingRulesPage() {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRules = async () => {
    setIsLoading(true);
    const data = await getPricingRules();
    setPricingRules(data as unknown as PricingRule[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    type: "surge" as PricingRule["type"],
    multiplier: 1,
    startDate: "",
    endDate: "",
    daysOfWeek: [] as number[],
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "surge",
      multiplier: 1,
      startDate: "",
      endDate: "",
      daysOfWeek: [],
      isActive: true,
    });
    setEditingRule(null);
  };

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      type: rule.type,
      multiplier: rule.multiplier,
      startDate: rule.startDate ? new Date(rule.startDate).toISOString().split("T")[0] : "",
      endDate: rule.endDate ? new Date(rule.endDate).toISOString().split("T")[0] : "",
      daysOfWeek: rule.daysOfWeek || [],
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    let result;
    const ruleData = {
      ...formData,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
    };

    if (editingRule) {
      result = await updateRule(editingRule.id, ruleData);
    } else {
      result = await createRule(ruleData);
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

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const getTypeIcon = (type: PricingRule["type"]) => {
    switch (type) {
      case "surge": return <TrendingUp className="w-5 h-5 text-red-500" />;
      case "discount": return <TrendingDown className="w-5 h-5 text-green-500" />;
      case "holiday": return <Calendar className="w-5 h-5 text-purple-500" />;
      case "weekend": return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getTypeColor = (type: PricingRule["type"]) => {
    switch (type) {
      case "surge": return "bg-red-100 text-red-800";
      case "discount": return "bg-green-100 text-green-800";
      case "holiday": return "bg-purple-100 text-purple-800";
      case "weekend": return "bg-amber-100 text-amber-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pricing Rules</h1>
            <p className="text-muted-foreground">Configure dynamic pricing adjustments</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Pricing Rule" : "Add Pricing Rule"}</DialogTitle>
              <DialogDescription>Configure pricing multipliers for specific conditions</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  placeholder="e.g., Weekend Surge"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as PricingRule["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surge">Surge Pricing</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="holiday">Holiday Rate</SelectItem>
                      <SelectItem value="weekend">Weekend Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Multiplier</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="5"
                      value={formData.multiplier}
                      onChange={(e) => setFormData({ ...formData, multiplier: Number(e.target.value) })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      x
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.multiplier > 1
                      ? `+${((formData.multiplier - 1) * 100).toFixed(0)}% increase`
                      : formData.multiplier < 1
                        ? `${((1 - formData.multiplier) * 100).toFixed(0)}% discount`
                        : "No change"}
                  </p>
                </div>
              </div>

              {(formData.type === "holiday" || formData.type === "surge") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {formData.type === "weekend" && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={formData.daysOfWeek.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day.value)}
                        className={formData.daysOfWeek.includes(day.value) ? "" : "bg-transparent"}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isProcessing || !formData.name}>
                {isProcessing ? "Saving..." : editingRule ? "Update Rule" : "Add Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pricingRules.map((rule) => (
          <Card key={rule.id} className={`${!rule.isActive ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(rule.type)}
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                </div>
                <Badge className={getTypeColor(rule.type)}>
                  {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-foreground">{rule.multiplier}x</span>
                <span className="text-muted-foreground text-sm">
                  {rule.multiplier > 1
                    ? `(+${((rule.multiplier - 1) * 100).toFixed(0)}%)`
                    : rule.multiplier < 1
                      ? `(-${((1 - rule.multiplier) * 100).toFixed(0)}%)`
                      : ""}
                </span>
              </div>

              {(rule.startDate || rule.endDate) && (
                <div className="text-sm text-muted-foreground mb-3">
                  {rule.startDate && rule.endDate && (
                    <>
                      {new Date(rule.startDate).toLocaleDateString()} - {new Date(rule.endDate).toLocaleDateString()}
                    </>
                  )}
                </div>
              )}

              {rule.daysOfWeek && rule.daysOfWeek.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {rule.daysOfWeek.map((day) => (
                    <Badge key={day} variant="outline" className="text-xs">
                      {DAYS_OF_WEEK.find((d) => d.value === day)?.label}
                    </Badge>
                  ))}
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

      {(isLoading || pricingRules.length === 0) && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No pricing rules</h3>
            <p className="text-muted-foreground mt-1">Add your first pricing rule to get started</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading pricing rules...</div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the pricing rule.
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
