import { useState } from "react";
import { Upload, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

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
      const urlResponse = await fetch(`/api/menu/${restaurantId}/menu-card/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }),
      });

      if (!urlResponse.ok) throw new Error("Failed to get upload URL");
      
      const { jobId, uploadUrl, publicUrl, key }: UploadUrlResponse = await urlResponse.json();
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
      const jobResponse = await fetch(`/api/menu/${restaurantId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: publicUrl,
          imageS3Key: key,
          imageSizeBytes: file.size,
        }),
      });

      if (!jobResponse.ok) throw new Error("Failed to create job");
      
      const { job }: ExtractionJobResponse = await jobResponse.json();
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
        className="gap-2 bg-gradient-to-r from-primary to-pink-600 hover:from-primary/90 hover:to-pink-600/90"
      >
        <Sparkles className="w-4 h-4" />
        AI Menu Extract
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Upload Menu Card Image
            </DialogTitle>
          </DialogHeader>

          {!isUploading ? (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept={SUPPORTED_FORMATS.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="menu-upload"
                />
                <label htmlFor="menu-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Choose menu card image
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {FORMAT_NAMES} • Max 10MB
                  </p>
                  <Button type="button" variant="outline" size="sm">
                    Browse Files
                  </Button>
                </label>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> AVIF format is not supported. Please use JPG, PNG, or WebP instead.
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI will extract:
                </p>
                <ul className="space-y-1 text-muted-foreground pl-6">
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