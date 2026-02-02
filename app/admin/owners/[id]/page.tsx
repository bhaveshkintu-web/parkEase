"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  DollarSign,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/data";

interface OwnerDetails {
  id: string;
  businessName: string;
  businessType: string;
  status: string;
  verificationStatus: string;
  taxId: string | null;
  registrationNumber: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    createdAt: string;
  };
  locations: Array<{
    id: string;
    name: string;
    status: string;
    pricePerDay: number;
    _count: {
      bookings: number;
      reviews: number;
    };
  }>;
  wallet: {
    balance: number;
    currency: string;
  } | null;
}

export default function OwnerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [owner, setOwner] = useState<OwnerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Unwrap params in useEffect
  useEffect(() => {
    params.then((p) => setOwnerId(p.id));
  }, [params]);

  useEffect(() => {
    if (ownerId) {
      fetchOwnerDetails();
    }
  }, [ownerId]);

  const fetchOwnerDetails = async () => {
    if (!ownerId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/owners/${ownerId}`);
      if (response.ok) {
        const data = await response.json();
        setOwner(data.owner);
      } else {
        toast({
          title: "Error",
          description: "Owner not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch owner:", error);
      toast({
        title: "Error",
        description: "Failed to load owner details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!ownerId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve owner");
      }

      toast({
        title: "Owner Approved",
        description: "The owner profile has been approved successfully.",
      });

      fetchOwnerDetails(); // Refresh data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve owner",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!ownerId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject owner");
      }

      toast({
        title: "Owner Rejected",
        description: "The owner profile has been rejected.",
      });

      fetchOwnerDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject owner",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Owner Not Found</h2>
        <p className="text-muted-foreground mb-4">The owner profile you're looking for doesn't exist.</p>
        <Button onClick={() => router.push("/admin/owners")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Owners
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      approved: { variant: "default", label: "Approved" },
      pending: { variant: "secondary", label: "Pending" },
      suspended: { variant: "destructive", label: "Suspended" },
      rejected: { variant: "outline", label: "Rejected" },
    };
    const item = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/owners")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{owner.businessName}</h1>
            <p className="text-muted-foreground">Owner Profile Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {owner.status === "pending" && (
            <>
              <Button variant="outline" onClick={handleReject} disabled={isProcessing}>
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {getStatusBadge(owner.status)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Verification</span>
              <Badge className="capitalize">{owner.verificationStatus}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="font-medium capitalize">{owner.businessType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Locations</span>
              <span className="font-medium">{owner.locations?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owner Details */}
      <Card>
        <CardHeader>
          <CardTitle>Owner Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{owner.user.email}</p>
              </div>
            </div>
            {owner.user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{owner.user.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">
                  {new Date(owner.user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {owner.address && (
            <div>
              <h3 className="font-semibold mb-3">Business Address</h3>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p>{owner.address.street}</p>
                  <p>
                    {owner.address.city}, {owner.address.state} {owner.address.zipCode}
                  </p>
                  <p>{owner.address.country}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locations */}
      {owner.locations && owner.locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parking Locations ({owner.locations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {owner.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {location._count.bookings} bookings · {location._count.reviews} reviews
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(location.pricePerDay)}/day</span>
                    <Badge variant={location.status === "active" ? "default" : "secondary"}>
                      {location.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet */}
      {owner.wallet && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(owner.wallet.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
