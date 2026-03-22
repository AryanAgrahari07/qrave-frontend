import { useState, useCallback, useMemo } from "react";
import { Upload, ImageIcon, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  useMenuBackgroundTemplates,
  useMenuBackground,
  useUpdateMenuBackground,
  useDeleteMenuBackground,
} from "@/hooks/api";

const SUPPORTED_FORMATS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Increased to 10 MB since we compress it anyway

/**
 * Fast client-side image compression using HTML5 Canvas.
 * Resizes to max 1920x1080 and converts to WebP with 0.85 quality.
 */
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File(
              [blob], 
              file.name.replace(/\.[^/.]+$/, ".webp"), 
              { type: "image/webp", lastModified: Date.now() }
            );
            resolve(compressedFile);
          },
          "image/webp",
          0.85 // High quality but great compression
        );
      };
      img.onerror = () => resolve(file); // Fallback
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file); // Fallback
    reader.readAsDataURL(file);
  });
};

// Overlay presets — each defines the CSS applied to the hero image + overlay div
export const OVERLAY_PRESETS = [
  {
    id: "none",
    name: "None",
    description: "No filter — show image as-is",
    imgClass: "opacity-100",
    overlayClass: "",
  },
  {
    id: "subtle",
    name: "Subtle",
    description: "Very light darkening for readability",
    imgClass: "opacity-90",
    overlayClass: "bg-gradient-to-t from-black/40 via-transparent to-black/10",
  },
  {
    id: "dark-fade",
    name: "Dark Fade",
    description: "Dark gradient from bottom",
    imgClass: "opacity-70",
    overlayClass: "bg-gradient-to-t from-black/70 via-black/20 to-black/10",
  },
  {
    id: "vivid",
    name: "Vivid",
    description: "Bright image with bottom text area",
    imgClass: "opacity-95 saturate-[1.1]",
    overlayClass: "bg-gradient-to-t from-black/60 via-transparent to-transparent",
  },
  {
    id: "warm-fade",
    name: "Warm",
    description: "Warm amber-toned overlay",
    imgClass: "opacity-80 sepia-[0.15]",
    overlayClass: "bg-gradient-to-t from-amber-950/60 via-amber-950/10 to-transparent",
  },
  {
    id: "cool-fade",
    name: "Cool",
    description: "Cool blue-toned overlay",
    imgClass: "opacity-80",
    overlayClass: "bg-gradient-to-t from-slate-950/60 via-slate-900/10 to-transparent",
  },
] as const;

export type OverlayPresetId = (typeof OVERLAY_PRESETS)[number]["id"];

/** Get the overlay preset config by ID, falling back to 'dark-fade' */
export function getOverlayPreset(id?: string | null) {
  return OVERLAY_PRESETS.find((p) => p.id === id) ?? OVERLAY_PRESETS[2]; // dark-fade default
}

interface Props {
  restaurantId: string;
}

