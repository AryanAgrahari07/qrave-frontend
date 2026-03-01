import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderItem } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface CustomizedOrderItemDisplayProps {
  item: OrderItem & {
    selectedModifiers?: Array<{
      id: string;
      name: string;
      price: number;
      groupName: string;
    }>;
    variantName?: string;
    variantPrice?: string;
    customizationAmount?: string;
  };
  currency: string;
  showPriceBreakdown?: boolean;
  compact?: boolean;
  onMarkDelivered?: () => void;
  isUpdating?: boolean;
}

export function CustomizedOrderItemDisplay({
  item,
  currency,
  showPriceBreakdown = false,
  compact = false,
  onMarkDelivered,
  isUpdating = false,
}: CustomizedOrderItemDisplayProps) {
  const { t, language } = useLanguage();
  const hasCustomization = item.variantName || (item.selectedModifiers && item.selectedModifiers.length > 0);

  // Helper to resolve translation for variants and modifiers
  const tVariantName = item.variantNameTranslations?.[language] || item.variantName;

  if (compact) {
    const isServed = item.status === "SERVED";
    const isReady = item.status === "READY";
    const isNew = item.status === "PENDING";

    return (
      <div className={cn("space-y-1 p-2 rounded-md", isReady && "bg-green-50/50", isServed && "opacity-60")}>
        <div className="flex items-start justify-between">
          <div className="flex-[2_2_0%] min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("font-medium", isServed && "line-through text-slate-500")}>
                {item.quantity}x {item.itemName}
              </span>
              {isNew && <Badge variant="destructive" className="px-1 py-0 text-[9px] h-4">NEW</Badge>}
              {isReady && <Badge variant="default" className="px-1 py-0 text-[9px] h-4 bg-green-600">READY</Badge>}
              {isServed && <Badge variant="outline" className="px-1 py-0 text-[9px] h-4 text-slate-400">SERVED</Badge>}
            </div>
            {item.variantName && (
              <Badge variant="outline" className="mt-1 text-xs">
                {tVariantName}
              </Badge>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="font-bold">{currency}{parseFloat(item.totalPrice).toFixed(2)}</span>
            {isReady && onMarkDelivered && (
              <Button
                size="sm"
                variant="default"
                className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMarkDelivered(); }}
                disabled={isUpdating}
              >
                {isUpdating ? "..." : "Serve"}
              </Button>
            )}
          </div>
        </div>

        {hasCustomization && (
          <div className="text-xs text-muted-foreground pl-6">
            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.selectedModifiers.map((mod, idx) => {
                  const modNameToUse = (mod as any).nameTranslations?.[language] || mod.name;
                  return (
                    <span key={idx}>
                      {modNameToUse}
                      {mod.price > 0 && ` (+${currency}${mod.price.toFixed(2)})`}
                      {idx < item.selectedModifiers!.length - 1 && ","}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {item.notes && (
          <div className="text-xs text-yellow-600 pl-6 italic">
            Note: {item.notes}
          </div>
        )}
      </div>
    );
  }

  const isServed = item.status === "SERVED";
  const isReady = item.status === "READY";
  const isNew = item.status === "PENDING";

  return (
    <div className={cn("space-y-2 p-3 rounded-lg border bg-muted/20", isReady && "bg-green-50 border-green-200", isServed && "opacity-60 bg-slate-50")}>
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-bold text-base", isServed && "line-through text-slate-500")}>
              {item.quantity}x {item.itemName}
            </span>
            {isNew && <Badge variant="destructive" className="px-1.5 py-0 text-[10px] h-5">NEW</Badge>}
            {isReady && <Badge variant="default" className="px-1.5 py-0 text-[10px] h-5 bg-green-600">READY</Badge>}
            {isServed && <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-5 text-slate-400">SERVED</Badge>}
          </div>

          {showPriceBreakdown && (
            <div className="text-sm text-muted-foreground mt-1">
              Base: {currency}{parseFloat(item.unitPrice).toFixed(2)}
            </div>
          )}
        </div>
        <span className="font-bold text-lg text-primary">
          {currency}{parseFloat(item.totalPrice).toFixed(2)}
        </span>
      </div>

      {/* Variant Selection */}
      {item.variantName && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Size/Portion
          </Badge>
          <span className="text-sm font-medium">{tVariantName}</span>
          {showPriceBreakdown && item.variantPrice && (
            <span className="text-xs text-muted-foreground">
              ({currency}{parseFloat(item.variantPrice).toFixed(2)})
            </span>
          )}
        </div>
      )}

      {/* Modifiers */}
      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            Customizations:
          </div>
          <div className="space-y-1 pl-3">
            {item.selectedModifiers.map((mod, idx) => {
              const modPrice = mod.price || 0;
              const modNameToUse = (mod as any).nameTranslations?.[language] || mod.name;
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span>{modNameToUse}</span>
                    {mod.groupName && (
                      <span className="text-xs text-muted-foreground">
                        ({mod.groupName})
                      </span>
                    )}
                  </div>
                  {modPrice > 0 && showPriceBreakdown && (
                    <span className="text-xs text-muted-foreground">
                      +{currency}{modPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customization Total */}
      {showPriceBreakdown && item.customizationAmount && parseFloat(item.customizationAmount) > 0 && (
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Customization Total</span>
          <span className="font-medium">
            +{currency}{parseFloat(item.customizationAmount).toFixed(2)}
          </span>
        </div>
      )}

      {/* Special Notes */}
      {item.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
          <span className="font-semibold text-yellow-800">Note: </span>
          <span className="text-yellow-700">{item.notes}</span>
        </div>
      )}
    </div>
  );
}

// Utility function to check if an item has customization
export function hasCustomization(item: OrderItem): boolean {
  return !!(
    item.variantName ||
    (item.selectedModifiers && Array.isArray(item.selectedModifiers) && item.selectedModifiers.length > 0)
  );
}

// Utility function to format customization summary (for compact displays)
export function getCustomizationSummary(item: OrderItem): string {
  const parts: string[] = [];

  if (item.variantName) {
    parts.push(item.variantName);
  }

  if (item.selectedModifiers && Array.isArray(item.selectedModifiers)) {
    const modNames = item.selectedModifiers.map(m => m.name);
    if (modNames.length > 0) {
      parts.push(modNames.join(", "));
    }
  }

  return parts.join(" • ");
}