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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { MenuItem, Table } from "@/types";

interface MobilePOSProps {
  categories: any[];
  menuItems: MenuItem[];
  activeCategory: string;
  orderItems: Record<string, number>;
  tableNumber: string;
  waiterName: string | null;
  diningType: "dine-in" | "takeaway" | "delivery";
  paymentMethod: "cash" | "card" | "upi" | "due";
  onCategoryChange: (categoryId: string) => void;
  onAddItem: (item: MenuItem) => void;
  onRemoveItem: (itemId: string) => void;
  onIncrement: (itemId: string) => void;
  onTableChange: (tableId: string) => void;
  onWaiterChange: (waiterId: string) => void;
  onDiningTypeChange: (type: "dine-in" | "takeaway" | "delivery") => void;
  onPaymentMethodChange: (method: "cash" | "card" | "upi" | "due") => void;
  onSendToKitchen: () => void;
  onSave: () => void;
  onSaveAndPrint: () => void;
  onClose: () => void;
  currency: string;
  gstRate: number;
  tables?: Table[];
  staff?: any[];
  isLoading: boolean;
}

export function MobilePOS({
  categories,
  menuItems,
  activeCategory,
  orderItems,
  tableNumber,
  waiterName,
  diningType,
  paymentMethod,
  onCategoryChange,
  onAddItem,
  onRemoveItem,
  onIncrement,
  onTableChange,
  onWaiterChange,
  onDiningTypeChange,
  onPaymentMethodChange,
  onSendToKitchen,
  onSave,
  onSaveAndPrint,
  onClose,
  currency,
  gstRate,
  tables,
  staff,
  isLoading,
}: MobilePOSProps) {
  const [activeView, setActiveView] = useState<"items" | "order">("items");

  const filteredItems = menuItems.filter((item: any) => item.categoryId === activeCategory && item.isAvailable);
  const totalItems = Object.values(orderItems).reduce((sum: number, qty: any) => sum + qty, 0);

  // Calculate totals
  const subtotal = Object.entries(orderItems).reduce((total, [itemId, quantity]: any) => {
    const item = menuItems.find((m: any) => m.id === itemId);
    return total + (item?.price || 0) * quantity;
  }, 0);

  const cgst = subtotal * (gstRate / 2);
  const sgst = subtotal * (gstRate / 2);
  const total = subtotal + cgst + sgst;

  const orderedMenuItems = Object.entries(orderItems)
    .map(([itemId, quantity]: any) => ({
      item: menuItems.find((m: any) => m.id === itemId)!,
      quantity,
    }))
    .filter((o) => o.item);

  const hasItems = orderedMenuItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
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
          <p className="text-primary-foreground font-semibold text-base">New Order</p>
        </div>
      </div>

      {/* View Toggle Tabs */}
      <div className="bg-white border-b border-gray-200 flex flex-shrink-0">
        <button
          onClick={() => setActiveView("items")}
          className={`flex-1 px-4 py-3 font-medium flex items-center justify-center gap-2 transition-colors ${
            activeView === "items"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-gray-600"
          }`}
        >
          <Grid3x3 className="size-5" />
          Items
        </button>
        <button
          onClick={() => setActiveView("order")}
          className={`flex-1 px-4 py-3 font-medium flex items-center justify-center gap-2 transition-colors relative ${
            activeView === "order"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-gray-600"
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
            {/* Category Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {categories.map((category: any) => (
                  <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all font-medium text-sm ${
                      activeCategory === category.id
                        ? "bg-primary text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Grid */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map((item: any) => {
                    const quantity = orderItems[item.id] || 0;
                    const isAdded = quantity > 0;
                    const isVeg = item.dietaryTags?.some((tag: string) => tag.toLowerCase() === "veg");

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-lg p-2.5 hover:shadow-md transition-shadow flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 flex-1 text-xs leading-tight line-clamp-2 min-h-[2rem]">
                            {item.name}
                          </h3>
                          <div
                            className={`size-2.5 rounded-full flex-shrink-0 mt-0.5 ml-1.5 ${
                              isVeg ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-sm font-semibold text-gray-900">
                            {currency}{item.price}
                          </span>
                          {!isAdded ? (
                            <Button
                              onClick={() => onAddItem(item)}
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-white h-7 w-7 p-0"
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                              <Button
                                onClick={() => onRemoveItem(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-gray-200"
                              >
                                <Minus className="size-3" />
                              </Button>
                              <span className="font-semibold text-gray-900 min-w-[1rem] text-center text-xs px-0.5">
                                {quantity}
                              </span>
                              <Button
                                onClick={() => onIncrement(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-gray-200"
                              >
                                <Plus className="size-3" />
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
              <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
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
          <div className="h-full flex flex-col bg-gray-50">
            {/* Order Items List - Fixed 50% height with scroll */}
            <div className="h-[50%] flex-shrink-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                    Selected Items ({orderedMenuItems.length})
                  </h3>
                  {orderedMenuItems.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-6">
                      No items added
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {orderedMenuItems.map(({ item, quantity }: any) => {
                        const isVeg = item.dietaryTags?.some((tag: string) => tag.toLowerCase() === "veg");
                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-lg border border-gray-200 p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <div
                                  className={`size-2.5 rounded-full flex-shrink-0 ${
                                    isVeg ? "bg-green-500" : "bg-red-500"
                                  }`}
                                />
                                <span className="font-medium text-gray-900 text-xs truncate">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                                  <Button
                                    onClick={() => onRemoveItem(item.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-gray-200"
                                  >
                                    <Minus className="size-3" />
                                  </Button>
                                  <span className="font-semibold text-xs min-w-[1rem] text-center px-0.5">
                                    {quantity}
                                  </span>
                                  <Button
                                    onClick={() => onIncrement(item.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-gray-200"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                                <span className="font-semibold text-gray-900 text-xs min-w-[3rem] text-right">
                                  {currency}{(item.price * quantity).toFixed(2)}
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
            <div className="flex-1 flex flex-col bg-white border-t border-gray-200">
              {/* Tax Breakdown */}
              <div className="px-2 py-1.5 border-b border-gray-200">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-medium">{currency}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-medium">{currency}{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-medium">{currency}{sgst.toFixed(2)}</span>
                  </div>
                  <Separator className="my-0.5" />
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-semibold text-gray-900 text-[11px]">Total</span>
                    <span className="font-bold text-sm text-primary">
                      {currency}{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Three Dropdowns */}
              <div className="px-2 py-1.5 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <Label className="text-[8px] text-gray-600 mb-0.5 block">Table</Label>
                    <Select value={tableNumber} onValueChange={onTableChange}>
                      <SelectTrigger className="text-[10px] h-6 px-1.5">
                        <SelectValue placeholder="Table" />
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

                  <div>
                    <Label className="text-[8px] text-gray-600 mb-0.5 block">Waiter</Label>
                    <Select value={waiterName || "none"} onValueChange={onWaiterChange}>
                      <SelectTrigger className="text-[10px] h-6 px-1.5">
                        <SelectValue placeholder="Waiter" />
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

                  <div>
                    <Label className="text-[8px] text-gray-600 mb-0.5 block">Type</Label>
                    <Select
                      value={diningType}
                      onValueChange={onDiningTypeChange}
                    >
                      <SelectTrigger className="text-[10px] h-6 px-1.5">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dine-in">Dine-in</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="px-2 py-1.5 border-b border-gray-200">
                <Label className="text-[9px] md:text-[10px] text-gray-600 mb-1 md:mb-1.5 block font-medium">Payment</Label>
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    onClick={() => onPaymentMethodChange("cash")}
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
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
                      "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
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
                      "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
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
                      "h-7 md:h-8 text-[10px] md:text-[11px] font-semibold",
                      paymentMethod === "due"
                        ? "bg-primary hover:bg-primary/90"
                        : "hover:bg-gray-100 border-2"
                    )}
                  >
                    Due
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-2 py-1.5">
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    onClick={onSave}
                    variant="outline"
                    disabled={!hasItems}
                    className="h-9 text-xs flex flex-col items-center justify-center gap-0 hover:bg-gray-100"
                  >
                    <Save className="size-3" />
                    <span className="text-[8px] font-semibold mt-0.5">Save</span>
                  </Button>
                  <Button
                    onClick={onSaveAndPrint}
                    variant="outline"
                    disabled={!hasItems}
                    className="h-9 text-xs flex flex-col items-center justify-center gap-0 hover:bg-gray-100"
                  >
                    <Printer className="size-3" />
                    <span className="text-[8px] font-semibold mt-0.5">Print</span>
                  </Button>
                  <Button
                    onClick={onSendToKitchen}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}