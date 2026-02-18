"use client";

import { useState, useEffect } from "react";
import { Tag, Ticket, Check, ChevronRight, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getApplicablePromotions } from "@/lib/actions/promotion-actions";
import { formatCurrency } from "@/lib/data";
import { cn } from "@/lib/utils";

interface PromoSelectorProps {
  bookingAmount: number;
  onApply: (promo: any) => void;
  onRemove: () => void;
  appliedPromo: any | null;
}

export function PromoSelector({
  bookingAmount,
  onApply,
  onRemove,
  appliedPromo,
}: PromoSelectorProps) {
  const [promos, setPromos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchPromos = async () => {
    setIsLoading(true);
    try {
      const data = await getApplicablePromotions(bookingAmount);
      setPromos(data);
    } catch (error) {
      console.error("Failed to fetch promos", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPromos();
    }
  }, [isOpen, bookingAmount]);

  // Find the best promo (already sorted by value on backend, but we need to check application)
  const bestPromo = promos.find(p => p.isApplicable);

  const handleApplyManual = async () => {
    if (!manualCode.trim()) return;
    setIsManualLoading(true);
    // Use existing validation logic via onApply if needed, 
    // but here we just pass the code up to be handled by the page
    onApply({ code: manualCode.toUpperCase() });
    setIsManualLoading(false);
    setManualCode("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter promo code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="pl-9 h-11"
              disabled={!!appliedPromo}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleApplyManual}
            disabled={!manualCode || isManualLoading || !!appliedPromo}
            className="h-11"
          >
            {isManualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>

        {appliedPromo ? (
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">{appliedPromo.code}</p>
                <p className="text-[10px] text-primary/70 font-medium">Applied successfully!</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-primary/40 hover:text-primary hover:bg-primary/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="justify-between px-2 text-primary hover:bg-primary/5 h-auto py-1"

              >
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Ticket className="h-3 w-3" />
                  View all active coupons
                </span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Available Promotions</DialogTitle>
                <DialogDescription>
                  Choose a promotion to apply to your booking
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Finding best deals...</p>
                  </div>
                ) : promos.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {promos.map((promo, idx) => (
                        <Card
                          key={promo.id}
                          className={cn(
                            "relative overflow-hidden cursor-pointer transition-all",
                            promo.isApplicable ? "hover:border-primary border-2" : "opacity-60 cursor-not-allowed",
                            promo.isApplicable && idx === 0 && "border-primary bg-primary/[0.02]"
                          )}
                          onClick={() => {
                            if (promo.isApplicable) {
                              onApply(promo);
                              setIsOpen(false);
                            }
                          }}
                        >
                          {promo.isApplicable && idx === 0 && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter rounded-bl-lg flex items-center gap-1">
                              <Sparkles className="h-2 w-2" />
                              Best Value
                            </div>
                          )}
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-lg leading-tight">{promo.code}</h4>
                                <p className="text-xs text-muted-foreground">{promo.name || "Special Promotion"}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-primary text-xl">
                                  {promo.type === "percentage" ? `${promo.value}%` : formatCurrency(promo.value)}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">OFF</p>
                              </div>
                            </div>

                            <Separator className="my-3" />

                            <div className="flex items-center justify-between">
                              <div className="text-[10px] text-muted-foreground font-medium">
                                {promo.minBookingValue ? (
                                  <span>Min booking: {formatCurrency(promo.minBookingValue)}</span>
                                ) : (
                                  "No minimum booking"
                                )}
                              </div>
                              {!promo.isApplicable && (
                                <Badge variant="outline" className="text-[10px] bg-destructive/5 text-destructive border-destructive/20 font-bold">
                                  {promo.error}
                                </Badge>
                              )}
                              {promo.isApplicable && (
                                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-bold">
                                  Save {formatCurrency(promo.potentialDiscount)}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-20 text-center space-y-2">
                    <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground font-medium">No active promotions available right now.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
