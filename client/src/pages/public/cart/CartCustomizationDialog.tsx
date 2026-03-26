import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { MenuItem } from "@/types";

function getTranslated(translations: Record<string, string> | undefined | null, lang: string, fallback: string) {
  if (!translations) return fallback;
  return translations[lang] || translations["en"] || fallback;
}

export function CartCustomizationDialog({
  item,
  currency,
  lang,
  open,
  onOpenChange,
  onAddToCart,
}: {
  item: MenuItem | null;
  currency: string;
  lang: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (cartItemParams: any) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, boolean>>({});

  const hasVariants = item?.variants && item.variants.length > 0;
  const hasModifiers = item?.modifierGroups && item.modifierGroups.length > 0;

  useEffect(() => {
    if (open && item) {
      setQuantity(1);
      if (item.variants?.length) {
        const defaultVar = item.variants.find((v) => v.isDefault) || item.variants[0];
        setSelectedVariantId(defaultVar?.id || null);
      } else {
        setSelectedVariantId(null);
      }
      setSelectedModifiers({});
    }
  }, [open, item]);

  const toggleModifier = (modId: string, group: any) => {
    setSelectedModifiers((prev) => {
      const next = { ...prev };
      
      // Simple validation for radio behavior if maxSelections === 1
      if (group.maxSelections === 1) {
        // Unselect all others in this group
        group.modifiers?.forEach((m: any) => {
          if (m.id !== modId) next[m.id] = false;
        });
      }

      next[modId] = !next[modId];

      return next;
    });
  };

  const currentPrice = useMemo(() => {
    if (!item) return 0;
    let base = parseFloat(String(item.price)) || 0;
    if (selectedVariantId && item.variants) {
      const v = item.variants.find((x) => x.id === selectedVariantId);
      if (v) base = parseFloat(String(v.price)) || 0;
    }

    let mods = 0;
    if (item.modifierGroups) {
      item.modifierGroups.forEach((g) => {
        g.modifiers?.forEach((m) => {
          if (selectedModifiers[m.id]) mods += parseFloat(String(m.price)) || 0;
        });
      });
    }

    return (base + mods) * quantity;
  }, [item, selectedVariantId, selectedModifiers, quantity]);

  if (!item) return null;

  const displayName = getTranslated(item.nameTranslations, lang, item.name);
  const displayDesc = item.description ? getTranslated(item.descriptionTranslations, lang, item.description) : null;

  const handleAdd = () => {
    // Validate required modifier groups (minSelections)
    if (item.modifierGroups) {
      for (const group of item.modifierGroups) {
        const min = group.minSelections ?? 0;
        if (min > 0) {
          const selectedCount = group.modifiers?.filter((m) => selectedModifiers[m.id]).length ?? 0;
          if (selectedCount < min) {
            const groupName = group.name || "a required group";
            toast.error(`Please select at least ${min} option${min > 1 ? "s" : ""} for "${groupName}"`);
            return;
          }
        }
      }
    }
    const selectedMods: any[] = [];
    if (item.modifierGroups) {
      item.modifierGroups.forEach((g) => {
        g.modifiers?.forEach((m) => {
          if (selectedModifiers[m.id]) {
            selectedMods.push({
              id: m.id,
              name: m.name,
              nameTranslations: m.nameTranslations,
              price: m.price,
              groupId: g.id,
              groupName: g.name,
            });
          }
        });
      });
    }

    let variantName = null;
    let variantNameTranslations = null;
    if (selectedVariantId && item.variants) {
      const v = item.variants.find((x) => x.id === selectedVariantId);
      if (v) {
        variantName = v.variantName;
        variantNameTranslations = (v as any).nameTranslations ?? v.variantNameTranslations;
      }
    }

    onAddToCart({
      menuItemId: item.id,
      name: item.name,
      nameTranslations: item.nameTranslations,
      price: currentPrice / quantity, // Base price + mods per unit
      quantity,
      selectedVariantId,
      variantName,
      variantNameTranslations,
      selectedModifiers: selectedMods,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <DialogTitle className="text-xl font-semibold pr-8">{displayName}</DialogTitle>
          {displayDesc && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{displayDesc}</p>}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-6 mt-2">
          {hasVariants && (
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center">
                Size Options <span className="text-red-500 ml-1">*</span>
              </h3>
              <div className="space-y-2">
                {item.variants?.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  const vName = getTranslated((variant as any).nameTranslations ?? variant.variantNameTranslations, lang, variant.variantName);
                  return (
                    <div
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted/40'} cursor-pointer transition-colors gap-2`}
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary' : 'border-input'}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-sm font-medium text-foreground">{vName}</span>
                        {variant.isDefault && <Badge className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">Popular</Badge>}
                      </div>
                      <span className="text-sm sm:text-base font-bold text-primary shrink-0 sm:ml-auto ml-7">
                        {currency}{variant.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasModifiers && (
            <div className="space-y-5 pb-4">
              {item.modifierGroups?.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-1">
                      {getTranslated((group as any).nameTranslations, lang, group.name)}
                      {group.isRequired && <span className="text-red-500 text-base">*</span>}
                    </h3>
                    {(group.minSelections || group.maxSelections) && (
                      <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                        {group.minSelections && `Min ${group.minSelections}`}
                        {group.minSelections && group.maxSelections && " • "}
                        {group.maxSelections && `Max ${group.maxSelections}`}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.modifiers?.map((modifier) => {
                      const isSelected = !!selectedModifiers[modifier.id];
                      const mName = getTranslated(modifier.nameTranslations, lang, modifier.name);
                      const isRadio = group.maxSelections === 1;
                      return (
                        <div
                          key={modifier.id}
                          onClick={() => toggleModifier(modifier.id, group)}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:bg-muted/40'} cursor-pointer transition-colors gap-2`}
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 border mr-3 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'} ${isRadio ? 'rounded-full' : 'rounded-sm'}`}>
                              {isSelected && (isRadio ? <div className="w-2 h-2 rounded-full bg-background" /> : <div className="w-3 h-3 bg-current shrink-0" style={{ clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />)}
                            </div>
                            <span className="text-sm text-foreground">{mName}</span>
                          </div>
                          <span className="text-sm font-bold text-primary shrink-0 sm:ml-auto ml-7">
                            +{currency}{modifier.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-background border-t mt-auto shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="text-sm font-medium text-foreground">Quantity</span>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background rounded-md" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background rounded-md" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button className="w-full h-12 text-base rounded-xl" onClick={handleAdd}>
            Add to Order • {currency}{currentPrice.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
