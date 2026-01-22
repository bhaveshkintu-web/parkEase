"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Star,
  Check,
  X,
  Flag,
  Eye,
  MessageSquare,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDataStore } from "@/lib/data-store";
import { useToast } from "@/hooks/use-toast";
import type { AdminReview } from "@/lib/types";

const ITEMS_PER_PAGE = 10;

// Mock reviews data
const mockReviews: AdminReview[] = [
  {
    id: "r1",
    locationId: "1",
    author: "John D.",
    rating: 5,
    comment: "Excellent service! The shuttle was quick and the staff was friendly. Will definitely use again.",
    date: "2024-01-15",
    helpful: 12,
    status: "approved",
    reportCount: 0,
  },
  {
    id: "r2",
    locationId: "1",
    author: "Sarah M.",
    rating: 4,
    comment: "Good parking spot, easy to find. Shuttle took a bit longer than expected but overall good experience.",
    date: "2024-01-14",
    helpful: 8,
    status: "approved",
    reportCount: 0,
  },
  {
    id: "r3",
    locationId: "2",
    author: "Mike T.",
    rating: 2,
    comment: "The lot was full when I arrived even though I had a reservation. Very frustrating experience.",
    date: "2024-01-13",
    helpful: 3,
    status: "pending",
    reportCount: 2,
    flagReason: "Customer complaint - needs follow up",
  },
  {
    id: "r4",
    locationId: "3",
    author: "Emily R.",
    rating: 5,
    comment: "Best airport parking I've ever used. Clean, secure, and the shuttle was waiting for us.",
    date: "2024-01-12",
    helpful: 15,
    status: "approved",
    reportCount: 0,
  },
  {
    id: "r5",
    locationId: "2",
    author: "Anonymous",
    rating: 1,
    comment: "This place is a scam! They charged me extra fees not mentioned anywhere.",
    date: "2024-01-11",
    helpful: 1,
    status: "flagged",
    reportCount: 5,
    flagReason: "Potential false review - no matching reservation",
  },
  {
    id: "r6",
    locationId: "1",
    author: "David L.",
    rating: 4,
    comment: "Convenient location and fair price. Would recommend for anyone flying out of LAX.",
    date: "2024-01-10",
    helpful: 6,
    status: "pending",
    reportCount: 0,
  },
];

const Loading = () => null;

export default function AdminReviewsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<AdminReview[]>(mockReviews);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (searchQuery && !review.comment.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !review.author.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== "all" && review.status !== statusFilter) {
        return false;
      }
      if (ratingFilter !== "all" && review.rating !== parseInt(ratingFilter)) {
        return false;
      }
      return true;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => ({
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    flagged: reviews.filter((r) => r.status === "flagged").length,
    avgRating: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
  }), [reviews]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(paginatedReviews.map((r) => r.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleSelectReview = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews((prev) => [...prev, id]);
    } else {
      setSelectedReviews((prev) => prev.filter((rid) => rid !== id));
    }
  };

  const updateReviewStatus = (id: string, status: AdminReview["status"]) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    toast({
      title: "Review updated",
      description: `Review has been ${status}.`,
    });
  };

  const handleBulkAction = (action: "approve" | "reject" | "flag") => {
    const statusMap = { approve: "approved", reject: "rejected", flag: "flagged" } as const;
    setReviews((prev) =>
      prev.map((r) =>
        selectedReviews.includes(r.id) ? { ...r, status: statusMap[action] } : r
      )
    );
    toast({
      title: "Bulk action completed",
      description: `${selectedReviews.length} reviews have been ${statusMap[action]}.`,
    });
    setSelectedReviews([]);
  };

  const handleDeleteReview = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast({
      title: "Review deleted",
      description: "The review has been permanently removed.",
    });
  };

  const handleSaveResponse = () => {
    if (!selectedReview) return;
    
    toast({
      title: "Response saved",
      description: "Your response has been published.",
    });
    setResponseDialogOpen(false);
    setResponseText("");
    setSelectedReview(null);
  };

  const getStatusBadge = (status: AdminReview["status"]) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      flagged: "bg-orange-100 text-orange-800",
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Management</h1>
          <p className="text-muted-foreground">Moderate and respond to customer reviews</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Flagged</p>
              <p className="text-2xl font-bold text-orange-600">{stats.flagged}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-accent text-accent" />
                <p className="text-2xl font-bold text-foreground">{stats.avgRating}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedReviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedReviews.length} selected</span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("approve")}>
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("reject")}>
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("flag")}>
                    <Flag className="mr-1 h-4 w-4" />
                    Flag
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reviews Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedReviews.length === paginatedReviews.length && paginatedReviews.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Review</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Rating</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReviews.map((review) => (
                    <tr key={review.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedReviews.includes(review.id)}
                          onCheckedChange={(checked) => handleSelectReview(review.id, checked === true)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="max-w-md">
                          <p className="font-medium text-foreground">{review.author}</p>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{review.comment}</p>
                          {review.flagReason && (
                            <p className="mt-1 text-xs text-orange-600">Flag: {review.flagReason}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? "fill-accent text-accent" : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(review.status)}</td>
                      <td className="p-4 text-sm text-muted-foreground">{review.date}</td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateReviewStatus(review.id, "approved")}>
                              <Check className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateReviewStatus(review.id, "rejected")}>
                              <X className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateReviewStatus(review.id, "flagged")}>
                              <Flag className="mr-2 h-4 w-4" />
                              Flag
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReview(review);
                                setResponseDialogOpen(true);
                              }}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Respond
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paginatedReviews.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No reviews found matching your criteria.
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredReviews.length)} of {filteredReviews.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Dialog */}
        <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respond to Review</DialogTitle>
              <DialogDescription>
                Write a public response to this review. This will be visible to all customers.
              </DialogDescription>
            </DialogHeader>
            {selectedReview && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{selectedReview.author}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < selectedReview.rating ? "fill-accent text-accent" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{selectedReview.comment}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="response">Your Response</Label>
                  <Textarea
                    id="response"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Thank you for your feedback..."
                    rows={4}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveResponse} disabled={!responseText.trim()}>
                Publish Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
