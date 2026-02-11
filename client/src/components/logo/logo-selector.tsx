import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Check, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  usePredefinedLogos, 
  useLogoUploadUrl, 
  useUpdateRestaurantLogo,
  useRestaurantLogo,
  useDeleteRestaurantLogo
} from "@/hooks/api";

interface LogoSelectorProps {
  restaurantId: string;
}

export function LogoSelector({ restaurantId }: LogoSelectorProps) {
  const [selectedLogo, setSelectedLogo] = useState<{
    type: 'predefined' | 'custom';
    url: string;
    key?: string | null;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentLogo, refetch: refetchLogo } = useRestaurantLogo(restaurantId);
  // Remove category parameter - fetch all logos
  const { data: predefinedLogos, isLoading: loadingTemplates } = usePredefinedLogos();
  const uploadUrlMutation = useLogoUploadUrl(restaurantId);
  const updateLogoMutation = useUpdateRestaurantLogo(restaurantId);
  const deleteLogoMutation = useDeleteRestaurantLogo(restaurantId);


  const handlePredefinedSelect = (logo: any) => {
    setSelectedLogo({
      type: 'predefined',
      url: logo.url,
    });
  };

  const handleCustomUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Please upload a PNG or JPEG image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Get upload URL
      const uploadData = await uploadUrlMutation.mutateAsync({
        contentType: file.type
      });

      // Upload to S3
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // Set selected logo
      setSelectedLogo({
        type: 'custom',
        url: uploadData.publicUrl,
        key: uploadData.key
      });

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveLogo = async () => {
    if (!selectedLogo) return;

    try {
      await updateLogoMutation.mutateAsync(selectedLogo);
      await refetchLogo();
      setSelectedLogo(null);
      toast.success('Logo updated successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update logo');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await deleteLogoMutation.mutateAsync();
      await refetchLogo();
      setSelectedLogo(null);
      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove logo');
    }
  };

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <CardTitle className="text-lg sm:text-xl">Receipt Logo</CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Choose a logo to appear on your thermal printer receipts. All templates work for any business type.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        {/* Current Logo */}
        {currentLogo && (
          <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
            <Label className="text-xs sm:text-sm font-medium mb-2 block">Current Logo</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <img 
                src={currentLogo.url} 
                alt="Current logo" 
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain border rounded bg-white p-2 mx-auto sm:mx-0"
              />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {currentLogo.type === 'predefined' ? 'Template Logo' : 'Custom Logo'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={deleteLogoMutation.isPending}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {deleteLogoMutation.isPending ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <span className="ml-1 sm:ml-2">Remove</span>
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="text-xs sm:text-sm">Browse Templates</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs sm:text-sm">Upload Custom</TabsTrigger>
          </TabsList>

          {/* Predefined Templates - All shown together */}
          <TabsContent value="templates" className="space-y-3 sm:space-y-4">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  {predefinedLogos?.length || 0} templates available • Choose any design for your business
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2">
                  {predefinedLogos?.map((logo: any) => (
                    <button
                      key={logo.id}
                      onClick={() => handlePredefinedSelect(logo)}
                      className={cn(
                        "relative p-2 sm:p-3 border-2 rounded-lg transition-all hover:border-primary hover:shadow-md",
                        selectedLogo?.url === logo.url && selectedLogo?.type === 'predefined'
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border"
                      )}
                    >
                      <div className="aspect-square bg-white rounded mb-1.5 sm:mb-2 flex items-center justify-center p-2 sm:p-3 border">
                        <img
                          src={logo.url}
                          alt={logo.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[10px] sm:text-xs font-medium text-center line-clamp-1">
                          {logo.name}
                        </p>
                        {logo.description && (
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center line-clamp-2 hidden sm:block">
                            {logo.description}
                          </p>
                        )}
                      </div>
                      {selectedLogo?.url === logo.url && selectedLogo?.type === 'predefined' && (
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Custom Upload */}
          <TabsContent value="upload" className="space-y-3 sm:space-y-4">
            <div className="border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCustomUpload(file);
                }}
                className="hidden"
              />
              
              {selectedLogo?.type === 'custom' ? (
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <img
                    src={selectedLogo.url}
                    alt="Custom logo"
                    className="w-24 h-24 sm:w-32 sm:h-32 object-contain border rounded bg-white p-2"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs sm:text-sm"
                  >
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Upload Different Image
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-medium mb-1">
                      {isUploading ? 'Uploading...' : 'Upload Your Logo'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 px-2">
                      PNG or JPEG, max 2MB. Recommended: 300x300px
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs sm:text-sm"
                  >
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium">Logo Guidelines:</p>
              <ul className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5 sm:space-y-1">
                <li>• Use a square image (300x300px recommended)</li>
                <li>• PNG format with transparent background works best</li>
                <li>• Keep it simple - thermal printers print in black & white</li>
                <li>• Avoid fine details that may not print clearly</li>
                <li>• High contrast designs work best for receipts</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        {selectedLogo && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSaveLogo}
              disabled={updateLogoMutation.isPending}
              className="flex-1 text-xs sm:text-sm"
            >
              {updateLogoMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Save Logo
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedLogo(null)}
              disabled={updateLogoMutation.isPending}
              className="text-xs sm:text-sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}