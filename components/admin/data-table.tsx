"use client";

import React from "react"

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface Action<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[] | ((item: T) => Action<T>[]);
  searchPlaceholder?: string;
  searchKey?: keyof T;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  actions,
  searchPlaceholder = "Search...",
  searchKey,
  pageSize = 10,
  emptyMessage = "No data found",
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter data
  const filteredData = searchKey
    ? data.filter((item) => {
      const value = (item as any)[searchKey];
      if (typeof value === "string") {
        return value.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    })
    : data;

  // Sort data
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
      const aVal = (a as any)[sortColumn];
      const bVal = (b as any)[sortColumn];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    })
    : filteredData;

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "font-semibold",
                    column.sortable && "cursor-pointer hover:bg-muted/80"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {sortColumn === column.key && (
                      <span className="text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && (
                <TableHead className="w-[80px]">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render
                        ? column.render(item)
                        : ((item as any)[column.key] as React.ReactNode)}
                    </TableCell>
                  ))}
                  {actions && (() => {
                    const itemActions = typeof actions === 'function' ? actions(item) : actions;
                    return itemActions.length > 0 ? (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {itemActions.map((action, i) => (
                              <DropdownMenuItem
                                key={i}
                                onClick={() => action.onClick(item)}
                                disabled={action.disabled}
                                className={cn(
                                  action.variant === "destructive" &&
                                  "text-destructive focus:text-destructive"
                                )}
                              >
                                {action.icon}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null;
                  })()}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-lg">
            {emptyMessage}
          </div>
        ) : (
          paginatedData.map((item, index) => (
            <div
              key={index}
              className={cn(
                "w-full p-4 border rounded-xl bg-white shadow-sm ring-1 ring-border/20 mb-4 transition-all overflow-hidden",
                onRowClick && "cursor-pointer active:scale-[0.99] hover:bg-muted/10"
              )}
              onClick={() => onRowClick?.(item)}
            >
              <div className="space-y-3.5">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((column) => (
                    <div
                      key={column.key}
                      className="flex items-start justify-between gap-2 w-full"
                    >
                      <span className="text-xs font-semibold text-muted-foreground shrink-0 pt-0.5">
                        {column.header}
                      </span>
                      <div className="text-[13px] font-semibold text-foreground text-right break-words min-w-0">
                        {column.render
                          ? column.render(item)
                          : ((item as any)[column.key] as React.ReactNode)}
                      </div>
                    </div>
                  ))}
              </div>
              {actions && (() => {
                const itemActions = typeof actions === 'function' ? actions(item) : actions;
                return itemActions.length > 0 ? (
                  <div className="mt-3 pt-3 border-t border-border/10">
                    <div
                      className="flex flex-wrap gap-1.5 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {itemActions.map((action, i) => (
                        <Button
                          key={i}
                          variant={action.variant === "destructive" ? "destructive" : "outline"}
                          size="sm"
                          className={cn(
                            "h-8 px-2.5 gap-1 rounded-lg text-[11px] font-semibold flex-1 min-w-fit",
                            action.variant === "destructive"
                              ? "bg-destructive hover:bg-destructive/90 text-white border-transparent"
                              : "bg-background text-foreground hover:bg-muted"
                          )}
                          disabled={action.disabled}
                          onClick={() => action.onClick(item)}
                        >
                          {action.icon && React.cloneElement(action.icon as React.ReactElement<any>, { className: "w-3.5 h-3.5 shrink-0" })}
                          <span className="whitespace-nowrap">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for status badges
export function StatusBadge({
  status,
  variant,
  className,
}: {
  status: string;
  variant?: "success" | "warning" | "error" | "info" | "default";
  className?: string;
}) {
  const variantStyles = {
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    default: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn(variantStyles[variant || "default"], className)}>
      {status}
    </Badge>
  );
}
