"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, DEMO_ACCOUNTS } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Car,
  User,
  Building2,
  Shield,
  QrCode,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Wallet,
  MapPin,
  Users,
  BarChart3,
  CreditCard,
  Calendar,
  Settings,
  FileText,
} from "lucide-react";

type DemoRole = keyof typeof DEMO_ACCOUNTS;

const roleIcons: Record<DemoRole, React.ReactNode> = {
  customer: <User className="w-6 h-6" />,
  owner: <Building2 className="w-6 h-6" />,
  watchman: <QrCode className="w-6 h-6" />,
  admin: <Shield className="w-6 h-6" />,
};

const roleColors: Record<DemoRole, string> = {
  customer: "bg-blue-500/10 text-blue-600 border-blue-200",
  owner: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  watchman: "bg-amber-500/10 text-amber-600 border-amber-200",
  admin: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const roleFeatures: Record<DemoRole, { icon: React.ReactNode; label: string }[]> = {
  customer: [
    { icon: <MapPin className="w-4 h-4" />, label: "Search & book parking" },
    { icon: <Calendar className="w-4 h-4" />, label: "Manage reservations" },
    { icon: <Car className="w-4 h-4" />, label: "Save vehicles" },
    { icon: <CreditCard className="w-4 h-4" />, label: "Payment methods" },
  ],
  owner: [
    { icon: <MapPin className="w-4 h-4" />, label: "Manage locations" },
    { icon: <Users className="w-4 h-4" />, label: "Manage watchmen" },
    { icon: <Wallet className="w-4 h-4" />, label: "Earnings & wallet" },
    { icon: <BarChart3 className="w-4 h-4" />, label: "Analytics" },
  ],
  watchman: [
    { icon: <QrCode className="w-4 h-4" />, label: "Scan QR codes" },
    { icon: <Car className="w-4 h-4" />, label: "Check-in/out vehicles" },
    { icon: <FileText className="w-4 h-4" />, label: "View sessions" },
    { icon: <Calendar className="w-4 h-4" />, label: "Daily reports" },
  ],
  admin: [
    { icon: <Users className="w-4 h-4" />, label: "User management" },
    { icon: <MapPin className="w-4 h-4" />, label: "All locations" },
    { icon: <Settings className="w-4 h-4" />, label: "System settings" },
    { icon: <BarChart3 className="w-4 h-4" />, label: "Platform analytics" },
  ],
};

export default function DemoAccessPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, logout } = useAuth();
  const [loadingRole, setLoadingRole] = useState<DemoRole | null>(null);
  const [successRole, setSuccessRole] = useState<DemoRole | null>(null);

  const handleDemoLogin = async (role: DemoRole) => {
    const account = DEMO_ACCOUNTS[role];
    setLoadingRole(role);
    setSuccessRole(null);

    const result = await login(account.email, account.password);

    if (result.success) {
      setSuccessRole(role);
      setTimeout(() => {
        router.push(account.dashboardUrl);
      }, 500);
    } else {
      setLoadingRole(null);
    }
  };

  const roles: DemoRole[] = ["customer", "owner", "watchman", "admin"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">ParkEase</span>
          </Link>
          {isAuthenticated && user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Logged in as <span className="font-medium text-foreground">{user.firstName}</span>
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4">
              Demo Access
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
              Explore ParkEase by Role
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
              Choose a demo account to experience all features available for each role. 
              No registration required - instant access to fully functional dashboards.
            </p>
          </div>

          {/* Current Session Banner */}
          {isAuthenticated && user && (
            <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Currently signed in as {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      Role: {user.role} | {user.email}
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href={DEMO_ACCOUNTS[user.role as DemoRole]?.dashboardUrl || "/account"}>
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Role Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {roles.map((role) => {
              const account = DEMO_ACCOUNTS[role];
              const isLoading = loadingRole === role;
              const isSuccess = successRole === role;
              const isCurrentRole = isAuthenticated && user?.role === role;

              return (
                <Card
                  key={role}
                  className={`relative overflow-hidden transition-all ${
                    isCurrentRole ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {isCurrentRole && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border ${roleColors[role]}`}>
                        {roleIcons[role]}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl capitalize">{role} Account</CardTitle>
                        <CardDescription className="mt-1">{account.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <div className="space-y-4">
                      {/* Features */}
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Key Features:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {roleFeatures[role].map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="text-primary">{feature.icon}</span>
                              {feature.label}
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Credentials */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          Demo Credentials
                        </p>
                        <div className="space-y-1 text-sm font-mono">
                          <p>
                            <span className="text-muted-foreground">Email:</span>{" "}
                            <span className="text-foreground">{account.email}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Pass:</span>{" "}
                            <span className="text-foreground">{account.password}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleDemoLogin(role)}
                      disabled={isLoading || loadingRole !== null}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : isSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          Access {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Security Note */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4" />
              <span>Demo accounts are reset periodically. No real data is stored.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/auth/login">Standard Login</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/register">Create Account</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
