"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/data-table";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Globe,
  Eye,
  EyeOff,
  Calendar,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

export default function ContentManagementPage() {
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<CMSPage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    content: "",
    metaTitle: "",
    metaDescription: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
  });

  // Fetch CMS pages
  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await fetch("/api/admin/cms");
      if (!response.ok) throw new Error("Failed to fetch pages");
      const data = await response.json();
      setCmsPages(data.pages);
    } catch (error) {
      console.error("Error fetching pages:", error);
      toast.error("Failed to load pages");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      slug: "",
      title: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      status: "DRAFT",
    });
    setEditingPage(null);
  };

  const handleEdit = (page: CMSPage) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
      status: page.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.slug) {
      toast.error("Title and slug are required");
      return;
    }

    setIsProcessing(true);
    try {
      const url = editingPage ? `/api/admin/cms/${editingPage.id}` : "/api/admin/cms";
      const method = editingPage ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save page");
      }

      toast.success(editingPage ? "Page updated successfully" : "Page created successfully");
      setIsDialogOpen(false);
      resetForm();
      fetchPages();
    } catch (error: any) {
      console.error("Error saving page:", error);
      toast.error(error.message || "Failed to save page");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/cms/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete page");

      toast.success("Page deleted successfully");
      setDeleteId(null);
      fetchPages();
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error("Failed to delete page");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async (id: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/cms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });

      if (!response.ok) throw new Error("Failed to publish page");

      toast.success("Page published successfully");
      fetchPages();
    } catch (error) {
      console.error("Error publishing page:", error);
      toast.error("Failed to publish page");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusVariant = (status: CMSPage["status"]) => {
    switch (status) {
      case "DRAFT": return "warning";
      case "PUBLISHED": return "success";
      case "ARCHIVED": return "default";
    }
  };

  const publishedCount = cmsPages.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = cmsPages.filter((p) => p.status === "DRAFT").length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground animate-pulse font-medium">Loading your content...</p>
          </div>
        </div>
      </div>
    );
  }

  // Full Screen Editor View
  if (isDialogOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in transition-all duration-300">
        {/* Editor Header */}
        <header className="h-16 border-b bg-card px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsDialogOpen(false); resetForm(); }}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {editingPage ? "Edit Page" : "Create New Page"}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {formData.slug ? `/${formData.slug}` : "Configure your page"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => { setIsDialogOpen(false); resetForm(); }}
              className="hidden sm:inline-flex"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !formData.title || !formData.slug}
              className="shadow-lg shadow-primary/20"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {editingPage ? "Update Page" : "Publish Page"}
                </div>
              )}
            </Button>
          </div>
        </header>

        {/* Editor Body */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm border-border/50">
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Page Title</Label>
                        <Input
                          className="text-xl font-bold h-12 px-4 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                          placeholder="What's the title?"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Content</Label>
                        <RichTextEditor
                          content={formData.content}
                          onChange={(content) => setFormData({ ...formData, content })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Settings */}
              <div className="space-y-6">
                <Card className="shadow-sm border-border/50 h-fit sticky top-24">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Document Settings</CardTitle>
                    <CardDescription>Configure page meta and visibility</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">URL Slug</Label>
                      <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">/</span>
                        <Input
                          className="pl-7 bg-muted/30"
                          placeholder="privacy-policy"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                      >
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-warning" />
                              Draft
                            </div>
                          </SelectItem>
                          <SelectItem value="PUBLISHED">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-success" />
                              Published
                            </div>
                          </SelectItem>
                          <SelectItem value="ARCHIVED">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                              Archived
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold block">SEO Optimization</Label>
                      <div className="space-y-2">
                        <Label className="text-xs">Meta Title</Label>
                        <Input
                          placeholder="Privacy Policy | ParkEase"
                          value={formData.metaTitle}
                          onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                          className="text-xs h-8 bg-muted/10 border-border/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Meta Description</Label>
                        <textarea
                          placeholder="Learn how ParkEase protects your privacy..."
                          value={formData.metaDescription}
                          onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                          rows={3}
                          className="flex w-full rounded-md border border-border/30 bg-muted/10 px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:ring-1 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all"
                        />
                        <p className="text-[10px] text-muted-foreground text-right italic">
                          {formData.metaDescription.length}/160 characters
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Content Management</h1>
            <p className="text-muted-foreground">Shape your website's story and information</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="sm:h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5 mr-2" />
          New Page
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card shadow-sm border-border/50 hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                <Globe className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{publishedCount}</p>
                  <p className="text-xs text-muted-foreground font-normal">Active Pages</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-border/50 hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20">
                <FileText className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{draftCount}</p>
                  <p className="text-xs text-muted-foreground font-normal">In Progress</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-border/50 hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border border-border">
                <EyeOff className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Archived</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">
                    {cmsPages.filter((p) => p.status === "ARCHIVED").length}
                  </p>
                  <p className="text-xs text-muted-foreground font-normal">Hidden</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pages List */}
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        <Tabs defaultValue="all" className="w-full">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
            <TabsList className="bg-background/50 border h-11 p-1 rounded-xl items-stretch">
              <TabsTrigger
                value="all"
                className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 focus-visible:ring-0 focus-visible:outline-none border-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm">All Pages</span>
                  <Badge
                    variant="secondary"
                    className="bg-muted/20 text-current border-none h-5 px-1.5 text-[10px] font-bold"
                  >
                    {cmsPages.length}
                  </Badge>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="PUBLISHED"
                className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 focus-visible:ring-0 focus-visible:outline-none border-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm">Published</span>
                  <Badge
                    variant="secondary"
                    className="bg-muted/20 text-current border-none h-5 px-1.5 text-[10px] font-bold"
                  >
                    {publishedCount}
                  </Badge>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="DRAFT"
                className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 focus-visible:ring-0 focus-visible:outline-none border-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm">Drafts</span>
                  <Badge
                    variant="secondary"
                    className="bg-muted/20 text-current border-none h-5 px-1.5 text-[10px] font-bold"
                  >
                    {draftCount}
                  </Badge>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            {["all", "PUBLISHED", "DRAFT"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 gap-4">
                  {cmsPages
                    .filter((p) => tab === "all" || p.status === tab)
                    .map((page) => (
                      <Card key={page.id} className="group hover:border-primary/40 transition-all duration-300 border-border/40 hover:shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-primary/10 transition-colors">
                                  <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <h3 className="font-bold text-lg text-foreground tracking-tight">{page.title}</h3>
                                <StatusBadge status={page.status.toLowerCase()} variant={getStatusVariant(page.status)} />
                              </div>
                              <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <Globe className="w-3.5 h-3.5" />
                                  <span className="text-primary/70">/{page.slug}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Updated: {new Date(page.updatedAt).toLocaleDateString()}
                                </span>
                                {page.publishedAt && (
                                  <span className="flex items-center gap-1.5 text-success font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                    Live since: {new Date(page.publishedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {page.metaDescription && (
                                <p className="text-sm text-muted-foreground line-clamp-1 italic">{page.metaDescription}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 border-t lg:border-t-0 pt-4 lg:pt-0">
                              <Button variant="ghost" size="icon" asChild title="View Public Page" className="rounded-full">
                                <Link href={`/${page.slug}`} target="_blank">
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setPreviewPage(page)} title="Quick Preview" className="rounded-full">
                                <Globe className="w-4 h-4" />
                              </Button>
                              {page.status === "DRAFT" && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handlePublish(page.id)}
                                  disabled={isProcessing}
                                  className="h-8 rounded-full text-xs font-semibold px-4 hover:bg-primary hover:text-primary-foreground transition-all"
                                >
                                  Publish
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(page)} title="Edit Content" className="rounded-full">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(page.id)}
                                title="Delete Page"
                                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {cmsPages.filter((p) => tab === "all" || p.status === tab).length === 0 && (
                    <div className="py-20 text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border/50">
                        <FileText className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">No pages found</h3>
                      <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                        Ready to share something new? Create your first page to get started.
                      </p>
                      <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-8 rounded-full px-8">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Now
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold">Preview: {previewPage?.title}</DialogTitle>
                <DialogDescription className="font-mono text-primary animate-pulse">
                  parkease.com/{previewPage?.slug}
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  previewPage?.status === "PUBLISHED"
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
                )}
              >
                {previewPage?.status}
              </Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 sm:p-12 bg-background">
            <article className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold mb-8 text-foreground tracking-tight">{previewPage?.title}</h1>
              <div
                className="prose prose-slate dark:prose-invert max-w-none prose-p:text-lg prose-p:leading-relaxed text-foreground/80"
                dangerouslySetInnerHTML={{ __html: previewPage?.content || "" }}
              />
            </article>
          </div>
          <div className="p-4 bg-muted/30 border-t flex justify-between items-center px-8">
            <p className="text-xs text-muted-foreground">This is a layout preview. Actual appearance may vary.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPreviewPage(null)} className="h-9 rounded-full bg-background border-border/50">
                Close Preview
              </Button>
              {previewPage && (
                <Button
                  onClick={() => { setPreviewPage(null); handleEdit(previewPage); }}
                  className="h-9 rounded-full shadow-lg shadow-primary/20 px-6"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Continue Editing
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl p-6 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 mx-auto border border-destructive/20">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">Delete this page?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base py-2">
              This action is permanent and cannot be undone. All content, images, and SEO configuration will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
            <AlertDialogCancel className="h-11 px-8 rounded-full border-border/50 bg-muted/30">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-11 px-8 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all font-bold"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
