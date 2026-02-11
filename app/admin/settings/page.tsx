"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Settings,
  Percent,
  Tag,
  Bell,
  Shield,
  Mail,
  Globe,
  Save,
  Plus,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  History,
  AlertTriangle,
  CheckCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getGeneralSettings,
  getNotificationSettings,
  updateGeneralSettings,
  updateNotificationSettings,
  seedDefaultSettings,
  getSettingsAuditLog,
  type PlatformSettingsData,
  type NotificationSettingsData,
} from "@/lib/actions/settings-actions";
import {
  getCommissionRules,
  addCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
} from "@/lib/actions/commission-actions";
import {
  getPromotions,
  addPromotion,
  updatePromotion,
  deletePromotion,
} from "@/lib/actions/promotion-actions";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue: any;
  newValue: any;
  changedBy: string;
  changedByName?: string;
  changedAt: Date;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState<PlatformSettingsData>({
    platformName: "ParkEase",
    supportEmail: "support@parkease.com",
    termsOfServiceUrl: "/terms",
    privacyPolicyUrl: "/privacy",
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: true,
    minBookingDuration: 120,
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsData>({
    emailEnabled: true,
    bookingConfirmations: true,
    bookingReminders: true,
    marketingEmails: false,
    smsEnabled: true,
    checkInReminders: true,
    checkOutAlerts: true,
  });

  // Commission Rules State
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<any>(null);
  const [commissionForm, setCommissionForm] = useState({
    name: "",
    type: "percentage",
    value: 0,
    appliesTo: "all",
    minBookingValue: "",
    maxCommission: "",
    priority: 0,
    isActive: true,
  });

  // Promotions State
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [promoForm, setPromoForm] = useState({
    code: "",
    name: "",
    type: "percentage",
    value: 0,
    minBookingValue: "",
    maxDiscount: "",
    usageLimit: "",
    validFrom: "",
    validUntil: "",
    isActive: true,
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "commission" | "promotion"; id: string } | null>(null);

  // Fake admin ID for now (should come from auth context)
  const adminId = "admin-user-id";

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Seed default settings if needed
        await seedDefaultSettings();

        const [general, notifications, rules, promos] = await Promise.all([
          getGeneralSettings(),
          getNotificationSettings(),
          getCommissionRules(),
          getPromotions(),
        ]);

        setGeneralSettings(general);
        setNotificationSettings(notifications);
        setCommissions(rules as any[]);
        setPromotions(promos as any[]);
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Handle General Settings Save
  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const result = await updateGeneralSettings(generalSettings, adminId);
      if (result.success) {
        toast({
          title: "Settings saved",
          description: "General settings have been updated successfully",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save general settings",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  // Handle Notification Settings Save
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const result = await updateNotificationSettings(notificationSettings, adminId);
      if (result.success) {
        toast({
          title: "Settings saved",
          description: "Notification settings have been updated successfully",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  // Toggle Maintenance Mode with confirmation
  const handleToggleMaintenance = () => {
    if (!generalSettings.maintenanceMode) {
      setShowMaintenanceConfirm(true);
    } else {
      updateMaintenanceMode(false);
    }
  };

  const updateMaintenanceMode = async (enabled: boolean) => {
    setGeneralSettings((prev) => ({ ...prev, maintenanceMode: enabled }));
    const result = await updateGeneralSettings({ maintenanceMode: enabled }, adminId);
    if (result.success) {
      toast({
        title: enabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: enabled
          ? "Platform is now in maintenance mode. Only admins can access."
          : "Platform is now accessible to all users.",
        variant: enabled ? "destructive" : "default",
      });
    }
    setShowMaintenanceConfirm(false);
  };

  // Commission CRUD
  const resetCommissionForm = () => {
    setCommissionForm({
      name: "",
      type: "percentage",
      value: 0,
      appliesTo: "all",
      minBookingValue: "",
      maxCommission: "",
      priority: 0,
      isActive: true,
    });
    setEditingCommission(null);
  };

  const handleEditCommission = (rule: any) => {
    setEditingCommission(rule);
    setCommissionForm({
      name: rule.name,
      type: rule.type,
      value: rule.value,
      appliesTo: rule.appliesTo,
      minBookingValue: rule.minBookingValue?.toString() || "",
      maxCommission: rule.maxCommission?.toString() || "",
      priority: rule.priority || 0,
      isActive: rule.isActive,
    });
    setIsCommissionDialogOpen(true);
  };

  const handleSaveCommission = async () => {
    setIsSaving(true);
    try {
      const data = {
        ...commissionForm,
        value: Number(commissionForm.value),
        minBookingValue: commissionForm.minBookingValue ? Number(commissionForm.minBookingValue) : undefined,
        maxCommission: commissionForm.maxCommission ? Number(commissionForm.maxCommission) : undefined,
        priority: Number(commissionForm.priority),
      };

      let result;
      if (editingCommission) {
        result = await updateCommissionRule(editingCommission.id, data, adminId);
      } else {
        result = await addCommissionRule(data, adminId);
      }

      if (result.success) {
        const rules = await getCommissionRules();
        setCommissions(rules as any[]);
        setIsCommissionDialogOpen(false);
        resetCommissionForm();
        toast({
          title: editingCommission ? "Rule updated" : "Rule created",
          description: "Commission rule has been saved successfully",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save commission rule",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleToggleCommission = async (id: string, isActive: boolean) => {
    await updateCommissionRule(id, { isActive }, adminId);
    const rules = await getCommissionRules();
    setCommissions(rules as any[]);
  };

  const handleDeleteCommission = async () => {
    if (!deleteTarget || deleteTarget.type !== "commission") return;
    await deleteCommissionRule(deleteTarget.id, adminId);
    const rules = await getCommissionRules();
    setCommissions(rules as any[]);
    setDeleteTarget(null);
    toast({ title: "Commission rule deleted" });
  };

  // Promotion CRUD
  const resetPromoForm = () => {
    setPromoForm({
      code: "",
      name: "",
      type: "percentage",
      value: 0,
      minBookingValue: "",
      maxDiscount: "",
      usageLimit: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
    });
    setEditingPromo(null);
  };

  const handleEditPromo = (promo: any) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code,
      name: promo.name,
      type: promo.type,
      value: promo.value,
      minBookingValue: promo.minBookingValue?.toString() || "",
      maxDiscount: promo.maxDiscount?.toString() || "",
      usageLimit: promo.usageLimit?.toString() || "",
      validFrom: new Date(promo.validFrom).toISOString().split("T")[0],
      validUntil: new Date(promo.validUntil).toISOString().split("T")[0],
      isActive: promo.isActive,
    });
    setIsPromoDialogOpen(true);
  };

  const handleSavePromo = async () => {
    setIsSaving(true);
    try {
      const data = {
        ...promoForm,
        value: Number(promoForm.value),
        minBookingValue: promoForm.minBookingValue ? Number(promoForm.minBookingValue) : undefined,
        maxDiscount: promoForm.maxDiscount ? Number(promoForm.maxDiscount) : undefined,
        usageLimit: promoForm.usageLimit ? Number(promoForm.usageLimit) : undefined,
      };

      let result;
      if (editingPromo) {
        result = await updatePromotion(editingPromo.id, data, adminId);
      } else {
        result = await addPromotion(data, adminId);
      }

      if (result.success) {
        const promos = await getPromotions();
        setPromotions(promos as any[]);
        setIsPromoDialogOpen(false);
        resetPromoForm();
        toast({
          title: editingPromo ? "Promotion updated" : "Promotion created",
          description: "Promotion has been saved successfully",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save promotion",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleTogglePromo = async (id: string, isActive: boolean) => {
    await updatePromotion(id, { isActive }, adminId);
    const promos = await getPromotions();
    setPromotions(promos as any[]);
  };

  const handleDeletePromo = async () => {
    if (!deleteTarget || deleteTarget.type !== "promotion") return;
    await deletePromotion(deleteTarget.id, adminId);
    const promos = await getPromotions();
    setPromotions(promos as any[]);
    setDeleteTarget(null);
    toast({ title: "Promotion deleted" });
  };

  // Audit Log
  const handleViewAuditLog = async () => {
    setShowAuditLog(true);
    const logs = await getSettingsAuditLog(undefined, 50);
    setAuditLog(logs as AuditEntry[]);
  };

  const isPromoExpired = (promo: any) => new Date(promo.validUntil) < new Date();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Platform Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure platform-wide settings, commissions, and promotions
          </p>
        </div>
        <Button variant="outline" onClick={handleViewAuditLog}>
          <History className="mr-2 h-4 w-4" />
          View Audit Log
        </Button>
      </div>

      {/* Maintenance Mode Alert */}
      {generalSettings.maintenanceMode && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-destructive">
              Maintenance Mode is Active
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The platform is currently inaccessible to non-admin users.
          </p>
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Commissions</span>
            <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
              {commissions.filter((c) => c.isActive).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="promotions" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Promotions</span>
            <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
              {promotions.filter((p) => p.isActive && !isPromoExpired(p)).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Platform Information
              </CardTitle>
              <CardDescription>
                Basic platform settings and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={generalSettings.platformName}
                    onChange={(e) =>
                      setGeneralSettings((prev) => ({
                        ...prev,
                        platformName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) =>
                      setGeneralSettings((prev) => ({
                        ...prev,
                        supportEmail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="termsUrl">Terms of Service URL</Label>
                <Input
                  id="termsUrl"
                  value={generalSettings.termsOfServiceUrl}
                  onChange={(e) =>
                    setGeneralSettings((prev) => ({
                      ...prev,
                      termsOfServiceUrl: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
                <Input
                  id="privacyUrl"
                  value={generalSettings.privacyPolicyUrl}
                  onChange={(e) =>
                    setGeneralSettings((prev) => ({
                      ...prev,
                      privacyPolicyUrl: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveGeneral} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Controls
              </CardTitle>
              <CardDescription>
                Platform-wide operational settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    Maintenance Mode
                    {generalSettings.maintenanceMode && (
                      <Badge variant="destructive">Active</Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable the platform for maintenance
                  </p>
                </div>
                <Switch
                  checked={generalSettings.maintenanceMode}
                  onCheckedChange={handleToggleMaintenance}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to create accounts
                  </p>
                </div>
                <Switch
                  checked={generalSettings.allowRegistrations}
                  onCheckedChange={async (checked) => {
                    setGeneralSettings((prev) => ({
                      ...prev,
                      allowRegistrations: checked,
                    }));
                    await updateGeneralSettings(
                      { allowRegistrations: checked },
                      adminId
                    );
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify email before booking
                  </p>
                </div>
                <Switch
                  checked={generalSettings.requireEmailVerification}
                  onCheckedChange={async (checked) => {
                    setGeneralSettings((prev) => ({
                      ...prev,
                      requireEmailVerification: checked,
                    }));
                    await updateGeneralSettings(
                      { requireEmailVerification: checked },
                      adminId
                    );
                  }}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-6">
                <div className="space-y-0.5">
                  <Label htmlFor="minBookingDuration">Minimum Booking Duration</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimum required time for a booking (in minutes).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    id="minBookingDuration"
                    type="number"
                    className="w-24 text-right"
                    value={generalSettings.minBookingDuration}
                    onChange={(e) => 
                      setGeneralSettings((prev) => ({
                        ...prev,
                        minBookingDuration: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      await updateGeneralSettings({ minBookingDuration: generalSettings.minBookingDuration }, adminId);
                      setIsSaving(false);
                      toast({ title: "Setting updated", description: "Minimum booking duration has been saved." });
                    }}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Settings */}
        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Commission Rules</CardTitle>
                <CardDescription>
                  Configure platform commission rates for different booking types
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetCommissionForm();
                  setIsCommissionDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="hidden sm:table-cell">Applies To</TableHead>
                      <TableHead className="hidden md:table-cell">Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell className="capitalize">{rule.type}</TableCell>
                        <TableCell>
                          {rule.type === "percentage" ? `${rule.value}%` : `$${rule.value}`}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell capitalize">
                          {rule.appliesTo === "all" ? "All Bookings" : `${rule.appliesTo} Parking`}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{rule.priority || 0}</TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleCommission(rule.id, !rule.isActive)}
                          >
                            {rule.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCommission(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteTarget({ type: "commission", id: rule.id })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotion Settings */}
        <TabsContent value="promotions" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Active Promotions</p>
                <p className="text-2xl font-bold text-foreground">
                  {promotions.filter((p) => p.isActive && !isPromoExpired(p)).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Redemptions</p>
                <p className="text-2xl font-bold text-foreground">
                  {promotions.reduce((sum, p) => sum + (p.usedCount || 0), 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-foreground">
                  {promotions.filter(isPromoExpired).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Disabled</p>
                <p className="text-2xl font-bold text-foreground">
                  {promotions.filter((p) => !p.isActive).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Promotional Codes</CardTitle>
                <CardDescription>
                  Manage discount codes and promotional offers
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetPromoForm();
                  setIsPromoDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Promo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead className="hidden sm:table-cell">Name</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="hidden md:table-cell">Usage</TableHead>
                      <TableHead className="hidden lg:table-cell">Valid Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promo) => (
                      <TableRow
                        key={promo.id}
                        className={!promo.isActive || isPromoExpired(promo) ? "opacity-60" : ""}
                      >
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                            {promo.code}
                          </code>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{promo.name}</TableCell>
                        <TableCell>
                          {promo.type === "percentage"
                            ? `${promo.value}%`
                            : promo.type === "fixed"
                            ? `$${promo.value}`
                            : `${promo.value} day${promo.value > 1 ? "s" : ""}`}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {promo.usedCount || 0} / {promo.usageLimit || "∞"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {new Date(promo.validUntil).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {isPromoExpired(promo) ? (
                            <Badge variant="outline">Expired</Badge>
                          ) : promo.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePromo(promo.id, !promo.isActive)}
                          >
                            {promo.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPromo(promo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteTarget({ type: "promotion", id: promo.id })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications to users
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      emailEnabled: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Booking Confirmations</Label>
                  <p className="text-sm text-muted-foreground">
                    Send confirmation emails for new bookings
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.bookingConfirmations}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      bookingConfirmations: checked,
                    }))
                  }
                  disabled={!notificationSettings.emailEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Booking Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminder emails before check-in
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.bookingReminders}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      bookingReminders: checked,
                    }))
                  }
                  disabled={!notificationSettings.emailEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Send promotional and marketing emails
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.marketingEmails}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      marketingEmails: checked,
                    }))
                  }
                  disabled={!notificationSettings.emailEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Notifications
              </CardTitle>
              <CardDescription>
                Configure SMS notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications to users
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.smsEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      smsEnabled: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Check-in Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS reminder 1 hour before check-in
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.checkInReminders}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      checkInReminders: checked,
                    }))
                  }
                  disabled={!notificationSettings.smsEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Check-out Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS alert when approaching check-out time
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.checkOutAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      checkOutAlerts: checked,
                    }))
                  }
                  disabled={!notificationSettings.smsEnabled}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Notification Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Commission Dialog */}
      <Dialog
        open={isCommissionDialogOpen}
        onOpenChange={(open) => {
          setIsCommissionDialogOpen(open);
          if (!open) resetCommissionForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCommission ? "Edit Commission Rule" : "Add Commission Rule"}
            </DialogTitle>
            <DialogDescription>
              Configure commission settings for bookings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                placeholder="Standard Commission"
                value={commissionForm.name}
                onChange={(e) =>
                  setCommissionForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={commissionForm.type}
                  onValueChange={(v) =>
                    setCommissionForm((prev) => ({ ...prev, type: v }))
                  }
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
                    {commissionForm.type === "percentage" ? "%" : "$"}
                  </span>
                  <Input
                    type="number"
                    className="pl-8"
                    value={commissionForm.value}
                    onChange={(e) =>
                      setCommissionForm((prev) => ({
                        ...prev,
                        value: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select
                  value={commissionForm.appliesTo}
                  onValueChange={(v) =>
                    setCommissionForm((prev) => ({ ...prev, appliesTo: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bookings</SelectItem>
                    <SelectItem value="airport">Airport Parking</SelectItem>
                    <SelectItem value="monthly">Monthly Bookings</SelectItem>
                    <SelectItem value="hourly">Hourly Parking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={commissionForm.priority}
                  onChange={(e) =>
                    setCommissionForm((prev) => ({
                      ...prev,
                      priority: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Booking Value (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-8"
                    placeholder="0"
                    value={commissionForm.minBookingValue}
                    onChange={(e) =>
                      setCommissionForm((prev) => ({
                        ...prev,
                        minBookingValue: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Max Commission (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-8"
                    placeholder="No limit"
                    value={commissionForm.maxCommission}
                    onChange={(e) =>
                      setCommissionForm((prev) => ({
                        ...prev,
                        maxCommission: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={commissionForm.isActive}
                onCheckedChange={(checked) =>
                  setCommissionForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCommissionDialogOpen(false);
                resetCommissionForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCommission}
              disabled={isSaving || !commissionForm.name}
            >
              {isSaving
                ? "Saving..."
                : editingCommission
                ? "Update Rule"
                : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promotion Dialog */}
      <Dialog
        open={isPromoDialogOpen}
        onOpenChange={(open) => {
          setIsPromoDialogOpen(open);
          if (!open) resetPromoForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? "Edit Promotion" : "Create Promotion"}
            </DialogTitle>
            <DialogDescription>
              Configure promotional discount settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Promo Code</Label>
                <Input
                  placeholder="SUMMER20"
                  value={promoForm.code}
                  onChange={(e) =>
                    setPromoForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Summer Sale"
                  value={promoForm.name}
                  onChange={(e) =>
                    setPromoForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={promoForm.type}
                  onValueChange={(v) =>
                    setPromoForm((prev) => ({ ...prev, type: v }))
                  }
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
                    {promoForm.type === "percentage"
                      ? "%"
                      : promoForm.type === "fixed"
                      ? "$"
                      : ""}
                  </span>
                  <Input
                    type="number"
                    className={promoForm.type !== "free_day" ? "pl-8" : ""}
                    value={promoForm.value}
                    onChange={(e) =>
                      setPromoForm((prev) => ({
                        ...prev,
                        value: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={promoForm.validFrom}
                  onChange={(e) =>
                    setPromoForm((prev) => ({ ...prev, validFrom: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={promoForm.validUntil}
                  onChange={(e) =>
                    setPromoForm((prev) => ({ ...prev, validUntil: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Booking Value</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-8"
                    placeholder="Optional"
                    value={promoForm.minBookingValue}
                    onChange={(e) =>
                      setPromoForm((prev) => ({
                        ...prev,
                        minBookingValue: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              {promoForm.type === "percentage" && (
                <div className="space-y-2">
                  <Label>Max Discount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      className="pl-8"
                      placeholder="No limit"
                      value={promoForm.maxDiscount}
                      onChange={(e) =>
                        setPromoForm((prev) => ({
                          ...prev,
                          maxDiscount: e.target.value,
                        }))
                      }
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
                value={promoForm.usageLimit}
                onChange={(e) =>
                  setPromoForm((prev) => ({
                    ...prev,
                    usageLimit: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={promoForm.isActive}
                onCheckedChange={(checked) =>
                  setPromoForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPromoDialogOpen(false);
                resetPromoForm();
              }}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePromo}
              disabled={
                isSaving ||
                !promoForm.code ||
                !promoForm.name ||
                !promoForm.validFrom ||
                !promoForm.validUntil
              }
            >
              {isSaving ? "Saving..." : editingPromo ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "commission" ? "Commission Rule" : "Promotion"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {deleteTarget?.type === "commission" ? "commission rule" : "promotion"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={
                deleteTarget?.type === "commission"
                  ? handleDeleteCommission
                  : handleDeletePromo
              }
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Maintenance Mode Confirmation */}
      <AlertDialog
        open={showMaintenanceConfirm}
        onOpenChange={setShowMaintenanceConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Enable Maintenance Mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately block all non-admin users from accessing the
              platform. Only administrators will be able to use the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateMaintenanceMode(true)}
              className="bg-destructive text-destructive-foreground"
            >
              Enable Maintenance Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Settings Audit Log
            </DialogTitle>
            <DialogDescription>
              Recent changes to platform settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {auditLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No audit entries found
              </p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {entry.action}
                        </Badge>
                        <span className="text-sm font-medium">
                          {entry.entityType.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.changedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Changed by: {entry.changedByName || entry.changedBy}
                    </p>
                    {entry.newValue && (
                      <div className="text-xs bg-muted rounded p-2 font-mono overflow-x-auto">
                        {JSON.stringify(entry.newValue, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
