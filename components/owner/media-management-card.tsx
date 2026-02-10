"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  X,
  Plus,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Check,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { updateLocationImages } from "@/lib/actions/parking-actions";

interface MediaManagementCardProps {
  locationId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  autoSave?: boolean;
}

export function MediaManagementCard({
  locationId,
  images,
  onImagesChange,
  autoSave = false
}: MediaManagementCardProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateImages = async (newImages: string[]) => {
    onImagesChange(newImages);

    if (autoSave) {
      setIsSubmitting(true);
      try {
        const result = await updateLocationImages(locationId, newImages);
        if (!result.success) {
          throw new Error(result.error);
        }
        toast({
          title: "Images updated",
          description: "Changes saved successfully.",
        });
      } catch (error: any) {
        toast({
          title: "Update failed",
          description: error.message || "Failed to save changes.",
          variant: "destructive",
        });
        // Rollback on error if needed, but onImagesChange already called.
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSubmitting(true);
    const uploadedUrls: string[] = [...images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);

        const data = await response.json();
        uploadedUrls.push(data.url);
      }
      handleUpdateImages(uploadedUrls);
      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${files.length} image(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    handleUpdateImages(newImages);
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [img] = newImages.splice(index, 1);
    newImages.unshift(img);
    handleUpdateImages(newImages);
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    handleUpdateImages(newImages);
  };

  const moveRight = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
    handleUpdateImages(newImages);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Location Media
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isSubmitting}
            />
            <div className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
              <Plus className="h-3 w-3" />
              Add Photos
            </div>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {images.map((img, i) => (
              <div key={i} className="group relative aspect-square bg-muted rounded-md overflow-hidden border">
                <img
                  src={img}
                  alt={`Location ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Labels */}
                {i === 0 && (
                  <div className="absolute top-2 left-2 bg-primary text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-sm z-10">
                    COVER
                  </div>
                )}

                {/* Overlays/Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => moveLeft(i)}
                      disabled={i === 0 || isSubmitting}
                      title="Move Left"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => moveRight(i)}
                      disabled={i === images.length - 1 || isSubmitting}
                      title="Move Right"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex flex-col w-full gap-1">
                    {i !== 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-[10px] py-0"
                        onClick={() => makeCover(i)}
                        disabled={isSubmitting}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Set as Cover
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-[10px] py-0"
                      onClick={() => removeImage(i)}
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-md bg-muted/30">
            <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground text-center">No images uploaded yet.</p>
            <label className="mt-4 cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isSubmitting}
              />
              <Button variant="outline" size="sm" className="pointer-events-none">
                Upload Photos
              </Button>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
