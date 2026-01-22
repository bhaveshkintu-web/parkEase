"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDataStore } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Shield,
  CreditCard,
  Car,
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Trash2,
  Lock,
  Mail,
  Smartphone,
  Megaphone,
  MapPin,
  Clock,
  Globe,
  Moon,
  Sun,
} from "lucide-react";

export default function SettingsPage() {
  const { user, updatePreferences, changePassword, deleteAccount, logout } = useAuth();
  const { vehicles, payments } = useDataStore();
  const router = useRouter();
  const { toast } = useToast();

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: user?.preferences?.notifications?.email ?? true,
    sms: user?.preferences?.notifications?.sms ?? false,
    marketing: user?.preferences?.notifications?.marketing ?? false,
  });

  // Default selections
  const [defaultVehicleId, setDefaultVehicleId] = useState(
    user?.preferences?.defaultVehicleId || "no-default"
  );
  const [defaultPaymentId, setDefaultPaymentId] = useState(
    user?.preferences?.defaultPaymentId || "no-default"
  );

  // Password change
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Loading states
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Handle notification toggle
  const handleNotificationToggle = async (
    key: "email" | "sms" | "marketing",
    value: boolean
  ) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
    setSavingNotifications(true);

    const result = await updatePreferences({
      notifications: { ...notifications, [key]: value },
    });

    setSavingNotifications(false);

    if (result.success) {
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    } else {
      // Revert on error
      setNotifications((prev) => ({ ...prev, [key]: !value }));
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle default vehicle change
  const handleDefaultVehicleChange = async (vehicleId: string) => {
    setDefaultVehicleId(vehicleId);
    setSavingDefaults(true);

    const result = await updatePreferences({
      defaultVehicleId: vehicleId || undefined,
    });

    setSavingDefaults(false);

    if (result.success) {
      toast({
        title: "Default vehicle updated",
        description: "Your default vehicle has been saved.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update default vehicle.",
        variant: "destructive",
      });
    }
  };

  // Handle default payment change
  const handleDefaultPaymentChange = async (paymentId: string) => {
    setDefaultPaymentId(paymentId);
    setSavingDefaults(true);

    const result = await updatePreferences({
      defaultPaymentId: paymentId || undefined,
    });

    setSavingDefaults(false);

    if (result.success) {
      toast({
        title: "Default payment updated",
        description: "Your default payment method has been saved.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update default payment.",
        variant: "destructive",
      });
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    // Validate
    const errors: Record<string, string> = {};

    if (!passwordForm.current) {
      errors.current = "Current password is required";
    }
    if (!passwordForm.new) {
      errors.new = "New password is required";
    } else if (passwordForm.new.length < 8) {
      errors.new = "Password must be at least 8 characters";
    }
    if (!passwordForm.confirm) {
      errors.confirm = "Please confirm your new password";
    } else if (passwordForm.new !== passwordForm.confirm) {
      errors.confirm = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);
    const result = await changePassword(passwordForm.current, passwordForm.new);
    setChangingPassword(false);

    if (result.success) {
      setPasswordDialogOpen(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
      setPasswordErrors({});
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    } else {
      setPasswordErrors({ current: result.error || "Failed to change password" });
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      return;
    }

    setDeletingAccount(true);
    const result = await deleteAccount();
    setDeletingAccount(false);

    if (result.success) {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      router.push("/");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete account.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and security settings
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Defaults</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications" className="text-base font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive booking confirmations, reminders, and receipts via email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    handleNotificationToggle("email", checked)
                  }
                  disabled={savingNotifications}
                />
              </div>

              <Separator />

              {/* SMS Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sms-notifications" className="text-base font-medium">
                      SMS Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get text alerts for check-in reminders and important updates
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={notifications.sms}
                  onCheckedChange={(checked) =>
                    handleNotificationToggle("sms", checked)
                  }
                  disabled={savingNotifications}
                />
              </div>

              <Separator />

              {/* Marketing Communications */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="marketing-notifications" className="text-base font-medium">
                      Marketing Communications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive special offers, discounts, and promotional content
                    </p>
                  </div>
                </div>
                <Switch
                  id="marketing-notifications"
                  checked={notifications.marketing}
                  onCheckedChange={(checked) =>
                    handleNotificationToggle("marketing", checked)
                  }
                  disabled={savingNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Types Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What you'll receive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Reminders</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check-in/out reminders 24 hours before your reservation
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Confirmations</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Instant confirmation when you book or modify reservations
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Receipts</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digital receipts for all completed transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Default Vehicle
              </CardTitle>
              <CardDescription>
                Select a vehicle to be pre-filled when making reservations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vehicles.length > 0 ? (
                <Select
                  value={defaultVehicleId}
                  onValueChange={handleDefaultVehicleChange}
                  disabled={savingDefaults}
                >
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder="Select a default vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-default">No default</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </span>
                          <span className="text-muted-foreground">
                            ({vehicle.licensePlate})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <Car className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No vehicles saved yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/account/vehicles/new")}
                  >
                    Add Vehicle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Default Payment Method
              </CardTitle>
              <CardDescription>
                Select a payment method to be used by default for bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Select
                  value={defaultPaymentId}
                  onValueChange={handleDefaultPaymentChange}
                  disabled={savingDefaults}
                >
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder="Select a default payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-default">No default</SelectItem>
                    {payments.map((payment) => (
                      <SelectItem key={payment.id} value={payment.id}>
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{payment.brand}</span>
                          <span className="text-muted-foreground">
                            ending in {payment.last4}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No payment methods saved yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/account/payments/new")}
                  >
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current password</p>
                  <p className="text-sm text-muted-foreground">
                    Last changed: Never
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                    Not Enabled
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Protect your account with 2FA
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Enable 2FA
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Two-factor authentication is coming soon. We'll notify you when it's available.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage devices where you're currently logged in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">
                        Web Browser - Active now
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    This device
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 bg-transparent"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                Sign out of all devices
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-6">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium text-foreground">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm mb-2">
                  What happens when you delete your account:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    All your personal information will be permanently erased
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    Your reservation history will be deleted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    Saved vehicles and payment methods will be removed
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    This action cannot be undone
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Your Data</CardTitle>
              <CardDescription>
                Download a copy of your data before deleting your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                Download My Data
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Your data will be exported as a JSON file containing your profile,
                reservations, and saved information.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({ ...prev, current: e.target.value }));
                    setPasswordErrors((prev) => ({ ...prev, current: "" }));
                  }}
                  className={passwordErrors.current ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordErrors.current && (
                <p className="text-sm text-destructive">{passwordErrors.current}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.new}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({ ...prev, new: e.target.value }));
                    setPasswordErrors((prev) => ({ ...prev, new: "" }));
                  }}
                  className={passwordErrors.new ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordErrors.new && (
                <p className="text-sm text-destructive">{passwordErrors.new}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }));
                    setPasswordErrors((prev) => ({ ...prev, confirm: "" }));
                  }}
                  className={passwordErrors.confirm ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordErrors.confirm && (
                <p className="text-sm text-destructive">{passwordErrors.confirm}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false);
                setPasswordForm({ current: "", new: "", confirm: "" });
                setPasswordErrors({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete your
                account and remove all your data from our servers.
              </p>
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "DELETE" || deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
