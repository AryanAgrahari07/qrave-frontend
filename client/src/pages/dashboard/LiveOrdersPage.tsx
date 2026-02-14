import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Utensils,
  UserPlus,
  Receipt,
  CreditCard,
  QrCode,
  Loader2,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
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
import type { Order, MenuItem, OrderStatus, PaymentMethod } from "@/types";
import type { POSCartLineItem } from "@/types/pos";
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
import { formatDistanceToNow } from "date-fns";
import {
  getCustomizationSummary,
} from "@/components/menu/Customizedorderitemdisplay";
import { Textarea } from "@/components/ui/textarea";
import { MobilePOS } from "@/components/pos/mobilepos";
import { DesktopPOS } from "@/components/pos/desktoppos";

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
  const [manualCart, setManualCart] = useState<POSCartLineItem[]>([]);

  const [repeatCustomizationDialogOpen, setRepeatCustomizationDialogOpen] = useState(false);
  const [repeatCustomizationTargetItem, setRepeatCustomizationTargetItem] = useState<MenuItem | null>(null);

  const [selectedTableId, setSelectedTableId] = useState<string>("1");
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizationTarget, setCustomizationTarget] = useState<
    "manual" | "addItems"
  >("manual");
  const [orderMethod, setOrderMethod] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "due">("due");
  const [searchQuery, setSearchQuery] = useState("");
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

  const makeLineId = (menuItemId: string) =>
    `${menuItemId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const isItemCustomizable = (item: MenuItem) =>
    (item.variants && item.variants.length > 0) ||
    (item.modifierGroups && item.modifierGroups.length > 0);

  const addToManualCart = (item: MenuItem) => {
    if (isItemCustomizable(item)) {
      setCustomizingItem(item);
      setCustomizationTarget("manual");
      return;
    }

    setManualCart((prev) => {
      const existing = prev.find(
        (li) =>
          li.menuItemId === item.id &&
          !li.variantId &&
          (!li.modifierIds || li.modifierIds.length === 0),
      );
      if (existing) {
        return prev.map((li) =>
          li.lineId === existing.lineId
            ? { ...li, quantity: li.quantity + 1 }
            : li,
        );
      }

      const isVeg = item.dietaryTags?.some((tag) => tag.toLowerCase() === "veg");
      const newLine: POSCartLineItem = {
        lineId: makeLineId(item.id),
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.price,
        quantity: 1,
        isVeg,
        menuItem: item,
      };
      return [...prev, newLine];
    });
  };

  const decrementLineItem = (lineId: string) => {
    setManualCart((prev) =>
      prev
        .map((li) =>
          li.lineId === lineId ? { ...li, quantity: li.quantity - 1 } : li,
        )
        .filter((li) => li.quantity > 0),
    );
  };

  const incrementLineItem = (lineId: string) => {
    setManualCart((prev) =>
      prev.map((li) =>
        li.lineId === lineId ? { ...li, quantity: li.quantity + 1 } : li,
      ),
    );
  };

  const getMenuItemQuantity = (menuItemId: string) =>
    manualCart.reduce(
      (sum, li) => (li.menuItemId === menuItemId ? sum + li.quantity : sum),
      0,
    );

  const handlePlusForCustomizableItem = (item: MenuItem) => {
    const existingLines = manualCart.filter((li) => li.menuItemId === item.id);
    if (existingLines.length > 0) {
      setRepeatCustomizationTargetItem(item);
      setRepeatCustomizationDialogOpen(true);
      return;
    }
    setCustomizingItem(item);
    setCustomizationTarget("manual");
  };

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

    const cartLine: POSCartLineItem = {
      lineId: makeLineId(customizingItem.id),
      menuItemId: customizingItem.id,
      name: customizingItem.name,
      unitPrice: price,
      quantity: selection.quantity,
      variantId: selection.variantId,
      modifierIds: selection.modifierIds,
      isVeg,
      menuItem: customizingItem,
    };

    setManualCart((prev) => [...prev, cartLine]);
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
          menuItemId: item.menuItemId,
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

      const updatedOrder = await updatePaymentStatus.mutateAsync({
        orderId: order.id,
        paymentStatus: "PAID",
        paymentMethod: method,
      });

      setSelectedOrder(updatedOrder);

      toast.success(
        order.paymentStatus === "PARTIALLY_PAID"
          ? `Outstanding amount of ${currency}${outstandingAmount.toFixed(2)} paid via ${method}`
          : `Payment of ${currency}${totalAmount.toFixed(2)} received via ${method}`
      );

      refetch();
      
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
      <>
        <AlertDialog
          open={repeatCustomizationDialogOpen}
          onOpenChange={setRepeatCustomizationDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Add again?</AlertDialogTitle>
              <AlertDialogDescription>
                {repeatCustomizationTargetItem?.name
                  ? `Do you want to repeat the same customizations for "${repeatCustomizationTargetItem.name}" or add a new customization?`
                  : "Do you want to repeat the same customization or add a new one?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!repeatCustomizationTargetItem) return;
                  const lines = manualCart.filter(
                    (li) => li.menuItemId === repeatCustomizationTargetItem.id,
                  );
                  const lastLine = lines[lines.length - 1];
                  if (lastLine) incrementLineItem(lastLine.lineId);
                  setRepeatCustomizationDialogOpen(false);
                  setRepeatCustomizationTargetItem(null);
                }}
              >
                Repeat
              </AlertDialogAction>
              <AlertDialogAction
                className="bg-primary"
                onClick={() => {
                  if (!repeatCustomizationTargetItem) return;
                  setCustomizingItem(repeatCustomizationTargetItem);
                  setRepeatCustomizationDialogOpen(false);
                }}
              >
                New customization
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {customizingItem ? (
          <div className="fixed inset-0 z-50 bg-white">
            <ItemCustomizationContent
              menuItem={customizingItem}
              currency={currency}
              onClose={() => setCustomizingItem(null)}
              onAddToCart={handleAddCustomizedToCart}
            />
          </div>
        ) : (
          <MobilePOS
            categories={menuData?.categories || []}
            menuItems={menuData?.items || []}
            activeCategory={activeCategory}
            cartItems={manualCart}
            tableNumber={selectedTableId}
            waiterName={selectedWaiterId}
            diningType={orderMethod}
            paymentMethod={paymentMethod}
            onCategoryChange={setActiveCategory}
            onAddItem={addToManualCart}
            onDecrementLineItem={decrementLineItem}
            onIncrementLineItem={incrementLineItem}
            getMenuItemQuantity={getMenuItemQuantity}
            onPlusForCustomizableItem={handlePlusForCustomizableItem}
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
        )}
      </>
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
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Link href="/dashboard/orders/cancelled">
            <Button variant="outline" className="shrink-0">
              <XCircle className="w-1 h-1 mr-2 text-red-600" />
              <span className="hidden sm:inline">Cancelled</span>
              <span className="sm:hidden">Cancelled</span>
              {/* <ExternalLink className="w-4 h-4 ml-2" />  */}
            </Button>
          </Link>
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
              <DesktopPOS
                categories={menuData?.categories || []}
                menuItems={menuData?.items || []}
                activeCategory={activeCategory}
                manualCart={manualCart}
                selectedTableId={selectedTableId}
                selectedWaiterId={selectedWaiterId}
                orderMethod={orderMethod}
                paymentMethod={paymentMethod}
                customizingItem={customizingItem}
                searchQuery={searchQuery}
                isSearchOpen={isSearchOpen}
                onCategoryChange={setActiveCategory}
                onAddToManualCart={addToManualCart}
                onDecrementLineItem={decrementLineItem}
                onIncrementLineItem={incrementLineItem}
                getMenuItemQuantity={getMenuItemQuantity}
                onPlusForCustomizableItem={handlePlusForCustomizableItem}
                onTableChange={setSelectedTableId}
                onWaiterChange={(value: string) => setSelectedWaiterId(value === "none" ? null : value)}
                onOrderMethodChange={setOrderMethod}
                onPaymentMethodChange={setPaymentMethod}
                onSendToKitchen={handleSendToKitchen}
                onSave={handleSave}
                onSaveAndPrint={handleSaveAndPrint}
                onCloseCustomization={() => setCustomizingItem(null)}
                onAddCustomizedToCart={handleAddCustomizedToCart}
                onSearchQueryChange={setSearchQuery}
                onSearchOpenChange={setIsSearchOpen}
                currency={currency}
                gstRate={gstRate}
                tables={tables}
                staff={staff}
                isLoading={createOrder.isPending}
              />
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
              {activeOrders.map((order: Order) => (
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
              ))}
            </div>
          )}

          {/* Billing Dialog */}
          <Dialog open={isBillingOpen} onOpenChange={setIsBillingOpen}>
            <DialogContent
              className={cn(
                // Mobile: fit within viewport, top aligned and scrollable
                "w-[calc(100vw-1.5rem)] sm:w-full max-w-md",
                "max-h-[calc(100vh-1.5rem)] overflow-y-auto",
                "top-3 sm:top-1/2",
                "translate-y-0 sm:translate-y-[-50%]",
                "p-4 sm:p-6"
              )}
            >
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Bill Details</DialogTitle>
                <DialogDescription>
                  {selectedOrder && (
                    <span className="block mt-1 font-semibold text-sm">
                      {selectedOrder.table?.tableNumber
                        ? `Table ${selectedOrder.table.tableNumber}`
                        : selectedOrder.guestName || `Order #${selectedOrder.id.slice(-6)}`}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {selectedOrder && (
                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Order Items */}
                  <div className="max-h-[50vh] sm:max-h-[240px] overflow-y-auto pr-1">
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Items</h4>
                    <div className="space-y-1.5">
                      {selectedOrder.items?.map((item, i) => {
                        const customizationSummary = getCustomizationSummary(item);
                        return (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-2 rounded-md border bg-muted/40 px-2 py-1.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-medium leading-snug break-words">
                                {item.quantity}× {item.itemName}
                              </div>
                              {customizationSummary && (
                                <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground break-words">
                                  {customizationSummary}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {currency}{parseFloat(item.totalPrice).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Bill Breakdown */}
                  <div className="space-y-2 text-xs sm:text-sm">
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
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm sm:text-base font-bold">
                      <span>Total</span>
                      <span className="text-primary text-lg sm:text-xl tabular-nums">
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
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-base sm:text-lg font-bold text-orange-600">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Payment Status</span>
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
                        <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-3">
                          {selectedOrder.paymentStatus === "PARTIALLY_PAID" 
                            ? "Pay Outstanding Amount"
                            : "Accept Payment"}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <Button
                            onClick={() => handlePayment(selectedOrder, "CASH")}
                            variant="outline"
                            className="flex flex-col items-center gap-1 h-auto py-3"
                            disabled={updatePaymentStatus.isPending}
                          >
                            <DollarSign className="w-4 h-4" />
                            <span className="text-[11px]">Cash</span>
                          </Button>
                          <Button
                            onClick={() => handlePayment(selectedOrder, "CARD")}
                            variant="outline"
                            className="flex flex-col items-center gap-1 h-auto py-3"
                            disabled={updatePaymentStatus.isPending}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span className="text-[11px]">Card</span>
                          </Button>
                          <Button
                            onClick={() => handlePayment(selectedOrder, "UPI")}
                            variant="outline"
                            className="flex flex-col items-center gap-1 h-auto py-3"
                            disabled={updatePaymentStatus.isPending}
                          >
                            <QrCode className="w-4 h-4" />
                            <span className="text-[11px]">UPI</span>
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

          {/* Bottom Pagination */}
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