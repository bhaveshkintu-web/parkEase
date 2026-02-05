"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import {
  Search,
  Star,
  MessageSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Clock,
  MapPin,
  ThumbsUp,
  SlidersHorizontal,
  ArrowUpDown,
  Reply,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/lib/data-store";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import type { AdminReview } from "@/lib/types";

const ITEMS_PER_PAGE = 10;


const Loading = () => null;

export default function OwnerReviewsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { adminReviews, setReviewData, addOwnerReply, updateOwnerReply, deleteOwnerReply } = useDataStore();

  // Explicit filters data
  const [filterAirports, setFilterAirports] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<{ id: string, name: string, airportCode?: string }[]>([]);

  // Filters and state
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [replyFilter, setReplyFilter] = useState<string>("all");
  const [airportFilter, setAirportFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [editReplyDialogOpen, setEditReplyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch reviews and filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/owner/reviews");
        if (res.ok) {
          const data = await res.json();
          // Assuming useDataStore has a way to set bulk data, or we just set it directly if the store doesn't support the full structure yet.
          // For now, we update the store review data if the method exists.
          if (setReviewData) {
            setReviewData(data.reviews);
          }
          setFilterLocations(data.locations);
          setFilterAirports(data.airports);
        }
      } catch (error) {
        console.error("Failed to fetch reviews data", error);
      }
    };
    fetchData();
  }, [setReviewData]);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let filtered = adminReviews.filter((review) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !review.author.toLowerCase().includes(query) &&
          !review.content.toLowerCase().includes(query) &&
          !review.title.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Rating filter
      if (ratingFilter !== "all" && review.rating !== parseInt(ratingFilter)) {
        return false;
      }

      // Reply filter
      if (replyFilter === "replied" && !review.ownerReply) {
        return false;
      }
      if (replyFilter === "unreplied" && review.ownerReply) {
        return false;
      }

      // Airport filter
      if (airportFilter !== "all" && review.airportCode !== airportFilter) {
        return false;
      }

      // Location filter
      if (locationFilter !== "all" && review.locationId !== locationFilter) {
        return false;
      }

      // Tab filter
      if (activeTab === "positive" && review.rating < 4) {
        return false;
      }
      if (activeTab === "negative" && review.rating >= 4) {
        return false;
      }
      if (activeTab === "unreplied" && review.ownerReply) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "rating-desc":
          return b.rating - a.rating;
        case "rating-asc":
          return a.rating - b.rating;
        case "helpful":
          return b.helpful - a.helpful;
        default:
          return 0;
      }
    });

    return filtered;
  }, [adminReviews, searchQuery, ratingFilter, replyFilter, locationFilter, sortBy, activeTab, airportFilter]); // Added airportFilter to dependencies

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => {
    const total = adminReviews.length;
    const avgRating = total > 0 ? adminReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const replied = adminReviews.filter((r) => r.ownerReply).length;
    const positive = adminReviews.filter((r) => r.rating >= 4).length;
    const negative = adminReviews.filter((r) => r.rating < 4).length;
    const unreplied = total - replied;

    return { total, avgRating, replied, unreplied, positive, negative };
  }, [adminReviews]);

  // Unique airports and locations for filter
  const airports = filterAirports;

  const locations = useMemo(() => {
    return filterLocations.filter(loc =>
      airportFilter === "all" || loc.airportCode === airportFilter
    ).map(loc => ({ id: loc.id, name: loc.name }));
  }, [filterLocations, airportFilter]);

  // Handlers
  const handleAddReply = async () => {
    if (!selectedReview || !replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await addOwnerReply(selectedReview.id, replyContent.trim(), "owner_1", "Chen Parking Solutions");
      toast({
        title: "Reply Published",
        description: "Your response has been added to the review.",
      });
      setReplyDialogOpen(false);
      setReplyContent("");
      setSelectedReview(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to add reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReply = async () => {
    if (!selectedReview || !replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await updateOwnerReply(selectedReview.id, replyContent.trim());
      toast({
        title: "Reply Updated",
        description: "Your response has been updated.",
      });
      setEditReplyDialogOpen(false);
      setReplyContent("");
      setSelectedReview(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReply = async () => {
    if (!selectedReview) return;

    setIsSubmitting(true);
    try {
      await deleteOwnerReply(selectedReview.id);
      toast({
        title: "Reply Deleted",
        description: "Your response has been removed.",
      });
      setDeleteDialogOpen(false);
      setSelectedReview(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReplyDialog = (review: AdminReview) => {
    setSelectedReview(review);
    setReplyContent("");
    setReplyDialogOpen(true);
  };

  const openEditDialog = (review: AdminReview) => {
    setSelectedReview(review);
    setReplyContent(review.ownerReply?.content || "");
    setEditReplyDialogOpen(true);
  };

  const openDeleteDialog = (review: AdminReview) => {
    setSelectedReview(review);
    setDeleteDialogOpen(true);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-amber-600";
    return "text-red-600";
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 4) return "bg-green-50 border-green-200";
    if (rating >= 3) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Reviews</h1>
            <p className="text-muted-foreground">
              Manage and respond to customer feedback across your parking locations
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <p className="text-2xl font-bold text-foreground">{stats.avgRating.toFixed(1)}</p>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Replied</p>
                  <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Reply className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.replied / stats.total) * 100).toFixed(0)}% response rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Needs Response</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.unreplied}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Positive</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.positive}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ThumbsUp className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.positive / stats.total) * 100).toFixed(0)}% positive rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All Reviews ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="positive">
              Positive ({stats.positive})
            </TabsTrigger>
            <TabsTrigger value="negative">
              Needs Attention ({stats.negative})
            </TabsTrigger>
            <TabsTrigger value="unreplied">
              Unreplied ({stats.unreplied})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                  />
                </div>

                <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <Star className="h-4 w-4 mr-2" />
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

                <Select value={replyFilter} onValueChange={(v) => { setReplyFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <Reply className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Reply Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="unreplied">Unreplied</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={airportFilter} onValueChange={(v) => { setAirportFilter(v); setLocationFilter("all"); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Airport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Airports</SelectItem>
                    {airports.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <MapPin className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  <SelectItem value="rating-asc">Lowest Rated</SelectItem>
                  <SelectItem value="helpful">Most Helpful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {paginatedReviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No reviews found</h3>
                <p className="text-muted-foreground mt-1">
                  Try adjusting your filters or search criteria
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedReviews.map((review) => (
              <Card key={review.id} className={`${getRatingBgColor(review.rating)} border`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Review Content */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                }`}
                            />
                          ))}
                        </div>
                        <span className={`font-semibold ${getRatingColor(review.rating)}`}>
                          {review.rating}.0
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {review.locationName || `Location ${review.locationId}`}
                        </Badge>
                        {!review.ownerReply && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                            Needs Response
                          </Badge>
                        )}
                      </div>

                      {/* Title & Content */}
                      <div>
                        <h3 className="font-semibold text-foreground">{review.title}</h3>
                        <p className="text-muted-foreground mt-1">{review.content}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{review.author}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(review.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {review.helpful} helpful
                        </span>
                      </div>

                      {/* Owner Reply */}
                      {review.ownerReply && (
                        <div className="mt-4 pl-4 border-l-2 border-blue-300 bg-blue-50 rounded-r-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-blue-600 text-xs">
                                Owner Response
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(review.ownerReply.createdAt)}
                                {review.ownerReply.updatedAt && " (edited)"}
                              </span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(review)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Reply
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(review)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Reply
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-sm text-foreground">{review.ownerReply.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            - {review.ownerReply.ownerName}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                      {!review.ownerReply ? (
                        <Button onClick={() => openReplyDialog(review)} className="flex-1 lg:flex-none">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Reply
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => openEditDialog(review)}
                          className="flex-1 lg:flex-none"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Reply
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredReviews.length)} of{" "}
              {filteredReviews.length} reviews
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
              <span className="text-sm text-muted-foreground px-2">
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

        {/* Add Reply Dialog */}
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reply to Review</DialogTitle>
              <DialogDescription>
                Write a professional response to this customer review. Your reply will be publicly
                visible.
              </DialogDescription>
            </DialogHeader>

            {selectedReview && (
              <div className="space-y-4">
                {/* Original Review */}
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{selectedReview.author}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < selectedReview.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">{selectedReview.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedReview.content}</p>
                </div>

                {/* Reply Input */}
                <div className="space-y-2">
                  <Label htmlFor="reply">Your Response</Label>
                  <Textarea
                    id="reply"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Thank you for your feedback..."
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {replyContent.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddReply}
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting ? "Publishing..." : "Publish Reply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Reply Dialog */}
        <Dialog open={editReplyDialogOpen} onOpenChange={setEditReplyDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Your Reply</DialogTitle>
              <DialogDescription>
                Update your response to this review. Changes will be reflected immediately.
              </DialogDescription>
            </DialogHeader>

            {selectedReview && (
              <div className="space-y-4">
                {/* Original Review */}
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{selectedReview.author}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < selectedReview.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">{selectedReview.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedReview.content}</p>
                </div>

                {/* Reply Input */}
                <div className="space-y-2">
                  <Label htmlFor="edit-reply">Your Response</Label>
                  <Textarea
                    id="edit-reply"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Thank you for your feedback..."
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {replyContent.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditReplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEditReply}
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reply</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your response to this review? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteReply}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting ? "Deleting..." : "Delete Reply"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Suspense>
  );
}
