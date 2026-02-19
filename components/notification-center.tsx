"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Info, AlertTriangle, MessageSquare, MapPin } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

/** Returns true for transient network errors that should be silently ignored (e.g. ERR_NETWORK_CHANGED). */
function isNetworkError(error: Error): boolean {
  return error.message === "Failed to fetch" || error.message.includes("NetworkError");
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
  metadata: any;
}

export function NotificationCenter() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async (signal?: AbortSignal) => {
    if (!isAuthenticated || !user?.id) return;

    try {
      const response = await fetch("/api/notifications", { signal });
      const text = await response.text();

      if (response.ok) {
        try {
          const data = JSON.parse(text);
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        } catch (parseError) {
          console.error("Failed to parse notifications JSON. Response start:", text.substring(0, 100));
        }
      } else {
        console.warn(`Failed to fetch notifications (${response.status}):`, text.substring(0, 100));
      }
    } catch (error) {
      // Silently ignore aborts (navigation/unmount) and transient network changes (ERR_NETWORK_CHANGED).
      // The 60-second polling interval will retry automatically.
      if (error instanceof Error && error.name !== 'AbortError' && !isNetworkError(error)) {
        console.error("Failed to fetch notifications:", error);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const controller = new AbortController();
      fetchNotifications(controller.signal);
      // Poll for new notifications every minute
      const interval = setInterval(() => fetchNotifications(controller.signal), 60000);
      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }
  }, [isAuthenticated, user?.id]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationId: id }),
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ markAllAsRead: true }),
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: "READ" }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getIcon = (notification: Notification) => {
    const { type, metadata } = notification;
    switch (type) {
      case "DISPUTE_CREATED":
      case "DISPUTE_UPDATED":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "REFUND_REQUESTED":
      case "REFUND_PROCESSED":
        return <Check className="h-4 w-4 text-green-500" />;
      case "SUPPORT_TICKET_CREATED":
      case "SUPPORT_TICKET_UPDATED":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "SYSTEM_ALERT":
        if (metadata?.subtype === "LOCATION_SUBMITTED") {
          return <MapPin className="h-4 w-4 text-purple-500" />;
        }
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getHref = (notification: Notification) => {
    const { type, metadata } = notification;
    if (type.startsWith("DISPUTE")) {
      return `/admin/disputes/${metadata.disputeId}`;
    }
    if (type.startsWith("REFUND")) {
      return `/admin/refunds?search=${metadata.refundRequestId}`;
    }
    if (type.startsWith("SUPPORT_TICKET")) {
      return `/admin/support?id=${metadata.ticketId}`;
    }
    if (type === "LOCATION_SUBMITTED" || (type === "SYSTEM_ALERT" && metadata?.subtype === "LOCATION_SUBMITTED")) {
      return `/admin/approvals`;
    }
    return "#";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs font-medium text-primary hover:bg-transparent"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-1 border-b p-4 transition-colors hover:bg-accent/50",
                    n.status === "UNREAD" && "bg-primary/5"
                  )}
                  onClick={() => {
                    markAsRead(n.id);
                    // If it has a href, we could navigate, but Popover handles focus
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
                        {getIcon(n)}
                      </div>
                      <span className="text-sm font-semibold leading-none">
                        {n.title}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="pl-8 text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>
                  {n.status === "UNREAD" && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                  <Link
                    href={getHref(n)}
                    className="absolute inset-0 z-10"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">View {n.title}</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            asChild
          >
            <Link href="/account/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
