import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  usePredefinedLogos,
  useUpdateRestaurantLogo,
  useRestaurantLogo,
  useDeleteRestaurantLogo,
} from "@/hooks/api";

interface LogoSelectorProps {
  restaurantId: string;
}

export function LogoSelector({ restaurantId }: LogoSelectorProps) {
  const [selectedLogo, setSelectedLogo] = useState<{
    type: 'predefined';
    url: string;
  } | null>(null);
  const { data: currentLogo, refetch: refetchLogo } = useRestaurantLogo(restaurantId);
  // Fetch all available predefined logos
  const { data: predefinedLogos, isLoading: loadingTemplates } = usePredefinedLogos();
  const updateLogoMutation = useUpdateRestaurantLogo(restaurantId);
  const deleteLogoMutation = useDeleteRestaurantLogo(restaurantId);


  const handlePredefinedSelect = (logo: any) => {
    setSelectedLogo({
      type: 'predefined',
      url: logo.url,
    });
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

        {/* Predefined Templates */}
        <div className="space-y-3 sm:space-y-4">
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
                      selectedLogo?.url === logo.url ? "border-primary bg-primary/5 shadow-md" : "border-border"
                    )}
                  >
                    <div className="aspect-square bg-white rounded mb-1.5 sm:mb-2 flex items-center justify-center p-2 sm:p-3 border">
                      <img src={logo.url} alt={logo.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-[10px] sm:text-xs font-medium text-center line-clamp-1">{logo.name}</p>
                      {logo.description && (
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center line-clamp-2 hidden sm:block">
                          {logo.description}
                        </p>
                      )}
                    </div>
                    {selectedLogo?.url === logo.url && (
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

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