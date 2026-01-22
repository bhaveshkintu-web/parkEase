"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
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
import { CreditCard, Plus, MoreVertical, Edit, Trash2, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const cardBrandIcons: Record<string, string> = {
  Visa: "V",
  Mastercard: "M",
  "American Express": "A",
  Discover: "D",
};

export default function PaymentsPage() {
  const { payments, deletePayment, setDefaultPayment } = useDataStore();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    await deletePayment(deleteId);
    setIsDeleting(false);
    setDeleteId(null);
    toast({
      title: "Payment method deleted",
      description: "The payment method has been removed from your account.",
    });
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefault(id);
    await setDefaultPayment(id);
    setSettingDefault(null);
    toast({
      title: "Default payment updated",
      description: "Your default payment method has been changed.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your saved payment methods</p>
        </div>
        <Link href="/account/payments/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </Link>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No payment methods saved</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a payment method for faster checkout
            </p>
            <Link href="/account/payments/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="relative overflow-hidden">
              {/* Card brand decoration */}
              <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/5 rounded-full" />
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-10 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {cardBrandIcons[payment.brand] || payment.brand[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {payment.brand} ending in {payment.last4}
                        </h3>
                        {payment.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {payment.cardholderName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {String(payment.expiryMonth).padStart(2, "0")}/{payment.expiryYear}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!payment.isDefault && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(payment.id)}
                            disabled={settingDefault === payment.id}
                          >
                            {settingDefault === payment.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Star className="w-4 h-4 mr-2" />
                            )}
                            Set as Default
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeleteId(payment.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security note */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm">Secure Payment Storage</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Your payment information is encrypted and stored securely. We never store your full card number.
            </p>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
