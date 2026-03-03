import { useState } from "react";
import { Upload, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface MenuCardUploaderProps {
  restaurantId: string | null;
  onExtractionComplete: (jobId: string) => void;
}

interface UploadUrlResponse {
  jobId: string;
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

interface ExtractionJobResponse {
  job: {
    id: string;
  };
}

// Supported formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const FORMAT_NAMES = 'JPG, PNG, or WebP';

export function MenuCardUploader({ restaurantId, onExtractionComplete }: MenuCardUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      toast.error(
        `Unsupported format. Please use ${FORMAT_NAMES}.`,
        {
          description: file.type === 'image/avif'
            ? 'AVIF format is not supported. Please convert to JPG or PNG.'
            : 'This image format is not supported.'
        }
      );
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Step 1: Get presigned URL
      const { jobId, uploadUrl, publicUrl, key }: UploadUrlResponse = await api.post(
        `/api/menu/${restaurantId}/menu-card/upload-url`,
        {
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        },
      );
      setUploadProgress(20);

      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");
      setUploadProgress(50);

      // Step 3: Create extraction job
      const { job }: ExtractionJobResponse = await api.post(
        `/api/menu/${restaurantId}/extract`,
        {
          imageUrl: publicUrl,
          imageS3Key: key,
          imageSizeBytes: file.size,
        },
      );
      setUploadProgress(100);

      toast.success("🎉 Image uploaded! AI is analyzing your menu...");

      setTimeout(() => {
        setIsOpen(false);
        onExtractionComplete(job.id);
        setIsUploading(false);
        setUploadProgress(0);
        setPreview(null);
      }, 1000);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-gradient-to-r from-primary to-pink-600 hover:from-primary/90 hover:to-pink-600/90 text-xs sm:text-sm h-8 sm:h-9"
      >
        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">AI Menu Extract</span>
        <span className="sm:hidden">Extract</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-full mx-auto max-h-[90vh] overflow-y-auto px-4 py-4 sm:p-6 transition-all duration-200">
          <DialogHeader className="pr-6 sm:pr-0">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="truncate">Upload Menu Image</span>
            </DialogTitle>
          </DialogHeader>

          {!isUploading ? (
            <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 sm:p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept={SUPPORTED_FORMATS.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="menu-upload"
                />
                <label htmlFor="menu-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-4 text-muted-foreground" />
                  <p className="text-sm sm:text-base font-medium mb-1 sm:mb-2">
                    Choose menu card image
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                    {FORMAT_NAMES} • Max 10MB
                  </p>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs sm:text-sm px-4">
                    Browse Files
                  </Button>
                </label>
              </div>

              <Alert className="p-2 sm:p-4">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <AlertDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-0 leading-tight">
                  <strong>Note:</strong> AVIF format is not supported. Use JPG/PNG/WebP.
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <p className="font-semibold flex items-center gap-1.5 sm:gap-2">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  AI will extract:
                </p>
                <ul className="space-y-1 text-muted-foreground pl-5 sm:pl-6 text-[10px] sm:text-sm">
                  <li>✓ All menu items with prices</li>
                  <li>✓ Categories and descriptions</li>
                  <li>✓ Dietary types (Veg/Non-Veg)</li>
                  <li>✓ Ready to review in seconds!</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-6">
              {preview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                  <img
                    src={preview}
                    alt="Menu preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {uploadProgress < 50 ? '📤 Uploading...' :
                      uploadProgress < 100 ? '🤖 AI Analyzing...' : '✅ Complete!'}
                  </span>
                  <span className="text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>

              {uploadProgress === 100 && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">Processing started!</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}