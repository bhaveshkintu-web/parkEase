"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Crop as CropIcon, RefreshCw, FileCode, Monitor } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        renderHTML: (attributes) => ({
          width: attributes.width,
          style: `width: ${attributes.width}; height: auto;`,
        }),
      },
    };
  },
});

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [isCodeView, setIsCodeView] = useState(false);
  const [htmlContent, setHtmlContent] = useState(content);
  const imgRef = useRef<HTMLImageElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg inline-block",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange(html);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[300px] p-4 border rounded-md",
      },
    },
    immediatelyRender: false,
  });

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: 90,
          },
          aspect,
          width,
          height
        ),
        width,
        height
      ));
    } else {
      setCrop({
        unit: "%",
        x: 5,
        y: 5,
        width: 90,
        height: 90,
      });
    }
  }

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (newAspect) {
        setCrop(centerCrop(
          makeAspectCrop(
            {
              unit: "%",
              width: 90,
            },
            newAspect,
            width,
            height
          ),
          width,
          height
        ));
      } else {
        setCrop({
          unit: "%",
          x: 5,
          y: 5,
          width: 90,
          height: 90,
        });
      }
    }
  };

  if (!editor) {
    return null;
  }

  const setImageSize = (width: string) => {
    editor.chain().focus().updateAttributes("image", { width }).run();
  };

  const handleApplyCrop = async () => {
    if (!imageToCrop || !completedCrop || !imgRef.current) return;

    setIsUploading(true);
    try {
      const canvas = document.createElement("canvas");
      const image = imgRef.current;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          image,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.9)
        );

        if (blob) {
          const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Upload failed");

          const { url } = await response.json();
          editor.chain().focus().updateAttributes("image", { src: url }).run();
          toast.success("Image cropped and updated");
        }
      }
    } catch (error) {
      console.error("Crop error:", error);
      toast.error("Failed to crop image");
    } finally {
      setIsUploading(false);
      setCropDialogOpen(false);
    }
  };

  const handleReplaceImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const { url } = await response.json();
        editor.chain().focus().updateAttributes("image", { src: url }).run();
        toast.success("Image replaced successfully");
      } catch (error) {
        toast.error("Failed to replace image");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const { url } = await response.json();
        editor.chain().focus().setImage({ src: url }).run();
        toast.success("Image uploaded successfully");
      } catch (error: any) {
        console.error("Image upload error:", error);
        toast.error(error.message || "Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const toggleCodeView = () => {
    if (isCodeView) {
      // Switching from Code to Visual
      editor.commands.setContent(htmlContent);
    } else {
      // Switching from Visual to Code
      setHtmlContent(editor.getHTML());
    }
    setIsCodeView(!isCodeView);
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlContent(val);
    onChange(val);
  };

  return (
    <div className="border rounded-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border my-auto mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""}
        >
          <Heading3 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border my-auto mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? "bg-muted text-primary" : ""}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "bg-muted text-primary" : ""}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? "bg-muted text-primary" : ""}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={editor.isActive({ textAlign: "justify" }) ? "bg-muted text-primary" : ""}
          title="Align Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border my-auto mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-muted" : ""}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-muted" : ""}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive("codeBlock") ? "bg-muted" : ""}
        >
          <Code className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border my-auto mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLink}
          className={editor.isActive("link") ? "bg-muted" : ""}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          disabled={isUploading}
          className={editor.isActive("image") ? "text-primary" : ""}
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        {editor.isActive("image") && (
          <div className="flex items-center gap-1 border-l pl-1 ml-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImageSize("25%")}
              className={editor.isActive("image", { width: "25%" }) ? "bg-muted text-primary" : "text-xs"}
            >
              25%
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImageSize("50%")}
              className={editor.isActive("image", { width: "50%" }) ? "bg-muted text-primary" : "text-xs"}
            >
              50%
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImageSize("75%")}
              className={editor.isActive("image", { width: "75%" }) ? "bg-muted text-primary" : "text-xs"}
            >
              75%
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImageSize("100%")}
              className={editor.isActive("image", { width: "100%" }) ? "bg-muted text-primary" : "text-xs"}
            >
              100%
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReplaceImage}
              title="Replace Image"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const attrs = editor.getAttributes("image");
                if (attrs.src) {
                  setImageToCrop(attrs.src);
                  setCropDialogOpen(true);
                }
              }}
              title="Crop Image"
            >
              <CropIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="w-px h-6 bg-border my-auto mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          variant={isCodeView ? "default" : "ghost"}
          size="sm"
          onClick={toggleCodeView}
          className={cn("gap-2", isCodeView && "bg-primary text-primary-foreground")}
          title={isCodeView ? "Switch to Visual Editor" : "Switch to HTML Editor"}
        >
          {isCodeView ? (
            <>
              <Monitor className="w-4 h-4" />
              <span className="text-xs font-medium">Visual</span>
            </>
          ) : (
            <>
              <FileCode className="w-4 h-4" />
              <span className="text-xs font-medium">HTML</span>
            </>
          )}
        </Button>
      </div>

      {/* Editor Content */}
      <div className="relative">
        {isCodeView ? (
          <textarea
            value={htmlContent}
            onChange={handleHtmlChange}
            className="w-full min-h-[400px] p-4 font-mono text-sm bg-slate-950 text-slate-200 border-none focus:ring-1 focus:ring-primary/50 outline-none rounded-b-lg resize-y scrollbar-thin scrollbar-thumb-slate-800"
            spellCheck={false}
          />
        ) : (
          <EditorContent editor={editor} />
        )}

        {isCodeView && (
          <div className="absolute top-2 right-4 pointer-events-none">
            <Badge variant="outline" className="bg-slate-900/50 text-slate-400 border-slate-800 text-[10px] uppercase tracking-wider">
              HTML Mode
            </Badge>
          </div>
        )}
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center min-h-[400px] max-h-[600px] w-full bg-slate-900 overflow-auto border rounded-md">
            {imageToCrop && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={imageToCrop}
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[500px] block"
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            )}
          </div>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aspect Ratio</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20">
                  {aspect === undefined ? "Free" : aspect === 1 ? "1:1" : aspect === 4 / 3 ? "4:3" : "16:9"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={aspect === undefined ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAspectChange(undefined)}
                  className="h-8 text-xs gap-2"
                >
                  Free
                </Button>
                <Button
                  variant={aspect === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAspectChange(1)}
                  className="h-8 text-xs"
                >
                  1:1 Square
                </Button>
                <Button
                  variant={aspect === 4 / 3 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAspectChange(4 / 3)}
                  className="h-8 text-xs"
                >
                  4:3 Portrait
                </Button>
                <Button
                  variant={aspect === 16 / 9 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAspectChange(16 / 9)}
                  className="h-8 text-xs"
                >
                  16:9 Landscape
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                {aspect === undefined
                  ? "Drag handles to resize the crop area freely."
                  : "Drag handles to resize while maintaining fixed proportions."}
              </p>
            </div>
            {/* Zoom removed as handles replace its primary function for resizing/framing */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyCrop} disabled={isUploading}>
              {isUploading ? "Applying..." : "Apply Crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
