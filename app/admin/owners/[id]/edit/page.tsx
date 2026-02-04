"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OwnerData {
  id: string;
  businessName: string;
  businessType: "individual" | "company" | "partnership";
  taxId: string;
  registrationNumber: string;
  website: string;
  description: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  bankAccountName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export default function EditOwnerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const ownerId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<OwnerData>({
    id: "",
    businessName: "",
    businessType: "individual",
    taxId: "",
    registrationNumber: "",
    website: "",
    description: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    bankAccountName: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    user: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    fetchOwner();
  }, [ownerId]);

  const fetchOwner = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/owners/${ownerId}`);
      if (!response.ok) throw new Error("Failed to fetch owner");
      
      const data = await response.json();
      const owner = data.owner;

      // Populate form data from API response
      setFormData({
        id: owner.id,
        businessName: owner.businessName || "",
        businessType: owner.businessType || "individual",
        taxId: owner.taxId || "",
        registrationNumber: owner.registrationNumber || "",
        website: owner.website || "",
        description: owner.description || "",
        street: owner.street || "",
        city: owner.city || "",
        state: owner.state || "",
        zipCode: owner.zipCode || "",
        country: owner.country || "USA",
        bankAccountName: owner.bankAccountName || "",
        bankName: owner.bankName || "",
        accountNumber: owner.accountNumber || "",
        routingNumber: owner.routingNumber || "",
        user: {
          firstName: owner.user.firstName || "",
          lastName: owner.user.lastName || "",
          email: owner.user.email || "",
          phone: owner.user.phone || "",
        },
      });
    } catch (error) {
      console.error("Error fetching owner:", error);
      toast({
        title: "Error",
        description: "Failed to load owner details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update owner:", errorText);
        throw new Error(errorText || "Failed to update owner");
      }

      toast({
        title: "Success",
        description: "Owner profile updated successfully.",
      });
      router.push(`/admin/owners/${ownerId}`);
    } catch (error) {
      console.error("Error updating owner:", error);
      toast({
        title: "Error",
        description: "Failed to update owner profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/owners/${ownerId}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Owner</h1>
            <p className="text-muted-foreground">{formData.businessName}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" asChild>
            <Link href={`/admin/owners/${ownerId}`}>Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Primary contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.user.firstName}
                    onChange={(e) => setFormData({ ...formData, user: { ...formData.user, firstName: e.target.value } })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.user.lastName}
                    onChange={(e) => setFormData({ ...formData, user: { ...formData.user, lastName: e.target.value } })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.user.email}
                  onChange={(e) => setFormData({ ...formData, user: { ...formData.user, email: e.target.value } })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.user.phone}
                  onChange={(e) => setFormData({ ...formData, user: { ...formData.user, phone: e.target.value } })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Company details and registration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(v: any) => setFormData({ ...formData, businessType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
               <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration No.</Label>
                    <Input
                      id="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    />
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Business Address</CardTitle>
              <CardDescription>Primary place of business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Information</CardTitle>
              <CardDescription>For payouts and verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-muted border-none mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Sensitive Information</AlertTitle>
                <AlertDescription>
                  This information is encrypted. Ensure accuracy to prevent payout delays.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="bankAccountName">Account Holder Name</Label>
                <Input
                  id="bankAccountName"
                  value={formData.bankAccountName}
                  onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    value={formData.routingNumber}
                    onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

           {/* Description */}
           <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Business Description</CardTitle>
              <CardDescription>Public overview of the business</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us about the business..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
