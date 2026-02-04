"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { submitDispute, requestRefund, submitSupportTicket } from "@/lib/actions/support-actions";
import { DisputeType, DisputePriority } from "@prisma/client";
import { 
  AlertTriangle, 
  DollarSign, 
  Loader2,
  CheckCircle2,
  MessageSquare
} from "lucide-react";

interface SupportDialogsProps {
  bookingId: string;
  totalPrice: number;
  isOpen: boolean;
  onClose: () => void;
  defaultType?: "DISPUTE" | "REFUND" | "TICKET";
  customerEmail?: string;
  customerName?: string;
}

export function SupportDialogs({ 
  bookingId, 
  totalPrice, 
  isOpen, 
  onClose, 
  defaultType = "DISPUTE",
  customerEmail = "",
  customerName = ""
}: SupportDialogsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"DISPUTE" | "REFUND" | "TICKET">(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Dispute state
  const [disputeSubject, setDisputeSubject] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeType, setDisputeType] = useState<DisputeType>("SERVICE");

  // Refund state
  const [refundAmount, setRefundAmount] = useState<string>(totalPrice.toFixed(2));
  const [refundReason, setRefundReason] = useState("");

  // Ticket state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");

  const handleSubmitDispute = async () => {
    if (!disputeSubject.trim() || !disputeDescription.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitDispute({
        bookingId,
        subject: disputeSubject,
        description: disputeDescription,
        type: disputeType,
      });

      if (result.success) {
        setIsSuccess(true);
        toast({ title: "Issue Reported", description: "Our team will review your case shortly." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit dispute", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRefund = async () => {
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > totalPrice) {
      toast({ title: "Error", description: `Please enter a valid amount (max ${totalPrice})`, variant: "destructive" });
      return;
    }
    if (!refundReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestRefund({
        bookingId,
        amount,
        reason: refundReason,
      });

      if (result.success) {
        setIsSuccess(true);
        toast({ title: "Refund Requested", description: "Your request has been submitted for review." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to request refund", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast({ title: "Error", description: "Please enter a subject and message", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitSupportTicket({
        name: customerName || "Customer",
        email: customerEmail,
        subject: ticketSubject,
        message: ticketMessage,
      });

      if (result.success) {
        setIsSuccess(true);
        toast({ title: "Ticket Submitted", description: "A support agent will follow up via email." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit ticket", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">Submission Successful</DialogTitle>
            <DialogDescription className="text-center">
              We've received your request. You can track the status directly on the reservation page.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={onClose} className="mt-6 w-full">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button 
                variant={activeTab === "DISPUTE" ? "default" : "outline"} 
                className="flex-1 h-10 text-xs"
                onClick={() => setActiveTab("DISPUTE")}
            >
                <AlertTriangle className="w-3 h-3 mr-1.5" />
                Report Issue
            </Button>
            <Button 
                variant={activeTab === "REFUND" ? "default" : "outline"} 
                className="flex-1 h-10 text-xs"
                onClick={() => setActiveTab("REFUND")}
            >
                <DollarSign className="w-3 h-3 mr-1.5" />
                Request Refund
            </Button>
            <Button 
                variant={activeTab === "TICKET" ? "default" : "outline"} 
                className="flex-1 h-10 text-xs"
                onClick={() => setActiveTab("TICKET")}
            >
                <MessageSquare className="w-3 h-3 mr-1.5" />
                Inquiry
            </Button>
          </div>
          <DialogTitle>
            {activeTab === "DISPUTE" ? "Report an Issue" : activeTab === "REFUND" ? "Request a Refund" : "General Inquiry"}
          </DialogTitle>
          <DialogDescription>
            {activeTab === "DISPUTE" 
              ? "Tell us what went wrong so we can make it right." 
              : activeTab === "REFUND" 
              ? "Request a partial or full refund for your booking."
              : "Ask a question about your booking or our services."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {activeTab === "DISPUTE" ? (
            <>
              <div className="space-y-2">
                <Label>Issue Type</Label>
                <div className="grid grid-cols-2 gap-2">
                    {["SERVICE", "LOCATION", "REFUND", "OTHER"].map((type) => (
                        <Button
                            key={type}
                            type="button"
                            variant={disputeType === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDisputeType(type as DisputeType)}
                            className="text-[10px] h-8"
                        >
                            {type}
                        </Button>
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                    id="subject" 
                    placeholder="Brief summary of the issue" 
                    value={disputeSubject}
                    onChange={(e) => setDisputeSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                    id="description" 
                    placeholder="Please provide details about your experience..." 
                    rows={4}
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                />
              </div>
            </>
          ) : activeTab === "REFUND" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Refund Amount (max {totalPrice.toFixed(2)})</Label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        id="amount" 
                        type="number" 
                        step="0.01"
                        className="pl-9"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Refund</Label>
                <Textarea 
                    id="reason" 
                    placeholder="Why are you requesting a refund?" 
                    rows={4}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="ticket-subject">Subject</Label>
                <Input 
                    id="ticket-subject" 
                    placeholder="What is your question about?" 
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-message">Message</Label>
                <Textarea 
                    id="ticket-message" 
                    placeholder="Provide as much detail as possible..." 
                    rows={6}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-transparent">Cancel</Button>
          <Button 
            onClick={activeTab === "DISPUTE" ? handleSubmitDispute : activeTab === "REFUND" ? handleSubmitRefund : handleSubmitTicket}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit {activeTab === "DISPUTE" ? "Issue" : activeTab === "REFUND" ? "Refund" : "Inquiry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
