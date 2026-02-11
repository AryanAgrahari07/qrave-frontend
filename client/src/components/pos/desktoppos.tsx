import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Save,
  Printer,
  ChefHat,
  Loader2,
  Search,
  X,
  UtensilsCrossed,
  Users,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { MenuItem, Table } from "@/types";
import { ItemCustomizationContent } from "@/components/menu/ItemcustomizationContent";

interface DesktopPOSProps {
  categories: any[];
  menuItems: MenuItem[];
  activeCategory: string;
  manualCart: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    variantId?: string;
    modifierIds?: string[];
    isVeg?: boolean;
  }[];
  selectedTableId: string;
  selectedWaiterId: string | null;
  orderMethod: "dine-in" | "takeaway" | "delivery";
  paymentMethod: "cash" | "card" | "upi" | "due";
  customizingItem: MenuItem | null;
  searchQuery: string;
  isSearchOpen: boolean;
  onCategoryChange: (categoryId: string) => void;
  onAddToManualCart: (item: MenuItem) => void;
  onRemoveFromManualCart: (itemId: string) => void;
  onIncrementManualCart: (itemId: string) => void;
  onTableChange: (tableId: string) => void;
  onWaiterChange: (waiterId: string) => void;
  onOrderMethodChange: (method: "dine-in" | "takeaway" | "delivery") => void;
  onPaymentMethodChange: (method: "cash" | "card" | "upi" | "due") => void;
  onSendToKitchen: () => void;
  onSave: () => void;
  onSaveAndPrint: () => void;
  onCloseCustomization: () => void;
  onAddCustomizedToCart: (selection: {
    menuItemId: string;
    quantity: number;
    variantId?: string;
    modifierIds?: string[];
  }) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchOpenChange: (open: boolean) => void;
  currency: string;
  gstRate: number;
  tables?: Table[];
  staff?: any[];
  isLoading: boolean;
}

