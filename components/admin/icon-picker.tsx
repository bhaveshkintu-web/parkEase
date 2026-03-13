"use client";

import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface IconPickerProps {
  onSelect: (iconName: string) => void;
}

export function IconPicker({ onSelect }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const iconList = useMemo(() => {
    return Object.keys(LucideIcons)
      .filter((key) => {
        // Filter out non-icon exports and internal things
        return (
          typeof (LucideIcons as any)[key] === "function" ||
          (typeof (LucideIcons as any)[key] === "object" && (LucideIcons as any)[key].displayName)
        );
      })
      .map((key) => ({
        name: key,
        displayName: key.replace(/([A-Z])/g, " $1").trim(),
        lowercase: key.toLowerCase(),
      }));
  }, []);

  const filteredIcons = useMemo(() => {
    if (!searchTerm) return iconList.slice(0, 100); // Limit initial view for performance
    const term = searchTerm.toLowerCase();
    return iconList.filter((icon) => icon.lowercase.includes(term)).slice(0, 200);
  }, [searchTerm, iconList]);

  const toCamelCase = (str: string) => {
    return str.charAt(0).toLowerCase() + str.slice(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
      <ScrollArea className="h-[300px] border rounded-md p-2">
        <div className="grid grid-cols-5 gap-2">
          {filteredIcons.map((icon) => {
            const IconComponent = (LucideIcons as any)[icon.name];
            if (!IconComponent) return null;

            // Convert PascalCase back to kebab-case-ish string for data-icon 
            // but the prompt said <i data-icon="home"></i>
            // Lucide component for "Home" is Home. 
            // Let's store it as the original component name but lowercase the first letter to match common usage
            const dataName = toCamelCase(icon.name);

            return (
              <Button
                key={icon.name}
                variant="outline"
                size="icon"
                className="h-12 w-12 flex flex-col items-center justify-center gap-1 hover:bg-muted"
                onClick={() => onSelect(dataName)}
                title={icon.displayName}
              >
                <IconComponent size={20} />
              </Button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p>No icons found</p>
          </div>
        )}
      </ScrollArea>
      <div className="text-[10px] text-muted-foreground text-center">
        Showing {filteredIcons.length} icons
      </div>
    </div>
  );
}
