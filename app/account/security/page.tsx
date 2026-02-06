"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { TrustedDevice, LoginActivity } from "@/lib/types";
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
  CardFooter,
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Lock,
  Smartphone,
  Mail,
  Key,
  Monitor,
  Tablet,
  MapPin,
  Clock,
  Fingerprint,
  QrCode,
  Copy,
  RefreshCw,
  Trash2,
  LogOut,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  History,
  ShieldCheck,
  ShieldAlert,
  Bell,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function SecurityPage() {
  const {
    user,
    updateSecurityPreferences,
    changePassword,
    enableTwoFactor,
    disableTwoFactor,
    verifyTwoFactor,
    getTrustedDevices,
    removeTrustedDevice,
    getLoginActivity,
    revokeAllSessions,
  } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Security preferences state
  const [securitySettings, setSecuritySettings] = useState({
    loginAlerts: user?.preferences?.security?.loginAlerts ?? true,
    loginAlertEmail: user?.preferences?.security?.loginAlertEmail ?? true,
    loginAlertSms: user?.preferences?.security?.loginAlertSms ?? false,
    sessionTimeout: user?.preferences?.security?.sessionTimeout ?? 30,
    requirePasswordForSensitive: user?.preferences?.security?.requirePasswordForSensitive ?? true,
  });

  // Two-factor authentication state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    user?.preferences?.security?.twoFactorEnabled ?? false
  );
  const [twoFactorMethod, setTwoFactorMethod] = useState<"authenticator" | "sms" | "email" | undefined>(
    user?.preferences?.security?.twoFactorMethod
  );
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [twoFactorSetupStep, setTwoFactorSetupStep] = useState<"method" | "setup" | "verify">("method");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disableTwoFactorDialogOpen, setDisableTwoFactorDialogOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  // Password change state
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
    disable: false,
  });

  // Trusted devices state
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [deviceToRemove, setDeviceToRemove] = useState<TrustedDevice | null>(null);

  // Login activity state
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);

  // Session management state
  const [revokeSessionsDialogOpen, setRevokeSessionsDialogOpen] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Load trusted devices and login activity
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const [devices, activity] = await Promise.all([
            getTrustedDevices(),
            getLoginActivity()
        ]);
        setTrustedDevices(devices);
        setLoginActivity(activity);
        setIsLoading(false);
    };
    
    if (user) {
        fetchData();
    }
  }, [user, getTrustedDevices, getLoginActivity]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/auth/login?redirect=/account/security");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate password strength
  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 20;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    if (score < 40) return { score, label: "Weak", color: "bg-red-500" };
    if (score < 70) return { score, label: "Moderate", color: "bg-amber-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(passwordForm.new);

  // Security score calculation
  const getSecurityScore = (): number => {
    let score = 0;
    if (twoFactorEnabled) score += 40;
    if (securitySettings.loginAlerts) score += 20;
    if (securitySettings.requirePasswordForSensitive) score += 20;
    if (user.emailVerified) score += 20;
    return score;
  };

  const securityScore = getSecurityScore();

  // Save security preferences
  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    const result = await updateSecurityPreferences(securitySettings);
    setIsSavingPrefs(false);

    if (result.success) {
      toast({
        title: "Settings saved",
        description: "Your security preferences have been updated.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save preferences.",
        variant: "destructive",
      });
    }
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const result = await changePassword(passwordForm.current, passwordForm.new);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordDialogOpen(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to change password.",
        variant: "destructive",
      });
    }
  };

  // Two-factor authentication handlers
  const handleStartTwoFactorSetup = () => {
    setTwoFactorSetupStep("method");
    setTwoFactorDialogOpen(true);
  };

  const handleSelectTwoFactorMethod = async (method: "authenticator" | "sms" | "email") => {
    setIsLoading(true);
    const result = await enableTwoFactor(method);
    setIsLoading(false);

    if (result.success) {
      setTwoFactorMethod(method);
      if (result.secret) {
        setTwoFactorSecret(result.secret);
      }
      setTwoFactorSetupStep("setup");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to setup two-factor authentication.",
        variant: "destructive",
      });
    }
  };

  const handleVerifyTwoFactor = async () => {
    setIsLoading(true);
    const result = await verifyTwoFactor(verificationCode);
    setIsLoading(false);

    if (result.success) {
      setTwoFactorEnabled(true);
      setTwoFactorDialogOpen(false);
      setVerificationCode("");
      toast({
        title: "Two-factor authentication enabled",
        description: "Your account is now more secure.",
      });
    } else {
      toast({
        title: "Invalid code",
        description: "Please check the code and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisableTwoFactor = async () => {
    setIsLoading(true);
    const result = await disableTwoFactor(disablePassword);
    setIsLoading(false);

    if (result.success) {
      setTwoFactorEnabled(false);
      setTwoFactorMethod(undefined);
      setDisableTwoFactorDialogOpen(false);
      setDisablePassword("");
      toast({
        title: "Two-factor authentication disabled",
        description: "Two-factor authentication has been turned off.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to disable two-factor authentication.",
        variant: "destructive",
      });
    }
  };

  // Trusted device handlers
  const handleRemoveDevice = async () => {
    if (!deviceToRemove) return;

    setIsLoading(true);
    const result = await removeTrustedDevice(deviceToRemove.id);
    setIsLoading(false);

    if (result.success) {
      setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceToRemove.id));
      setDeviceToRemove(null);
      toast({
        title: "Device removed",
        description: "The device has been removed from your trusted devices.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to remove device.",
        variant: "destructive",
      });
    }
  };

  // Revoke all sessions handler
  const handleRevokeAllSessions = async () => {
    setIsLoading(true);
    const result = await revokeAllSessions();
    setIsLoading(false);

    if (result.success) {
      setRevokeSessionsDialogOpen(false);
      toast({
        title: "All sessions revoked",
        description: "You will need to log in again on other devices.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to revoke sessions.",
        variant: "destructive",
      });
    }
  };

  const getDeviceIcon = (type: TrustedDevice["type"]) => {
    switch (type) {
      case "desktop":
        return <Monitor className="w-5 h-5" />;
      case "mobile":
        return <Smartphone className="w-5 h-5" />;
      case "tablet":
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: LoginActivity["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "blocked":
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-4xl py-6 px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Account
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Security Settings</h1>
              <p className="text-muted-foreground">
                Manage your account security and authentication preferences
              </p>
            </div>
          </div>
        </div>

        {/* Security Score Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-full ${
                    securityScore >= 80
                      ? "bg-green-100 text-green-600"
                      : securityScore >= 50
                        ? "bg-amber-100 text-amber-600"
                        : "bg-red-100 text-red-600"
                  }`}
                >
                  {securityScore >= 80 ? (
                    <ShieldCheck className="w-8 h-8" />
                  ) : (
                    <ShieldAlert className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Security Score</h3>
                  <p className="text-sm text-muted-foreground">
                    {securityScore >= 80
                      ? "Your account is well protected"
                      : securityScore >= 50
                        ? "Some improvements recommended"
                        : "Your account needs attention"}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-48">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl font-bold">{securityScore}%</span>
                  <Badge
                    variant={
                      securityScore >= 80 ? "default" : securityScore >= 50 ? "secondary" : "destructive"
                    }
                  >
                    {securityScore >= 80 ? "Strong" : securityScore >= 50 ? "Moderate" : "Weak"}
                  </Badge>
                </div>
                <Progress
                  value={securityScore}
                  className={`h-2 ${
                    securityScore >= 80
                      ? "[&>div]:bg-green-500"
                      : securityScore >= 50
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-red-500"
                  }`}
                />
              </div>
            </div>

            {securityScore < 80 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Recommendations:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {!twoFactorEnabled && (
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Enable two-factor authentication for extra security
                    </li>
                  )}
                  {!securitySettings.loginAlerts && (
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Turn on login alerts to monitor account activity
                    </li>
                  )}
                  {!user.emailVerified && (
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Verify your email address
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="authentication" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="authentication" className="text-xs sm:text-sm">
              <Key className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
              Auth
            </TabsTrigger>
            <TabsTrigger value="devices" className="text-xs sm:text-sm">
              <Monitor className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">
              <History className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">
              <Bell className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
              Alerts
            </TabsTrigger>
          </TabsList>

          {/* Authentication Tab */}
          <TabsContent value="authentication" className="space-y-6">
            {/* Password Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Password</CardTitle>
                      <CardDescription>Manage your account password</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                    Change Password
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Password last changed</p>
                    <p className="text-sm text-muted-foreground">
                      {user.preferences?.security?.passwordLastChanged
                        ? formatDate(user.preferences.security.passwordLastChanged)
                        : "Never changed"}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Check className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                      <CardDescription>Add an extra layer of security to your account</CardDescription>
                    </div>
                  </div>
                  {twoFactorEnabled ? (
                    <Badge variant="default" className="bg-green-600">
                      <Check className="w-3 h-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {twoFactorEnabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        {twoFactorMethod === "authenticator" && <QrCode className="w-5 h-5 text-green-600" />}
                        {twoFactorMethod === "sms" && <Smartphone className="w-5 h-5 text-green-600" />}
                        {twoFactorMethod === "email" && <Mail className="w-5 h-5 text-green-600" />}
                        <div>
                          <p className="font-medium text-green-800">
                            {twoFactorMethod === "authenticator" && "Authenticator App"}
                            {twoFactorMethod === "sms" && "SMS Verification"}
                            {twoFactorMethod === "email" && "Email Verification"}
                          </p>
                          <p className="text-sm text-green-600">Currently active method</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                        onClick={() => setDisableTwoFactorDialogOpen(true)}
                      >
                        Disable
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication is currently enabled using your{" "}
                      {twoFactorMethod === "authenticator"
                        ? "authenticator app"
                        : twoFactorMethod === "sms"
                          ? "phone number"
                          : "email address"}
                      .
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication adds an extra layer of security by requiring a verification
                      code in addition to your password when signing in.
                    </p>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={handleStartTwoFactorSetup}
                      >
                        <div className="flex items-center gap-3">
                          <QrCode className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">Authenticator App</p>
                            <p className="text-sm text-muted-foreground">
                              Use Google Authenticator or similar apps
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    <Button onClick={handleStartTwoFactorSetup} className="w-full">
                      <Shield className="w-4 h-4 mr-2" />
                      Enable Two-Factor Authentication
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Timeout */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">Session Timeout</CardTitle>
                    <CardDescription>Automatically log out after inactivity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Auto-logout after inactivity</Label>
                    <Select
                      value={securitySettings.sessionTimeout.toString()}
                      onValueChange={(value) =>
                        setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="0">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require password for sensitive actions</Label>
                      <p className="text-sm text-muted-foreground">
                        Re-enter password when changing security settings
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.requirePasswordForSensitive}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({ ...securitySettings, requirePasswordForSensitive: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSavePreferences} disabled={isSavingPrefs}>
                  {isSavingPrefs && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Trusted Devices</CardTitle>
                    <CardDescription>
                      Devices that have accessed your account
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 bg-transparent"
                    onClick={() => setRevokeSessionsDialogOpen(true)}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trustedDevices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No trusted devices found
                    </div>
                  ) : (
                    trustedDevices.map((device) => (
                      <div
                        key={device.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          device.isCurrent ? "bg-primary/5 border-primary/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-lg ${
                              device.isCurrent ? "bg-primary/10 text-primary" : "bg-muted"
                            }`}
                          >
                            {getDeviceIcon(device.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{device.name}</p>
                              {device.isCurrent && (
                                <Badge variant="default" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{device.browser}</span>
                              <span>•</span>
                              <span>{device.os}</span>
                              {device.location && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {device.location}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last active: {formatDate(device.lastActive)}
                            </p>
                          </div>
                        </div>
                        {!device.isCurrent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-red-600"
                            onClick={() => setDeviceToRemove(device)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Login Activity</CardTitle>
                <CardDescription>
                  Monitor recent sign-in attempts to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loginActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity
                    </div>
                  ) : (
                    loginActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          activity.status === "blocked"
                            ? "bg-red-50 border-red-200"
                            : activity.status === "failed"
                              ? "bg-amber-50 border-amber-200"
                              : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-lg ${
                              activity.status === "success"
                                ? "bg-green-100"
                                : activity.status === "failed"
                                  ? "bg-amber-100"
                                  : "bg-red-100"
                            }`}
                          >
                            {getStatusIcon(activity.status)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {activity.status === "success"
                                  ? "Successful login"
                                  : activity.status === "failed"
                                    ? "Failed login attempt"
                                    : "Blocked login attempt"}
                              </p>
                              <Badge
                                variant={
                                  activity.status === "success"
                                    ? "default"
                                    : activity.status === "failed"
                                      ? "secondary"
                                      : "destructive"
                                }
                                className="text-xs"
                              >
                                {activity.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{activity.device}</span>
                              <span>•</span>
                              <span>{activity.browser}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {activity.location}
                              </span>
                              <span>•</span>
                              <span>IP: {activity.ipAddress}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Login Alerts</CardTitle>
                <CardDescription>
                  Get notified when someone signs in to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable login alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new sign-ins
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.loginAlerts}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({ ...securitySettings, loginAlerts: checked })
                    }
                  />
                </div>

                {securitySettings.loginAlerts && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Alert methods</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <Label>Email alerts</Label>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Switch
                          checked={securitySettings.loginAlertEmail}
                          onCheckedChange={(checked) =>
                            setSecuritySettings({ ...securitySettings, loginAlertEmail: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <Label>SMS alerts</Label>
                            <p className="text-sm text-muted-foreground">{user.phone || "No phone added"}</p>
                          </div>
                        </div>
                        <Switch
                          checked={securitySettings.loginAlertSms}
                          onCheckedChange={(checked) =>
                            setSecuritySettings({ ...securitySettings, loginAlertSms: checked })
                          }
                          disabled={!user.phone}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleSavePreferences} disabled={isSavingPrefs}>
                  {isSavingPrefs && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {passwordForm.new && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={passwordStrength.score} className={`h-2 flex-1 [&>div]:${passwordStrength.color}`} />
                      <span className="text-xs font-medium">{passwordStrength.label}</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className={passwordForm.new.length >= 8 ? "text-green-600" : ""}>
                        {passwordForm.new.length >= 8 ? "✓" : "○"} At least 8 characters
                      </li>
                      <li className={/[A-Z]/.test(passwordForm.new) && /[a-z]/.test(passwordForm.new) ? "text-green-600" : ""}>
                        {/[A-Z]/.test(passwordForm.new) && /[a-z]/.test(passwordForm.new) ? "✓" : "○"} Upper & lowercase letters
                      </li>
                      <li className={/\d/.test(passwordForm.new) ? "text-green-600" : ""}>
                        {/\d/.test(passwordForm.new) ? "✓" : "○"} At least one number
                      </li>
                      <li className={/[^a-zA-Z0-9]/.test(passwordForm.new) ? "text-green-600" : ""}>
                        {/[^a-zA-Z0-9]/.test(passwordForm.new) ? "✓" : "○"} Special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={
                  isLoading ||
                  !passwordForm.current ||
                  !passwordForm.new ||
                  passwordForm.new !== passwordForm.confirm ||
                  passwordForm.new.length < 8
                }
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Two-Factor Setup Dialog */}
        <Dialog open={twoFactorDialogOpen} onOpenChange={setTwoFactorDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {twoFactorSetupStep === "method" && "Enable Two-Factor Authentication"}
                {twoFactorSetupStep === "setup" && "Set Up Authenticator"}
                {twoFactorSetupStep === "verify" && "Verify Setup"}
              </DialogTitle>
              <DialogDescription>
                {twoFactorSetupStep === "method" && "Choose how you want to receive verification codes"}
                {twoFactorSetupStep === "setup" && "Scan the QR code with your authenticator app"}
                {twoFactorSetupStep === "verify" && "Enter the code from your authenticator app"}
              </DialogDescription>
            </DialogHeader>

            {twoFactorSetupStep === "method" && (
              <div className="space-y-3">
                <button
                  className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSelectTwoFactorMethod("authenticator")}
                  disabled={isLoading}
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-muted-foreground">
                      Use Google Authenticator, Authy, or similar
                    </p>
                  </div>
                  <Badge>Recommended</Badge>
                </button>
                <button
                  className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSelectTwoFactorMethod("sms")}
                  disabled={isLoading}
                >
                  <div className="p-2 bg-muted rounded-lg">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">SMS</p>
                    <p className="text-sm text-muted-foreground">Receive codes via text message</p>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSelectTwoFactorMethod("email")}
                  disabled={isLoading}
                >
                  <div className="p-2 bg-muted rounded-lg">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">Receive codes via email</p>
                  </div>
                </button>
              </div>
            )}

            {twoFactorSetupStep === "setup" && (
              <div className="space-y-4">
                {twoFactorMethod === "authenticator" && (
                  <>
                    <div className="flex justify-center p-4 bg-white rounded-lg border">
                      <div className="w-48 h-48 bg-muted flex items-center justify-center rounded">
                        <QrCode className="w-24 h-24 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Or enter this code manually:</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                          {twoFactorSecret}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(twoFactorSecret);
                            toast({ title: "Copied to clipboard" });
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                {twoFactorMethod === "sms" && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      A verification code will be sent to {user.phone || "your phone"}
                    </p>
                  </div>
                )}
                {twoFactorMethod === "email" && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      A verification code will be sent to {user.email}
                    </p>
                  </div>
                )}
                <Button className="w-full" onClick={() => setTwoFactorSetupStep("verify")}>
                  Continue
                </Button>
              </div>
            )}

            {twoFactorSetupStep === "verify" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleVerifyTwoFactor}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify and Enable
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Disable Two-Factor Dialog */}
        <Dialog open={disableTwoFactorDialogOpen} onOpenChange={setDisableTwoFactorDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter your password to disable two-factor authentication. This will make your account less
                secure.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Disabling two-factor authentication will reduce your account security. We recommend
                    keeping it enabled.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Enter your password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.disable ? "text" : "password"}
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, disable: !showPasswords.disable })}
                  >
                    {showPasswords.disable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisableTwoFactorDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisableTwoFactor}
                disabled={isLoading || !disablePassword}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Disable 2FA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Device Dialog */}
        <AlertDialog open={!!deviceToRemove} onOpenChange={() => setDeviceToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Trusted Device</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{deviceToRemove?.name}" from your trusted devices? You will
                need to verify your identity again when signing in from this device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveDevice} disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Remove Device
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revoke All Sessions Dialog */}
        <AlertDialog open={revokeSessionsDialogOpen} onOpenChange={setRevokeSessionsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign Out All Devices</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign you out from all devices except your current one. You will need to sign in
                again on other devices.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeAllSessions}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign Out All Devices
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
