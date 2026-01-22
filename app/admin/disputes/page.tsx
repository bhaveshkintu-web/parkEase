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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import type { Dispute } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function DisputesPage() {
  const { disputes, updateDispute } = useDataStore();
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState<Dispute["status"]>("in_progress");
  const [newPriority, setNewPriority] = useState<Dispute["priority"]>("medium");
  const [isProcessing, setIsProcessing] = useState(false);
  const searchParams = useSearchParams();

  const filteredDisputes = disputes.filter(
    (d) =>
      d.subject.toLowerCase().includes(search.toLowerCase()) ||
      d.bookingId.toLowerCase().includes(search.toLowerCase())
  );

  const openCount = disputes.filter((d) => d.status === "open").length;
  const inProgressCount = disputes.filter((d) => d.status === "in_progress").length;

  const handleUpdate = async () => {
    if (!selectedDispute) return;
    setIsProcessing(true);
    await updateDispute(selectedDispute.id, {
      status: newStatus,
      priority: newPriority,
      resolution: resolution || undefined,
    });
    setSelectedDispute(null);
    setResolution("");
    setIsProcessing(false);
  };

  const getPriorityColor = (priority: Dispute["priority"]) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-100";
      case "high": return "text-orange-600 bg-orange-100";
      case "medium": return "text-amber-600 bg-amber-100";
      case "low": return "text-green-600 bg-green-100";
    }
  };

  const getStatusVariant = (status: Dispute["status"]) => {
    switch (status) {
      case "open": return "warning";
      case "in_progress": return "info";
      case "resolved": return "success";
      case "closed": return "default";
    }
  };

  return (
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dispute Management</h1>
            <p className="text-muted-foreground">Handle customer disputes and complaints</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="py-1.5">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {openCount} Open
          </Badge>
          <Badge variant="outline" className="py-1.5">
            <Clock className="w-3 h-3 mr-1" />
            {inProgressCount} In Progress
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by subject or booking ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Disputes List */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open">Open ({openCount})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({inProgressCount})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {["open", "in_progress", "resolved", "all"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="grid gap-4">
              {filteredDisputes
                .filter((d) => tab === "all" || d.status === tab)
                .map((dispute) => (
                  <Card key={dispute.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg text-foreground">{dispute.subject}</h3>
                                <Badge className={`text-xs ${getPriorityColor(dispute.priority)}`}>
                                  {dispute.priority.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{dispute.description}</p>
                            </div>
                            <StatusBadge status={dispute.status.replace("_", " ")} variant={getStatusVariant(dispute.status)} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium capitalize">{dispute.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Booking:</span>
                              <span className="font-medium">{dispute.bookingId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">{new Date(dispute.createdAt).toLocaleDateString()}</span>
                            </div>
                            {dispute.assignedTo && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Assigned:</span>
                                <span className="font-medium">{dispute.assignedTo}</span>
                              </div>
                            )}
                          </div>

                          {dispute.resolution && (
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm text-green-800">
                                <span className="font-medium">Resolution:</span> {dispute.resolution}
                              </p>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setNewStatus(dispute.status);
                            setNewPriority(dispute.priority);
                            setResolution(dispute.resolution || "");
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {filteredDisputes.filter((d) => tab === "all" || d.status === tab).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No disputes found</h3>
                    <p className="text-muted-foreground mt-1">
                      {tab === "open" ? "No open disputes at this time" : "No disputes match your criteria"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Manage Dialog */}
      <Suspense fallback={null}>
        <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Dispute</DialogTitle>
              <DialogDescription>{selectedDispute?.subject}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">{selectedDispute?.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as Dispute["status"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Dispute["priority"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  placeholder="Describe the resolution..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isProcessing}>
                {isProcessing ? "Updating..." : "Update Dispute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Suspense>
    </div>
  );
}
