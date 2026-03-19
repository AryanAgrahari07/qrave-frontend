import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Grid3x3,
  ShoppingCart,
  Plus,
  Minus,
  Save,
  Printer,
  ChefHat,
  Loader2,
  StickyNote,
  Percent,
  Search,
  X,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { MenuItem, Table } from "@/types";
import type { POSCartLineItem } from "@/types/pos";
import { getCustomizationSummary } from "@/components/menu/Customizedorderitemdisplay";
import { useLanguage, getTranslatedName } from "@/context/LanguageContext";
import { toast } from "sonner";

type POSMode = "full" | "waiter";

interface MobilePOSProps {
  /** Hide the table selector (useful when table is pre-selected, e.g. Floor Map). */
  hideTableSelect?: boolean;
  /** Hide the order type selector (useful when order type is fixed, e.g. Floor Map dine-in). */
  hideOrderTypeSelect?: boolean;
  /**
   * - `full`: Live Orders POS (includes waiter, type, payment, save/print, discount, service charge)
   * - `waiter`: Waiter terminal POS (keeps only waiter-needed controls)
   */
  mode?: POSMode;
  /** Header title shown in the mobile POS top bar. */
  title?: string;

  serviceRatePct?: number;
  waiveServiceCharge?: boolean;
  onToggleWaiveServiceCharge?: (waive: boolean) => void;
  categories: any[];
  menuItems: MenuItem[];
  activeCategory: string;
  cartItems: POSCartLineItem[];
  tableNumber: string;
  waiterName: string | null;
  diningType: "dine-in" | "takeaway" | "delivery";
  paymentMethod: "cash" | "card" | "upi" | "due";

  // Optional fields
  cookingNote?: string;
  onCookingNoteChange?: (note: string) => void;
  showDiscount?: boolean;
  discountAmount?: string;
  onDiscountAmountChange?: (value: string) => void;

  onCategoryChange: (categoryId: string) => void;
  onAddItem: (item: MenuItem) => void;
  /** Decrement/removes a specific cart line. */
  onDecrementLineItem: (lineId: string) => void;
  /** Increments a specific cart line. */
  onIncrementLineItem: (lineId: string) => void;
  /** Total qty for a menuItemId (used to show qty on menu grid). */
  getMenuItemQuantity: (menuItemId: string) => number;
  /** Called when user presses + for an item that already exists and has customization. */
  onPlusForCustomizableItem: (item: MenuItem) => void;
  onTableChange: (tableId: string) => void;
  onWaiterChange?: (waiterId: string) => void;
  onDiningTypeChange?: (type: "dine-in" | "takeaway" | "delivery") => void;
  onPaymentMethodChange?: (method: "cash" | "card" | "upi" | "due") => void;
  onSendToKitchen: () => void;
  onSave?: () => void;
  onSaveAndPrint?: () => void;
  onSaveAndPrintBill?: () => void;
  onClose: () => void;
  currency: string;
  gstRate: number;
  tables?: Table[];
  staff?: any[];
  isLoading: boolean;
}

