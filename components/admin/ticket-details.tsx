"use client";

import { useState, useEffect } from "react";
import { format, differenceInHours } from "date-fns";
import { 
  X, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Mail,
  Calendar, 
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  MoreVertical
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface TicketDetailsProps {
  ticket: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function TicketDetails({ ticket, isOpen, onClose, onUpdate }: TicketDetailsProps) {
  const [status, setStatus] = useState(ticket?.status || "OPEN");
  const [isUpdating, setIsUpdating] = useState(false);
  const [internalNote, setInternalNote] = useState(ticket?.internalNotes || "");

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setInternalNote(ticket.internalNotes || "");
    }
  }, [ticket]);

  const handleUpdate = async (updates: any) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/admin/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        if (updates.status) {
            toast.success(`Ticket marked as ${updates.status.replace("_", " ")}`);
            setStatus(updates.status);
        }
        if (updates.internalNotes !== undefined) {
            toast.success("Internal note saved");
        }
        onUpdate();
      } else {
        toast.error("Failed to update ticket");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const calculateSLA = (createdAt: string) => {
    const hours = differenceInHours(new Date(), new Date(createdAt));
    if (hours < 2) return { label: "Under 2h", color: "bg-green-500" };
    if (hours < 8) return { label: "Standard", color: "bg-amber-500" };
    return { label: "Overdue", color: "bg-red-500" };
  };

  if (!ticket) return null;

  const sla = calculateSLA(ticket.createdAt);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col h-full gap-0">
        <SheetHeader className="p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle>Ticket #{ticket.id.slice(-6).toUpperCase()}</SheetTitle>
              <SheetDescription>
                Submitted by {ticket.name}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sla.color}`} title={sla.label} />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {sla.label}
              </span>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={status === "OPEN" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleUpdate({ status: "OPEN" })}
                disabled={isUpdating}
                className={status === "OPEN" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                Open
              </Button>
              <Button 
                variant={status === "IN_PROGRESS" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleUpdate({ status: "IN_PROGRESS" })}
                disabled={isUpdating}
                className={status === "IN_PROGRESS" ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                In Progress
              </Button>
              <Button 
                variant={status === "RESOLVED" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleUpdate({ status: "RESOLVED" })}
                disabled={isUpdating}
                className={status === "RESOLVED" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Resolved
              </Button>
            </div>

            <Separator />

            {/* Ticket Info */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Subject</Label>
                <p className="font-semibold text-lg">{ticket.subject}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
                <Label className="text-xs text-muted-foreground uppercase">Message</Label>
                <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Customer Details
              </h4>
              <div className="bg-card border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {ticket.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ticket.name}</p>
                    <p className="text-xs text-muted-foreground">{ticket.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={`mailto:${ticket.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email Customer
                  </a>
                </Button>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Internal Notes
              </h4>
              <Textarea 
                placeholder="Add a private note for other admins..." 
                className="min-h-[120px] bg-amber-50/20 border-amber-100"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
              />
              <Button 
                className="w-full" 
                onClick={() => handleUpdate({ internalNotes: internalNote })}
                disabled={isUpdating}
              >
                {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Internal Note
              </Button>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Raised: {format(new Date(ticket.createdAt), "MMM d, yyyy HH:mm")}
            </div>
            {ticket.updatedAt !== ticket.createdAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated: {format(new Date(ticket.updatedAt), "HH:mm")}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