export function DesktopPOS({
  categories,
  menuItems,
  activeCategory,
  manualCart,
  selectedTableId,
  selectedWaiterId,
  orderMethod,
  paymentMethod,
  customizingItem,
  searchQuery,
  isSearchOpen,
  onCategoryChange,
  onAddToManualCart,
  onRemoveFromManualCart,
  onIncrementManualCart,
  onTableChange,
  onWaiterChange,
  onOrderMethodChange,
  onPaymentMethodChange,
  onSendToKitchen,
  onSave,
  onSaveAndPrint,
  onCloseCustomization,
  onAddCustomizedToCart,
  onSearchQueryChange,
  onSearchOpenChange,
  currency,
  gstRate,
  tables,
  staff,
  isLoading,
}: DesktopPOSProps) {
  const filteredItems = menuItems.filter((item: MenuItem) => {
    if (!searchQuery && activeCategory) {
      return item.categoryId === activeCategory && item.isAvailable;
    } else if (searchQuery) {
      return item.isAvailable && item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });

  const manualCartTotal = manualCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const subtotal = manualCartTotal;
  const cgst = subtotal * (gstRate / 2);
  const sgst = subtotal * (gstRate / 2);
  const total = subtotal + cgst + sgst;

  return (
    <DialogContent
      className="max-w-[90vw] w-[90vw] h-[90vh] max-h-[90vh] p-0 gap-0 rounded-lg"
      onInteractOutside={(e) => {
        if (customizingItem) e.preventDefault();
      }}
      onEscapeKeyDown={(e) => {
        if (customizingItem) e.preventDefault();
      }}
    >
      {customizingItem ? (
        <div className="h-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl w-full">
            <ItemCustomizationContent
              menuItem={customizingItem}
              currency={currency}
              onClose={onCloseCustomization}
              onAddToCart={onAddCustomizedToCart}
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left Side - Category & Items */}
            <div className="flex-[1_1_60%] flex flex-col overflow-hidden bg-white min-w-0 max-w-[60%]">
              {/* Category Bar with Search */}
              <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-min pb-1">
                      {!isSearchOpen && categories?.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            onCategoryChange(category.id);
                            onSearchQueryChange("");
                          }}
                          className={cn(
                            "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-[11px] sm:text-xs whitespace-nowrap transition-all flex-shrink-0",
                            activeCategory === category.id && !searchQuery
                              ? "bg-primary text-white shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {!isSearchOpen ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSearchOpenChange(true)}
                      className="flex-shrink-0 h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search items..."
                          value={searchQuery}
                          onChange={(e) => onSearchQueryChange(e.target.value)}
                          className="h-8 sm:h-9 pl-8 pr-2 text-xs sm:text-sm"
                          autoFocus
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          onSearchOpenChange(false);
                          onSearchQueryChange("");
                        }}
                        className="flex-shrink-0 h-8 sm:h-9 px-2"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Grid */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 sm:p-3 md:p-4">
                  {searchQuery && (
                    <div className="mb-3 text-xs text-gray-600">
                      Found {filteredItems.length} item(s) for "{searchQuery}"
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                    {filteredItems.map((item: MenuItem) => {
                      const quantity = manualCart.find((i) => i.id === item.id)?.quantity || 0;
                      const isAdded = quantity > 0;
                      const isVeg = item.dietaryTags?.some(
                        (tag) => tag.toLowerCase() === "veg"
                      );

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "bg-white rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-all flex flex-col",
                            isAdded 
                              ? "border-2 border-primary shadow-md ring-2 ring-primary/20" 
                              : "border-2 border-gray-200 hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 flex-1 text-xs sm:text-sm line-clamp-2 leading-tight">
                              {item.name}
                            </h3>
                            <div
                              className={cn(
                                "size-2.5 sm:size-3 rounded-sm border-2 flex-shrink-0 mt-0.5 ml-1.5",
                                isVeg 
                                  ? "border-green-600 bg-white relative after:content-[''] after:absolute after:inset-[3px] after:bg-green-600 after:rounded-full" 
                                  : "border-red-600 bg-white relative after:content-[''] after:absolute after:inset-[3px] after:bg-red-600 after:rounded-full"
                              )}
                            />
                          </div>
                          
                          <div className="mt-auto space-y-2">
                            <span className="text-sm sm:text-base font-bold text-gray-900 block">
                              {currency}{item.price}
                            </span>
                            
                            {!isAdded ? (
                              <Button
                                onClick={() => onAddToManualCart(item)}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-white h-8 w-full rounded-md font-semibold"
                              >
                                <Plus className="size-4 mr-1" />
                                Add
                              </Button>
                            ) : (
                              <div className="flex items-center justify-center gap-2 bg-primary/10 rounded-md border-2 border-primary/30 p-1">
                                <Button
                                  onClick={() => onRemoveFromManualCart(item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-primary/20 rounded-md"
                                >
                                  <Minus className="size-4 text-primary" />
                                </Button>
                                <span className="font-bold text-gray-900 min-w-[1.5rem] text-center text-sm">
                                  {quantity}
                                </span>
                                <Button
                                  onClick={() => onIncrementManualCart(item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-primary/20 rounded-md"
                                >
                                  <Plus className="size-4 text-primary" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No items found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="bg-white border-t border-gray-200 p-2 sm:p-3 flex-shrink-0">
                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                  <Button
                    onClick={onSave}
                    variant="outline"
                    disabled={manualCart.length === 0}
                    size="sm"
                    className="hover:bg-gray-100 text-[11px] sm:text-xs h-8 sm:h-9"
                  >
                    <Save className="size-3 sm:size-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                  <Button
                    onClick={onSaveAndPrint}
                    variant="outline"
                    disabled={manualCart.length === 0}
                    size="sm"
                    className="hover:bg-gray-100 text-[11px] sm:text-xs h-8 sm:h-9"
                  >
                    <Printer className="size-3 sm:size-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Print</span>
                  </Button>
                  <Button
                    onClick={onSendToKitchen}
                    disabled={manualCart.length === 0 || isLoading}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-6 text-[11px] sm:text-xs h-8 sm:h-9"
                  >
                    {isLoading ? (
                      <Loader2 className="size-3 sm:size-3.5 sm:mr-1.5 animate-spin" />
                    ) : (
                      <ChefHat className="size-3 sm:size-3.5 sm:mr-1.5" />
                    )}
                    <span className="hidden xs:inline">Kitchen</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Side - Order Summary */}
            <div className="flex-[1_1_40%] min-w-[280px] max-w-[40%] bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex-shrink-0">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3">
                  Order Summary
                </h2>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-600 font-medium flex items-center gap-1">
                      <UtensilsCrossed className="size-3" />
                      Table
                    </Label>
                    <Select value={selectedTableId} onValueChange={onTableChange}>
                      <SelectTrigger className="h-9 text-xs border-2 focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tables?.filter((t: Table) => 
                          t.currentStatus === "OCCUPIED" || t.currentStatus === "AVAILABLE"
                        ).map((table: Table) => (
                          <SelectItem key={table.id} value={table.id}>
                            T{table.tableNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-600 font-medium flex items-center gap-1">
                      <Users className="size-3" />
                      Waiter
                    </Label>
                    <Select
                      value={selectedWaiterId || "none"}
                      onValueChange={onWaiterChange}
                    >
                      <SelectTrigger className="h-9 text-xs border-2 focus:border-primary">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {staff
                          ?.filter((s: any) => s.role === "WAITER" && s.isActive)
                          .map((waiter: any) => (
                            <SelectItem key={waiter.id} value={waiter.id}>
                              {waiter.fullName.split(' ')[0]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-600 font-medium flex items-center gap-1">
                      <Utensils className="size-3" />
                      Type
                    </Label>
                    <Select
                      value={orderMethod}
                      onValueChange={onOrderMethodChange}
                    >
                      <SelectTrigger className="h-9 text-xs border-2 focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dine-in">Dine</SelectItem>
                        <SelectItem value="takeaway">Take</SelectItem>
                        <SelectItem value="delivery">Delv</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 md:p-3">
                  <h3 className="font-semibold text-gray-900 mb-1.5 text-[11px] md:text-xs">
                    Items ({manualCart.length})
                  </h3>
                  {manualCart.length === 0 ? (
                    <p className="text-gray-500 text-[10px] text-center py-6">
                      No items added
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {manualCart.map((item, idx) => {
                        const menuItem = menuItems?.find(
                          (mi) => mi.id === item.id
                        );
                        const selectedVariant = menuItem?.variants?.find(
                          (v) => v.id === item.variantId
                        );
                        const selectedModifiers =
                          menuItem?.modifierGroups?.flatMap(
                            (g) =>
                              g.modifiers?.filter((m) =>
                                item.modifierIds?.includes(m.id)
                              ) || []
                          ) || [];

                        return (
                          <div
                            key={idx}
                            className="bg-white rounded-md border border-gray-200 p-1.5 md:p-2"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <div
                                  className={cn(
                                    "size-2 md:size-2.5 rounded-sm border flex-shrink-0",
                                    item.isVeg 
                                      ? "border-green-600 bg-white relative after:content-[''] after:absolute after:inset-[2px] after:bg-green-600 after:rounded-full" 
                                      : "border-red-600 bg-white relative after:content-[''] after:absolute after:inset-[2px] after:bg-red-600 after:rounded-full"
                                  )}
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-gray-900 text-[10px] md:text-[11px] truncate leading-tight">
                                    {item.name}
                                  </span>
                                  {selectedVariant && (
                                    <span className="text-[8px] md:text-[9px] text-blue-600 truncate leading-tight">
                                      {selectedVariant.variantName}
                                    </span>
                                  )}
                                  {selectedModifiers.length > 0 && (
                                    <span className="text-[8px] md:text-[9px] text-amber-600 truncate leading-tight">
                                      + {selectedModifiers.map((m) => m.name).join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
                                  <Button
                                    onClick={() => onRemoveFromManualCart(item.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-gray-200"
                                  >
                                    <Minus className="size-2 md:size-2.5" />
                                  </Button>
                                  <span className="font-bold text-[9px] md:text-[10px] min-w-[0.75rem] text-center px-0.5">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    onClick={() => onIncrementManualCart(item.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-gray-200"
                                  >
                                    <Plus className="size-2 md:size-2.5" />
                                  </Button>
                                </div>
                                <span className="font-bold text-gray-900 min-w-[2.5rem] md:min-w-[3rem] text-right text-[9px] md:text-[10px]">
                                  {currency}{(item.price * item.quantity).toFixed(2)}
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

              {/* Bill Breakdown */}
              <div className="bg-white border-t border-gray-200 p-2 md:p-3 flex-shrink-0">
                <div className="space-y-1 mb-2 md:mb-3">
                  <div className="flex justify-between text-[9px] md:text-[10px]">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-semibold">
                      {currency}{subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] md:text-[10px]">
                    <span className="text-gray-600">CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-semibold">
                      {currency}{cgst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] md:text-[10px]">
                    <span className="text-gray-600">SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-semibold">
                      {currency}{sgst.toFixed(2)}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-bold text-gray-900 text-[11px] md:text-xs">Total</span>
                    <span className="font-bold text-base md:text-lg text-primary">
                      {currency}{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="px-2 md:p-3 border-b border-gray-200">
                  <Label className="text-[9px] md:text-[10px] text-gray-600 mb-1 md:mb-1.5 block font-medium">Payment</Label>
                  <div className="flex gap-1 md:gap-1.5">
                    <Button
                      onClick={() => onPaymentMethodChange("cash")}
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex-1 h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
                        paymentMethod === "cash"
                          ? "bg-primary hover:bg-primary/90"
                          : "hover:bg-gray-100 border-2"
                      )}
                    >
                      Cash
                    </Button>
                    <Button
                      onClick={() => onPaymentMethodChange("card")}
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex-1 h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
                        paymentMethod === "card"
                          ? "bg-primary hover:bg-primary/90"
                          : "hover:bg-gray-100 border-2"
                      )}
                    >
                      Card
                    </Button>
                    <Button
                      onClick={() => onPaymentMethodChange("upi")}
                      variant={paymentMethod === "upi" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex-1 h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
                        paymentMethod === "upi"
                          ? "bg-primary hover:bg-primary/90"
                          : "hover:bg-gray-100 border-2"
                      )}
                    >
                      UPI
                    </Button>
                    <Button
                      onClick={() => onPaymentMethodChange("due")}
                      variant={paymentMethod === "due" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex-1 h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
                        paymentMethod === "due"
                          ? "bg-primary hover:bg-primary/90"
                          : "hover:bg-gray-100 border-2"
                      )}
                    >
                      Due
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContent>
  );
}