"use client";

import { useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { StatusBadge } from "@/components/admin/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ExternalLink,
  Send,
} from "lucide-react";
import type { CMSPage } from "@/lib/types";

export default function ContentManagementPage() {
  const { cmsPages, addCMSPage, updateCMSPage, deleteCMSPage, publishCMSPage } = useDataStore();
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
    status: "draft" as CMSPage["status"],
    createdBy: "admin_1",
  });

  const resetForm = () => {
    setFormData({
      slug: "",
      title: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      status: "draft",
      createdBy: "admin_1",
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
      createdBy: page.createdBy,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    const data: Omit<CMSPage, "id" | "createdAt" | "updatedAt"> = {
      slug: formData.slug.toLowerCase().replace(/\s+/g, "-"),
      title: formData.title,
      content: formData.content,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
      status: formData.status,
      createdBy: formData.createdBy,
    };

    if (editingPage) {
      await updateCMSPage(editingPage.id, data);
    } else {
      await addCMSPage(data);
    }
    setIsDialogOpen(false);
    resetForm();
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    await deleteCMSPage(deleteId);
    setDeleteId(null);
    setIsProcessing(false);
  };

  const handlePublish = async (id: string) => {
    setIsProcessing(true);
    await publishCMSPage(id);
    setIsProcessing(false);
  };

  const getStatusVariant = (status: CMSPage["status"]) => {
    switch (status) {
      case "draft": return "warning";
      case "published": return "success";
      case "archived": return "default";
    }
  };

  const publishedCount = cmsPages.filter((p) => p.status === "published").length;
  const draftCount = cmsPages.filter((p) => p.status === "draft").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Content Management</h1>
            <p className="text-muted-foreground">Manage website pages and content</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Page
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
              <DialogDescription>Configure page content and SEO settings</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input
                    placeholder="Privacy Policy"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL Slug</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
                    <Input
                      className="pl-7"
                      placeholder="privacy-policy"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content (Markdown supported)</Label>
                <Textarea
                  placeholder="# Page Title&#10;&#10;Your content here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">SEO Settings</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meta Title</Label>
                    <Input
                      placeholder="Privacy Policy | ParkEase"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description</Label>
                    <Textarea
                      placeholder="Learn how ParkEase protects your privacy..."
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as CMSPage["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isProcessing || !formData.title || !formData.slug}>
                {isProcessing ? "Saving..." : editingPage ? "Update Page" : "Create Page"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-foreground">{draftCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-2xl font-bold text-foreground">
                  {cmsPages.filter((p) => p.status === "archived").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pages List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Pages ({cmsPages.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({draftCount})</TabsTrigger>
        </TabsList>

        {["all", "published", "draft"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="space-y-4">
              {cmsPages
                .filter((p) => tab === "all" || p.status === tab)
                .map((page) => (
                  <Card key={page.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <h3 className="font-semibold text-lg text-foreground">{page.title}</h3>
                            <StatusBadge status={page.status} variant={getStatusVariant(page.status)} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Globe className="w-4 h-4" />
                              /{page.slug}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Updated: {new Date(page.updatedAt).toLocaleDateString()}
                            </span>
                            {page.publishedAt && (
                              <span className="text-green-600">
                                Published: {new Date(page.publishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {page.metaDescription && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{page.metaDescription}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setPreviewPage(page)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {page.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePublish(page.id)}
                              disabled={isProcessing}
                              className="bg-transparent"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Publish
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(page.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {cmsPages.filter((p) => tab === "all" || p.status === tab).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No pages found</h3>
                    <p className="text-muted-foreground mt-1">Create your first page to get started</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewPage?.title}</DialogTitle>
            <DialogDescription>/{previewPage?.slug}</DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none py-4">
            <div className="whitespace-pre-wrap">{previewPage?.content}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPage(null)} className="bg-transparent">
              Close
            </Button>
            {previewPage && (
              <Button onClick={() => { setPreviewPage(null); handleEdit(previewPage); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Page
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the page and its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
