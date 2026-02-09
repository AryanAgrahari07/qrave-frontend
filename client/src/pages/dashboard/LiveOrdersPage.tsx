import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Utensils,
  UserPlus,
  Receipt,
  CreditCard,
  QrCode,
  Plus,
  Minus,
  Loader2,
  RefreshCw,
  Save,
  Printer,
  ChefHat,
  UtensilsCrossed,
  Users,
  Search,
  X,
  ShoppingCart,
  Grid3x3,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useMemo, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import {
  useOrders,
  useUpdateOrderStatus,
  useCreateOrder,
  useRestaurant,
  useMenuCategories,
  useTables,
  useStaff,
  useRecentTransactions,
  useUpdatePaymentStatus,
  useCancelOrderWithReason,
  useCloseOrder,
} from "@/hooks/api";
import type { Order, MenuItem, Table, OrderStatus, PaymentMethod } from "@/types";
import { formatDistanceToNow } from "date-fns";
import {
  CustomizedOrderItemDisplay,
  getCustomizationSummary,
} from "@/components/menu/Customizedorderitemdisplay";
import { ItemCustomizationContent } from "@/components/menu/ItemcustomizationContent";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { XCircle, DollarSign } from "lucide-react";

// Mobile POS Component
function MobilePOS({
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

export default function LiveOrdersPage() {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Items per page
  const offset = (currentPage - 1) * pageSize;

  const {
    data: ordersData,
    isLoading,
    refetch,
  } = useOrders(restaurantId, { limit: pageSize, offset });
  
  const { data: menuData } = useMenuCategories(
    restaurantId,
    restaurant?.slug ?? null,
  );
  const { data: tables } = useTables(restaurantId);
  const { data: staff } = useStaff(restaurantId);

  const transactions = useRecentTransactions(restaurantId, 5);
  const updateStatus = useUpdateOrderStatus(restaurantId);
  const createOrder = useCreateOrder(restaurantId);
  const updatePaymentStatus = useUpdatePaymentStatus(restaurantId);
  const cancelWithReason = useCancelOrderWithReason(restaurantId);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [manualCart, setManualCart] = useState<
    {
      id: string;
      name: string;
      price: number;
      quantity: number;
      variantId?: string;
      modifierIds?: string[];
      isVeg?: boolean;
    }[]
  >([]);
  const [addItemsCart, setAddItemsCart] = useState<
    {
      id: string;
      name: string;
      price: number;
      quantity: number;
      variantId?: string;
      modifierIds?: string[];
    }[]
  >([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("1");
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizationTarget, setCustomizationTarget] = useState<
    "manual" | "addItems"
  >("manual");
  const [orderMethod, setOrderMethod] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "due">("due");  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePOS, setShowMobilePOS] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const closeOrder = useCloseOrder(restaurantId);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Extract orders and pagination info
  const orders = ordersData?.orders ?? [];
  const pagination = ordersData?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const hasNextPage = pagination?.hasMore ?? false;
  const hasPrevPage = currentPage > 1;

  // Filter active orders (not paid/cancelled)
  const activeOrders = useMemo(() => {
    return orders.filter(
      (o: Order) =>
        !(o.paymentStatus === "PAID" && o.status === "SERVED" && o.isClosed) && 
        o.status !== "CANCELLED"
    );
  }, [orders]);

  const currency = restaurant?.currency || "₹";
  const gstRate = parseFloat(restaurant?.taxRateGst || "5") / 100;

  // Set initial active category
  useMemo(() => {
    if (!activeCategory && menuData?.categories && menuData.categories.length > 0) {
      setActiveCategory(menuData.categories[0].id);
    }
  }, [menuData, activeCategory]);

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

  const addToManualCart = (item: MenuItem) => {
    const hasCustomizationOptions =
      (item.variants && item.variants.length > 0) ||
      (item.modifierGroups && item.modifierGroups.length > 0);

    if (hasCustomizationOptions) {
      setCustomizingItem(item);
    } else {
      setManualCart((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        const isVeg = item.dietaryTags?.some((tag) => tag.toLowerCase() === "veg");
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            isVeg,
          },
        ];
      });
    }
  };

  const removeFromManualCart = (itemId: string) => {
    setManualCart((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      
      if (item.quantity === 1) {
        return prev.filter((i) => i.id !== itemId);
      }
      return prev.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  };

  const incrementManualCart = (itemId: string) => {
    setManualCart((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
  };

  const manualCartTotal = useMemo(() => {
    return manualCart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
  }, [manualCart]);

  const calculateBill = (subtotal: number) => {
    const cgst = subtotal * (gstRate / 2);
    const sgst = subtotal * (gstRate / 2);
    const total = subtotal + cgst + sgst;
    return { subtotal, cgst, sgst, total };
  };

  const billBreakdown = useMemo(() => {
    return calculateBill(manualCartTotal);
  }, [manualCartTotal, gstRate]);

  const handleAddCustomizedToCart = (selection: {
    menuItemId: string;
    quantity: number;
    variantId?: string;
    modifierIds?: string[];
  }) => {
    if (!customizingItem) return;

    let price = parseFloat(customizingItem.price as any);

    if (selection.variantId) {
      const variant = customizingItem.variants?.find(
        (v) => v.id === selection.variantId,
      );
      if (variant) price = parseFloat(variant.price as any);
    }

    if (selection.modifierIds) {
      customizingItem.modifierGroups?.forEach((group) => {
        group.modifiers?.forEach((mod) => {
          if (selection.modifierIds!.includes(mod.id)) {
            price += parseFloat(mod.price as any);
          }
        });
      });
    }

    const isVeg = customizingItem.dietaryTags?.some((tag) => tag.toLowerCase() === "veg");

    const cartItem = {
      id: customizingItem.id,
      name: customizingItem.name,
      price,
      quantity: selection.quantity,
      variantId: selection.variantId,
      modifierIds: selection.modifierIds,
      isVeg,
    };

    if (customizationTarget === "addItems") {
      setAddItemsCart((prev) => [...prev, cartItem]);
    } else {
      setManualCart((prev) => [...prev, cartItem]);
    }

    setCustomizingItem(null);
  };

  const handleSave = () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    toast.success("Order saved!");
  };

  const handleSaveAndPrint = () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    toast.success("Order saved and sent to printer!");
  };

  const handleSendToKitchen = async () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    try {
      const orderTypeMap = {
        "dine-in": "DINE_IN",
        "takeaway": "TAKEAWAY",
        "delivery": "DELIVERY",
      };

      const paymentStatusMap = {
        "cash": "PAID",
        "card": "PAID", 
        "upi": "PAID",
        "due": "DUE",
      };

      const order = await createOrder.mutateAsync({
        tableId: orderMethod === "dine-in" ? selectedTableId : undefined,
        orderType: orderTypeMap[orderMethod] as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
        items: manualCart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          variantId: item.variantId,
          modifierIds: item.modifierIds,
        })),
        assignedWaiterId: selectedWaiterId || undefined,
        paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
        paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
      });

      toast.success(
       `Order ${paymentMethod !== 'due' ? 'placed and paid' : 'sent to kitchen'}! ${orderMethod === 'dine-in' ? `Table ${selectedTableId}` : ''} - ${manualCart.length} items`,
      );

      setManualCart([]);
      setSelectedTableId("1");
      setSelectedWaiterId(null);
      setPaymentMethod("due"); 
      setIsNewOrderOpen(false);
      setShowMobilePOS(false);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };


  
