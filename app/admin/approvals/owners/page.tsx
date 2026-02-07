"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Eye,
  Clock,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OwnerLead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  city: string;
  state: string;
  country: string;
  status: string;
  createdAt: string;
  isProfile?: boolean;
  profileId?: string;
  userId?: string;
}

export default function OwnerApprovalsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<OwnerLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<OwnerLead | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch owner leads
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching leads from /api/admin/approvals/owners...");
      const response = await fetch("/api/admin/approvals/owners");

      if (response.ok) {
        const data = await response.json();
        console.log("Leads fetched successfully:", data.leads?.length || 0);
        setLeads(data.leads || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch leads:", response.status, errorData);
        toast({
          title: "Error",
          description: `Failed to load owner leads (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      toast({
        title: "Error",
        description: "Failed to load owner leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (leadId: string, action: "approve" | "reject") => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/admin/approvals/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action, notes: adminNotes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} lead`);
      }

      toast({
        title: `Lead ${action === "approve" ? "Approved" : "Rejected"}`,
        description: `The owner lead has been ${action} successfully.`,
      });

      setSelectedLead(null);
      setAdminNotes("");
      fetchLeads(); // Refresh list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} lead`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.fullName.toLowerCase().includes(search.toLowerCase()) ||
      lead.businessName.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = leads.filter((l) => l.status === "pending").length;
  const approvedCount = leads.filter((l) => l.status === "approved").length;
  const rejectedCount = leads.filter((l) => l.status === "rejected").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Owner Approvals</h1>
            <p className="text-muted-foreground">Review and approve new partner inquiries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={isLoading} className="bg-transparent">
            <Clock className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Badge variant="outline" className="py-1.5">
            <Clock className="w-3 h-3 mr-1" />
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="py-1.5 text-green-600 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {approvedCount} Approved
          </Badge>
          <Badge variant="outline" className="py-1.5 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {rejectedCount} Rejected
          </Badge>
        </div>
      </div>

      {/* Filters & Search - Styled like Refund Processing */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, business or email..."
                className="pl-10 h-10 border-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="bg-slate-100 h-10 w-full md:w-auto">
                <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
                <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads
          .filter((lead) => activeTab === "all" || lead.status === activeTab)
          .map((lead) => (
            <Card key={lead.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {lead.fullName}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Building2 className="w-4 h-4" />
                          {lead.businessName} ({lead.businessType})
                          {lead.isProfile && (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Registered Profile
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={lead.status === "approved" ? "default" : lead.status === "rejected" ? "destructive" : "secondary"}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{lead.city}, {lead.state}, {lead.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="font-medium">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none bg-transparent"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                    {lead.status === "pending" && (
                      <Button
                        size="sm"
                        className="flex-1 lg:flex-none"
                        onClick={() => {
                          setSelectedLead(lead);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {filteredLeads.filter((lead) => activeTab === "all" || lead.status === activeTab).length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">No leads found</h3>
              <p className="text-muted-foreground mt-1">
                {activeTab === "pending" ? "No pending leads at this time" : "No leads match your search"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Owner Inquiry</DialogTitle>
            <DialogDescription>
              {selectedLead?.fullName} from {selectedLead?.businessName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Business Type</p>
                <p>{selectedLead?.businessType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Contact Details</p>
                <p>{selectedLead?.phone}</p>
                <p>{selectedLead?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Location</p>
                <p>{selectedLead?.city}, {selectedLead?.state}</p>
                <p>{selectedLead?.country}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Submission Date</p>
                <p>{selectedLead && new Date(selectedLead.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes</label>
              <Textarea
                placeholder="Internal notes about this partner..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <p className="text-xs text-muted-foreground mb-2 sm:mb-0 sm:mr-auto self-center">
              Approving will create a new owner user account.
            </p>
            {selectedLead?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => selectedLead && handleAction(selectedLead.id, "reject")}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => selectedLead && handleAction(selectedLead.id, "approve")}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Create Account
                </Button>
              </>
            )}
            {selectedLead?.status !== "pending" && (
              <Button variant="outline" onClick={() => setSelectedLead(null)} className="w-full sm:w-auto">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
