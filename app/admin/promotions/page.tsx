"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Tag,
  Percent,
  DollarSign,
  Gift,
  Calendar,
  Copy,
  Check,
} from "lucide-react";
import type { Promotion } from "@/lib/types";

export default function PromotionsPage() {
  const { promotions, addPromotion, updatePromotion, deletePromotion } = useDataStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "percentage" as Promotion["type"],
    value: 0,
    minBookingValue: undefined as number | undefined,
    maxDiscount: undefined as number | undefined,
    usageLimit: undefined as number | undefined,
    validFrom: "",
    validUntil: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      type: "percentage",
      value: 0,
      minBookingValue: undefined,
      maxDiscount: undefined,
      usageLimit: undefined,
      validFrom: "",
      validUntil: "",
      isActive: true,
    });
    setEditingPromo(null);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      type: promo.type,
      value: promo.value,
      minBookingValue: promo.minBookingValue,
      maxDiscount: promo.maxDiscount,
      usageLimit: promo.usageLimit,
      validFrom: new Date(promo.validFrom).toISOString().split("T")[0],
      validUntil: new Date(promo.validUntil).toISOString().split("T")[0],
      isActive: promo.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    const data: Omit<Promotion, "id" | "usedCount"> = {
      code: formData.code.toUpperCase(),
      name: formData.name,
      type: formData.type,
      value: formData.value,
      minBookingValue: formData.minBookingValue,
      maxDiscount: formData.maxDiscount,
      usageLimit: formData.usageLimit,
      validFrom: new Date(formData.validFrom),
      validUntil: new Date(formData.validUntil),
      isActive: formData.isActive,
    };

    if (editingPromo) {
      await updatePromotion(editingPromo.id, { ...data, usedCount: editingPromo.usedCount });
    } else {
      await addPromotion(data);
    }
    setIsDialogOpen(false);
    resetForm();
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    await deletePromotion(deleteId);
    setDeleteId(null);
    setIsProcessing(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTypeIcon = (type: Promotion["type"]) => {
    switch (type) {
      case "percentage": return <Percent className="w-5 h-5 text-blue-500" />;
      case "fixed": return <DollarSign className="w-5 h-5 text-green-500" />;
      case "free_day": return <Gift className="w-5 h-5 text-purple-500" />;
    }
  };

  const getValueDisplay = (promo: Promotion) => {
    switch (promo.type) {
      case "percentage": return `${promo.value}% off`;
      case "fixed": return `${formatCurrency(promo.value)} off`;
      case "free_day": return `${promo.value} free day${promo.value > 1 ? "s" : ""}`;
    }
  };

  const isExpired = (promo: Promotion) => new Date(promo.validUntil) < new Date();

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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Promotions & Coupons</h1>
            <p className="text-muted-foreground">Create and manage promotional codes</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPromo ? "Edit Promotion" : "Create Promotion"}</DialogTitle>
              <DialogDescription>Configure promotional discount settings</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Promo Code</Label>
                  <Input
                    placeholder="SUMMER20"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Summer Sale"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as Promotion["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                      <SelectItem value="free_day">Free Day(s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {formData.type === "percentage" ? "%" : formData.type === "fixed" ? "$" : ""}
                    </span>
                    <Input
                      type="number"
                      className={formData.type !== "free_day" ? "pl-8" : ""}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Booking Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-8"
                      placeholder="Optional"
                      value={formData.minBookingValue || ""}
                      onChange={(e) => setFormData({ ...formData, minBookingValue: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>
                {formData.type === "percentage" && (
                  <div className="space-y-2">
                    <Label>Max Discount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        className="pl-8"
                        placeholder="No limit"
                        value={formData.maxDiscount || ""}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={formData.usageLimit || ""}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? Number(e.target.value) : undefined })}
                />
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
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="bg-transparent">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isProcessing || !formData.code || !formData.name || !formData.validFrom || !formData.validUntil}
              >
                {isProcessing ? "Saving..." : editingPromo ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Promotions</p>
            <p className="text-2xl font-bold text-foreground">{promotions.filter((p) => p.isActive && !isExpired(p)).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Redemptions</p>
            <p className="text-2xl font-bold text-foreground">{promotions.reduce((sum, p) => sum + p.usedCount, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Expired</p>
            <p className="text-2xl font-bold text-foreground">{promotions.filter(isExpired).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Disabled</p>
            <p className="text-2xl font-bold text-foreground">{promotions.filter((p) => !p.isActive).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Promotions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promo) => (
          <Card key={promo.id} className={`${!promo.isActive || isExpired(promo) ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(promo.type)}
                  <div>
                    <CardTitle className="text-lg">{promo.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">{promo.code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(promo.code)}
                      >
                        {copiedCode === promo.code ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                {isExpired(promo) ? (
                  <Badge variant="outline">Expired</Badge>
                ) : promo.isActive ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="outline">Disabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-foreground">{getValueDisplay(promo)}</span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(promo.validFrom).toLocaleDateString()} - {new Date(promo.validUntil).toLocaleDateString()}
                  </span>
                </div>
                {promo.minBookingValue && (
                  <p className="text-muted-foreground">Min booking: {formatCurrency(promo.minBookingValue)}</p>
                )}
              </div>

              {promo.usageLimit && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Used</span>
                    <span>{promo.usedCount} / {promo.usageLimit}</span>
                  </div>
                  <Progress value={(promo.usedCount / promo.usageLimit) * 100} className="h-2" />
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={promo.isActive}
                    onCheckedChange={(checked) => updatePromotion(promo.id, { isActive: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {promo.isActive ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(promo.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {promotions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No promotions</h3>
            <p className="text-muted-foreground mt-1">Create your first promotional code</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promotion code.
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