const handleCancelOrder = (order: Order) => {
  setOrderToCancel(order);
  setCancelReason("");
  setCancelDialogOpen(true);
};

const confirmCancelOrder = async () => {
  if (!orderToCancel || !cancelReason.trim()) {
    toast.error("Please provide a reason for cancellation");
    return;
  }

  try {
    await cancelWithReason.mutateAsync({
      orderId: orderToCancel.id,
      reason: cancelReason.trim(),
    });
    
    setCancelDialogOpen(false);
    setOrderToCancel(null);
    setCancelReason("");
    refetch();
  } catch (error) {
    // Error handled by mutation
  }
};

const getPaymentStatusColor = (paymentStatus?: string) => {
  switch (paymentStatus) {
    case "PAID":
      return "bg-green-100 text-green-700 border-green-200";
    case "PARTIALLY_PAID":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "DUE":
    default:
      return "bg-red-100 text-red-700 border-red-200";
  }
};

const getPaymentStatusIcon = (paymentStatus?: string) => {
  switch (paymentStatus) {
    case "PAID":
      return <CheckCircle2 className="w-3 h-3" />;
    case "PARTIALLY_PAID":
      return <DollarSign className="w-3 h-3" />;
    case "DUE":
    default:
      return <XCircle className="w-3 h-3" />;
  }
};

