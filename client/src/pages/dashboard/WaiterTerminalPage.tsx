import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, LayoutGrid, Users, Languages, MapPin, Check, ShoppingCart, Plus, Minus, X, 
  Loader2, RefreshCw, LogOut, Clock, Bell, ChefHat, Utensils, Receipt, Edit2, Trash2,
  AlertCircle, Grid3x3, ArrowLeft, Search, Save, Printer, UtensilsCrossed
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { 
  useTables, 
  useQueueActive, 
  useMenuCategories, 
  useRestaurant,
  useUpdateTableStatus,
  useCreateOrder,
  useSeatGuest,
  useCallNextGuest,
  useOrders,
  useUpdateOrderStatus,
  useAddOrderItems,
  useRemoveOrderItem,
} from "@/hooks/api";
import type { Table, QueueEntry, MenuItem, MenuCategory, Order, OrderItem, OrderStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ItemCustomizationDialog } from "@/components/menu/Itemcustomizationdialog";
import { CustomizedOrderItemDisplay } from "@/components/menu/Customizedorderitemdisplay";
import { ItemCustomizationContent } from "@/components/menu/ItemcustomizationContent";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mobile POS New Order Component
function MobilePOSNewOrder({
  categories,
  menuItems,
  activeCategory,
  orderItems,
  tableNumber,
  onCategoryChange,
  onAddItem,
  onRemoveItem,
  onIncrement,
  onTableChange,
  onSendToKitchen,
  onClose,
  currency,
  gstRate,
  tables,
  isLoading,
}: any) {
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
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-medium text-gray-900 flex-1 text-sm">
                            {item.name}
                          </h3>
                          <div
                            className={`size-3 rounded-full flex-shrink-0 mt-1 ml-2 ${
                              isVeg ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold text-gray-900">
                            {currency}{item.price}
                          </span>
                          {!isAdded ? (
                            <Button
                              onClick={() => onAddItem(item)}
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-white h-8"
                            >
                              <Plus className="size-4" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-gray-100 rounded-md">
                              <Button
                                onClick={() => onRemoveItem(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="size-3.5" />
                              </Button>
                              <span className="font-semibold text-gray-900 min-w-[1.25rem] text-center text-sm">
                                {quantity}
                              </span>
                              <Button
                                onClick={() => onIncrement(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="size-3.5" />
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
            {/* Order Items List */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-base">
                  Selected Items ({orderedMenuItems.length})
                </h3>
                {orderedMenuItems.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No items added
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orderedMenuItems.map(({ item, quantity }: any) => {
                      const isVeg = item.dietaryTags?.some((tag: string) => tag.toLowerCase() === "veg");
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className={`size-3 rounded-full flex-shrink-0 ${
                                  isVeg ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="flex items-center gap-1.5 bg-gray-100 rounded-md">
                                <Button
                                  onClick={() => onRemoveItem(item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="size-4" />
                                </Button>
                                <span className="font-semibold text-sm min-w-[1.5rem] text-center">
                                  {quantity}
                                </span>
                                <Button
                                  onClick={() => onIncrement(item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="size-4" />
                                </Button>
                              </div>
                              <span className="font-semibold text-gray-900 min-w-[4rem] text-right">
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

            {/* Bottom Section - Settings & Actions */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200">
              {/* Tax Breakdown */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-medium">{currency}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-medium">{currency}{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-medium">{currency}{sgst.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-xl text-primary">
                      {currency}{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Table Dropdown */}
              <div className="px-4 py-3 border-b border-gray-200">
                <Label className="text-xs text-gray-600 mb-1.5 block">Table Number</Label>
                <Select value={tableNumber} onValueChange={onTableChange}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables?.filter((t: Table) => 
                      t.currentStatus === "OCCUPIED" || t.currentStatus === "AVAILABLE"
                    ).map((table: Table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Table {table.tableNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Button */}
              <div className="px-4 py-3">
                <Button
                  onClick={onSendToKitchen}
                  disabled={!hasItems || isLoading}
                  className="w-full h-12 text-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ChefHat className="size-4" />
                  )}
                  <span className="text-sm font-semibold">Send to Kitchen</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile POS Add Items Component
function MobilePOSAddItems({
  categories,
  menuItems,
  activeCategory,
  orderItems,
  tableNumber,
  onCategoryChange,
  onAddItem,
  onRemoveItem,
  onIncrement,
  onAddToOrder,
  onClose,
  currency,
  gstRate,
  isLoading,
}: any) {
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
          <p className="text-primary-foreground font-semibold text-base">Add Items - {tableNumber}</p>
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
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-medium text-gray-900 flex-1 text-sm">
                            {item.name}
                          </h3>
                          <div
                            className={`size-3 rounded-full flex-shrink-0 mt-1 ml-2 ${
                              isVeg ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold text-gray-900">
                            {currency}{item.price}
                          </span>
                          {!isAdded ? (
                            <Button
                              onClick={() => onAddItem(item)}
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-white h-8"
                            >
                              <Plus className="size-4" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-gray-100 rounded-md">
                              <Button
                                onClick={() => onRemoveItem(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="size-3.5" />
                              </Button>
                              <span className="font-semibold text-gray-900 min-w-[1.25rem] text-center text-sm">
                                {quantity}
                              </span>
                              <Button
                                onClick={() => onIncrement(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="size-3.5" />
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
            {/* Order Items List */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-base">
                  Selected Items ({orderedMenuItems.length})
                </h3>
                {orderedMenuItems.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No items added
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orderedMenuItems.map(({ item, quantity }: any) => {
                      const isVeg = item.dietaryTags?.some((tag: string) => tag.toLowerCase() === "veg");
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className={`size-3 rounded-full flex-shrink-0 ${
                                  isVeg ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="flex items-center gap-1.5 bg-gray-100 rounded-md">
                                <Button
                                  onClick={() => onRemoveItem(item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="size-4" />
                                </Button>
                                <span className="font-semibold text-sm min-w-[1.5rem] text-center">
                                  {quantity}
                                </span>
                                <Button
                                  onClick={() => onIncrement(item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="size-4" />
                                </Button>
                              </div>
                              <span className="font-semibold text-gray-900 min-w-[4rem] text-right">
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

            {/* Bottom Section - Tax & Actions */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200">
              {/* Tax Breakdown */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-medium">{currency}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-medium">{currency}{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                    <span className="text-gray-900 font-medium">{currency}{sgst.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-xl text-primary">
                      {currency}{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="px-4 py-3">
                <Button
                  onClick={onAddToOrder}
                  disabled={!hasItems || isLoading}
                  className="w-full h-12 text-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <span className="text-sm font-semibold">Add to Order</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WaiterTerminalPage() {
  const [_, setLocation] = useLocation();
  const { restaurantId, user, logout } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: tables, isLoading: tablesLoading, refetch: refetchTables } = useTables(restaurantId);
  const { data: queueEntries, isLoading: queueLoading, refetch: refetchQueue } = useQueueActive(restaurantId);
  const { data: menuData, refetch: refetchMenu } = useMenuCategories(restaurantId, restaurant?.slug ?? null);
  const { data: orders, refetch: refetchOrders } = useOrders(restaurantId, { limit: 50 });
  
  const updateTableStatus = useUpdateTableStatus(restaurantId);
  const createOrder = useCreateOrder(restaurantId);
  const seatGuest = useSeatGuest(restaurantId);
  const callNext = useCallNextGuest(restaurantId);
  const updateOrderStatus = useUpdateOrderStatus(restaurantId);
  const addOrderItems = useAddOrderItems(restaurantId);
  const removeOrderItem = useRemoveOrderItem(restaurantId);

  const [language, setLanguage] = useState<"en" | "es" | "hi">("en");
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);
  const [cart, setCart] = useState<Array<{
     item: MenuItem; 
     quantity: number
     variantId?: string; 
      modifierIds?: string[];
  }>>([]);

  const [selectedGuestForSeating, setSelectedGuestForSeating] = useState<QueueEntry | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"floor" | "orders">("floor");
  const [dietaryFilter, setDietaryFilter] = useState<'any' | 'veg' | 'non-veg'>('any');
  
  // Mobile detection and POS state
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePOSNewOrder, setShowMobilePOSNewOrder] = useState(false);
  const [showMobilePOSAddItems, setShowMobilePOSAddItems] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Track served orders for notifications
  const servedOrdersRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<{ id: string; message: string; time: Date }[]>([]);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);


  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Set initial active category
  useEffect(() => {
    if (!activeCategory && menuData?.categories && menuData.categories.length > 0) {
      setActiveCategory(menuData.categories[0].id);
    }
  }, [menuData, activeCategory]);

  // Check for newly ready orders and notify
  useEffect(() => {
    if (!orders) return;
    
    const readyOrders = orders.filter((o: Order) => o.status === "READY");
    readyOrders.forEach((order: Order) => {
      if (!servedOrdersRef.current.has(order.id)) {
        servedOrdersRef.current.add(order.id);
        const tableName = order.table?.tableNumber ? `Table ${order.table.tableNumber}` : order.guestName || `Order #${order.id.slice(-4)}`;
        const notification = {
          id: order.id,
          message: `🍽️ ${tableName} is READY for pickup!`,
          time: new Date(),
        };
        setNotifications(prev => [notification, ...prev].slice(0, 10));
        toast.success(notification.message, { 
          duration: 10000,
          icon: <ChefHat className="w-5 h-5 text-green-500" />,
        });
        
        // Play notification sound if available
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        } catch {}
      }
    });
  }, [orders]);

  const t = {
    en: { 
      title: "Waiter Terminal", 
      floor: "Floor Map", 
      orders: "Active Orders",
      queue: "Guest Queue", 
      seat: "Seat Party", 
      tables: "Tables", 
      available: "Available", 
      occupied: "Occupied", 
      order: "New Order", 
      add: "Add to Order", 
      confirm: "Send to Kitchen", 
      items: "Items", 
      callNext: "Call Next",
      noQueue: "No guests waiting",
      noTables: "No tables configured",
      noOrders: "No active orders",
      editOrder: "Edit Order",
      addItems: "Add Items",
      markServed: "Mark Served",
      ready: "Ready to Serve",
      preparing: "Preparing",
      pending: "New",
    },
    es: { 
      title: "Terminal del Camarero", 
      floor: "Mapa del Piso", 
      orders: "Pedidos Activos",
      queue: "Cola de Invitados", 
      seat: "Sentar Grupo", 
      tables: "Mesas", 
      available: "Disponible", 
      occupied: "Ocupado", 
      order: "Nuevo Pedido", 
      add: "Agregar", 
      confirm: "Enviar a Cocina", 
      items: "Artículos", 
      callNext: "Llamar Siguiente",
      noQueue: "Sin invitados esperando",
      noTables: "Sin mesas configuradas",
      noOrders: "Sin pedidos activos",
      editOrder: "Editar Pedido",
      addItems: "Agregar Items",
      markServed: "Marcar Servido",
      ready: "Listo para Servir",
      preparing: "Preparando",
      pending: "Nuevo",
    },
    hi: { 
      title: "वेटर टर्मिनल", 
      floor: "फ्लोर मैप", 
      orders: "एक्टिव ऑर्डर",
      queue: "मेहमानों की सूची", 
      seat: "बैठाएं", 
      tables: "मेज़", 
      available: "उपलब्ध", 
      occupied: "भरा हुआ", 
      order: "नया ऑर्डर", 
      add: "जोड़ें", 
      confirm: "किचन भेजें", 
      items: "सामान", 
      callNext: "अगला बुलाएं",
      noQueue: "कोई मेहमान इंतज़ार में नहीं",
      noTables: "कोई टेबल नहीं",
      noOrders: "कोई ऑर्डर नहीं",
      editOrder: "ऑर्डर बदलें",
      addItems: "आइटम जोड़ें",
      markServed: "सर्व किया",
      ready: "सर्व के लिए तैयार",
      preparing: "बन रहा है",
      pending: "नया",
    }
  }[language];

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  const handleRefreshAll = () => {
    refetchTables();
    refetchQueue();
    refetchOrders();
    refetchMenu();
    toast.success("Refreshed!");
  };

  const toggleTableStatus = async (table: Table) => {
    const newStatus = table.currentStatus === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE";
    updateTableStatus.mutate({ tableId: table.id, status: newStatus });
  };

 const addToCart = (item: MenuItem) => {
  // Check if item has customization options
  const hasCustomization = 
    (item.variants && item.variants.length > 0) ||
    (item.modifierGroups && item.modifierGroups.length > 0);

  if (hasCustomization) {
    // Open customization dialog
    setIsCustomizing(true);
    setCustomizingItem(item);
  } else {
    // Add directly to cart (existing behavior)
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  }
};

const handleAddCustomizedItem = (selection: {
  menuItemId: string;
  quantity: number;
  variantId?: string;
  modifierIds?: string[];
}) => {
  if (!customizingItem) return;

  setCart(prev => [
    ...prev,
    {
      item: customizingItem,
      quantity: selection.quantity,
      variantId: selection.variantId,
      modifierIds: selection.modifierIds,
    }
  ]);

  setCustomizingItem(null);
  setIsCustomizing(false);

};

  const removeFromCart = (index: number) => {
   setCart(prev => prev.filter((_, i) => i !== index));
  };


  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = prev.map((item, i) => {
        if (i === index) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
      // Remove items with quantity 0
      return newCart.filter(item => item.quantity > 0);
    });
  };


const submitOrder = async () => {
  const tableId = isMobile ? selectedTableId : selectedTableForOrder?.id;
  if (!tableId || cart.length === 0) return;
  
  try {
    await createOrder.mutateAsync({
      tableId,
      orderType: "DINE_IN",
      items: cart.map(c => ({
        menuItemId: c.item.id,
        quantity: c.quantity,
        variantId: c.variantId,        // Include variant
        modifierIds: c.modifierIds,    // Include modifiers
      })),
    });
    if (isMobile) {
      handleCloseMobilePOSNewOrder();
    } else {
      setSelectedTableForOrder(null);
    }
    setCart([]);
    refetchOrders();
  } catch {
    // Error handled by mutation
  }
};

  const handleAddItemsToOrder = async () => {
    if (!selectedOrderForEdit || cart.length === 0) return;
    
    try {
      await addOrderItems.mutateAsync({
        orderId: selectedOrderForEdit.id,
        items: cart.map(c => ({
          menuItemId: c.item.id,
          quantity: c.quantity,
          variantId: c.variantId,
          modifierIds: c.modifierIds,
        })),
      });
      if (isMobile) {
        handleCloseMobilePOSAddItems();
      } else {
        setSelectedOrderForEdit(null);
      }
      setCart([]);
      refetchOrders();
    } catch {
    }
  };

  const handleRemoveItem = async (orderId: string, orderItemId: string) => {
    if (!confirm("Remove this item from the order?")) return;
    try {
      await removeOrderItem.mutateAsync({ orderId, orderItemId });
      refetchOrders();
    } catch {
      // Error handled by mutation
    }
  };

  const handleSeatGuest = async (entry: QueueEntry, tableId?: string) => {
    try {
      await seatGuest.mutateAsync({ queueId: entry.id, tableId });
      setSelectedGuestForSeating(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCallNext = async () => {
    try {
      await callNext.mutateAsync();
    } catch {
      // Error handled by mutation
    }
  };

  const handleMarkServed = async (order: Order) => {
    try {
      await updateOrderStatus.mutateAsync({ orderId: order.id, status: "SERVED" });
    } catch {
      // Error handled by mutation
    }
  };

  // Mobile handlers
  const handleNewOrderClick = (table: Table) => {
    if (isMobile) {
      setSelectedTableId(table.id);
      setShowMobilePOSNewOrder(true);
    } else {
      setSelectedTableForOrder(table);
    }
  };

  const handleAddItemsClick = (order: Order) => {
    if (isMobile) {
      setSelectedOrderForEdit(order);
      setShowMobilePOSAddItems(true);
    } else {
      setSelectedOrderForEdit(order);
      setCart([]);
    }
  };

  const handleMobileAddItem = (item: MenuItem) => {
    addToCart(item);
  };

  const handleMobileRemoveItem = (itemId: string) => {
    setCart(prev => {
      const itemIndex = prev.findIndex(c => c.item.id === itemId);
      if (itemIndex === -1) return prev;
      
      const item = prev[itemIndex];
      if (item.quantity === 1) {
        return prev.filter((_, i) => i !== itemIndex);
      }
      return prev.map((c, i) => 
        i === itemIndex ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  };

  const handleMobileIncrement = (itemId: string) => {
    setCart(prev => {
      const itemIndex = prev.findIndex(c => c.item.id === itemId);
      if (itemIndex === -1) return prev;
      return prev.map((c, i) => 
        i === itemIndex ? { ...c, quantity: c.quantity + 1 } : c
      );
    });
  };

  const handleCloseMobilePOSNewOrder = () => {
    setShowMobilePOSNewOrder(false);
    setCart([]);
    setSelectedTableId("");
    setSearchQuery("");
    setIsSearchOpen(false);
    if (menuData?.categories?.[0]?.id) {
      setActiveCategory(menuData.categories[0].id);
    }
  };

  const handleCloseMobilePOSAddItems = () => {
    setShowMobilePOSAddItems(false);
    setCart([]);
    setSearchQuery("");
    setIsSearchOpen(false);
    if (menuData?.categories?.[0]?.id) {
      setActiveCategory(menuData.categories[0].id);
    }
  };

  const handleSave = () => {
    if (cart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    toast.success("Order saved!");
  };

  const handleSaveAndPrint = () => {
    if (cart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    toast.success("Order saved and sent to printer!");
  };

  const currency = restaurant?.currency || "₹";
  const gstRate = parseFloat(restaurant?.taxRateGst || "5") / 100;

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, cartItem) => {
      const { item, quantity, variantId, modifierIds } = cartItem;
      
      let itemPrice = parseFloat(item.price as any);
      if (variantId) {
        const variant = item.variants?.find(v => v.id === variantId);
        if (variant) {
          itemPrice = parseFloat(variant.price as any);
        }
      }
      
      let modifiersTotal = 0;
      if (modifierIds && modifierIds.length > 0) {
        item.modifierGroups?.forEach(group => {
          group.modifiers?.forEach(mod => {
            if (modifierIds.includes(mod.id)) {
              modifiersTotal += parseFloat(mod.price as any);
            }
          });
        });
      }
      
      return sum + ((itemPrice + modifiersTotal) * quantity);
    }, 0);
  }, [cart]);

  const calculateBill = (subtotal: number, rate: number) => {
    const cgst = subtotal * (rate / 2);
    const sgst = subtotal * (rate / 2);
    const total = subtotal + cgst + sgst;
    return { subtotal, cgst, sgst, total };
  };

  const billBreakdown = useMemo(() => {
    return calculateBill(cartTotal, gstRate);
  }, [cartTotal, gstRate]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "PENDING": return <Badge variant="destructive" className="animate-pulse">{t.pending}</Badge>;
      case "PREPARING": return <Badge variant="secondary" className="bg-blue-100 text-blue-700">{t.preparing}</Badge>;
      case "READY": return <Badge variant="default" className="bg-green-600 text-white animate-pulse">READY</Badge>;
      case "SERVED": return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">{t.ready}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimeSince = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch {
      return "—";
    }
  };

  // Convert cart array to orderItems object for mobile components
  const cartToOrderItems = useMemo(() => {
    const items: Record<string, number> = {};
    cart.forEach(c => {
      items[c.item.id] = (items[c.item.id] || 0) + c.quantity;
    });
    return items;
  }, [cart]);

  // Filter menu items by active category and search query
  const filteredMenuItems = useMemo(() => {
    if (!menuData?.items) return [];
    
    let items = menuData.items;
    
    // Filter by category if not searching
    if (!searchQuery && activeCategory) {
      items = items.filter(
        (item: MenuItem) => item.categoryId === activeCategory && item.isAvailable
      );
    } else if (searchQuery) {
      // Filter by search query across all categories
      items = items.filter(
        (item: MenuItem) => 
          item.isAvailable && 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return items;
  }, [menuData, activeCategory, searchQuery]);

  // Organize menu items by category and apply dietary filter
  const categoriesWithItems = useMemo(() => {
    if (!menuData) return [];
    
    // Filter items by dietary type if filter is active
    let filteredItems = menuData.items?.filter((item: MenuItem) => item.isAvailable) || [];
    if (dietaryFilter === 'veg') {
      filteredItems = filteredItems.filter((item: MenuItem) => 
        item.dietaryTags?.some(tag => tag.toLowerCase() === 'veg')
      );
    } else if (dietaryFilter === 'non-veg') {
      filteredItems = filteredItems.filter((item: MenuItem) => 
        item.dietaryTags?.some(tag => tag.toLowerCase() === 'non-veg')
      );
    }
    
    return menuData.categories?.map((cat: MenuCategory) => ({
      ...cat,
      items: filteredItems.filter((item: MenuItem) => item.categoryId === cat.id),
    })).filter((cat) => cat.items.length > 0) || [];
  }, [menuData, dietaryFilter]);

  // Filter queue entries
  const waitingGuests = queueEntries?.filter((e: QueueEntry) => e.status === "WAITING") || [];
  const calledGuests = queueEntries?.filter((e: QueueEntry) => e.status === "CALLED") || [];
  const availableTables = tables?.filter((t: Table) => t.currentStatus === "AVAILABLE") || [];

  // Active orders (not paid/cancelled)
  const activeOrders = (orders || []).filter((o: Order) => 
    o.status === "PENDING" || o.status === "PREPARING" || o.status === "READY" || o.status === "SERVED"
  );

  // Count ready orders for notification badge
  const readyOrdersCount = activeOrders.filter((o: Order) => o.status === "READY").length;

  const isLoading = tablesLoading || queueLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile POS render checks
  if (showMobilePOSNewOrder && isMobile) {
    return (
      <MobilePOSNewOrder
        categories={menuData?.categories || []}
        menuItems={menuData?.items || []}
        activeCategory={activeCategory}
        orderItems={cartToOrderItems}
        tableNumber={selectedTableId}
        onCategoryChange={setActiveCategory}
        onAddItem={handleMobileAddItem}
        onRemoveItem={handleMobileRemoveItem}
        onIncrement={handleMobileIncrement}
        onTableChange={setSelectedTableId}
        onSendToKitchen={submitOrder}
        onClose={handleCloseMobilePOSNewOrder}
        currency={currency}
        gstRate={gstRate}
        tables={tables}
        isLoading={createOrder.isPending}
      />
    );
  }

  if (showMobilePOSAddItems && isMobile) {
    const tableDisplay = selectedOrderForEdit?.table?.tableNumber 
      ? `Table ${selectedOrderForEdit.table.tableNumber}` 
      : `Order #${selectedOrderForEdit?.id.slice(-4)}`;

    return (
      <MobilePOSAddItems
        categories={menuData?.categories || []}
        menuItems={menuData?.items || []}
        activeCategory={activeCategory}
        orderItems={cartToOrderItems}
        tableNumber={tableDisplay}
        onCategoryChange={setActiveCategory}
        onAddItem={handleMobileAddItem}
        onRemoveItem={handleMobileRemoveItem}
        onIncrement={handleMobileIncrement}
        onAddToOrder={handleAddItemsToOrder}
        onClose={handleCloseMobilePOSAddItems}
        currency={currency}
        gstRate={gstRate}
        isLoading={addOrderItems.isPending}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900">{t.title}</h1>
            <p className="text-slate-500 text-sm">{restaurant?.name || "Restaurant"} • {user?.fullName || user?.email}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshAll}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">
              <Languages className="w-4 h-4 text-slate-400 ml-1" />
              {(["en", "es", "hi"] as const).map((l) => (
                <Button 
                  key={l}
                  variant={language === l ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage(l)}
                  className="uppercase text-xs font-bold h-7 px-2"
                >
                  {l}
                </Button>
              ))}
            </div>

            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Notification Banner */}
        {notifications.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3 animate-in slide-in-from-top">
            <Bell className="w-5 h-5 text-green-600 animate-bounce" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">{notifications[0].message}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setNotifications(prev => prev.slice(1))}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "floor" | "orders")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="floor" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> {t.floor}
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 relative">
              <Utensils className="w-4 h-4" /> {t.orders}
              {readyOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {readyOrdersCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Floor Map Tab */}
          <TabsContent value="floor" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Floor Map Section */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> {t.available}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400" /> {t.occupied}</span>
                  </div>
                </div>
                
                {tables && tables.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {tables.map((table: Table) => (
                      <div key={table.id} className="relative group">
                        <div className="absolute -top-1 -right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-6 w-6 rounded-full shadow-lg border border-slate-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTableStatus(table);
                            }}
                            disabled={updateTableStatus.isPending}
                          >
                            <Check className={cn("w-3 h-3", table.currentStatus === "AVAILABLE" ? "text-slate-400" : "text-green-600")} />
                          </Button>
                        </div>
                        <button
                          onClick={() => {
                            if (table.currentStatus === "OCCUPIED") {
                              handleNewOrderClick(table);
                            }
                          }}
                          className={cn(
                            "w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                            table.currentStatus === "AVAILABLE" 
                              ? "bg-white border-green-200 shadow-sm" 
                              : "bg-slate-100 border-primary/50 shadow-inner text-slate-900 cursor-pointer hover:bg-slate-200"
                          )}
                        >
                          <span className="text-2xl font-bold">{table.tableNumber}</span>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Cap: {table.capacity}</span>
                          {table.assignedWaiter && (
                            <span className="text-[9px] font-semibold text-primary mt-0.5 px-1.5 py-0.5 bg-primary/10 rounded">
                              👤 {table.assignedWaiter.fullName}
                            </span>
                          )}
                          {table.currentStatus === "OCCUPIED" && (
                            <Badge variant="outline" className="text-[9px] border-primary text-primary bg-primary/5 mt-1">
                              <Plus className="w-2 h-2 mr-0.5" /> Order
                            </Badge>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <LayoutGrid className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground">{t.noTables}</p>
                  </div>
                )}
              </div>

              {/* Queue Sidebar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> {t.queue}
                  </h2>
                  <Button size="sm" variant="outline" onClick={handleCallNext} disabled={callNext.isPending || waitingGuests.length === 0}>
                    {callNext.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {t.callNext}
                  </Button>
                </div>

                {/* Called Guests */}
                {calledGuests.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Called</p>
                    {calledGuests.map((guest: QueueEntry) => (
                      <Card key={guest.id} className="border-l-4 border-l-primary shadow-sm animate-pulse">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold">{guest.guestName}</p>
                              <p className="text-xs text-slate-500">{guest.partySize} people</p>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedGuestForSeating(guest)}
                            >
                              <MapPin className="w-3 h-3 mr-1" /> Seat
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Waiting Guests */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {waitingGuests.length > 0 ? (
                    <>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting ({waitingGuests.length})</p>
                      {waitingGuests.map((guest: QueueEntry) => (
                        <Card key={guest.id} className="shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-bold text-sm">{guest.guestName}</p>
                                <p className="text-xs text-slate-500">{guest.partySize} people • #{guest.position}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <Users className="w-6 h-6 mx-auto mb-1 opacity-20" />
                      <p>{t.noQueue}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Utensils className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">{t.noOrders}</p>
                <p className="text-sm text-muted-foreground">Orders will appear here</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order: Order) => (
                  <Card key={order.id} className={cn(
                    "overflow-hidden transition-all",
                    order.status === "READY" && "ring-2 ring-green-500 bg-green-50/50 animate-pulse",
                    order.status === "SERVED" && "ring-1 ring-green-300 bg-green-50/30"
                  )}>
                    <CardHeader className={cn(
                      "py-3 px-4",
                      order.status === "PENDING" && "bg-red-50",
                      order.status === "PREPARING" && "bg-blue-50",
                      order.status === "READY" && "bg-green-50",
                      order.status === "SERVED" && "bg-green-50/50"
                    )}>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {order.table?.tableNumber ? `Table ${order.table.tableNumber}` : order.guestName || `#${order.id.slice(-4)}`}
                          </CardTitle>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {getTimeSince(order.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {/* Order Items */}
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {order.items?.map((item) => (
                            <CustomizedOrderItemDisplay
                                key={item.id}
                                item={item as any}
                                currency={currency}
                                compact={true}
                              />
                            ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center pt-2 border-t font-bold">
                        <span>Total</span>
                        <span className="text-primary">{currency}{parseFloat(order.totalAmount).toFixed(0)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {order.status === "PENDING" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleAddItemsClick(order)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Items
                          </Button>
                        )}
                        {order.status === "READY" && (
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleMarkServed(order)}
                            disabled={updateOrderStatus.isPending}
                          >
                            <Check className="w-3 h-3 mr-1" /> Mark as Delivered
                          </Button>
                        )}
                        {order.status === "SERVED" && (
                          <Badge className="flex-1 justify-center bg-green-100 text-green-700 border-green-300">
                            <Check className="w-3 h-3 mr-1" /> Delivered
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New Order Dialog */}
      <Dialog 
        open={!!selectedTableForOrder} 
        onOpenChange={(open) => {
          if (!open && customizingItem) return;
          if (!open) {
            setSelectedTableForOrder(null);
            setCart([]);
            setDietaryFilter('any');
            setSearchQuery("");
            setIsSearchOpen(false);
          }
        }}
      >
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
                  onClose={() => setCustomizingItem(null)}
                  onAddToCart={handleAddCustomizedItem}
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
                          {!isSearchOpen && menuData?.categories?.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => {
                                setActiveCategory(category.id);
                                setSearchQuery("");
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
                          onClick={() => setIsSearchOpen(true)}
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
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="h-8 sm:h-9 pl-8 pr-2 text-xs sm:text-sm"
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
                          Found {filteredMenuItems.length} item(s) for "{searchQuery}"
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                        {filteredMenuItems.map((item: MenuItem) => {
                          const cartItem = cart.find((c) => c.item.id === item.id);
                          const quantity = cartItem ? cartItem.quantity : 0;
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
                                    onClick={() => addToCart(item)}
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-white h-8 w-full rounded-md font-semibold"
                                  >
                                    <Plus className="size-4 mr-1" />
                                    Add
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-center gap-2 bg-primary/10 rounded-md border-2 border-primary/30 p-1">
                                    <Button
                                      onClick={() => {
                                        const index = cart.findIndex(c => c.item.id === item.id);
                                        if (index !== -1) updateQuantity(index, -1);
                                      }}
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
                                      onClick={() => {
                                        const index = cart.findIndex(c => c.item.id === item.id);
                                        if (index !== -1) updateQuantity(index, 1);
                                        else addToCart(item);
                                      }}
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
                      {filteredMenuItems.length === 0 && (
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
                      {/* <Button
                        onClick={handleSave}
                        variant="outline"
                        disabled={cart.length === 0}
                        size="sm"
                        className="hover:bg-gray-100 text-[11px] sm:text-xs h-8 sm:h-9"
                      >
                        <Save className="size-3 sm:size-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Save</span>
                      </Button> */}
                      {/* <Button
                        onClick={handleSaveAndPrint}
                        variant="outline"
                        disabled={cart.length === 0}
                        size="sm"
                        className="hover:bg-gray-100 text-[11px] sm:text-xs h-8 sm:h-9"
                      >
                        <Printer className="size-3 sm:size-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Print</span>
                      </Button> */}
                      <Button
                        onClick={submitOrder}
                        disabled={cart.length === 0 || createOrder.isPending}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-6 text-[11px] sm:text-xs h-8 sm:h-9"
                      >
                        {createOrder.isPending ? (
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

                    <div className="grid grid-cols-1 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-600 font-medium flex items-center gap-1">
                          <UtensilsCrossed className="size-3" />
                          Table
                        </Label>
                        <Select 
                          value={selectedTableForOrder?.id || ""} 
                          onValueChange={(value) => {
                            const table = tables?.find((t: Table) => t.id === value);
                            if (table) setSelectedTableForOrder(table);
                          }}
                        >
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
                    </div>
                  </div>

                  {/* Order Items */}
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 text-xs sm:text-sm">
                        Items ({cart.length})
                      </h3>
                      {cart.length === 0 ? (
                        <p className="text-gray-500 text-xs text-center py-8">
                          No items added
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((cartItem, idx) => {
                            const { item, quantity, variantId, modifierIds } = cartItem;
                            
                            const selectedVariant = item.variants?.find(
                              (v) => v.id === variantId
                            );
                            const selectedModifiers =
                              item.modifierGroups?.flatMap(
                                (g) =>
                                  g.modifiers?.filter((m) =>
                                    modifierIds?.includes(m.id)
                                  ) || []
                              ) || [];

                            const isVeg = item.dietaryTags?.some(
                              (tag) => tag.toLowerCase() === "veg"
                            );

                            let displayPrice = parseFloat(item.price as any);
                            if (selectedVariant) {
                              displayPrice = parseFloat(selectedVariant.price as any);
                            }
                            let modifiersPrice = 0;
                            selectedModifiers.forEach(mod => {
                              modifiersPrice += parseFloat(mod.price as any);
                            });
                            const totalItemPrice = displayPrice + modifiersPrice;

                            return (
                              <div
                                key={idx}
                                className="bg-white rounded-lg border-2 border-gray-200 p-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <div
                                      className={cn(
                                        "size-2 rounded-sm border flex-shrink-0",
                                        isVeg 
                                          ? "border-green-600 bg-white relative after:content-[''] after:absolute after:inset-[2px] after:bg-green-600 after:rounded-full" 
                                          : "border-red-600 bg-white relative after:content-[''] after:absolute after:inset-[2px] after:bg-red-600 after:rounded-full"
                                      )}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-semibold text-gray-900 text-[11px] sm:text-xs truncate">
                                        {item.name}
                                      </span>
                                      {selectedVariant && (
                                        <span className="text-[9px] text-blue-600 truncate">
                                          {selectedVariant.variantName}
                                        </span>
                                      )}
                                      {selectedModifiers.length > 0 && (
                                        <span className="text-[9px] text-amber-600 truncate">
                                          + {selectedModifiers.map((m) => m.name).join(", ")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                                    <div className="flex items-center gap-0.5 bg-gray-100 rounded-md">
                                      <Button
                                        onClick={() => updateQuantity(idx, -1)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                      >
                                        <Minus className="size-2 sm:size-2.5" />
                                      </Button>
                                      <span className="font-bold text-[9px] sm:text-[11px] min-w-[0.75rem] sm:min-w-[0.875rem] text-center">
                                        {quantity}
                                      </span>
                                      <Button
                                        onClick={() => updateQuantity(idx, 1)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                      >
                                        <Plus className="size-2 sm:size-2.5" />
                                      </Button>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => removeFromCart(idx)}
                                      title="Remove item"
                                    >
                                      <X className="size-3 sm:size-3.5" />
                                    </Button>
                                    <span className="font-bold text-gray-900 min-w-[2rem] sm:min-w-[2.5rem] text-right text-[9px] sm:text-[11px] md:text-xs">
                                      {currency}{(totalItemPrice * quantity).toFixed(2)}
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
                  <div className="bg-white border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between text-[10px] sm:text-xs">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900 font-semibold">
                          {currency}{billBreakdown.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-xs">
                        <span className="text-gray-600">CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                        <span className="text-gray-900 font-semibold">
                          {currency}{billBreakdown.cgst.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-xs">
                        <span className="text-gray-600">SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                        <span className="text-gray-900 font-semibold">
                          {currency}{billBreakdown.sgst.toFixed(2)}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">Total</span>
                        <span className="font-bold text-lg sm:text-xl text-primary">
                          {currency}{billBreakdown.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Items to Existing Order Dialog */}
      <Dialog open={!!selectedOrderForEdit} onOpenChange={() => { setSelectedOrderForEdit(null); setCart([]); setDietaryFilter('any'); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">

          {customizingItem ? (
             <ItemCustomizationContent
               menuItem={customizingItem}
               currency={currency}
               onClose={() => setCustomizingItem(null)}
               onAddToCart={handleAddCustomizedItem}
              />
            ) : (
            <>
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              {t.addItems} - {selectedOrderForEdit?.table?.tableNumber ? `Table ${selectedOrderForEdit.table.tableNumber}` : `Order #${selectedOrderForEdit?.id.slice(-4)}`}
            </DialogTitle>
            <DialogDescription>
              Current items: {selectedOrderForEdit?.items?.map(i => `${i.quantity}x ${i.itemName}`).join(", ")}
            </DialogDescription>
          </DialogHeader>
           </> )}

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left Side - 60% - Menu Items */}
              <div className="flex-[1_1_60%] flex flex-col overflow-hidden bg-white min-w-0">
              {/* Dietary Filter Buttons */}
              <div className="flex gap-2 mb-4 sticky top-0 bg-white pb-2 z-10 border-b">
                <button
                  onClick={() => setDietaryFilter('any')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1",
                    dietaryFilter === 'any'
                      ? "bg-primary text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setDietaryFilter('veg')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1",
                    dietaryFilter === 'veg'
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Veg
                </button>
                <button
                  onClick={() => setDietaryFilter('non-veg')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1",
                    dietaryFilter === 'non-veg'
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Non-Veg
                </button>
              </div>
              
              {categoriesWithItems.map((category: MenuCategory & { items: MenuItem[] }) => (
                <div key={category.id} className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider sticky top-0 bg-white py-1">{category.name}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map((item: MenuItem) => {
                      const vegTag = item.dietaryTags?.find(tag => tag.toLowerCase() === "veg");
                      const nonVegTag = item.dietaryTags?.find(tag => tag.toLowerCase() === "non-veg");
                      return (
                        <button
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border bg-white hover:border-primary hover:bg-primary/5 transition-all text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-bold text-sm truncate">{item.name}</p>
                              {vegTag && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-[9px] px-1 py-0 h-3.5 flex-shrink-0">
                                  V
                                </Badge>
                              )}
                              {nonVegTag && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-[9px] px-1 py-0 h-3.5 flex-shrink-0">
                                  NV
                                </Badge>
                              )}
                            </div>
                            <p className="text-primary font-bold text-xs">{currency}{item.price}</p>
                          </div>
                          <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

              {/* Right Side - 40% - Order Summary */}
              <div className="flex-[1_1_40%] min-w-[280px] max-w-[40%] bg-gray-50 border-l flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b p-3 sm:p-4 flex-shrink-0">
                  <h2 className="font-bold text-sm sm:text-base mb-2">
                    Add Items - {selectedOrderForEdit?.table?.tableNumber ? `Table ${selectedOrderForEdit.table.tableNumber}` : `Order #${selectedOrderForEdit?.id.slice(-4)}`}
                  </h2>
                </div>

                {/* Items list */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold mb-2 text-xs sm:text-sm">New Items ({cart.length})</h3>
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <ShoppingCart className="w-6 h-6 mx-auto mb-1 opacity-20" />
                        <p>No items added</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cart.map((cartItem, index) => {
                          const { item, quantity, variantId, modifierIds } = cartItem;
                          
                          const selectedVariant = item.variants?.find(v => v.id === variantId);
                          const selectedModifiers = item.modifierGroups?.flatMap(g => 
                            g.modifiers?.filter(m => modifierIds?.includes(m.id)) || []
                          ) || [];

                          let displayPrice = parseFloat(item.price as any);
                          if (selectedVariant) {
                            displayPrice = parseFloat(selectedVariant.price as any);
                          }
                          let modifiersPrice = 0;
                          selectedModifiers.forEach(mod => {
                            modifiersPrice += parseFloat(mod.price as any);
                          });
                          const totalItemPrice = displayPrice + modifiersPrice;

                          return (
                            <div key={index} className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted/40 transition-colors bg-white border border-gray-200">
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-sm font-bold truncate">{item.name}</span>
                                
                                {selectedVariant && (
                                  <span className="text-[10px] text-blue-600 font-medium">
                                    {selectedVariant.variantName}
                                  </span>
                                )}
                                
                                {selectedModifiers.length > 0 && (
                                  <span className="text-[10px] text-amber-600">
                                    + {selectedModifiers.map(m => m.name).join(", ")}
                                  </span>
                                )}
                                
                                <span className="text-xs text-muted-foreground">
                                  {currency}{totalItemPrice.toFixed(2)} x {quantity} = {currency}{(totalItemPrice * quantity).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-full border hover:bg-destructive/10 hover:border-destructive"
                                  onClick={() => updateQuantity(index, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-sm font-bold min-w-[24px] text-center bg-primary/10 px-2 py-1 rounded">
                                  {quantity}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-full border hover:bg-primary/10 hover:border-primary"
                                  onClick={() => updateQuantity(index, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-full border hover:bg-destructive/10 hover:border-destructive text-destructive"
                                  onClick={() => removeFromCart(index)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Bill breakdown */}
                <div className="bg-white border-t p-3 sm:p-4 flex-shrink-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{currency}{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                      <span>{currency}{(cartTotal * gstRate / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                      <span>{currency}{(cartTotal * gstRate / 2).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary text-xl">{currency}{(cartTotal * (1 + gstRate)).toFixed(2)}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    disabled={cart.length === 0 || addOrderItems.isPending} 
                    onClick={handleAddItemsToOrder}
                  >
                    {addOrderItems.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add to Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seat Guest Dialog */}
      <Dialog open={!!selectedGuestForSeating} onOpenChange={() => setSelectedGuestForSeating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seat {selectedGuestForSeating?.guestName}</DialogTitle>
            <DialogDescription>
              Select a table for party of {selectedGuestForSeating?.partySize}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-4">
            {availableTables.map((table: Table) => (
              <Button
                key={table.id}
                variant="outline"
                className="h-16 flex flex-col gap-0.5"
                onClick={() => selectedGuestForSeating && handleSeatGuest(selectedGuestForSeating, table.id)}
                disabled={seatGuest.isPending}
              >
                <span className="text-xl font-bold">{table.tableNumber}</span>
                <span className="text-[10px] text-muted-foreground">Cap: {table.capacity}</span>
              </Button>
            ))}
            {availableTables.length === 0 && (
              <div className="col-span-4 text-center py-6 text-muted-foreground text-sm">
                No available tables
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => selectedGuestForSeating && handleSeatGuest(selectedGuestForSeating)}
              disabled={seatGuest.isPending}
            >
              {seatGuest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Seat without table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