export function MenuBackgroundSelector({ restaurantId }: Props) {
  const { data: templates, isLoading: loadingTemplates } = useMenuBackgroundTemplates();
  const { data: currentBg, isLoading: loadingCurrent } = useMenuBackground(restaurantId);
  const updateBg = useUpdateMenuBackground(restaurantId);
  const deleteBg = useDeleteMenuBackground(restaurantId);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const currentOverlay = useMemo(
    () => (currentBg as any)?.overlay || "dark-fade",
    [currentBg]
  );

  const handleSelectPredefined = useCallback(
    (template: { url: string }) => {
      updateBg.mutate({ type: "predefined", url: template.url, overlay: currentOverlay });
    },
    [updateBg, currentOverlay]
  );

  const handleOverlayChange = useCallback(
    (overlayId: string) => {
      if (!currentBg?.url) {
        toast.error("Please select a background image first");
        return;
      }
      updateBg.mutate({
        type: currentBg.type as "predefined" | "custom",
        url: currentBg.url,
        key: (currentBg as any)?.key,
        overlay: overlayId,
      });
    },
    [updateBg, currentBg]
  );

  const handleCustomUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      if (!SUPPORTED_FORMATS.includes(file.type)) {
        toast.error("Unsupported format. Please use JPG, PNG, or WebP.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 10 MB.");
        return;
      }

      setUploading(true);
      setUploadProgress(5); // Show immediate feedback for compression phase

      try {
        // Step 0: Compress image before requesting URL
        const compressedFile = await compressImage(file);
        setUploadProgress(15);

        // Step 1: Get presigned URL using the compressed file type
        const { uploadUrl, publicUrl, key } = await api.post<{
          uploadUrl: string;
          publicUrl: string;
          key: string;
        }>(`/api/menu-backgrounds/${restaurantId}/upload-url`, {
          contentType: compressedFile.type,
        });
        setUploadProgress(30);

        // Step 2: Upload compressed image to S3
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: compressedFile,
          headers: { "Content-Type": compressedFile.type },
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        setUploadProgress(70);

        await updateBg.mutateAsync({
          type: "custom",
          url: publicUrl,
          key,
          overlay: currentOverlay,
        });
        setUploadProgress(100);

        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 600);
      } catch (err) {
        console.error("Background upload error:", err);
        toast.error("Upload failed. Please try again.");
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [restaurantId, updateBg, currentOverlay]
  );

  const handleRemove = useCallback(() => {
    deleteBg.mutate();
  }, [deleteBg]);

  const isCurrentUrl = (url: string) => currentBg?.url === url;
  const activePreset = getOverlayPreset(currentOverlay);

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl">Menu Background</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Choose a background and filter for your public live menu.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-4 sm:px-6 pb-5 sm:pb-6">
        {/* Current Background Preview with live overlay */}
        {currentBg?.url && (
          <div className="relative group rounded-xl overflow-hidden border border-border/50 shadow-sm">
            <img
              src={currentBg.url}
              alt="Current background"
              className={cn("w-full h-36 sm:h-44 object-cover transition-all", activePreset.imgClass)}
            />
            {activePreset.overlayClass && (
              <div className={cn("absolute inset-0 transition-all", activePreset.overlayClass)} />
            )}
            {/* Simulated text to show how it looks */}
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white text-sm font-bold drop-shadow-lg">Restaurant Name</p>
              <p className="text-white/70 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Open Now
              </p>
            </div>
            {/* Hover remove button */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemove}
                disabled={deleteBg.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Remove
              </Button>
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-full capitalize">
              {(currentBg as any).type}
            </div>
          </div>
        )}

        {/* Overlay / Filter Selection */}
        {currentBg?.url && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Overlay Filter</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {OVERLAY_PRESETS.map((preset) => {
                const active = currentOverlay === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleOverlayChange(preset.id)}
                    disabled={updateBg.isPending}
                    className={cn(
                      "relative h-16 sm:h-20 rounded-lg overflow-hidden border-2 transition-all",
                      "hover:ring-2 hover:ring-primary/40",
                      active
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/40"
                    )}
                  >
                    {/* Miniature preview of image with this overlay */}
                    <img
                      src={currentBg.url}
                      alt={preset.name}
                      className={cn("w-full h-full object-cover", preset.imgClass)}
                    />
                    {preset.overlayClass && (
                      <div className={cn("absolute inset-0", preset.overlayClass)} />
                    )}
                    <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] sm:text-[9px] font-semibold text-white text-center drop-shadow-lg">
                      {preset.name}
                    </span>
                    {active && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {activePreset.description}
            </p>
          </div>
        )}

        {/* Predefined Templates Grid */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Preset Backgrounds</p>
          {loadingTemplates || loadingCurrent ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 sm:h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {templates?.map((template) => {
                const active = isCurrentUrl(template.url);
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectPredefined(template)}
                    disabled={updateBg.isPending}
                    className={cn(
                      "relative h-20 sm:h-24 rounded-lg overflow-hidden border-2 transition-all",
                      "hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary",
                      active
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent"
                    )}
                  >
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.parentElement!.style.background =
                          "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--muted)))";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <span className="absolute bottom-1 left-1 right-1 text-[9px] sm:text-[10px] font-medium text-white truncate text-center drop-shadow">
                      {template.name}
                    </span>
                    {active && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Upload */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Custom Upload</p>
          {uploading ? (
            <div className="space-y-2 p-4 border border-dashed border-border rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {uploadProgress < 70 ? "📤 Uploading..." : uploadProgress < 100 ? "✅ Saving..." : "✅ Done!"}
                </span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 sm:p-6 text-center hover:border-primary/40 transition-colors">
              <input
                type="file"
                accept={SUPPORTED_FORMATS.join(",")}
                onChange={handleCustomUpload}
                className="hidden"
                id="menu-bg-upload"
              />
              <label htmlFor="menu-bg-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                <p className="text-xs sm:text-sm font-medium">Upload custom background</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  JPG, PNG, WebP • Max 5 MB
                </p>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-3 mt-1">
                  Browse Files
                </Button>
              </label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