const handlePayment = async (order: Order, method: PaymentMethod) => {
  try {
    const totalAmount = parseFloat(order.totalAmount);
    const paid_amount = parseFloat(order.paid_amount || "0");
    const outstandingAmount = totalAmount - paid_amount;

    console.log("💳 Processing payment:");
    console.log("  Order ID:", order.id);
    console.log("  Total:", totalAmount.toFixed(2));
    console.log("  Already Paid:", paid_amount.toFixed(2));
    console.log("  Outstanding:", outstandingAmount.toFixed(2));
    console.log("  Payment Method:", method);

    // Update payment status - THIS RETURNS THE UPDATED ORDER
    const updatedOrder = await updatePaymentStatus.mutateAsync({
      orderId: order.id,
      paymentStatus: "PAID",
      paymentMethod: method,
    });

    console.log("✅ Payment updated!");
    console.log("  New paid_amount:", updatedOrder.paid_amount);
    console.log("  New paymentStatus:", updatedOrder.paymentStatus);

    // ✅ CRITICAL FIX: Update the selectedOrder state with fresh data
    setSelectedOrder(updatedOrder);

    toast.success(
      order.paymentStatus === "PARTIALLY_PAID"
        ? `Outstanding amount of ${currency}${outstandingAmount.toFixed(2)} paid via ${method}`
        : `Payment of ${currency}${totalAmount.toFixed(2)} received via ${method}`
    );

    // Refetch the orders list in the background
    refetch();
    
    // Don't close the dialog immediately - let user see the updated status
    // They can close it manually or it will update in real-time
    // If you want to close it:
    setTimeout(() => {
      setIsBillingOpen(false);
      setSelectedOrder(null);
    }, 1500);
    
  } catch (error: any) {
    console.error("❌ Payment error:", error);
    toast.error(error.message || "Failed to process payment");
  }
};


  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return "destructive";
      case "PREPARING":
        return "secondary";
      case "READY":
        return "default";
      case "SERVED":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTimeSince = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch {
      return "just now";
    }
  };

  const handleCloseMobilePOS = () => {
    setShowMobilePOS(false);
    setManualCart([]);
    setSelectedWaiterId(null);
    setSelectedTableId("1");
    setSearchQuery("");
    setIsSearchOpen(false);
    setActiveCategory(menuData?.categories?.[0]?.id || "");
  };

  const handleNewOrderClick = () => {
    if (isMobile) {
      setShowMobilePOS(true);
    } else {
      setIsNewOrderOpen(true);
    }
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Render mobile POS overlay when active
  if (showMobilePOS && isMobile) {
    return (
      <MobilePOS
        categories={menuData?.categories || []}
        menuItems={menuData?.items || []}
        activeCategory={activeCategory}
        orderItems={Object.fromEntries(
          manualCart.map((item) => [item.id, item.quantity])
        )}
        tableNumber={selectedTableId}
        waiterName={selectedWaiterId}
        diningType={orderMethod}
        paymentMethod={paymentMethod}
        onCategoryChange={setActiveCategory}
        onAddItem={addToManualCart}
        onRemoveItem={removeFromManualCart}
        onIncrement={incrementManualCart}
        onTableChange={setSelectedTableId}
        onWaiterChange={(value: string) => setSelectedWaiterId(value === "none" ? null : value)}
        onDiningTypeChange={setOrderMethod}
        onPaymentMethodChange={setPaymentMethod}
        onSendToKitchen={handleSendToKitchen}
        onSave={handleSave}
        onSaveAndPrint={handleSaveAndPrint}
        onClose={handleCloseMobilePOS}
        currency={currency}
        gstRate={gstRate}
        tables={tables}
        staff={staff}
        isLoading={createOrder.isPending}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold">
            Live Orders
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor active orders and process payments.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isMobile ? (
            <Button 
              onClick={handleNewOrderClick}
              className="shadow-lg flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              <Utensils className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New Order</span>
            </Button>
          ) : (
            <Dialog
              open={isNewOrderOpen}
              onOpenChange={(open) => {
                if (!open && customizingItem) return;
                setIsNewOrderOpen(open);
                if (!open) {
                  setSelectedWaiterId(null);
                  setSelectedTableId("1");
                  setManualCart([]);
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button 
                  className="shadow-lg flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                >
                  <Utensils className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Order</span>
                </Button>
              </DialogTrigger>
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
                      onAddToCart={handleAddCustomizedToCart}
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
                                        onClick={() => {
                                          setCustomizationTarget("manual");
                                          addToManualCart(item);
                                        }}
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 text-white h-8 w-full rounded-md font-semibold"
                                      >
                                        <Plus className="size-4 mr-1" />
                                        Add
                                      </Button>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2 bg-primary/10 rounded-md border-2 border-primary/30 p-1">
                                        <Button
                                          onClick={() => removeFromManualCart(item.id)}
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
                                          onClick={() => incrementManualCart(item.id)}
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
                          <Button
                            onClick={handleSave}
                            variant="outline"
                            disabled={manualCart.length === 0}
                            size="sm"
                            className="hover:bg-gray-100 text-[11px] sm:text-xs h-8 sm:h-9"
                          >
                            <Save className="size-3 sm:size-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Save</span>
                          </Button>
                          <Button
                            onClick={handleSaveAndPrint}
                            variant="outline"
                            disabled={manualCart.length === 0}
                            size="sm"
                            className="hover:bg-gray-100 text-[11px] sm:text-xs h-8 sm:h-9"
                          >
                            <Printer className="size-3 sm:size-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Print</span>
                          </Button>
                          <Button
                            onClick={handleSendToKitchen}
                            disabled={manualCart.length === 0 || createOrder.isPending}
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

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-gray-600 font-medium flex items-center gap-1">
                              <UtensilsCrossed className="size-3" />
                              Table
                            </Label>
                            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
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
                              onValueChange={(value) =>
                                setSelectedWaiterId(value === "none" ? null : value)
                              }
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
                              onValueChange={(value: any) => setOrderMethod(value)}
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
                                const menuItem = menuData?.items?.find(
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
                                            onClick={() => removeFromManualCart(item.id)}
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
                                            onClick={() => incrementManualCart(item.id)}
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
                              {currency}{billBreakdown.subtotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px] md:text-[10px]">
                            <span className="text-gray-600">CGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                            <span className="text-gray-900 font-semibold">
                              {currency}{billBreakdown.cgst.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px] md:text-[10px]">
                            <span className="text-gray-600">SGST ({(gstRate * 100 / 2).toFixed(1)}%)</span>
                            <span className="text-gray-900 font-semibold">
                              {currency}{billBreakdown.sgst.toFixed(2)}
                            </span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="font-bold text-gray-900 text-[11px] md:text-xs">Total</span>
                            <span className="font-bold text-base md:text-lg text-primary">
                              {currency}{billBreakdown.total.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="px-2 md:p-3 border-b border-gray-200">
                          <Label className="text-[9px] md:text-[10px] text-gray-600 mb-1 md:mb-1.5 block font-medium">Payment</Label>
                          <div className="flex gap-1 md:gap-1.5">
                            <Button
                              onClick={() => setPaymentMethod("cash")}
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
                              onClick={() => setPaymentMethod("card")}
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
                              onClick={() => setPaymentMethod("upi")}
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
                              onClick={() => setPaymentMethod("due")}
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
          </Dialog>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" /> Active Orders
              <Badge variant="outline" className="ml-2">
                {pagination?.total ?? activeOrders.length}
              </Badge>
            </h3>

            {/* Pagination Controls */}
            {/* {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={!hasPrevPage}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage}
                  className="h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )} */}
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl">
              <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">
                No active orders
              </p>
              <p className="text-sm text-muted-foreground">
                Orders will appear here when customers place them
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order: Order) => {
                const tableOrdersForBilling = order.tableId
                  ? (orders || []).filter(
                      (o: Order) =>
                        o.tableId === order.tableId && o.status === "SERVED",
                    )
                  : [order];

                const combinedSubtotal = tableOrdersForBilling.reduce(
                  (sum, o) => sum + parseFloat(o.subtotalAmount),
                  0,
                );
                const combinedGst = tableOrdersForBilling.reduce(
                  (sum, o) => sum + parseFloat(o.gstAmount),
                  0,
                );
                const combinedService = tableOrdersForBilling.reduce(
                  (sum, o) => sum + parseFloat(o.serviceTaxAmount),
                  0,
                );
                const combinedTotal = tableOrdersForBilling.reduce(
                  (sum, o) => sum + parseFloat(o.totalAmount),
                  0,
                );

                return (
                 <Card
                    key={order.id}
                    className="overflow-hidden border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4">
                        {/* Header Section */}
                        <div className="space-y-2">     
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg sm:text-xl font-bold font-heading">
                              {order.table?.tableNumber
                                ? `Table ${order.table.tableNumber}`
                                : order.guestName ||
                                  `Order #${order.id.slice(-6)}`}
                            </span>
                            <Badge
                              variant={getStatusColor(order.status)}
                              className="capitalize text-xs px-2 py-1"
                            >
                              {order.status.toLowerCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-1"
                            >
                              {order.orderType}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs px-2 py-1 flex items-center gap-1",
                                getPaymentStatusColor(order.paymentStatus)
                              )}
                            >
                              {getPaymentStatusIcon(order.paymentStatus)}
                              {order.paymentStatus || "DUE"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
                              {getTimeSince(order.createdAt)}
                            </p>
                            {order.placedByStaff && (
                              <p className="text-xs sm:text-sm text-blue-600 flex items-center gap-1.5 font-medium">
                                <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
                                {order.placedByStaff.fullName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-2">
                          {order.items?.slice(0, 3).map((item, i) => {
                            const customizationSummary = getCustomizationSummary(item);
                            return (
                              <div
                                key={i}
                                className="text-xs bg-muted/60 px-2.5 py-1.5 rounded-md border"
                              >
                                <div className="font-medium">
                                  {item.quantity}x {item.itemName}
                                </div>
                                {customizationSummary && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {customizationSummary}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {(order.items?.length ?? 0) > 3 && (
                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-md inline-block">
                              +{(order.items?.length ?? 0) - 3} more
                            </span>
                          )}
                        </div>

                        {/* Footer Section - Total and Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
                          {/* Total */}
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-0.5">
                              Total
                            </p>
                            <p className="text-xl sm:text-2xl font-bold font-heading text-primary">
                              {currency}
                              {parseFloat(order.totalAmount).toFixed(2)}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {order.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStatus.mutate({
                                    orderId: order.id,
                                    status: "PREPARING",
                                  })
                                }
                                disabled={updateStatus.isPending}
                                className="flex-1 sm:flex-initial"
                              >
                                Start
                              </Button>
                            )}

                            {order.status === "PREPARING" && (
                              <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() =>
                                  updateStatus.mutate({
                                    orderId: order.id,
                                    status: "READY",
                                  })
                                } 
                              disabled={updateStatus.isPending}
                              className="flex-1 sm:flex-initial"
                              >
                                Preparing...
                              </Button>
                            )}

                            {order.status === "READY" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() =>
                                  updateStatus.mutate({
                                    orderId: order.id,
                                    status: "SERVED",
                                  })
                                }
                                disabled={updateStatus.isPending}
                                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial"
                              >
                                <span className="hidden sm:inline">Mark as Delivered</span>
                                <span className="sm:hidden">Delivered</span>
                              </Button>
                            )}

                            {order.paymentStatus !== "PAID" && 
                              order.status !== "CANCELLED" && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsBillingOpen(true);
                                  }}
                                  className="bg-primary hover:bg-primary/90 flex-1 sm:flex-initial"
                                >
                                  <Receipt className="w-4 h-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Bill</span>
                                </Button>
                              )}

                            {order.paymentStatus === "PAID" && order.status !== "CANCELLED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsBillingOpen(true);
                                }}
                                className="border-green-500 text-green-600 hover:bg-green-50 flex-1 sm:flex-initial"
                              >
                                <Receipt className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">View Bill</span>
                                <span className="sm:hidden">Bill</span>
                              </Button>
                            )}


                            {order.status === "SERVED" && 
                              order.paymentStatus === "PAID" && 
                              !order.isClosed &&
                               (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (window.confirm(
                                      `Close this order? Future orders for ${order.table?.tableNumber ? `Table ${order.table.tableNumber}` : 'this guest'} will start a new session.`
                                    )) {
                                      closeOrder.mutate(order.id);
                                    }
                                  }}
                                  disabled={closeOrder.isPending}
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-initial"
                                >
                                  {closeOrder.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 sm:mr-1 animate-spin" />
                                      <span className="hidden sm:inline">Closing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 sm:mr-1" />
                                      <span className="hidden sm:inline">Close Order</span>
                                      <span className="sm:hidden">Close</span>
                                    </>
                                  )}
                                </Button>
                              )}


                            {order.status !== "CANCELLED" && order.status !== "SERVED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelOrder(order)}
                                disabled={cancelWithReason.isPending}
                                className="border-red-500 text-red-600 hover:bg-red-50 flex-1 sm:flex-initial"
                              >
                                <XCircle className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline">Cancel</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}


          {/* Billing Dialog */}
              {/* Billing Dialog */}
<Dialog open={isBillingOpen} onOpenChange={setIsBillingOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Bill Details</DialogTitle>
      <DialogDescription>
        {selectedOrder && (
          <span className="block mt-2 font-semibold text-base">
            {selectedOrder.table?.tableNumber
              ? `Table ${selectedOrder.table.tableNumber}`
              : selectedOrder.guestName || `Order #${selectedOrder.id.slice(-6)}`}
          </span>
        )}
      </DialogDescription>
    </DialogHeader>

    {selectedOrder && (
      <div className="space-y-4">
        {/* Order Items */}
        <div className="max-h-[200px] overflow-y-auto">
          <h4 className="font-semibold text-sm mb-2">Items</h4>
          <div className="space-y-1.5">
            {selectedOrder.items?.map((item, i) => {
              const customizationSummary = getCustomizationSummary(item);
              return (
                <div
                  key={i}
                  className="flex justify-between items-start text-xs bg-muted/60 px-2.5 py-1.5 rounded-md border"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.quantity}x {item.itemName}
                    </div>
                    {customizationSummary && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {customizationSummary}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold ml-2">
                    {currency}{parseFloat(item.totalPrice).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Bill Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">
              {currency}{parseFloat(selectedOrder.subtotalAmount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              CGST ({(gstRate * 100 / 2).toFixed(1)}%)
            </span>
            <span className="font-medium">
              {currency}{(parseFloat(selectedOrder.gstAmount) / 2).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              SGST ({(gstRate * 100 / 2).toFixed(1)}%)
            </span>
            <span className="font-medium">
              {currency}{(parseFloat(selectedOrder.gstAmount) / 2).toFixed(2)}
            </span>
          </div>
          {selectedOrder.serviceTaxAmount && parseFloat(selectedOrder.serviceTaxAmount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service Tax</span>
              <span className="font-medium">
                {currency}{parseFloat(selectedOrder.serviceTaxAmount).toFixed(2)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary text-xl">
              {currency}{parseFloat(selectedOrder.totalAmount).toFixed(2)}
            </span>
          </div>

          {/* Show amount already paid for PARTIALLY_PAID orders */}
          {selectedOrder.paymentStatus === "PARTIALLY_PAID" && (
            <>
              <div className="flex justify-between text-sm text-green-600">
                <span>Already Paid</span>
                <span className="font-medium">
                  - {currency}{parseFloat(selectedOrder.paid_amount || "0").toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-orange-600">
                <span>Outstanding Amount</span>
                <span>
                  {currency}
                  {(
                    parseFloat(selectedOrder.totalAmount) -
                    parseFloat(selectedOrder.paid_amount || "0")
                  ).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Payment Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">Payment Status</span>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1.5",
              getPaymentStatusColor(selectedOrder.paymentStatus)
            )}
          >
            {getPaymentStatusIcon(selectedOrder.paymentStatus)}
            {selectedOrder.paymentStatus || "DUE"}
          </Badge>
        </div>

        {/* Payment Buttons - Show if not fully paid */}
        {selectedOrder.paymentStatus !== "PAID" && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-3">
                {selectedOrder.paymentStatus === "PARTIALLY_PAID" 
                  ? "Pay Outstanding Amount"
                  : "Accept Payment"}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handlePayment(selectedOrder, "CASH")}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  disabled={updatePaymentStatus.isPending}
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xs">Cash</span>
                </Button>
                <Button
                  onClick={() => handlePayment(selectedOrder, "CARD")}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  disabled={updatePaymentStatus.isPending}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Card</span>
                </Button>
                <Button
                  onClick={() => handlePayment(selectedOrder, "UPI")}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  disabled={updatePaymentStatus.isPending}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs">UPI</span>
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Print Button (always shown) */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            toast.success("Print functionality will be implemented soon!");
          }}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Bill
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>

          {/* Bottom Pagination - Duplicate for convenience */}
          {totalPages > 1 && activeOrders.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
                className="h-8"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasNextPage}
                className="h-8"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Recent Bills
            </h3>
            <Badge variant="secondary">{transactions?.data?.length || 0}</Badge>
          </div>

          <div className="space-y-3">
            {transactions.data && transactions.data.length > 0 ? (
              transactions.data.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-3 rounded-lg border border-border bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm">
                      {transaction.billNumber}
                    </p>
                    <div className="flex gap-1">
                      {transaction.orderType && (
                        <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">
                          {transaction.orderType}
                        </Badge>
                      )}
                      <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200">
                        {transaction.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                        {transaction.tableNumber
                          ? `Table ${transaction.tableNumber}`
                          : transaction.guestName || "Guest"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(transaction.paidAt).toLocaleTimeString()}
                      </p>
                      {transaction.staffName && (
                        <p className="text-[9px] text-blue-600 mt-0.5">
                          👤 {transaction.staffName}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-primary font-mono text-sm">
                      {currency}
                      {parseFloat(transaction.grandTotal).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm italic border border-dashed rounded-lg">
                {transactions.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "No bills generated yet"
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToCancel && (
                <span className="block mb-2 font-semibold">
                  {orderToCancel.table?.tableNumber
                    ? `Table ${orderToCancel.table.tableNumber}`
                    : orderToCancel.guestName || `Order #${orderToCancel.id.slice(-6)}`}
                </span>
              )}
              Please provide a reason for cancelling this order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="cancel-reason" className="text-sm font-medium mb-2 block">
              Cancellation Reason *
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="E.g., Customer changed mind, wrong order, kitchen unavailable..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 3 characters required
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelWithReason.isPending}>
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelOrder}
              disabled={!cancelReason.trim() || cancelReason.trim().length < 3 || cancelWithReason.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelWithReason.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Order"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>   
    </DashboardLayout>
  );
}