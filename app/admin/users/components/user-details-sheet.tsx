"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Calendar, Mail, Phone, ShoppingBag, ShieldAlert, CreditCard } from "lucide-react";

interface UserDetailsSheetProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsSheet({ user, open, onOpenChange }: UserDetailsSheetProps) {
  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>
            Detailed information about {user.firstName} {user.lastName}
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="mt-6 space-y-6">
            {/* Header Profile */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold">{user.firstName} {user.lastName}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{user.role}</Badge>
                  <Badge 
                    variant={user.status === "ACTIVE" ? "default" : user.status === "SUSPENDED" ? "destructive" : "secondary"}
                  >
                    {user.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Contact Information</h4>
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                  {user.emailVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Activity Overview</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
                   <ShoppingBag className="h-6 w-6 mb-2 text-primary" />
                   <span className="text-2xl font-bold">{user._count?.bookings || 0}</span>
                   <span className="text-xs text-muted-foreground">Total Bookings</span>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
                   <ShieldAlert className="h-6 w-6 mb-2 text-destructive" />
                   <span className="text-2xl font-bold">{user._count?.disputes || 0}</span>
                   <span className="text-xs text-muted-foreground">Disputes</span>
                </div>
                {/* 
                // Could add more stats here, like payment methods count if available in _count
                */}
              </div>
            </div>

            {/* Role Specific Details */}
            {user.role === "OWNER" && user.ownerProfile && (
              <>
                <Separator />
                <div className="space-y-4">
                   <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Owner Profile</h4>
                   <div className="p-4 rounded-lg border space-y-2">
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Business Name</span>
                          <span className="font-medium">{user.ownerProfile.businessName}</span>
                      </div>
                       <div className="flex justify-between">
                          <span className="text-muted-foreground">Verification Status</span>
                          <span className="font-medium capitalize">{user.ownerProfile.verificationStatus}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Profile Status</span>
                          <span className="font-medium capitalize">{user.ownerProfile.status}</span>
                      </div>
                   </div>
                </div>
              </>
            )}

            {user.role === "WATCHMAN" && user.watchmanProfile && (
                <>
                <Separator />
                <div className="space-y-4">
                   <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Watchman Profile</h4>
                   <div className="p-4 rounded-lg border space-y-2">
                       <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium capitalize">{user.watchmanProfile.status}</span>
                      </div>
                   </div>
                </div>
                </>
            )}

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
