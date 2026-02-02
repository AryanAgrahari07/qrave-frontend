import { Badge } from "@/components/ui/badge";
import type { OrderItem } from "@/types";

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
}

export function CustomizedOrderItemDisplay({
  item,
  currency,
  showPriceBreakdown = false,
  compact = false,
}: CustomizedOrderItemDisplayProps) {
  const hasCustomization = item.variantName || (item.selectedModifiers && item.selectedModifiers.length > 0);

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span className="font-medium">
              {item.quantity}x {item.itemName}
            </span>
            {item.variantName && (
              <Badge variant="outline" className="ml-2 text-xs">
                {item.variantName}
              </Badge>
            )}
          </div>
          <span className="font-bold ml-2">{currency}{parseFloat(item.totalPrice).toFixed(2)}</span>
        </div>
        
        {hasCustomization && (
          <div className="text-xs text-muted-foreground pl-6">
            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.selectedModifiers.map((mod, idx) => (
                  <span key={idx}>
                    {mod.name}
                    {mod.price > 0 && ` (+${currency}${mod.price.toFixed(2)})`}
                    {idx < item.selectedModifiers!.length - 1 && ","}
                  </span>
                ))}
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

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">
              {item.quantity}x {item.itemName}
            </span>
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
          <span className="text-sm font-medium">{item.variantName}</span>
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
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span>{mod.name}</span>
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