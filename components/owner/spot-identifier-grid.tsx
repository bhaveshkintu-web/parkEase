"use client";

import { useState, useEffect } from "react";
import {
  Grid3X3,
  Trash2,
  Plus,
  AlertTriangle,
  Lock,
  Search,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { generateSpotIdentifiers, updateSpotStatus } from "@/lib/actions/spot-actions";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface SpotData {
  id: string; // db id
  identifier: string; // name like "A1"
  status: "ACTIVE" | "INACTIVE";
}

interface SpotIdentifierGridProps {
  identifiers: string[] | SpotData[];
  onChange: (identifiers: any[]) => void;
  lockedIdentifiers?: string[];
  bookedIdentifiers?: string[];
  maxSpots?: number;
  locationId?: string;
}

export function SpotIdentifierGrid({
  identifiers,
  onChange,
  lockedIdentifiers = [],
  bookedIdentifiers = [],
  maxSpots = 200,
  locationId
}: SpotIdentifierGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startId, setStartId] = useState("A1");
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const { toast } = useToast();

  // Normalize identifiers to SpotData objects
  const normalizedSpots: SpotData[] = (identifiers || []).map((item, index) => {
    if (typeof item === "string") {
      return { id: `temp-${index}`, identifier: item, status: "ACTIVE" as const };
    }
    return item;
  });

  // Find duplicates in real-time
  useEffect(() => {
    const seen = new Map<string, number[]>();
    normalizedSpots.forEach((spot, index) => {
      const normalized = spot.identifier.trim().toUpperCase();
      if (!normalized) return;
      if (!seen.has(normalized)) {
        seen.set(normalized, []);
      }
      seen.get(normalized)!.push(index);
    });

    const dupSet = new Set<number>();
    seen.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach(i => dupSet.add(i));
      }
    });
    setDuplicates(dupSet);
  }, [identifiers]);

  const handleUpdate = (index: number, value: string) => {
    const newItems = [...identifiers];
    if (typeof newItems[index] === "string") {
      newItems[index] = value;
    } else {
      newItems[index] = { ...(newItems[index] as SpotData), identifier: value };
    }
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const item = normalizedSpots[index];
    if (lockedIdentifiers.includes(item.identifier)) return;
    const newItems = identifiers.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleAdd = () => {
    if (identifiers.length >= maxSpots) return;
    const newItem = (identifiers.length > 0 && typeof identifiers[0] === "object")
      ? { id: `new-${Date.now()}`, identifier: "", status: "ACTIVE" as const }
      : "";
    onChange([...identifiers, newItem]);
  };

  const handleFillSequence = async () => {
    if (!startId) return;
    setIsGenerating(true);
    try {
      const newIds = await generateSpotIdentifiers(startId, maxSpots);
      // For fill sequence, we usually handle strings in the edit form
      onChange(newIds);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleStatus = async (index: number) => {
    const spot = normalizedSpots[index];
    if (spot.id.startsWith("temp-") || spot.id.startsWith("new-")) return;

    setIsToggling(spot.id);
    try {
      const newStatus = spot.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const result = await updateSpotStatus(spot.id, newStatus);

      if (result.success) {
        const newItems = [...identifiers];
        (newItems[index] as SpotData).status = newStatus;
        onChange(newItems);
        toast({
          title: "Status Updated",
          description: `Spot ${spot.identifier} is now ${newStatus.toLowerCase()}.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: "Toggle Failed",
        description: err.message || "Failed to update spot status",
        variant: "destructive",
      });
    } finally {
      setIsToggling(null);
    }
  };

  const filteredSpots = normalizedSpots.map((spot, index) => ({ ...spot, originalIndex: index }))
    .filter(item => item.identifier.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 p-3 rounded-lg border border-dashed flex flex-col sm:flex-row items-end gap-3 mb-6">
        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
            Sequence Start (e.g. A1, 101, P-01)
          </label>
          <div className="flex gap-2">
            <Input
              value={startId}
              onChange={(e) => setStartId(e.target.value)}
              placeholder="e.g. A1"
              className="bg-background h-9"
            />
            <Button
              onClick={handleFillSequence}
              variant="secondary"
              size="sm"
              disabled={isGenerating || !startId}
              className="px-4 h-9 whitespace-nowrap"
            >
              {isGenerating ? "Generating..." : "Fill All Spots"}
            </Button>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground pb-2 max-w-[200px]">
          This will pre-fill {maxSpots} spots starting from your pattern.
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search spots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="outline" className="px-3 py-1 bg-background">
            Total Spots: {identifiers.length}
          </Badge>
          {duplicates.size > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {duplicates.size} Duplicates
            </Badge>
          )}
          <Button
            onClick={handleAdd}
            disabled={identifiers.length >= maxSpots}
            size="sm"
            variant="outline"
            className="ml-auto"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Spot
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar p-1">
        {filteredSpots.map(({ id, identifier, status, originalIndex }) => {
          const isLocked = lockedIdentifiers.includes(identifier) && identifier !== "";
          const isBooked = bookedIdentifiers.includes(identifier);
          const isDuplicate = duplicates.has(originalIndex);
          const isEmpty = identifier.trim() === "";
          const isPersisted = !id.startsWith("temp-") && !id.startsWith("new-");

          return (
            <div
              key={originalIndex}
              className={cn(
                "group relative border rounded-xl p-3 transition-all hover:bg-muted/50 transition-all duration-200",
                isDuplicate && "border-destructive/50 ring-1 ring-destructive/20 bg-destructive/5",
                isEmpty && "border-dashed",
                status === "INACTIVE" && "grayscale opacity-80 bg-muted/30"
              )}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={identifier}
                      onChange={(e) => handleUpdate(originalIndex, e.target.value)}
                      disabled={isLocked}
                      className={cn(
                        "h-8 text-sm font-bold border-0 focus-visible:ring-0 px-1 bg-transparent truncate",
                        isLocked && "text-muted-foreground cursor-not-allowed"
                      )}
                      placeholder={`Spot ${originalIndex + 1}`}
                    />
                  </div>

                  {isPersisted && (
                    <div className="flex items-center gap-2" title={status === "ACTIVE" ? "Mark as Inactive" : "Mark as Active"}>
                      <Switch
                        checked={status === "ACTIVE"}
                        onCheckedChange={() => handleToggleStatus(originalIndex)}
                        disabled={isToggling === id}
                        className="scale-75"
                      />
                    </div>
                  )}

                  {isLocked && !isPersisted && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This spot has active bookings.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    variant={status === "ACTIVE" ? "default" : "secondary"}
                    className={cn(
                      "text-[10px] h-5 px-1.5 uppercase font-black tracking-tighter",
                      status === "ACTIVE" ? "bg-green-600/10 text-green-700 hover:bg-green-600/20 border-green-200" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {status}
                  </Badge>

                  {isBooked && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="p-1 text-amber-500 cursor-default">
                            <Calendar className="h-3.5 w-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Has active/future booking — protected</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {!isLocked && !isBooked && (
                    <button
                      onClick={() => handleRemove(originalIndex)}
                      className="p-1 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isDuplicate && (
                <div className="absolute -top-1 -right-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive fill-background" />
                </div>
              )}
            </div>
          );
        })}

        {filteredSpots.length === 0 && searchTerm && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl flex flex-col items-center justify-center">
            <Search className="h-8 w-8 opacity-10 mb-2" />
            <p>No spots found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {identifiers.length === 0 && !searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl bg-muted/20 text-center">
          <Grid3X3 className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
          <p className="text-sm font-medium text-muted-foreground mb-1">No spots defined yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4 max-w-xs">
            Start by entering a sequence or adding spots manually to identify spaces in your lot.
          </p>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Your First Spot
          </Button>
        </div>
      )}
    </div>
  );
}
