"use client";

import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Car, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Plus, 
  MapPin,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function OwnerDashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Total Locations", value: "0", icon: MapPin, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Total Bookings", value: "0", icon: Calendar, color: "text-green-600", bg: "bg-green-100" },
    { label: "Total Watchmen", value: "0", icon: Users, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Revenue (MTD)", value: "$0.00", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      
      <main className="flex-1 container py-8 pb-16 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Owner Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.firstName}. Here&apos;s what&apos;s happening with your parking locations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href="/owner/locations/new">
                <Plus className="mr-2 h-4 w-4" /> Add Location
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Locations</CardTitle>
                <CardDescription>Manage and monitor your registered parking spots.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No locations yet</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                  You haven&apos;t added any parking locations yet. Click the button below to get started.
                </p>
                <Button variant="outline" className="mt-6" asChild>
                  <Link href="/owner/locations/new">Add Your First Location</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Your most recent customer reservations.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No bookings found</h3>
                <p className="text-muted-foreground mt-2">
                  When customers book your spots, they will appear here.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start bg-card" asChild>
                  <Link href="/owner/watchmen">
                    <Users className="mr-2 h-4 w-4" /> Manage Watchmen
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start bg-card" asChild>
                  <Link href="/owner/analytics">
                    <BarChart3 className="mr-2 h-4 w-4" /> View Analytics
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start bg-card" asChild>
                  <Link href="/owner/settings">
                    <Settings className="mr-2 h-4 w-4" /> Account Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base text-primary">Need Help?</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary/80 mb-4">
                  Our partner support team is available 24/7 to help you with any questions about managing your spots.
                </p>
                <Button size="sm" className="w-full">Contact Support</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
