import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, ShoppingCart, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types";
import { hasCustomization } from "./Customizedorderitemdisplay";

interface ItemCustomizationContentProps {
  menuItem: MenuItem;
  currency: string;
  onClose: () => void;
  onAddToCart: (selection: {
    menuItemId: string;
    quantity: number;
    variantId?: string;
    modifierIds?: string[];
  }) => void;
}

export function ItemCustomizationContent({
  menuItem,
  currency,
  onClose,
  onAddToCart,
}: ItemCustomizationContentProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [selectedModifierIds, setSelectedModifierIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setQuantity(1);
    const defaultVariant = menuItem.variants?.find(v => v.isDefault);
    setSelectedVariantId(defaultVariant?.id);
    
    const defaultModifiers = new Set<string>();
    menuItem.modifierGroups?.forEach(group => {
      group.modifiers?.forEach(mod => {
        if (mod.isDefault) defaultModifiers.add(mod.id);
      });
    });
    setSelectedModifierIds(defaultModifiers);
  }, [menuItem]);

  const handleModifierToggle = (modifierId: string, group: any) => {
    const newSelection = new Set(selectedModifierIds);
    if (group.selectionType === "SINGLE") {
      group.modifiers?.forEach(mod => {
        if (mod.id !== modifierId) newSelection.delete(mod.id);
      });
      if (newSelection.has(modifierId)) {
        newSelection.delete(modifierId);
      } else {
        newSelection.add(modifierId);
      }
    } else {
      if (newSelection.has(modifierId)) {
        newSelection.delete(modifierId);
      } else {
        const groupModCount = Array.from(newSelection).filter(id =>
          group.modifiers?.some(m => m.id === id)
        ).length;
        if (group.maxSelections && groupModCount >= group.maxSelections) return;
        newSelection.add(modifierId);
      }
    }
    setSelectedModifierIds(newSelection);
  };

  const calculateTotal = () => {
    let basePrice = parseFloat(menuItem.price as any);
    if (selectedVariantId) {
      const variant = menuItem.variants?.find(v => v.id === selectedVariantId);
      if (variant) basePrice = parseFloat(variant.price as any);
    }
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
    for (const group of menuItem.modifierGroups || []) {
      if (group.isRequired) {
        const groupModCount = Array.from(selectedModifierIds).filter(id =>
          group.modifiers?.some(m => m.id === id)
        ).length;
        if (groupModCount < (group.minSelections || 1)) return false;
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
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate">{menuItem.name}</h3>
          {menuItem.description && (
            <p className="text-xs text-muted-foreground truncate">{menuItem.description}</p>
          )}
        </div>
      </div>

      {/* Content - Same as before but without Dialog wrapper */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
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

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-background">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-bold">Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-10 text-center font-bold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-primary">
                {currency}{calculateTotal().toFixed(2)}
              </p>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={!canAddToCart()}
              className="flex-1 max-w-[180px]"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}