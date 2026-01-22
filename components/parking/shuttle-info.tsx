"use client";

import type { ShuttleInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bus, Clock, Phone, ExternalLink, MapPin } from "lucide-react";

interface ShuttleInfoProps {
  shuttleInfo: ShuttleInfo;
}

export function ShuttleInfoCard({ shuttleInfo }: ShuttleInfoProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bus className="h-5 w-5 text-primary" />
            Free Shuttle Service
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Included
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hours and Frequency */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg bg-card p-3">
            <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Hours</p>
              <p className="text-sm text-muted-foreground">{shuttleInfo.hours}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-card p-3">
            <Bus className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Frequency</p>
              <p className="text-sm text-muted-foreground">{shuttleInfo.frequency}</p>
            </div>
          </div>
        </div>

        {/* Pickup Instructions */}
        <div className="rounded-lg bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Pickup Instructions</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {shuttleInfo.pickupInstructions}
          </p>
        </div>

        {/* Contact and Tracking */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
            <a href={`tel:${shuttleInfo.phone}`}>
              <Phone className="h-4 w-4" />
              {shuttleInfo.phone}
            </a>
          </Button>
          {shuttleInfo.trackingUrl && (
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
              <a href={shuttleInfo.trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Track Shuttle
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
