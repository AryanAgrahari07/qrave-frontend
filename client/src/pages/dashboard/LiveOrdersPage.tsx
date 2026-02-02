import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  Utensils,
  ArrowRight,
  UserPlus,
  Users as UsersIcon,
  Check,
  Receipt,
  CreditCard,
  QrCode,
  Plus,
  Minus,
  Trash2,
  Loader2,
  RefreshCw,
  Printer,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useMemo, Fragment } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Utensils as DineInIcon, Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useOrders,
  useUpdateOrderStatus,
  useCancelOrder,
  useCreateOrder,
  useRestaurant,
  useMenuCategories,
  useTables,
  useTransactions,
  useAddOrderItems,
  useStaff,
} from "@/hooks/api";
import { api } from "@/lib/api";
import type { Order, MenuItem, Table, OrderStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import {
  CustomizedOrderItemDisplay,
  getCustomizationSummary,
} from "@/components/menu/Customizedorderitemdisplay";
import { ItemCustomizationDialog } from "@/components/menu/Itemcustomizationdialog";
import { ItemCustomizationContent } from "@/components/menu/ItemcustomizationContent";

export default function LiveOrdersPage() {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const {
    data: orders,
    isLoading,
    refetch,
  } = useOrders(restaurantId, { limit: 100 });
  const { data: menuData } = useMenuCategories(
    restaurantId,
    restaurant?.slug ?? null,
  );
  const { data: tables } = useTables(restaurantId);
  const { data: transactions } = useTransactions(restaurantId, { limit: 10 });
  const { data: staff } = useStaff(restaurantId);

  const updateStatus = useUpdateOrderStatus(restaurantId);
  const cancelOrder = useCancelOrder(restaurantId);
  const createOrder = useCreateOrder(restaurantId);
  const addOrderItems = useAddOrderItems(restaurantId);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderMethod, setOrderMethod] = useState<string>("DINE_IN");
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isQuickBillOpen, setIsQuickBillOpen] = useState(false);
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [manualCart, setManualCart] = useState<
    {
      id: string;
      name: string;
      price: number;
      quantity: number;
      variantId?: string;
      modifierIds?: string[];
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
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [dietaryFilter, setDietaryFilter] = useState<"any" | "veg" | "non-veg">(
    "any",
  );
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizationTarget, setCustomizationTarget] = useState<
    "manual" | "addItems"
  >("manual");
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);


  // Filter active orders (not paid/cancelled)
  const activeOrders = useMemo(() => {
    return (orders || []).filter(
      (o: Order) =>
        o.status === "PENDING" ||
        o.status === "PREPARING" ||
        o.status === "READY" ||
        o.status === "SERVED",
    );
  }, [orders]);

  const currency = restaurant?.currency || "₹";
  const gstRate = parseFloat(restaurant?.taxRateGst || "5") / 100;
  const serviceRate = parseFloat(restaurant?.taxRateService || "10") / 100;

  // Filter menu items by dietary type
  const filteredMenuItems = useMemo(() => {
    if (!menuData?.items) return [];
    if (dietaryFilter === "any") return menuData.items;
    if (dietaryFilter === "veg") {
      return menuData.items.filter((item: MenuItem) =>
        item.dietaryTags?.some((tag) => tag.toLowerCase() === "veg"),
      );
    }
    if (dietaryFilter === "non-veg") {
      return menuData.items.filter((item: MenuItem) =>
        item.dietaryTags?.some((tag) => tag.toLowerCase() === "non-veg"),
      );
    }
    return menuData.items;
  }, [menuData, dietaryFilter]);

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
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
          },
        ];
      });
    }
  };

  const removeFromManualCart = (index: number) => {
    setManualCart((prev) => {
      const item = prev[index];
      if (item.quantity > 1) {
        return prev.map((i, idx) =>
          idx === index ? { ...i, quantity: i.quantity - 1 } : i,
        );
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const addToAddItemsCart = (item: MenuItem) => {
    setAddItemsCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { id: item.id, name: item.name, price: item.price, quantity: 1 },
      ];
    });
  };

  const removeFromAddItemsCart = (index: number) => {
    setAddItemsCart((prev) => {
      const item = prev[index];
      if (item.quantity > 1) {
        return prev.map((i, idx) =>
          idx === index ? { ...i, quantity: i.quantity - 1 } : i,
        );
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleAddItemsToOrder = async (orderId: string) => {
    if (addItemsCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    try {
      await addOrderItems.mutateAsync({
        orderId,
        items: addItemsCart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
      });

      setAddItemsCart([]);
      setIsAddItemsOpen(false);
      setSelectedOrder(null);
      toast.success("Items added to order! Kitchen will prepare them.");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const manualCartTotal = useMemo(() => {
    return manualCart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
  }, [manualCart]);

  const calculateBill = (subtotal: number) => {
    const gst = subtotal * gstRate;
    const serviceTax = subtotal * serviceRate;
    const total = subtotal + gst + serviceTax;
    return { subtotal, gst, serviceTax, total };
  };

  const handlePayment = async (order: Order, method: string) => {
    try {
      // Group all SERVED orders for the same table
      let ordersToBill: Order[] = [order];

      if (order.tableId) {
        // Find all other SERVED orders for the same table
        const tableOrders = (orders || []).filter(
          (o: Order) =>
            o.tableId === order.tableId &&
            o.status === "SERVED" &&
            o.id !== order.id,
        );
        ordersToBill = [order, ...tableOrders];
      }

      // Calculate combined totals
      const combinedSubtotal = ordersToBill.reduce(
        (sum, o) => sum + parseFloat(o.subtotalAmount),
        0,
      );
      const combinedGst = ordersToBill.reduce(
        (sum, o) => sum + parseFloat(o.gstAmount),
        0,
      );
      const combinedService = ordersToBill.reduce(
        (sum, o) => sum + parseFloat(o.serviceTaxAmount),
        0,
      );
      const combinedTotal = ordersToBill.reduce(
        (sum, o) => sum + parseFloat(o.totalAmount),
        0,
      );

      // Mark all orders as PAID
      for (const ord of ordersToBill) {
        await updateStatus.mutateAsync({ orderId: ord.id, status: "PAID" });
      }

      // Create a single transaction for all orders (using combined totals)
      const billNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create transaction with combined totals (using primary order ID)
      await api.post(`/api/restaurants/${restaurantId}/transactions`, {
        orderId: order.id, // Primary order ID
        billNumber,
        paymentMethod: method,
        combinedSubtotal: combinedSubtotal,
        combinedGst: combinedGst,
        combinedService: combinedService,
        combinedTotal: combinedTotal,
      });

      toast.success(
        ordersToBill.length > 1
          ? `Payment of ${currency}${combinedTotal.toFixed(2)} received for ${ordersToBill.length} orders via ${method}`
          : `Payment of ${currency}${combinedTotal.toFixed(2)} received via ${method}`,
      );

      // Refetch orders to update the list
      refetch();

      setSelectedOrder(null);
      setIsBillingOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to process payment");
    }
  };

  const handleAddCustomizedToCart = (selection: {
    menuItemId: string;
    quantity: number;
    variantId?: string;
    modifierIds?: string[];
  }) => {
    if (!customizingItem) return;

    // Calculate price with customization
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

    const cartItem = {
      id: customizingItem.id,
      name: customizingItem.name,
      price,
      quantity: selection.quantity,
      variantId: selection.variantId,
      modifierIds: selection.modifierIds,
    };

    // Add to the appropriate cart based on target
    if (customizationTarget === "addItems") {
      setAddItemsCart((prev) => [...prev, cartItem]);
    } else {
      setManualCart((prev) => [...prev, cartItem]);
    }

    setCustomizingItem(null);
  };

  const handleCreateNewOrder = async () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        tableId: selectedTableId || undefined,
        orderType: orderMethod as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
        items: manualCart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          variantId: item.variantId, // Include customization
          modifierIds: item.modifierIds, // Include customization
        })),
        assignedWaiterId: selectedWaiterId || undefined,
      });

      toast.success(
        `New order created! It will appear in the kitchen display.`,
      );

      setManualCart([]);
      setSelectedTableId(null);
      setSelectedWaiterId(null);
      setIsNewOrderOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCreateQuickBill = async (paymentMethod: string) => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the bill");
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        tableId: selectedTableId || undefined,
        orderType: orderMethod as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
        items: manualCart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
        assignedWaiterId: selectedWaiterId || undefined,
      });

      // Immediately mark as paid and create transaction
      await updateStatus.mutateAsync({ orderId: order.id, status: "PAID" });

      // Create transaction
      const billNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      await api.post(`/api/restaurants/${restaurantId}/transactions`, {
        orderId: order.id,
        billNumber,
        paymentMethod,
      });

      const billDetails = calculateBill(manualCartTotal);
      toast.success(
        `Quick bill created and paid: ${currency}${billDetails.total.toFixed(2)} via ${paymentMethod}`,
      );

      // Refetch orders and transactions
      refetch();

      setManualCart([]);
      setSelectedTableId(null);
      setSelectedWaiterId(null);
      setIsQuickBillOpen(false);
    } catch (error) {
      // Error handled by mutation
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
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
          <Dialog
            open={isNewOrderOpen}
            onOpenChange={(open) => {
              if (!open && customizingItem) return;

              setIsNewOrderOpen(open);
              if (!open) {
                setSelectedWaiterId(null);
                setSelectedTableId(null);
                setManualCart([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="shadow-lg flex-1 sm:flex-none"
              >
                <Utensils className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Order</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onInteractOutside={(e) => {
              if (customizingItem) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (customizingItem) e.preventDefault();
            }}
            >
              {customizingItem ? (
                <ItemCustomizationContent
                  menuItem={customizingItem}
                  currency={currency}
                  onClose={() => setCustomizingItem(null)}
                  onAddToCart={handleAddCustomizedToCart}
                />
              ) : (
                <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                  <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  New Order (Kitchen)
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new order that will be sent to the kitchen for
                  preparation.
                </DialogDescription>
              </DialogHeader>
                </>
              )}

              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4">
                {/* Left: Menu Selection */}
                <div className="flex flex-col gap-3 sm:gap-4 overflow-hidden md:border-r md:pr-6">
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">
                      1. Select Food Items
                    </Label>
                    {/* Dietary Filter */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDietaryFilter("any")}
                        className={cn(
                          "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                          dietaryFilter === "any"
                            ? "bg-primary text-white shadow-md shadow-primary/30"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setDietaryFilter("veg")}
                        className={cn(
                          "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                          dietaryFilter === "veg"
                            ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Veg
                      </button>
                      <button
                        onClick={() => setDietaryFilter("non-veg")}
                        className={cn(
                          "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                          dietaryFilter === "non-veg"
                            ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Non-Veg
                      </button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 max-h-[calc(100vh-32rem)]">
                    <div className="space-y-4 sm:space-y-6 pr-2">
                      {menuData?.categories?.map((category) => {
                        const items =
                          filteredMenuItems.filter(
                            (i: MenuItem) =>
                              i.categoryId === category.id && i.isAvailable,
                          ) || [];
                        if (items.length === 0) return null;

                        return (
                          <div key={category.id} className="space-y-2">
                            <h4 className="text-sm font-bold border-b pb-1">
                              {category.name}
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              {items.map((item: MenuItem) => {
                                const hasCustomizationOptions =
                                  (item.variants && item.variants.length > 0) ||
                                  (item.modifierGroups &&
                                    item.modifierGroups.length > 0);
                                const vegTag = item.dietaryTags?.some(
                                  (tag) => tag.toLowerCase() === "veg",
                                );
                                const nonVegTag = item.dietaryTags?.some(
                                  (tag) => tag.toLowerCase() === "non-veg",
                                );

                                return (
                                  <Button
                                    key={item.id}
                                    variant="outline"
                                    className="justify-between h-auto py-2 px-2 sm:px-3 text-left hover:border-primary hover:bg-primary/5 group"
                                    onClick={() => {
                                      setCustomizationTarget("manual");
                                      addToManualCart(item);
                                    }}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs sm:text-sm">
                                          {item.name}
                                        </span>

                                        {/* Customization indicator */}
                                        {hasCustomizationOptions && (
                                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0 h-4">
                                            Customize
                                          </Badge>
                                        )}

                                        {/* Dietary badges */}
                                        {vegTag && (
                                          <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-1.5 py-0 h-4">
                                            Veg
                                          </Badge>
                                        )}
                                        {nonVegTag && (
                                          <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1.5 py-0 h-4">
                                            Non-Veg
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {currency}
                                        {item.price}
                                      </span>
                                    </div>
                                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {(!filteredMenuItems ||
                        filteredMenuItems.length === 0) && (
                        <div className="text-center py-10 text-muted-foreground">
                          <p className="text-sm">No menu items available</p>
                          <p className="text-xs">Add items in Menu Builder</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right: Cart & Submit */}
                <div className="flex flex-col gap-4 sm:gap-6 overflow-hidden">
                  <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">
                      2. Order Details
                    </Label>

                    {/* Table Selection */}
                    {orderMethod === "DINE_IN" &&
                      tables &&
                      tables.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {tables
                            .filter(
                              (t: Table) =>
                                t.currentStatus === "OCCUPIED" ||
                                t.currentStatus === "AVAILABLE",
                            )
                            .slice(0, 8)
                            .map((table: Table) => (
                              <Button
                                key={table.id}
                                variant={
                                  selectedTableId === table.id
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  setSelectedTableId(
                                    selectedTableId === table.id
                                      ? null
                                      : table.id,
                                  )
                                }
                              >
                                T{table.tableNumber}
                              </Button>
                            ))}
                        </div>
                      )}

                    {/* Waiter Selection */}
                    {staff &&
                      staff.filter(
                        (s: any) => s.role === "WAITER" && s.isActive,
                      ).length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">
                            Assign to Waiter (Optional)
                          </Label>
                          <Select
                            value={selectedWaiterId || "none"}
                            onValueChange={(value) =>
                              setSelectedWaiterId(
                                value === "none" ? null : value,
                              )
                            }
                          >
                            <SelectTrigger className="w-full text-xs sm:text-sm">
                              <SelectValue placeholder="Select a waiter (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                None (Unassigned)
                              </SelectItem>
                              {staff
                                .filter(
                                  (s: any) => s.role === "WAITER" && s.isActive,
                                )
                                .map((waiter: any) => (
                                  <SelectItem key={waiter.id} value={waiter.id}>
                                    {waiter.fullName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                    {/* Cart Items */}
                    <ScrollArea className="flex-1 border rounded-lg p-2 sm:p-3 bg-muted/20 max-h-[calc(100vh-40rem)]">
                      <div className="space-y-2 sm:space-y-3">
                        {manualCart.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-xs sm:text-sm italic">
                            No items added to order
                          </div>
                        ) : (
                          <>
                            {manualCart.map((item, idx) => {
                              // Find the original menu item for customization details
                              const menuItem = menuData?.items?.find(
                                (mi) => mi.id === item.id,
                              );
                              const selectedVariant = menuItem?.variants?.find(
                                (v) => v.id === item.variantId,
                              );
                              const selectedModifiers =
                                menuItem?.modifierGroups?.flatMap(
                                  (g) =>
                                    g.modifiers?.filter((m) =>
                                      item.modifierIds?.includes(m.id),
                                    ) || [],
                                ) || [];

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between group p-1.5 sm:p-2 rounded-lg hover:bg-muted/40 transition-colors"
                                >
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-xs sm:text-sm font-bold truncate">
                                      {item.name}
                                    </span>

                                    {selectedVariant && (
                                      <span className="text-[10px] text-blue-600 font-medium">
                                        {selectedVariant.variantName}
                                      </span>
                                    )}

                                    {selectedModifiers.length > 0 && (
                                      <span className="text-[10px] text-amber-600">
                                        +{" "}
                                        {selectedModifiers
                                          .map((m) => m.name)
                                          .join(", ")}
                                      </span>
                                    )}

                                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                                      {currency}
                                      {item.price} x {item.quantity} ={" "}
                                      {currency}
                                      {(item.price * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border hover:bg-destructive/10 hover:border-destructive"
                                      onClick={() => removeFromManualCart(idx)}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-xs sm:text-sm font-bold min-w-[20px] sm:min-w-[24px] text-center bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                      {item.quantity}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border hover:bg-primary/10 hover:border-primary"
                                      onClick={() =>
                                        setManualCart((prev) =>
                                          prev.map((i, index) =>
                                            index === idx
                                              ? {
                                                  ...i,
                                                  quantity: i.quantity + 1,
                                                }
                                              : i,
                                          ),
                                        )
                                      }
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Breakdown */}
                    <div className="bg-muted/30 p-2 sm:p-3 rounded-lg space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>
                          {currency}
                          {manualCartTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Taxes (GST {gstRate * 100}% + SC {serviceRate * 100}%)
                        </span>
                        <span>
                          {currency}
                          {(manualCartTotal * (gstRate + serviceRate)).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
                        <span>Total</span>
                        <span className="text-primary text-base sm:text-lg">
                          {currency}
                          {(
                            manualCartTotal *
                            (1 + gstRate + serviceRate)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Method & Submit */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">
                        3. Select Type & Create
                      </Label>
                      <RadioGroup
                        defaultValue="DINE_IN"
                        onValueChange={setOrderMethod}
                        className="grid grid-cols-3 gap-2"
                      >
                        <div>
                          <RadioGroupItem
                            value="DINE_IN"
                            id="new-dine-in"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="new-dine-in"
                            className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                          >
                            <DineInIcon className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-bold">
                              Dine-in
                            </span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="TAKEAWAY"
                            id="new-takeaway"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="new-takeaway"
                            className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                          >
                            <ShoppingBag className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-bold">
                              Takeaway
                            </span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="DELIVERY"
                            id="new-delivery"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="new-delivery"
                            className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                          >
                            <Truck className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-bold">
                              Delivery
                            </span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      className="w-full h-12 text-lg font-bold"
                      onClick={handleCreateNewOrder}
                      disabled={
                        createOrder.isPending || manualCart.length === 0
                      }
                    >
                      {createOrder.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Utensils className="w-4 h-4 mr-2" />
                      )}
                      Create Order (Send to Kitchen)
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={isQuickBillOpen}
            onOpenChange={(open) => {
              if (!open && customizingItem) return; 

              setIsQuickBillOpen(open);
              if (!open) {
                setSelectedWaiterId(null);
                setSelectedTableId(null);
                setManualCart([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                <Receipt className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Quick Bill</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" 
              onInteractOutside={(e) => {
                if (customizingItem) e.preventDefault();
              }}
              onEscapeKeyDown={(e) => {
                if (customizingItem) e.preventDefault();
            }}>

              {customizingItem ? (
                <ItemCustomizationContent
                  menuItem={customizingItem}
                  currency={currency}
                  onClose={() => setCustomizingItem(null)}
                  onAddToCart={handleAddCustomizedToCart}
                />
              ) : (
                <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  Quick Billing Terminal
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Add items, select method, and settle payment.
                </DialogDescription>
              </DialogHeader>
                </> )}
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4">
                {/* Left: Menu Selection */}
                <div className="flex flex-col gap-3 sm:gap-4 overflow-hidden md:border-r md:pr-6">
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">
                      1. Select Food Items
                    </Label>
                    {/* Dietary Filter */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDietaryFilter("any")}
                        className={cn(
                          "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                          dietaryFilter === "any"
                            ? "bg-primary text-white shadow-md shadow-primary/30"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setDietaryFilter("veg")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                          dietaryFilter === "veg"
                            ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Veg
                      </button>
                      <button
                        onClick={() => setDietaryFilter("non-veg")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                          dietaryFilter === "non-veg"
                            ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Non-Veg
                      </button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-6">
                      {menuData?.categories?.map((category) => {
                        const items =
                          filteredMenuItems.filter(
                            (i: MenuItem) =>
                              i.categoryId === category.id && i.isAvailable,
                          ) || [];
                        if (items.length === 0) return null;

                        return (
                          <div key={category.id} className="space-y-2">
                            <h4 className="text-sm font-bold border-b pb-1">
                              {category.name}
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              {items.map((item: MenuItem) => {
                                const hasCustomizationOptions =
                                  (item.variants && item.variants.length > 0) ||
                                  (item.modifierGroups &&
                                    item.modifierGroups.length > 0);
                                const vegTag = item.dietaryTags?.some(
                                  (tag) => tag.toLowerCase() === "veg",
                                );
                                const nonVegTag = item.dietaryTags?.some(
                                  (tag) => tag.toLowerCase() === "non-veg",
                                );
                                return (
                                  <Button
                                    key={item.id}
                                    variant="outline"
                                    className="justify-between h-auto py-2 px-2 sm:px-3 text-left hover:border-primary hover:bg-primary/5 group"
                                    onClick={() => addToManualCart(item)}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs sm:text-sm">
                                          {item.name}
                                        </span>

                                        {/* Customization indicator */}
                                        {hasCustomizationOptions && (
                                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0 h-4">
                                            Customize
                                          </Badge>
                                        )}

                                        {/* Dietary badges */}
                                        {vegTag && (
                                          <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-1.5 py-0 h-4">
                                            Veg
                                          </Badge>
                                        )}
                                        {nonVegTag && (
                                          <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1.5 py-0 h-4">
                                            Non-Veg
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {currency}
                                        {item.price}
                                      </span>
                                    </div>
                                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {(!filteredMenuItems ||
                        filteredMenuItems.length === 0) && (
                        <div className="text-center py-10 text-muted-foreground">
                          <p>No menu items available</p>
                          <p className="text-sm">Add items in Menu Builder</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right: Cart & Payment */}
                <div className="flex flex-col gap-6 overflow-hidden">
                  <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">
                      2. Bill Details
                    </Label>

                    {/* Table Selection */}
                    {orderMethod === "DINE_IN" &&
                      tables &&
                      tables.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {tables
                            .filter(
                              (t: Table) =>
                                t.currentStatus === "OCCUPIED" ||
                                t.currentStatus === "AVAILABLE",
                            )
                            .slice(0, 8)
                            .map((table: Table) => (
                              <Button
                                key={table.id}
                                variant={
                                  selectedTableId === table.id
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  setSelectedTableId(
                                    selectedTableId === table.id
                                      ? null
                                      : table.id,
                                  )
                                }
                              >
                                T{table.tableNumber}
                              </Button>
                            ))}
                        </div>
                      )}

                    {/* Waiter Selection */}
                    {staff &&
                      staff.filter(
                        (s: any) => s.role === "WAITER" && s.isActive,
                      ).length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">
                            Assign to Waiter (Optional)
                          </Label>
                          <Select
                            value={selectedWaiterId || "none"}
                            onValueChange={(value) =>
                              setSelectedWaiterId(
                                value === "none" ? null : value,
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a waiter (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                None (Unassigned)
                              </SelectItem>
                              {staff
                                .filter(
                                  (s: any) => s.role === "WAITER" && s.isActive,
                                )
                                .map((waiter: any) => (
                                  <SelectItem key={waiter.id} value={waiter.id}>
                                    {waiter.fullName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                    {/* Cart Items */}
                    <ScrollArea className="flex-1 border rounded-lg p-3 bg-muted/20">
                      <div className="space-y-3">
                        {manualCart.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-xs sm:text-sm italic">
                            No items added to order
                          </div>
                        ) : (
                          <>
                            {manualCart.map((item, idx) => {
                              // Find the original menu item for customization details
                              const menuItem = menuData?.items?.find(
                                (mi) => mi.id === item.id,
                              );
                              const selectedVariant = menuItem?.variants?.find(
                                (v) => v.id === item.variantId,
                              );
                              const selectedModifiers =
                                menuItem?.modifierGroups?.flatMap(
                                  (g) =>
                                    g.modifiers?.filter((m) =>
                                      item.modifierIds?.includes(m.id),
                                    ) || [],
                                ) || [];

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between group p-1.5 sm:p-2 rounded-lg hover:bg-muted/40 transition-colors"
                                >
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-xs sm:text-sm font-bold truncate">
                                      {item.name}
                                    </span>

                                    {selectedVariant && (
                                      <span className="text-[10px] text-blue-600 font-medium">
                                        {selectedVariant.variantName}
                                      </span>
                                    )}

                                    {selectedModifiers.length > 0 && (
                                      <span className="text-[10px] text-amber-600">
                                        +{" "}
                                        {selectedModifiers
                                          .map((m) => m.name)
                                          .join(", ")}
                                      </span>
                                    )}

                                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                                      {currency}
                                      {item.price} x {item.quantity} ={" "}
                                      {currency}
                                      {(item.price * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border hover:bg-destructive/10 hover:border-destructive"
                                      onClick={() => removeFromManualCart(idx)}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-xs sm:text-sm font-bold min-w-[20px] sm:min-w-[24px] text-center bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                      {item.quantity}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border hover:bg-primary/10 hover:border-primary"
                                      onClick={() =>
                                        setManualCart((prev) =>
                                          prev.map((i, index) =>
                                            index === idx
                                              ? {
                                                  ...i,
                                                  quantity: i.quantity + 1,
                                                }
                                              : i,
                                          ),
                                        )
                                      }
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Breakdown */}
                    <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>
                          {currency}
                          {manualCartTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Taxes (GST {gstRate * 100}% + SC {serviceRate * 100}%)
                        </span>
                        <span>
                          {currency}
                          {(manualCartTotal * (gstRate + serviceRate)).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-2 mt-2">
                        <span>Total Payable</span>
                        <span className="text-primary text-lg">
                          {currency}
                          {(
                            manualCartTotal *
                            (1 + gstRate + serviceRate)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Method & Payment */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">
                        3. Select Type & Settle
                      </Label>
                      <RadioGroup
                        defaultValue="DINE_IN"
                        onValueChange={setOrderMethod}
                        className="grid grid-cols-3 gap-2"
                      >
                        <div>
                          <RadioGroupItem
                            value="DINE_IN"
                            id="quick-dine-in"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="quick-dine-in"
                            className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                          >
                            <DineInIcon className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-bold">
                              Dine-in
                            </span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="TAKEAWAY"
                            id="quick-takeaway"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="quick-takeaway"
                            className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                          >
                            <ShoppingBag className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-bold">
                              Takeaway
                            </span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="DELIVERY"
                            id="quick-delivery"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="quick-delivery"
                            className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                          >
                            <Truck className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-bold">
                              Delivery
                            </span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5 rounded-xl border-2"
                        onClick={() => handleCreateQuickBill("CASH")}
                        disabled={
                          createOrder.isPending || manualCart.length === 0
                        }
                      >
                        <CreditCard className="w-4 h-4 text-green-600" />
                        <div className="text-[10px] font-bold">CASH</div>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5 rounded-xl border-2"
                        onClick={() => handleCreateQuickBill("UPI")}
                        disabled={
                          createOrder.isPending || manualCart.length === 0
                        }
                      >
                        <QrCode className="w-4 h-4 text-blue-600" />
                        <div className="text-[10px] font-bold">UPI</div>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5 rounded-xl border-2"
                        onClick={() => handleCreateQuickBill("CARD")}
                        disabled={
                          createOrder.isPending || manualCart.length === 0
                        }
                      >
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        <div className="text-[10px] font-bold">CARD</div>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <h3 className="font-heading font-bold text-xl flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" /> Active Orders
            <Badge variant="outline" className="ml-2">
              {activeOrders.length}
            </Badge>
          </h3>

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
                // Get all SERVED orders for this table (for billing)
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
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xl font-bold font-heading">
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
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />{" "}
                              {getTimeSince(order.createdAt)}
                            </p>
                            {order.placedByStaff && (
                              <p className="text-sm text-blue-600 flex items-center gap-1.5 font-medium">
                                <UserPlus className="w-3.5 h-3.5" />{" "}
                                {order.placedByStaff.fullName}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 md:px-6">
                          <div className="space-y-2">
                            {order.items?.slice(0, 3).map((item, i) => {
                              const customizationSummary =
                                getCustomizationSummary(item);
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
                              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-md">
                                +{(order.items?.length ?? 0) - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right mr-2">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter mb-1">
                              Total
                            </p>
                            <p className="text-xl font-bold font-heading text-primary">
                              {currency}
                              {parseFloat(order.totalAmount).toFixed(2)}
                            </p>
                          </div>

                          {/* Status Actions */}
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
                            >
                              Start
                            </Button>
                          )}
                          {order.status === "PREPARING" && (
                            <Button size="sm" variant="outline" disabled>
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
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark as Delivered
                            </Button>
                          )}
                          {order.status === "SERVED" && (
                            <Fragment>
                              <Dialog
                                open={
                                  isAddItemsOpen &&
                                  selectedOrder?.id === order.id
                                }
                                onOpenChange={(open) => {
                                  setIsAddItemsOpen(open);
                                  if (!open) {
                                    setSelectedOrder(null);
                                    setAddItemsCart([]);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setIsAddItemsOpen(true);
                                    }}
                                  >
                                    <Plus className="w-4 h-4 mr-2" /> Add More
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-2xl">
                                      <Plus className="w-6 h-6 text-primary" />
                                      Add More Items -{" "}
                                      {order.table?.tableNumber
                                        ? `Table ${order.table.tableNumber}`
                                        : order.guestName}
                                    </DialogTitle>
                                    <DialogDescription>
                                      Add more items to this order. They will
                                      appear in kitchen as a new order but be
                                      billed together.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="flex-1 overflow-hidden grid md:grid-cols-2 gap-6 py-4">
                                    {/* Left: Menu Selection */}
                                    <div className="flex flex-col gap-4 overflow-hidden border-r pr-6">
                                      <div className="space-y-3">
                                        <Label className="text-xs uppercase font-bold text-muted-foreground">
                                          Select Items
                                        </Label>
                                        {/* Dietary Filter */}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() =>
                                              setDietaryFilter("any")
                                            }
                                            className={cn(
                                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                                              dietaryFilter === "any"
                                                ? "bg-primary text-white shadow-md shadow-primary/30"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted",
                                            )}
                                          >
                                            All
                                          </button>
                                          <button
                                            onClick={() =>
                                              setDietaryFilter("veg")
                                            }
                                            className={cn(
                                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                                              dietaryFilter === "veg"
                                                ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted",
                                            )}
                                          >
                                            Veg
                                          </button>
                                          <button
                                            onClick={() =>
                                              setDietaryFilter("non-veg")
                                            }
                                            className={cn(
                                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                                              dietaryFilter === "non-veg"
                                                ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted",
                                            )}
                                          >
                                            Non-Veg
                                          </button>
                                        </div>
                                      </div>
                                      <ScrollArea className="flex-1">
                                        <div className="space-y-6">
                                          {menuData?.categories?.map(
                                            (category) => {
                                              const items =
                                                filteredMenuItems.filter(
                                                  (i: MenuItem) =>
                                                    i.categoryId ===
                                                      category.id &&
                                                    i.isAvailable,
                                                ) || [];
                                              if (items.length === 0)
                                                return null;

                                              return (
                                                <div
                                                  key={category.id}
                                                  className="space-y-2"
                                                >
                                                  <h4 className="text-sm font-bold border-b pb-1">
                                                    {category.name}
                                                  </h4>
                                                  <div className="grid grid-cols-1 gap-2">
                                                    {items.map(
                                                      (item: MenuItem) => {
                                                        const hasCustomizationOptions =
                                                          (item.variants &&
                                                            item.variants
                                                              .length > 0) ||
                                                          (item.modifierGroups &&
                                                            item.modifierGroups
                                                              .length > 0);
                                                        const vegTag =
                                                          item.dietaryTags?.some(
                                                            (tag) =>
                                                              tag.toLowerCase() ===
                                                              "veg",
                                                          );
                                                        const nonVegTag =
                                                          item.dietaryTags?.some(
                                                            (tag) =>
                                                              tag.toLowerCase() ===
                                                              "non-veg",
                                                          );
                                                        return (
                                                          <Button
                                                            key={item.id}
                                                            variant="outline"
                                                            className="justify-between h-auto py-2 px-2 sm:px-3 text-left hover:border-primary hover:bg-primary/5 group"
                                                            onClick={() => {
                                                              // Use the same logic as manual cart for customization
                                                              setCustomizationTarget(
                                                                "addItems",
                                                              );
                                                              const hasCustomizationOptions =
                                                                (item.variants &&
                                                                  item.variants
                                                                    .length >
                                                                    0) ||
                                                                (item.modifierGroups &&
                                                                  item
                                                                    .modifierGroups
                                                                    .length >
                                                                    0);

                                                              if (
                                                                hasCustomizationOptions
                                                              ) {
                                                                setCustomizingItem(
                                                                  item,
                                                                );
                                                              } else {
                                                                addToAddItemsCart(
                                                                  item,
                                                                );
                                                              }
                                                            }}
                                                          >
                                                            <div className="flex flex-col gap-1">
                                                              <div className="flex items-center gap-2">
                                                                <span className="font-bold text-xs sm:text-sm">
                                                                  {item.name}
                                                                </span>

                                                                {/* Customization indicator */}
                                                                {hasCustomizationOptions && (
                                                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0 h-4">
                                                                    Customize
                                                                  </Badge>
                                                                )}

                                                                {/* Dietary badges */}
                                                                {vegTag && (
                                                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-1.5 py-0 h-4">
                                                                    Veg
                                                                  </Badge>
                                                                )}
                                                                {nonVegTag && (
                                                                  <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1.5 py-0 h-4">
                                                                    Non-Veg
                                                                  </Badge>
                                                                )}
                                                              </div>
                                                              <span className="text-xs text-muted-foreground">
                                                                {currency}
                                                                {item.price}
                                                              </span>
                                                            </div>
                                                            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                          </Button>
                                                        );
                                                      },
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            },
                                          )}
                                        </div>
                                      </ScrollArea>
                                    </div>

                                    {/* Right: Cart */}
                                    <div className="flex flex-col gap-6 overflow-hidden">
                                      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                                        <Label className="text-xs uppercase font-bold text-muted-foreground">
                                          Items to Add
                                        </Label>

                                        <ScrollArea className="flex-1 border rounded-lg p-3 bg-muted/20">
                                          <div className="space-y-3">
                                            {addItemsCart.length === 0 ? (
                                              <div className="text-center py-10 text-muted-foreground text-sm italic">
                                                No items selected
                                              </div>
                                            ) : (
                                              addItemsCart.map((item, idx) => (
                                                <div
                                                  key={idx}
                                                  className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted/40 transition-colors"
                                                >
                                                  <div className="flex flex-col flex-1">
                                                    <span className="text-sm font-bold">
                                                      {item.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                      {currency}
                                                      {item.price} x{" "}
                                                      {item.quantity} ={" "}
                                                      {currency}
                                                      {(
                                                        item.price *
                                                        item.quantity
                                                      ).toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-7 w-7 rounded-full border hover:bg-destructive/10 hover:border-destructive"
                                                      onClick={() =>
                                                        removeFromAddItemsCart(
                                                          idx,
                                                        )
                                                      }
                                                    >
                                                      <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="text-sm font-bold min-w-[24px] text-center bg-primary/10 px-2 py-1 rounded">
                                                      {item.quantity}
                                                    </span>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-7 w-7 rounded-full border hover:bg-primary/10 hover:border-primary"
                                                      onClick={() =>
                                                        setAddItemsCart(
                                                          (prev) =>
                                                            prev.map(
                                                              (i, index) =>
                                                                index === idx
                                                                  ? {
                                                                      ...i,
                                                                      quantity:
                                                                        i.quantity +
                                                                        1,
                                                                    }
                                                                  : i,
                                                            ),
                                                        )
                                                      }
                                                    >
                                                      <Plus className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </ScrollArea>

                                        <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm">
                                          <div className="flex justify-between font-bold">
                                            <span>Items to Add</span>
                                            <span>{addItemsCart.length}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <Button
                                        className="w-full h-12 text-lg font-bold"
                                        onClick={() =>
                                          handleAddItemsToOrder(order.id)
                                        }
                                        disabled={
                                          addOrderItems.isPending ||
                                          addItemsCart.length === 0
                                        }
                                      >
                                        {addOrderItems.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        Add Items to Order
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog
                                open={
                                  isBillingOpen &&
                                  selectedOrder?.id === order.id
                                }
                                onOpenChange={(open) => {
                                  setIsBillingOpen(open);
                                  if (!open) setSelectedOrder(null);
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setIsBillingOpen(true);
                                    }}
                                  >
                                    <Receipt className="w-4 h-4 mr-2" /> Bill
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-2xl">
                                      <Receipt className="w-6 h-6 text-primary" />
                                      Billing -{" "}
                                      {order.table?.tableNumber
                                        ? `Table ${order.table.tableNumber}`
                                        : order.guestName}
                                    </DialogTitle>
                                    <DialogDescription>
                                      {tableOrdersForBilling.length > 1
                                        ? `Combined bill for ${tableOrdersForBilling.length} orders from this table`
                                        : "Review order details and select payment method"}
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="flex-1 overflow-hidden grid md:grid-cols-2 gap-6 py-4">
                                    {/* Left: Order Info, Table, Waiter */}
                                    <div className="flex flex-col gap-4 overflow-hidden border-r pr-6">
                                      <div className="space-y-4">
                                        {/* Table & Waiter Info */}
                                        {order.table?.tableNumber && (
                                          <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold text-muted-foreground">
                                              Table
                                            </Label>
                                            <div className="bg-muted/30 p-3 rounded-lg">
                                              <div className="flex items-center gap-2">
                                                <Utensils className="w-4 h-4 text-primary" />
                                                <span className="font-bold text-lg">
                                                  Table{" "}
                                                  {order.table.tableNumber}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {order.placedByStaff && (
                                          <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold text-muted-foreground">
                                              Waiter
                                            </Label>
                                            <div className="bg-muted/30 p-3 rounded-lg">
                                              <div className="flex items-center gap-2">
                                                <UserPlus className="w-4 h-4 text-primary" />
                                                <span className="font-semibold">
                                                  {order.placedByStaff.fullName}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Order Type */}
                                        <div className="space-y-2">
                                          <Label className="text-xs uppercase font-bold text-muted-foreground">
                                            Order Type
                                          </Label>
                                          <div className="bg-muted/30 p-3 rounded-lg">
                                            <Badge
                                              variant="outline"
                                              className="text-sm"
                                            >
                                              {order.orderType}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Show all orders if multiple */}
                                        {tableOrdersForBilling.length > 1 && (
                                          <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold text-muted-foreground">
                                              Orders (
                                              {tableOrdersForBilling.length})
                                            </Label>
                                            <ScrollArea className="max-h-48">
                                              <div className="space-y-2">
                                                {tableOrdersForBilling.map(
                                                  (ord: Order, idx: number) => (
                                                    <div
                                                      key={ord.id}
                                                      className="bg-muted/20 p-3 rounded-lg border border-border"
                                                    >
                                                      <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold">
                                                          Order #{idx + 1}
                                                        </span>
                                                        <span className="text-xs font-semibold text-primary">
                                                          {currency}
                                                          {parseFloat(
                                                            ord.totalAmount,
                                                          ).toFixed(2)}
                                                        </span>
                                                      </div>
                                                      <div className="text-xs space-y-1">
                                                        {ord.items
                                                          ?.slice(0, 3)
                                                          .map((item, i) => (
                                                            <div
                                                              key={i}
                                                              className="flex justify-between"
                                                            >
                                                              <span className="text-muted-foreground">
                                                                {item.quantity}x{" "}
                                                                {item.itemName}
                                                              </span>
                                                              <span>
                                                                {currency}
                                                                {parseFloat(
                                                                  item.totalPrice,
                                                                ).toFixed(2)}
                                                              </span>
                                                            </div>
                                                          ))}
                                                        {(ord.items?.length ??
                                                          0) > 3 && (
                                                          <div className="text-muted-foreground italic pt-1">
                                                            +
                                                            {(ord.items
                                                              ?.length ?? 0) -
                                                              3}{" "}
                                                            more items
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </ScrollArea>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: Billed Items & Summary */}
                                    <div className="flex flex-col gap-4 overflow-hidden">
                                      <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-muted-foreground">
                                          {tableOrdersForBilling.length > 1
                                            ? "All Items"
                                            : "Order Items"}
                                        </Label>
                                        <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/20 max-h-64">
                                          {/* <div className="space-y-2">
                                          {tableOrdersForBilling.flatMap((ord: Order) => 
                                            ord.items?.map((item, i) => (
                                              <div key={`${ord.id}-${i}`} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                                                <div className="flex flex-col">
                                                  <span className="text-sm font-semibold">{item.quantity}x {item.itemName}</span>
                                                  <span className="text-xs text-muted-foreground">Unit: {currency}{(parseFloat(item.totalPrice) / item.quantity).toFixed(2)}</span>
                                                </div>
                                                <span className="text-sm font-bold text-primary">{currency}{parseFloat(item.totalPrice).toFixed(2)}</span>
                                              </div>
                                            )) || []
                                          )}
                                        </div> */}

                                          <div className="space-y-3">
                                            {order.items?.map((item, i) => (
                                              <CustomizedOrderItemDisplay
                                                key={i}
                                                item={item as any}
                                                currency={currency}
                                                showPriceBreakdown={true}
                                                compact={false}
                                              />
                                            ))}
                                          </div>
                                        </ScrollArea>
                                      </div>

                                      <Separator />

                                      {/* Bill Summary */}
                                      <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-muted-foreground">
                                          Bill Summary
                                        </Label>
                                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg space-y-2 text-sm border border-primary/20">
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Subtotal
                                            </span>
                                            <span className="font-semibold">
                                              {currency}
                                              {combinedSubtotal.toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              GST ({gstRate * 100}%)
                                            </span>
                                            <span className="font-semibold">
                                              {currency}
                                              {combinedGst.toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Service ({serviceRate * 100}%)
                                            </span>
                                            <span className="font-semibold">
                                              {currency}
                                              {combinedService.toFixed(2)}
                                            </span>
                                          </div>
                                          <Separator className="my-2" />
                                          <div className="flex justify-between items-center pt-2">
                                            <span className="font-bold text-base">
                                              Total Payable
                                            </span>
                                            <span className="text-primary text-2xl font-bold">
                                              {currency}
                                              {combinedTotal.toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Payment */}
                                  <div className="space-y-3 pt-4 border-t">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">
                                      Payment Method
                                    </Label>
                                    <div className="grid grid-cols-3 gap-3">
                                      <Button
                                        variant="outline"
                                        className="flex-col h-20 gap-2 hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-all rounded-xl border-2"
                                        onClick={() =>
                                          handlePayment(order, "CASH")
                                        }
                                        disabled={updateStatus.isPending}
                                      >
                                        <CreditCard className="w-5 h-5 text-green-600" />
                                        <div className="text-xs font-bold">
                                          CASH
                                        </div>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="flex-col h-20 gap-2 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all rounded-xl border-2"
                                        onClick={() =>
                                          handlePayment(order, "UPI")
                                        }
                                        disabled={updateStatus.isPending}
                                      >
                                        <QrCode className="w-5 h-5 text-blue-600" />
                                        <div className="text-xs font-bold">
                                          UPI
                                        </div>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="flex-col h-20 gap-2 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all rounded-xl border-2"
                                        onClick={() =>
                                          handlePayment(order, "CARD")
                                        }
                                        disabled={updateStatus.isPending}
                                      >
                                        <CreditCard className="w-5 h-5 text-purple-600" />
                                        <div className="text-xs font-bold">
                                          CARD
                                        </div>
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground italic text-center pt-2">
                                    Print and share options available after
                                    payment
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </Fragment>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Recent Bills
            </h3>
            <Badge variant="secondary">{transactions?.length || 0}</Badge>
          </div>

          <div className="space-y-3">
            {transactions && transactions.length > 0 ? (
              transactions.slice(0, 5).map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="p-3 rounded-lg border border-border bg-white shadow-sm animate-in fade-in slide-in-from-right-2"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm">
                      {transaction.billNumber}
                    </p>
                    <div className="flex gap-1">
                      {transaction.order?.orderType && (
                        <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">
                          {transaction.order.orderType}
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
                        {transaction.order?.table?.tableNumber
                          ? `Table ${transaction.order.table.tableNumber}`
                          : transaction.order?.guestName || "Guest"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(transaction.paidAt).toLocaleTimeString()}
                      </p>
                      {transaction.order?.placedByStaff && (
                        <p className="text-[9px] text-blue-600 mt-0.5">
                          👤 {transaction.order.placedByStaff.fullName}
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
                No bills generated yet
              </div>
            )}
          </div>
        </div>
      </div>

        {/* {customizingItem && (
            <ItemCustomizationDialog
                menuItem={customizingItem}
                currency={currency}
                isOpen={!!customizingItem}
                onClose={() => setCustomizingItem(null)}
                onAddToCart={handleAddCustomizedToCart}
              />
         )} */}
    </DashboardLayout>
  );
}
