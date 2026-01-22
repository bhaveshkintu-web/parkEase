"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Type as type, LucideIcon, ChevronRight } from "lucide-react";

interface QuickAction {
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

interface QuickActionsProps {
  title?: string;
  description?: string;
  actions: QuickAction[];
  columns?: 1 | 2 | 3 | 4;
}

export function QuickActions({
  title = "Quick Actions",
  description,
  actions,
  columns = 2,
}: QuickActionsProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-3", gridCols[columns])}>
          {actions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    action.iconBgColor || "bg-primary/10"
                  )}
                >
                  <action.icon
                    className={cn("w-5 h-5", action.iconColor || "text-primary")}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {action.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionButtonsProps {
  actions: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "default" | "outline" | "secondary" | "destructive";
    disabled?: boolean;
  }[];
}

export function ActionButtons({ actions }: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || "outline"}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon && <action.icon className="w-4 h-4 mr-2" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
