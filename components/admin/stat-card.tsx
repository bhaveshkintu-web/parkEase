"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  subtitle?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  trend,
  subtitle,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-1 truncate">
              {value}
            </p>
          </div>
          <div
            className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0",
              iconBgColor
            )}
          >
            <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", iconColor)} />
          </div>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 mt-2 text-xs sm:text-sm",
              trend.isPositive !== false ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive !== false ? (
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
            <span>
              {trend.isPositive !== false ? "+" : ""}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
        {subtitle && !trend && (
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
