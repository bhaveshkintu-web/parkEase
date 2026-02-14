"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, Plus, MoreVertical, Trash2, Star, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string | null;
  isDefault: boolean;
}

const cardBrandIcons: Record<string, string> = {
  visa: "V",
  mastercard: "M",
  amex: "A",
  discover: "D",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/payment-methods");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/payment-methods/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      
      toast({
        title: "Payment method deleted",
        description: "The payment method has been removed from your account.",
      });
      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment method",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefault(id);
    try {
      const res = await fetch(`/api/payment-methods/${id}/default`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to update");
      
      toast({
        title: "Default payment updated",
        description: "Your default payment method has been changed.",
      });
      fetchPayments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set default payment method",
        variant: "destructive",
      });
    } finally {
      setSettingDefault(null);
    }
  };

  if (isLoading && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your payment methods...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your saved cards for faster checkout</p>
        </div>
        <Link href="/account/payments/new">
          <Button className="font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]">
            <Plus className="w-4 h-4 mr-2" />
            Add New Card
          </Button>
        </Link>
      </div>

      {payments.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mx-auto mb-4 border border-border shadow-sm">
              <CreditCard className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No cards saved yet</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-8">
              Safe & secure. Save a card to make your next booking in seconds.
            </p>
            <Link href="/account/payments/new">
              <Button size="lg" className="px-8 font-black uppercase text-xs tracking-widest">
                Add My First Card
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {payments.map((payment) => (
            <Card key={payment.id} className={`relative overflow-hidden transition-all duration-300 border-2 ${payment.isDefault ? 'border-primary/20 bg-primary/[0.02]' : 'border-border hover:border-primary/10'}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-start gap-5">
                    <div className={`px-3 min-w-[56px] h-9 rounded-md flex items-center justify-center text-white font-black text-xs shadow-md transition-transform hover:scale-105 ${
                      payment.brand.toLowerCase() === 'visa' ? 'bg-[#1A1F71]' :
                      payment.brand.toLowerCase() === 'mastercard' ? 'bg-[#EB001B]' :
                      payment.brand.toLowerCase() === 'amex' ? 'bg-[#0070D1]' : 'bg-slate-700'
                    }`}>
                      {payment.brand.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-foreground">
                          •••• {payment.last4}
                        </h3>
                        {payment.isDefault && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] font-black uppercase tracking-tighter">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground/80 mt-1">
                        {payment.cardholderName || "Unnamed Card"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                          Expires {String(payment.expiryMonth).padStart(2, "0")}/{payment.expiryYear}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-1">
                      {!payment.isDefault && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(payment.id)}
                            disabled={settingDefault === payment.id}
                            className="rounded-md font-medium cursor-pointer"
                          >
                            {settingDefault === payment.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Star className="w-4 h-4 mr-2 text-amber-500" />
                            )}
                            Set as Default
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeleteId(payment.id)}
                        className="text-destructive focus:text-destructive rounded-md font-medium cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Card
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Decorative Background Element */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security note */}
      <div className="flex items-center gap-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 animate-pulse">
          <Shield className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
            PCI Compliant Security
            <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-700 bg-emerald-50 font-black">256-BIT AES</Badge>
          </h4>
          <p className="text-xs text-emerald-800/70 mt-1 max-w-xl leading-relaxed">
            Your payment data is fully encrypted and never stored on our servers. 
            We only store a secure reference token provided by our payment processor.
          </p>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-2">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">Remove Payment Method?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This card ending in <span className="font-bold text-foreground">•••• {payments.find(p => p.id === deleteId)?.last4}</span> will be permanently removed. 
              If it has active bookings, removal might be restricted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl font-bold border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold px-8 shadow-lg shadow-destructive/20"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Card"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Missing import fix
import { Shield } from "lucide-react";