export function MobilePOS({
  mode = "full",
  title = "New Order",
  hideTableSelect = false,
  hideOrderTypeSelect = false,
  categories,
  menuItems,
  activeCategory,
  cartItems,
  tableNumber,
  waiterName,
  diningType,
  paymentMethod,
  cookingNote = "",
  onCookingNoteChange,
  showDiscount = false,
  discountAmount = "",
  onDiscountAmountChange,
  onCategoryChange,
  onAddItem,
  onDecrementLineItem,
  onIncrementLineItem,
  getMenuItemQuantity,
  onPlusForCustomizableItem,
  onTableChange,
  onWaiterChange,
  onDiningTypeChange,
  onPaymentMethodChange,
  onSendToKitchen,
  onSave,
  onSaveAndPrint,
  onSaveAndPrintBill,
  onClose,
  currency,
  gstRate,
  tables,
  staff,
  isLoading,
  serviceRatePct = 0,
  waiveServiceCharge = false,
  onToggleWaiveServiceCharge,
}: MobilePOSProps) {
  const { language } = useLanguage();
  const isWaiterMode = mode === "waiter";

  const handleActionClick = (callback?: () => void) => {
    if (diningType === "dine-in" && (!tableNumber || tableNumber === "none")) {
      toast.error("Please select table for the dine in order");
      return;
    }
    callback?.();
  };

  const [activeView, setActiveView] = useState<"items" | "order">("items");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [discountPercent, setDiscountPercent] = useState("");

  const filteredItems = menuItems.filter((item: any) => {
    const isVeg = item.dietaryTags?.some((tag: string) => tag.toLowerCase() === "veg");
    const isVegMatch = vegFilter === "all" ? true : vegFilter === "veg" ? isVeg : !isVeg;
    if (!isVegMatch) return false;

    if (!searchQuery && activeCategory) {
      return item.categoryId === activeCategory && item.isAvailable;
    } else if (searchQuery) {
      const translatedName = getTranslatedName(item as any, language);
      return item.isAvailable && translatedName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });
  const totalItems = cartItems.reduce((sum, li) => sum + li.quantity, 0);

  // Calculate totals
  const subtotal = cartItems.reduce((total, li) => total + li.unitPrice * li.quantity, 0);

  const cgst = subtotal * (gstRate / 2);
  const sgst = subtotal * (gstRate / 2);

  const serviceCharge =
    !isWaiterMode && diningType === "dine-in" && !waiveServiceCharge
      ? subtotal * (Math.max(0, serviceRatePct) / 100)
      : 0;

  const discountNum = Math.max(0, parseFloat(discountAmount || "0") || 0);
  const totalBeforeDiscount = subtotal + cgst + sgst + serviceCharge;
  const total = Math.max(
    0,
    totalBeforeDiscount - (!isWaiterMode && showDiscount ? discountNum : 0)
  );

  const hasItems = cartItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white px-1 py-1 shadow-md flex-shrink-0 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-primary-foreground/20 h-9 w-9"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <p className="text-primary-foreground font-semibold text-base">{title}</p>
        </div>
      </div>

      {/* View Toggle Tabs */}
      <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border flex flex-shrink-0">
        <button
          onClick={() => setActiveView("items")}
          className={`flex-1 px-4 py-3 font-medium flex items-center justify-center gap-2 transition-colors ${activeView === "items"
            ? "text-primary border-b-2 border-primary bg-primary/5"
            : "text-gray-600 dark:text-muted-foreground"
            }`}
        >
          <Grid3x3 className="size-5" />
          Items
        </button>
        <button
          onClick={() => setActiveView("order")}
          className={`flex-1 px-4 py-3 font-medium flex items-center justify-center gap-2 transition-colors relative ${activeView === "order"
            ? "text-primary border-b-2 border-primary bg-primary/5"
            : "text-gray-600 dark:text-muted-foreground"
            }`}
        >
          <ShoppingCart className="size-5" />
          Order
          {totalItems > 0 && (
            <Badge className="bg-primary text-white absolute -top-1 right-8 h-5 min-w-[20px] flex items-center justify-center">
              {totalItems}
            </Badge>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeView === "items" ? (
          <div className="h-full flex flex-col">
            {/* Search, Filters, Category */}
            <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border px-3 py-2 flex-shrink-0">
              <div className="flex items-center gap-2">

                {/* Categories */}
                {!isSearchOpen && (
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                    {categories.map((category: any) => (
                      <button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium text-xs",
                          activeCategory === category.id
                            ? "bg-primary text-white shadow-md"
                            : "bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-muted/80"
                        )}
                      >
                        {getTranslatedName(category as any, language, 'category')}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search Expand */}
                {isSearchOpen && (
                  <div className="flex items-center gap-2 flex-1 max-w-full">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-7 pr-2 text-xs"
                        autoFocus
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </Button>
                  </div>
                )}

                {/* Search Toggle Icon */}
                {!isSearchOpen && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <Search className="w-4 h-4 text-gray-600" />
                  </Button>
                )}

                {/* Veg/Non-Veg Toggle */}
                <button
                  onClick={() => {
                    if (vegFilter === "all") setVegFilter("veg");
                    else if (vegFilter === "veg") setVegFilter("non-veg");
                    else setVegFilter("all");
                  }}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md border transition-colors bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary/50",
                    vegFilter === "all" ? "border-gray-200 dark:border-border text-gray-700 dark:text-foreground" :
                      vegFilter === "veg" ? "border-green-600 bg-green-50 dark:bg-green-900/20" :
                        "border-red-600 bg-red-50 dark:bg-red-900/20"
                  )}
                  title={`Filter: ${vegFilter === "all" ? "All" : vegFilter === "veg" ? "Veg" : "Non-Veg"} (Click to change)`}
                >
                  {vegFilter === "all" && <span className="text-[10px] sm:text-xs font-semibold leading-none">All</span>}
                  {vegFilter === "veg" && <div className="size-2.5 sm:size-3 rounded-sm border border-green-600 bg-white relative after:content-[''] after:absolute after:inset-[1.5px] after:bg-green-600 after:rounded-full" />}
                  {vegFilter === "non-veg" && <div className="size-2.5 sm:size-3 rounded-sm border border-red-600 bg-white relative after:content-[''] after:absolute after:inset-[1.5px] after:bg-red-600 after:rounded-full" />}
                </button>
              </div>
            </div>

            {/* Items Grid */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map((item: any) => {
                    const quantity = getMenuItemQuantity(item.id);
                    const isAdded = quantity > 0;
                    const isVeg = item.dietaryTags?.some((tag: string) => tag.toLowerCase() === "veg");
                    const isCustomizable =
                      (item.variants && item.variants.length > 0) ||
                      (item.modifierGroups && item.modifierGroups.length > 0);

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-lg p-2.5 hover:shadow-md transition-shadow flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-foreground text-xs leading-tight line-clamp-2 min-h-[2rem]">
                              {getTranslatedName(item as any, language)}
                            </h3>
                            {isCustomizable && (
                              <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0 h-4 inline-flex">
                                Customizable
                              </Badge>
                            )}
                          </div>
                          <div
                            className={`size-2.5 rounded-full flex-shrink-0 mt-0.5 ml-1.5 ${isVeg ? "bg-green-500" : "bg-red-500"
                              }`}
                            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                        </div>
                        <div className="flex flex-wrap min-[370px]:flex-nowrap items-center justify-between mt-auto gap-1">
                          <span className="text-xs min-[370px]:text-sm font-semibold text-gray-900 dark:text-foreground">
                            {currency}{item.price}
                          </span>
                          {!isAdded ? (
                            <Button
                              onClick={() => onAddItem(item)}
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-white h-6 w-6 min-[370px]:h-7 min-[370px]:w-7 p-0 flex-shrink-0"
                            >
                              <Plus className="size-3 min-[376px]:size-3.5" />
                            </Button>
                          ) : (
                            <div className="flex items-center bg-gray-100 dark:bg-muted rounded-md flex-shrink-0 min-[370px]:gap-1 min-[370px]:p-0.5">
                              <Button
                                onClick={() => {
                                  // for non-customizable items, decrement the single line; for customizable, user should use cart view.
                                  const line = cartItems.find((li) => li.menuItemId === item.id);
                                  if (line) onDecrementLineItem(line.lineId);
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 min-[370px]:h-6 min-[370px]:w-6 p-0 hover:bg-gray-200 dark:hover:bg-muted/80"
                              >
                                <Minus className="size-2.5 min-[370px]:size-3" />
                              </Button>
                              <span className="font-semibold text-gray-900 dark:text-foreground min-w-[1.1rem] min-[370px]:min-w-[1rem] text-center text-[11px] min-[370px]:text-xs px-0.5">
                                {quantity}
                              </span>
                              <Button
                                onClick={() => {
                                  if (isCustomizable) {
                                    onPlusForCustomizableItem(item);
                                    return;
                                  }
                                  const line = cartItems.find((li) => li.menuItemId === item.id);
                                  if (line) onIncrementLineItem(line.lineId);
                                  else onAddItem(item);
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 min-[370px]:h-6 min-[370px]:w-6 p-0 hover:bg-gray-200"
                              >
                                <Plus className="size-2.5 min-[370px]:size-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>

            {/* View Order Button */}
            {totalItems > 0 && (
              <div className="bg-white dark:bg-card border-t border-gray-200 dark:border-border p-4 flex-shrink-0">
                <Button
                  onClick={() => setActiveView("order")}
                  className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold"
                >
                  View Order ({totalItems} items)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col bg-gray-50 dark:bg-muted/10">
            {/* Order Items List - Fixed 50% height with scroll */}
            <div className="h-[50%] flex-shrink-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 dark:text-foreground mb-2 text-sm">
                    Selected Items ({cartItems.length})
                  </h3>
                  {cartItems.length === 0 ? (
                    <p className="text-gray-500 dark:text-muted-foreground text-xs text-center py-6">
                      No items added
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cartItems.map((li) => {
                        const menuItem = li.menuItem || menuItems.find((m) => m.id === li.menuItemId);
                        const isVeg = li.isVeg ?? menuItem?.dietaryTags?.some((tag: string) => tag.toLowerCase() === "veg");
                        const hasCustomization = !!(li.variantId || (li.modifierIds && li.modifierIds.length > 0));
                        const summary = hasCustomization && menuItem
                          ? getCustomizationSummary({
                            variantName: li.variantId
                              ? getTranslatedName(menuItem.variants?.find((v) => v.id === li.variantId) as any, language, 'variant')
                              : undefined,
                            selectedModifiers: (li.modifierIds || []).flatMap((id) =>
                              menuItem.modifierGroups?.flatMap((g) => g.modifiers?.filter((m) => m.id === id) || []) || []
                            ).map((m: any) => ({ ...m, name: getTranslatedName(m, language, 'modifier') })) as any,
                          } as any)
                          : "";

                        return (
                          <div
                            key={li.lineId}
                            className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0 w-0">
                                <div
                                  className={`size-2.5 rounded-full flex-shrink-0 ${isVeg ? "bg-green-500" : "bg-red-500"
                                    }`}
                                />
                                <div className="min-w-0 w-full">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-gray-900 dark:text-foreground text-xs truncate block max-w-[140px] sm:max-w-[220px]">
                                      {menuItem ? getTranslatedName(menuItem as any, language) : li.name}
                                    </span>
                                    {hasCustomization && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                        Customized
                                      </Badge>
                                    )}
                                  </div>
                                  {summary && (
                                    <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                                      {summary}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-muted rounded-md p-0.5">
                                  <Button
                                    onClick={() => onDecrementLineItem(li.lineId)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-muted/80"
                                  >
                                    <Minus className="size-3" />
                                  </Button>
                                  <span className="font-semibold text-xs min-w-[1rem] text-center px-0.5 text-gray-900 dark:text-foreground">
                                    {li.quantity}
                                  </span>
                                  <Button
                                    onClick={() => onIncrementLineItem(li.lineId)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-muted/80"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-foreground text-xs min-w-0 tabular-nums text-right">
                                  {currency}{(li.unitPrice * li.quantity).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Bottom Section - Settings & Actions - 50% */}
            <div className="flex-1 flex flex-col bg-white dark:bg-card border-t border-gray-200 dark:border-border">
              {/* Tax Breakdown */}
              <div className="px-2 py-1.5 border-b border-gray-200 dark:border-border">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600 dark:text-muted-foreground">Subtotal</span>
                    <span className="text-gray-900 dark:text-foreground font-medium">{currency}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600 dark:text-muted-foreground">CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 dark:text-foreground font-medium">{currency}{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600 dark:text-muted-foreground">SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 dark:text-foreground font-medium">{currency}{sgst.toFixed(2)}</span>
                  </div>

                  {!isWaiterMode && diningType === "dine-in" && serviceCharge > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 dark:text-muted-foreground">
                          Service Charge{serviceRatePct > 0 ? ` (${serviceRatePct.toFixed(0)}%)` : ""}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                          title="Remove service charge"
                          onClick={() => onToggleWaiveServiceCharge?.(true)}
                        >
                          <MinusCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <span className="text-gray-900 dark:text-foreground font-medium">{currency}{serviceCharge.toFixed(2)}</span>
                    </div>
                  )}

                  {!isWaiterMode && showDiscount && discountNum > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-600 dark:text-muted-foreground">Discount</span>
                      <span className="text-gray-900 dark:text-foreground font-medium">-{currency}{discountNum.toFixed(2)}</span>
                    </div>
                  )}

                  <Separator className="my-0.5" />
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-semibold text-gray-900 dark:text-foreground text-[11px]">Total</span>
                    <span className="font-bold text-sm text-primary">
                      {currency}{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="px-2 py-1.5 border-b border-gray-200 dark:border-border">
                <div className={cn(
                  "grid gap-1 items-end",
                  isWaiterMode
                    ? "grid-cols-[1fr_auto]"
                    : hideTableSelect || hideOrderTypeSelect
                      ? "grid-cols-[1fr_1fr_auto]"
                      : "grid-cols-[1fr_1fr_1fr_auto]"
                )}>
                  {!hideTableSelect && (
                    <div className="min-w-0">
                      <Label className="text-[8px] text-gray-600 dark:text-muted-foreground mb-0.5 block">Table</Label>
                      <Select value={tableNumber} onValueChange={onTableChange}>
                        <SelectTrigger className="text-[10px] h-6 px-1.5 dark:bg-card">
                          <SelectValue placeholder="Table" />
                        </SelectTrigger>
                        <SelectContent>
                          {tables
                            ?.filter((t: Table) => t.currentStatus === "OCCUPIED" || t.currentStatus === "AVAILABLE")
                            .map((table: Table) => (
                              <SelectItem key={table.id} value={table.id}>
                                T{table.tableNumber}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!isWaiterMode && (
                    <div className="min-w-0">
                      <Label className="text-[8px] text-gray-600 dark:text-muted-foreground mb-0.5 block">Waiter</Label>
                      <Select value={waiterName || "none"} onValueChange={onWaiterChange}>
                        <SelectTrigger className="text-[10px] h-6 px-1.5 dark:bg-card">
                          <SelectValue placeholder="Waiter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {staff
                            ?.filter((s: any) => s.role === "WAITER" && s.isActive)
                            .map((waiter: any) => (
                              <SelectItem key={waiter.id} value={waiter.id}>
                                {waiter.fullName.split(" ")[0]}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!hideOrderTypeSelect && !isWaiterMode && (
                    <div className="min-w-0">
                      <Label className="text-[8px] text-gray-600 dark:text-muted-foreground mb-0.5 block">Type</Label>
                      <Select value={diningType} onValueChange={onDiningTypeChange}>
                        <SelectTrigger className="text-[10px] h-6 px-1.5 dark:bg-card">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dine-in">Dine-in</SelectItem>
                          <SelectItem value="takeaway">Takeaway</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Options */}
                  <div className="flex flex-col items-end justify-end gap-0.5 pb-[2px]">
                    <div className="flex items-end justify-end gap-1">
                      <div className="space-y-1 flex flex-col items-center">
                        <span className="text-[7px] text-gray-600 dark:text-muted-foreground font-medium leading-none">Note</span>
                        <Button
                          type="button"
                          variant={cookingNote.trim() ? "default" : "outline"}
                          size="icon"
                          className="h-6 w-6 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                          onClick={() => setNoteDialogOpen(true)}
                          title="Cooking note"
                        >
                          <StickyNote className="h-3 w-3" />
                        </Button>
                      </div>

                      {!isWaiterMode && showDiscount && (
                        <div className="space-y-1 flex flex-col items-center">
                          <span className="text-[7px] text-gray-600 dark:text-muted-foreground font-medium leading-none">Disc</span>
                          <Button
                            type="button"
                            variant={discountAmount.trim() ? "default" : "outline"}
                            size="icon"
                            className="h-6 w-6 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                            onClick={() => setDiscountDialogOpen(true)}
                            title="Discount"
                          >
                            <Percent className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dialogs */}
                <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cooking Note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>Note (optional)</Label>
                      <Input
                        value={cookingNote}
                        onChange={(e) => onCookingNoteChange?.(e.target.value)}
                        placeholder="E.g. less spicy"
                      />
                      <div className="flex justify-end">
                        <Button type="button" onClick={() => setNoteDialogOpen(false)}>
                          Done
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Discount</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Discount Type</Label>
                        <RadioGroup
                          value={discountMode}
                          onValueChange={(v) => setDiscountMode(v as "amount" | "percent")}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="amount" id="m_disc_amount" />
                            <Label htmlFor="m_disc_amount">Amount</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="percent" id="m_disc_percent" />
                            <Label htmlFor="m_disc_percent">Percent</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {discountMode === "amount" ? (
                        <div className="space-y-2">
                          <Label>Discount Amount (optional)</Label>
                          <Input
                            value={discountAmount}
                            onChange={(e) => onDiscountAmountChange?.(e.target.value)}
                            placeholder="0"
                            inputMode="decimal"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Discount Percent (optional)</Label>
                          <Input
                            value={discountPercent}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDiscountPercent(v);
                              const pct = Math.max(0, Math.min(100, parseFloat(v || "0") || 0));
                              const amt = (totalBeforeDiscount * pct) / 100;
                              onDiscountAmountChange?.(amt ? amt.toFixed(2) : "");
                            }}
                            placeholder="0"
                            inputMode="decimal"
                          />
                          <p className="text-xs text-muted-foreground">
                            Applies on total ({currency}{(subtotal + cgst + sgst + serviceCharge).toFixed(2)}). Amount: {currency}
                            {(((totalBeforeDiscount * (parseFloat(discountPercent || "0") || 0)) / 100) || 0).toFixed(2)}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setDiscountPercent("");
                            onDiscountAmountChange?.("");
                          }}
                        >
                          Clear
                        </Button>
                        <Button type="button" onClick={() => setDiscountDialogOpen(false)}>
                          Done
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

              </div>

              {/* Payment Method */}
              {!isWaiterMode && (
                <div className="px-2 py-1.5 border-b border-gray-200 dark:border-border">
                  <Label className="text-[9px] md:text-[10px] text-gray-600 dark:text-muted-foreground mb-1 md:mb-1.5 block font-medium">Payment</Label>
                  <div className="grid grid-cols-4 gap-1">
                    <Button
                      onClick={() => onPaymentMethodChange?.("cash")}
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold transition-all active:scale-95",
                        paymentMethod === "cash"
                          ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                          : "hover:bg-primary/5 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground border-2 border-gray-200 dark:border-border"
                      )}
                    >
                      Cash
                    </Button>
                    <Button
                      onClick={() => onPaymentMethodChange?.("card")}
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold transition-all active:scale-95",
                        paymentMethod === "card"
                          ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                          : "hover:bg-primary/5 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground border-2 border-gray-200 dark:border-border"
                      )}
                    >
                      Card
                    </Button>
                    <Button
                      onClick={() => onPaymentMethodChange?.("upi")}
                      variant={paymentMethod === "upi" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold transition-all active:scale-95",
                        paymentMethod === "upi"
                          ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                          : "hover:bg-primary/5 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground border-2 border-gray-200 dark:border-border"
                      )}
                    >
                      UPI
                    </Button>
                    <Button
                      onClick={() => onPaymentMethodChange?.("due")}
                      variant={paymentMethod === "due" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold transition-all active:scale-95",
                        paymentMethod === "due"
                          ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                          : "hover:bg-primary/5 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground border-2 border-gray-200 dark:border-border"
                      )}
                    >
                      Due
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="px-2 py-1.5">
                {isWaiterMode ? (
                  <Button
                    onClick={() => handleActionClick(onSendToKitchen)}
                    disabled={!hasItems || isLoading}
                    className="w-full h-10 text-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ChefHat className="size-4" />
                    )}
                    <span className="text-sm font-semibold">Send to Kitchen</span>
                  </Button>
                ) : (
                  <div className="grid grid-cols-4 gap-1">
                    <Button
                      onClick={() => handleActionClick(onSave)}
                      variant="outline"
                      disabled={!hasItems}
                      className="h-9 text-xs flex flex-col items-center justify-center gap-0 hover:bg-gray-100 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground border-gray-200 dark:border-border"
                    >
                      <Save className="size-3" />
                      <span className="text-[8px] font-semibold mt-0.5">Save</span>
                    </Button>
                    <Button
                      onClick={() => handleActionClick(onSaveAndPrint)}
                      variant="outline"
                      disabled={!hasItems}
                      className="h-9 text-xs flex flex-col items-center justify-center gap-0 hover:bg-gray-100 dark:bg-card dark:text-card-foreground dark:hover:bg-accent dark:hover:text-accent-foreground border-gray-200 dark:border-border"
                    >
                      <Printer className="size-3" />
                      <span className="text-[8px] font-semibold mt-0.5">KOT</span>
                    </Button>
                    {onSaveAndPrintBill ? (
                      <Button
                        onClick={() => handleActionClick(onSaveAndPrintBill)}
                        variant="outline"
                        disabled={!hasItems}
                        className="h-9 text-xs flex flex-col items-center justify-center gap-0 hover:bg-blue-50 dark:bg-card dark:text-blue-400 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-600"
                      >
                        <Printer className="size-3" />
                        <span className="text-[8px] font-semibold mt-0.5">Save & print</span>
                      </Button>
                    ) : (
                      <div /> // placeholder to keep Kitchen in position 4
                    )}
                    <Button
                      onClick={() => handleActionClick(onSendToKitchen)}
                      disabled={!hasItems || isLoading}
                      className="h-9 text-xs flex flex-col items-center justify-center gap-0 bg-primary hover:bg-primary/90 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <ChefHat className="size-3" />
                      )}
                      <span className="text-[8px] font-semibold mt-0.5">Kitchen</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}