"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { StatusBadge } from "@/components/admin/data-table";
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
  AlertTriangle,
  FileText,
  MapPin,
  User,
  Calendar,
  Eye,
  Clock,
} from "lucide-react";
import type { ParkingApproval } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const Loading = () => null;

export default function ParkingApprovalsPage() {
  const searchParams = useSearchParams();
  const { parkingApprovals, reviewParkingApproval } = useDataStore();
  const [search, setSearch] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<ParkingApproval | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [requiredChanges, setRequiredChanges] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredApprovals = parkingApprovals.filter(
    (a) =>
      a.location.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = parkingApprovals.filter((a) => a.status === "pending").length;
  const underReviewCount = parkingApprovals.filter((a) => a.status === "under_review").length;

  const handleReview = async (action: "approve" | "reject" | "request_changes") => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    const changes = action === "request_changes" ? requiredChanges.split("\n").filter(Boolean) : undefined;
    await reviewParkingApproval(selectedApproval.id, action, reviewNotes, changes);
    setSelectedApproval(null);
    setReviewNotes("");
    setRequiredChanges("");
    setIsProcessing(false);
  };

  const getStatusVariant = (status: ParkingApproval["status"]) => {
    switch (status) {
      case "pending": return "warning";
      case "under_review": return "info";
      case "approved": return "success";
      case "rejected": return "error";
      case "requires_changes": return "warning";
      default: return "default";
    }
  };

  return (
    <Suspense fallback={<Loading />}>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Parking Approvals</h1>
              <p className="text-muted-foreground">Review and approve new parking location submissions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="py-1.5">
              <Clock className="w-3 h-3 mr-1" />
              {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="py-1.5">
              <Eye className="w-3 h-3 mr-1" />
              {underReviewCount} Under Review
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by location or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Approvals List */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="under_review">Under Review ({underReviewCount})</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {["pending", "under_review", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="grid gap-4">
                {filteredApprovals
                  .filter((a) => tab === "all" || a.status === tab)
                  .map((approval) => (
                    <Card key={approval.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg text-foreground">
                                  {approval.location.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <MapPin className="w-4 h-4" />
                                  {approval.location.address}
                                </div>
                              </div>
                              <StatusBadge status={approval.status} variant={getStatusVariant(approval.status)} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Owner:</span>
                                <span className="font-medium">{approval.ownerName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Submitted:</span>
                                <span className="font-medium">
                                  {new Date(approval.submittedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Documents:</span>
                                <span className="font-medium">{approval.documents.length}</span>
                              </div>
                            </div>

                            {/* Documents */}
                            <div className="flex flex-wrap gap-2">
                              {approval.documents.map((doc) => (
                                <Badge
                                  key={doc.id}
                                  variant={doc.verified ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {doc.verified && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-row lg:flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 lg:flex-none bg-transparent"
                              onClick={() => setSelectedApproval(approval)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                            {(approval.status === "pending" || approval.status === "under_review") && (
                              <>
                                <Button
                                  size="sm"
                                  className="flex-1 lg:flex-none"
                                  onClick={() => {
                                    setSelectedApproval(approval);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {filteredApprovals.filter((a) => tab === "all" || a.status === tab).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground">No approvals found</h3>
                      <p className="text-muted-foreground mt-1">
                        {tab === "pending" ? "No pending approvals at this time" : "No approvals match your search"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Parking Location</DialogTitle>
              <DialogDescription>
                {selectedApproval?.location.name} - Submitted by {selectedApproval?.ownerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Location Details */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Location Details</CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span>{selectedApproval?.location.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Airport:</span>
                    <span>{selectedApproval?.location.airport || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner Email:</span>
                    <span>{selectedApproval?.ownerEmail}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Documents ({selectedApproval?.documents.length})</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-2">
                    {selectedApproval?.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{doc.name}</span>
                        </div>
                        <Badge variant={doc.verified ? "default" : "outline"} className="text-xs">
                          {doc.verified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Review Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add notes about this approval..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Required Changes (for request_changes action) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Required Changes (one per line)</label>
                <Textarea
                  placeholder="List required changes..."
                  value={requiredChanges}
                  onChange={(e) => setRequiredChanges(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                onClick={() => handleReview("reject")}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReview("request_changes")}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              <Button
                onClick={() => handleReview("approve")}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
