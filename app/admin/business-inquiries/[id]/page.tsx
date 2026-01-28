// N
"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessInquiry {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string | null;
  businessType: string;
  message: string | null;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  const [inquiry, setInquiry] = useState<BusinessInquiry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchInquiry();
  }, [id]);

  const fetchInquiry = async () => {
    try {
      const response = await fetch(`/api/admin/business-inquiries/${id}`);
      const data = await response.json();
      if (data.inquiry) {
        setInquiry(data.inquiry);
        setNotes(data.inquiry.notes || "");
        setStatus(data.inquiry.status);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inquiry details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/business-inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) throw new Error("Update failed");

      toast({
        title: "Success",
        description: "Inquiry updated successfully",
      });
      fetchInquiry();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inquiry",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Inquiry not found</h2>
        <Button variant="link" onClick={() => router.push("/admin/business-inquiries")}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/business-inquiries")}
        className="mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Leads
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {inquiry.companyName}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span className="capitalize">{inquiry.businessType.toLowerCase().replace("_", " ")}</span>
            <span>•</span>
            <Calendar className="w-4 h-4" />
            <span>Received {new Date(inquiry.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <Badge
          variant={
            inquiry.status === "NEW"
              ? "default"
              : inquiry.status === "REJECTED"
                ? "destructive"
                : "secondary"
          }
          className="text-sm px-3 py-1"
        >
          {inquiry.status}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Inquiry Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Full Name</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium">{inquiry.fullName}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <a href={`mailto:${inquiry.email}`} className="font-medium hover:underline">
                    {inquiry.email}
                  </a>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <a href={`tel:${inquiry.phone}`} className="font-medium hover:underline">
                    {inquiry.phone}
                  </a>
                </div>
              </div>
              {inquiry.address && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-muted-foreground text-xs uppercase">Office Address</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{inquiry.address}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-primary">Message from Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 italic text-foreground">
                {inquiry.message || "No message provided."}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Lead source: <span className="font-mono">{inquiry.source}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Management Actions */}
        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Manage Lead</CardTitle>
              <CardDescription>Update status and add internal notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="CONVERTED">Converted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add notes about conversations, next steps, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
                <Save className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start">
                <Mail className="w-4 h-4 mr-2" />
                Email Lead
              </Button>
              <Button variant="outline" className="justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button variant="outline" className="justify-start text-destructive hover:bg-destructive/10">
                <XCircle className="w-4 h-4 mr-2" />
                Mark as Rejected
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
