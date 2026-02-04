"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  X, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  MapPin, 
  Calendar, 
  CreditCard,
  History,
  MessageSquare,
  ArrowRight,
  Shield,
  Loader2,
  Undo2,
  MoreVertical
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/data";

interface DisputeDetailsProps {
  disputeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DisputeDetails({ disputeId, isOpen, onClose }: DisputeDetailsProps) {
  const [dispute, setDispute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    if (isOpen && disputeId) {
      fetchDisputeDetails();
    }
  }, [isOpen, disputeId]);

  const fetchDisputeDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/disputes/${disputeId}`);
      if (response.ok) {
        const data = await response.json();
        setDispute(data);
        // Ensure precision matches two decimal places
        const amount = data.booking.totalPrice.toFixed(2);
        setRefundAmount(amount);
        setRefundReason(`Refund for dispute: ${data.subject}`);
      }
    } catch (error) {
      console.error("Failed to fetch dispute details:", error);
      toast.error("Failed to load dispute details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDispute = async (updates: any) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success("Dispute updated successfully");
        if (updates.notes) setNotes("");
        fetchDisputeDetails();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update dispute");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTriggerRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/admin/disputes/${disputeId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: parseFloat(refundAmount), 
          reason: refundReason,
          description: "Triggered from dispute resolution"
        }),
      });

      if (response.ok) {
        toast.success("Refund request created and dispute resolved");
        fetchDisputeDetails();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to trigger refund");
      }
    } catch (error) {
      console.error("Refund error:", error);
      toast.error("An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-2xl flex flex-col items-center justify-center">
          <SheetHeader className="sr-only">
            <SheetTitle>Loading Dispute Details</SheetTitle>
          </SheetHeader>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </SheetContent>
      </Sheet>
    );
  }

  if (!dispute) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl p-0 flex flex-col h-full gap-0">
        <SheetHeader className="p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl">Dispute Details</SheetTitle>
              <SheetDescription>
                Manage dispute and view history for Booking {dispute?.booking?.confirmationCode}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <div className="px-6 border-b shrink-0">
                <TabsList className="w-full justify-start h-12 bg-transparent border-b-0 space-x-6">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="timeline" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12"
                  >
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger 
                    value="refund" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12"
                  >
                    Refund
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  <TabsContent value="overview" className="m-0 space-y-6">
                    {/* Status & Priority Controls */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select 
                          value={dispute.status} 
                          onValueChange={(val) => handleUpdateDispute({ status: val })}
                          disabled={isUpdating}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select 
                          value={dispute.priority} 
                          onValueChange={(val) => handleUpdateDispute({ priority: val })}
                          disabled={isUpdating}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Dispute Info */}
                    <Card className="border-none bg-muted/30">
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                          <p className="font-medium">{dispute.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {dispute.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Booking & User Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          Customer Info
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">{dispute.user.firstName} {dispute.user.lastName}</p>
                          <p className="text-muted-foreground">{dispute.user.email}</p>
                          <p className="text-muted-foreground">{dispute.user.phone || "No phone provided"}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Location
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">{dispute.booking.location.name}</p>
                          <p className="text-muted-foreground line-clamp-1">{dispute.booking.location.address}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(dispute.booking.checkIn), "MMM d, yyyy")} - {format(new Date(dispute.booking.checkOut), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Internal Notes / Resolution */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          Internal Notes
                        </h4>
                        {dispute.internalNotes && (
                          <span className="text-[10px] text-muted-foreground italic">Always persistent</span>
                        )}
                      </div>
                      
                      {dispute.internalNotes && (
                         <div className="bg-amber-50/50 p-3 rounded-md border border-amber-100/50 text-sm text-amber-900/80 mb-2">
                            {dispute.internalNotes}
                         </div>
                      )}

                      <Textarea 
                        placeholder={dispute.internalNotes ? "Update internal notes..." : "Add a private note or resolution summary..."}
                        className="min-h-[100px] bg-card"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <Button 
                        onClick={() => handleUpdateDispute({ 
                          internalNotes: notes, 
                          notes: "Added/Updated internal note",
                          resolutionNotes: dispute.status === "RESOLVED" ? notes : undefined
                        })} 
                        disabled={isUpdating || !notes.trim()}
                        className="w-full bg-[#5fc4b0] hover:bg-[#4eb3a0] text-white"
                      >
                        {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Note
                      </Button>
                    </div>

                    {dispute.resolutionNotes && (
                      <div className="bg-green-50/50 p-4 border border-green-100 rounded-lg">
                        <p className="text-xs font-semibold text-green-700 uppercase mb-1">Resolution Summary</p>
                        <p className="text-sm text-green-800">{dispute.resolutionNotes}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="m-0">
                    <div className="space-y-6">
                      {dispute.auditLogs.map((log: any, idx: number) => (
                        <div key={log.id} className="relative pl-6 pb-6 last:pb-0">
                          {idx !== dispute.auditLogs.length - 1 && (
                            <div className="absolute left-[7px] top-[24px] bottom-0 w-[2px] bg-muted" />
                          )}
                          <div className={`absolute left-0 top-[6px] w-4 h-4 rounded-full border-2 bg-background ${
                            idx === 0 ? "border-primary" : "border-muted"
                          }`} />
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold capitalize">
                                {log.action.replace(/_/g, " ").toLowerCase()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(log.createdAt), "MMM d, HH:mm")}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              By {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : "System"}
                            </p>
                            {log.notes && (
                              <p className="text-sm text-foreground/80 mt-2 bg-muted/30 p-2 rounded">
                                {log.notes}
                              </p>
                            )}
                            {log.previousValue && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(log.previousValue).map(([key, val]: [string, any]) => (
                                  <div key={key} className="text-[11px] flex items-center gap-1">
                                    <span className="text-muted-foreground capitalize">{key}:</span>
                                    <span className="text-red-600 line-through">{val.from}</span>
                                    <ArrowRight className="w-2 h-2" />
                                    <span className="text-green-600 font-medium">{val.to}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="refund" className="m-0 space-y-6">
                    {dispute.refundRequest ? (
                      <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg text-center space-y-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900">Refund Already Triggered</h4>
                          <p className="text-sm text-blue-700">
                            A refund of {formatCurrency(dispute.refundRequest.amount)} has been requested.
                          </p>
                        </div>
                        <div className="pt-4 border-t border-blue-200">
                          <div className="flex justify-between text-xs text-blue-800 mb-1">
                            <span>Status</span>
                            <span className="font-bold">{dispute.refundRequest.status}</span>
                          </div>
                          <div className="flex justify-between text-xs text-blue-800">
                            <span>Requested at</span>
                            <span>{format(new Date(dispute.refundRequest.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-100" asChild>
                          <a href={`/admin/refunds?search=${dispute.booking.confirmationCode}`}>View in Refunds</a>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-900 leading-relaxed">
                            <strong>Note:</strong> Triggering a refund will automatically mark this dispute as <strong>RESOLVED</strong>. This action is irreversible once processed.
                          </div>
                        </div>

                        <div className="space-y-4 p-4 border rounded-lg">
                          <div className="flex justify-between items-center pb-2 border-b">
                            <span className="text-sm text-muted-foreground">Original Total</span>
                            <span className="font-bold">{formatCurrency(dispute.booking.totalPrice)}</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label htmlFor="refund-amount">Refund Amount</Label>
                                {parseFloat(refundAmount) > dispute.booking.totalPrice && (
                                    <span className="text-[10px] text-red-600 font-bold animate-pulse">Exceeds Total!</span>
                                )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input 
                                id="refund-amount"
                                type="number" 
                                className={`pl-7 ${parseFloat(refundAmount) > dispute.booking.totalPrice ? "border-red-500 bg-red-50" : ""}`}
                                step="0.01"
                                max={dispute.booking.totalPrice}
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground text-right">
                              Max available: {formatCurrency(dispute.booking.totalPrice)}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="refund-reason">Reason for Refund</Label>
                            <Select value={refundReason} onValueChange={setRefundReason}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={`Refund for dispute: ${dispute.subject}`}>Dispute Resolution</SelectItem>
                                <SelectItem value="Cancellation Policy">Cancellation Policy</SelectItem>
                                <SelectItem value="Service Unsatisfactory">Service Unsatisfactory</SelectItem>
                                <SelectItem value="Double Charged">Double Charged</SelectItem>
                                <SelectItem value="Other">Other (Specify in notes)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button 
                            className="w-full bg-red-600 hover:bg-red-700 text-white mt-4"
                            onClick={handleTriggerRefund}
                            disabled={isUpdating || parseFloat(refundAmount) > dispute.booking.totalPrice || parseFloat(refundAmount) <= 0}
                          >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Undo2 className="w-4 h-4 mr-2" />
                            )}
                            Issue Refund
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
