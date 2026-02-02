import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem, Variant, ModifierGroup, Modifier } from "@/types";

interface ItemCustomizationDialogProps {
  menuItem: MenuItem & {
    variants?: Variant[];
    modifierGroups?: ModifierGroup[];
  };
  currency: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (selection: {
    menuItemId: string;
    quantity: number;
    variantId?: string;
    modifierIds?: string[];
  }) => void;
}

export function ItemCustomizationDialog({
  menuItem,
  currency,
  isOpen,
  onClose,
  onAddToCart,
}: ItemCustomizationDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [selectedModifierIds, setSelectedModifierIds] = useState<Set<string>>(new Set());

  // Reset state when dialog opens with new item
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      
      // Auto-select default variant if exists
      const defaultVariant = menuItem.variants?.find(v => v.isDefault);
      setSelectedVariantId(defaultVariant?.id);
      
      // Auto-select default modifiers
      const defaultModifiers = new Set<string>();
      menuItem.modifierGroups?.forEach(group => {
        group.modifiers?.forEach(mod => {
          if (mod.isDefault) {
            defaultModifiers.add(mod.id);
          }
        });
      });
      setSelectedModifierIds(defaultModifiers);
    }
  }, [isOpen, menuItem]);

  const handleModifierToggle = (
    modifierId: string,
    group: ModifierGroup
  ) => {
    const newSelection = new Set(selectedModifierIds);

    if (group.selectionType === "SINGLE") {
      // Remove all other modifiers from this group
      group.modifiers?.forEach(mod => {
        if (mod.id !== modifierId) {
          newSelection.delete(mod.id);
        }
      });
      // Toggle this modifier
      if (newSelection.has(modifierId)) {
        newSelection.delete(modifierId);
      } else {
        newSelection.add(modifierId);
      }
    } else {
      // Multiple selection
      if (newSelection.has(modifierId)) {
        newSelection.delete(modifierId);
      } else {
        // Check max selections
        const groupModCount = Array.from(newSelection).filter(id =>
          group.modifiers?.some(m => m.id === id)
        ).length;
        
        if (group.maxSelections && groupModCount >= group.maxSelections) {
          return; // Don't allow more selections
        }
        
        newSelection.add(modifierId);
      }
    }

    setSelectedModifierIds(newSelection);
  };

  const calculateTotal = () => {
    let basePrice = parseFloat(menuItem.price as any);

    // Use variant price if selected
    if (selectedVariantId) {
      const variant = menuItem.variants?.find(v => v.id === selectedVariantId);
      if (variant) {
        basePrice = parseFloat(variant.price as any);
      }
    }

    // Add modifier prices
    let modifiersTotal = 0;
    menuItem.modifierGroups?.forEach(group => {
      group.modifiers?.forEach(mod => {
        if (selectedModifierIds.has(mod.id)) {
          modifiersTotal += parseFloat(mod.price as any);
        }
      });
    });

    return (basePrice + modifiersTotal) * quantity;
  };

  const canAddToCart = () => {
    // Check required modifier groups
    for (const group of menuItem.modifierGroups || []) {
      if (group.isRequired) {
        const groupModCount = Array.from(selectedModifierIds).filter(id =>
          group.modifiers?.some(m => m.id === id)
        ).length;
        
        if (groupModCount < (group.minSelections || 1)) {
          return false;
        }
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    onAddToCart({
      menuItemId: menuItem.id,
      quantity,
      variantId: selectedVariantId,
      modifierIds: Array.from(selectedModifierIds),
    });
    // Don't call onClose() here - let the parent component handle it
  };

  const hasCustomization = (menuItem.variants?.length || 0) > 0 || 
                          (menuItem.modifierGroups?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent 
        className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
        onInteractOutside={(e) => {
          e.preventDefault(); 
          e.stopPropagation();
        }}
        onEscapeKeyDown={(e) => {
          // Allow ESC to close this dialog only
          onClose();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Header - Fixed at top */}
        <DialogHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4 shrink-0 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg sm:text-2xl">{menuItem.name}</DialogTitle>
              {menuItem.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  {menuItem.description}
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
            {/* Variants Section */}
            {menuItem.variants && menuItem.variants.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-sm sm:text-base font-bold">
                  Size / Portion <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={selectedVariantId}
                  onValueChange={setSelectedVariantId}
                  className="space-y-1.5 sm:space-y-2"
                >
                  {menuItem.variants
                    .filter(v => v.isAvailable)
                    .map((variant) => (
                      <div
                        key={variant.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 sm:p-3 rounded-lg border-2 transition-colors cursor-pointer active:scale-[0.98]",
                          selectedVariantId === variant.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedVariantId(variant.id)}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <RadioGroupItem value={variant.id} id={variant.id} className="shrink-0" />
                          <Label
                            htmlFor={variant.id}
                            className="cursor-pointer font-medium text-sm sm:text-base truncate"
                          >
                            {variant.variantName}
                            {variant.isDefault && (
                              <Badge variant="outline" className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs">
                                Popular
                              </Badge>
                            )}
                          </Label>
                        </div>
                        <span className="font-bold text-primary text-sm sm:text-base shrink-0 ml-2">
                          {currency}{parseFloat(variant.price as any).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </RadioGroup>
              </div>
            )}

            {/* Modifier Groups Section */}
            {menuItem.modifierGroups && menuItem.modifierGroups.length > 0 && (
              <>
                {menuItem.variants && menuItem.variants.length > 0 && <Separator className="my-3 sm:my-4" />}
                
                {menuItem.modifierGroups.map((group) => {
                  const availableModifiers = group.modifiers?.filter(m => m.isAvailable) || [];
                  if (availableModifiers.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-2 sm:space-y-3">
                      <div>
                        <Label className="text-sm sm:text-base font-bold">
                          {group.name}
                          {group.isRequired && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        {group.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            {group.description}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          {group.selectionType === "SINGLE" ? (
                            "Choose one"
                          ) : (
                            <>
                              Choose {group.minSelections || 0}
                              {group.maxSelections ? ` to ${group.maxSelections}` : "+"}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        {availableModifiers.map((modifier) => {
                          const isSelected = selectedModifierIds.has(modifier.id);
                          const modPrice = parseFloat(modifier.price as any);

                          return (
                            <div
                              key={modifier.id}
                              className={cn(
                                "flex items-center justify-between p-2.5 sm:p-3 rounded-lg border-2 transition-colors cursor-pointer active:scale-[0.98]",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
                              onClick={() => handleModifierToggle(modifier.id, group)}
                            >
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                {group.selectionType === "SINGLE" ? (
                                  <RadioGroupItem
                                    value={modifier.id}
                                    id={modifier.id}
                                    checked={isSelected}
                                    className="pointer-events-none shrink-0"
                                  />
                                ) : (
                                  <Checkbox
                                    id={modifier.id}
                                    checked={isSelected}
                                    className="pointer-events-none shrink-0"
                                  />
                                )}
                                <Label
                                  htmlFor={modifier.id}
                                  className="cursor-pointer font-medium text-sm sm:text-base truncate"
                                >
                                  {modifier.name}
                                  {modifier.isDefault && (
                                    <Badge variant="outline" className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs">
                                      Popular
                                    </Badge>
                                  )}
                                </Label>
                              </div>
                              {modPrice > 0 && (
                                <span className="font-bold text-xs sm:text-sm shrink-0 ml-2">
                                  +{currency}{modPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {!hasCustomization && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No customization options available for this item.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - Fixed at bottom */}
        <DialogFooter className="px-3 sm:px-6 py-2.5 sm:py-4 border-t bg-background shrink-0">
          <div className="w-full space-y-2.5 sm:space-y-4">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <Label className="text-sm sm:text-base font-bold">Quantity</Label>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <span className="w-10 sm:w-12 text-center font-bold text-base sm:text-lg">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>

            {/* Total & Add Button */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground">Total</p>
                <p className="text-lg sm:text-2xl font-bold text-primary truncate">
                  {currency}{calculateTotal().toFixed(2)}
                </p>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={!canAddToCart()}
                className="flex-1 max-w-[180px] sm:max-w-xs h-9 sm:h-11 text-sm sm:text-base"
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}