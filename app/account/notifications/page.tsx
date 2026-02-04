"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Bell, Check, Info, AlertTriangle, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
  metadata: any;
}

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/notifications?limit=50");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    fetchNotifications();
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationId: id, status: "READ" }),
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: "READ" } : n));
      }
    } catch (error) {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "DISPUTE_CREATED":
      case "DISPUTE_UPDATED":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "REFUND_REQUESTED":
      case "REFUND_PROCESSED":
        return <Check className="h-5 w-5 text-green-500" />;
      case "SUPPORT_TICKET_CREATED":
      case "SUPPORT_TICKET_UPDATED":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Manage your alerts and updates</p>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
              <Bell className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
              <p className="text-sm text-muted-foreground max-w-xs">You have no new notifications right now. We'll alert you when something important happens.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "group flex items-start gap-4 p-4 transition-colors hover:bg-slate-50",
                    n.status === "UNREAD" && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-100 shadow-sm">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={cn(
                        "text-sm font-semibold truncate",
                        n.status === "UNREAD" ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(n.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                        {n.message}
                    </p>
                    {n.status === "UNREAD" && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase tracking-wider py-0 px-1.5 h-4 font-bold border-none">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-xs px-2 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                       <Link href={`/account/reservations`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
