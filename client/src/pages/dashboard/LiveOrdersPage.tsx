
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
  MinusCircle,
  Percent,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  useUpdateOrder,
  useRemoveOrderServiceCharge,
  useRestaurantLogo,
  useAddOrderItems,
  useMarkOrderItemsServed,
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
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { buildBillDataFromOrder } from "@/lib/bill-data";
import { buildKOTDataFromOrder } from "@/lib/kot-data";
import { OrderVerificationRequests } from "@/components/orders/OrderVerificationRequests";

// PERF: Pre-load notification audio once at module level
const notificationAudio = typeof window !== 'undefined' ? new Audio("/notification.mp3") : null;
if (notificationAudio) notificationAudio.preload = "auto";

// Distinct loud audio for QR requests/calls
const alertAudio = typeof window !== 'undefined' ? new Audio("/sounds/order-notification.mp3") : null;
if (alertAudio) alertAudio.preload = "auto";
let alertStopTimer: ReturnType<typeof setTimeout> | null = null;

function playNotificationSound() {
  if (!notificationAudio) return;
  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(() => { });
}

function playAlertSound() {
  if (!alertAudio) return;
  if (alertStopTimer) {
    clearTimeout(alertStopTimer);
    alertStopTimer = null;
  }
  alertAudio.currentTime = 0;
  alertAudio.play().catch(() => { });
  alertStopTimer = setTimeout(() => {
    if (!alertAudio) return;
    alertAudio.pause();
    alertAudio.currentTime = 0;
  }, 4000);
}

export default function LiveOrdersPage() {
  const { restaurantId, user } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: restaurantLogo } = useRestaurantLogo(restaurantId);

  const {
    isConnected: isPrinterConnected,
    isPrinting,
    printBill: printThermalBill,
    printKOT,
  } = useThermalPrinter(32);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Items per page
  const offset = (currentPage - 1) * pageSize;

  const {
    data: ordersData,
    isLoading,
    refetch,
    isRefetching,
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
  const updateOrder = useUpdateOrder(restaurantId);
  const removeServiceCharge = useRemoveOrderServiceCharge(restaurantId);

  const addOrderItems = useAddOrderItems(restaurantId);
  const markOrderItemsServed = useMarkOrderItemsServed(restaurantId);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [manualCart, setManualCart] = useState<POSCartLineItem[]>([]);

  const [repeatCustomizationDialogOpen, setRepeatCustomizationDialogOpen] = useState(false);
  const [repeatCustomizationTargetItem, setRepeatCustomizationTargetItem] = useState<MenuItem | null>(null);

  const [selectedTableId, setSelectedTableId] = useState<string>("");
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

  // Manual wrapper for updateOrderStatus to track local READY updates
  const handleUpdateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    if (status === "READY") {
      localReadyOrdersRef.current.add(orderId);
    }
    await updateStatus.mutateAsync({ orderId, status });
  }, [updateStatus]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refetch]);

  const isAdmin = user?.role === "owner" || user?.role === "admin" || user?.role === "platform_admin";

  // POS optional fields
  const [cookingNote, setCookingNote] = useState("");
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [waiveServiceCharge, setWaiveServiceCharge] = useState(false);

  // Bill preview discount editor (admin only)
  const [billDiscountDraft, setBillDiscountDraft] = useState<string>("");
  const [billDiscountDialogOpen, setBillDiscountDialogOpen] = useState(false);
  const [billDiscountMode, setBillDiscountMode] = useState<"amount" | "percent">("amount");
  const [billDiscountPercent, setBillDiscountPercent] = useState("");

  // Detect mobile screen size — PERF: debounced
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const checkMobile = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsMobile(window.innerWidth < 1024), 150);
    };
    setIsMobile(window.innerWidth < 1024);
    return () => { window.removeEventListener("resize", checkMobile); clearTimeout(timeout); };
  }, []);

  // Sync bill preview discount editor with selected order
  useEffect(() => {
    if (!selectedOrder) {
      setBillDiscountDraft("");
      setBillDiscountDialogOpen(false);
      setBillDiscountMode("amount");
      setBillDiscountPercent("");
      return;
    }
    const current = Math.max(0, parseFloat(selectedOrder.discountAmount || "0") || 0);
    setBillDiscountDraft(current > 0 ? String(current) : "");
    // Keep dialog closed by default when switching orders
    setBillDiscountDialogOpen(false);
    setBillDiscountMode("amount");
    setBillDiscountPercent("");
  }, [selectedOrder?.id]);

  // Extract orders and pagination info
  const orders = ordersData?.orders ?? [];
  const pagination = ordersData?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const hasNextPage = pagination?.hasMore ?? false;
  const hasPrevPage = currentPage > 1;

  // Scroll to hash target on mount / hash change (for global verification "View More")
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash && window.location.hash.startsWith("#verify-")) {
        const id = window.location.hash.substring(1);
        const el = document.getElementById(id);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
        }
      }
    };
    handleHash(); // initial
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [orders]); // Re-run when orders load so the element exists

  // Track notified unassigned ready orders
  const notifiedUnassignedReadyRef = useRef<Set<string>>(new Set());

  // Track orders that the local user marked as READY (to prevent self-notifying)
  const localReadyOrdersRef = useRef<Set<string>>(new Set());

  // Notify admin when an unassigned order becomes READY
  useEffect(() => {
    if (!isAdmin || !tables || !orders || orders.length === 0) return;

    // First load: prime the set without showing notifications for existing orders
    if (notifiedUnassignedReadyRef.current.size === 0) {
      orders.forEach((o: Order) => {
        if (o.status === "READY" || o.status === "SERVED" || o.status === "CANCELLED" || o.isClosed) {
          notifiedUnassignedReadyRef.current.add(o.id);
        }
      });
      // If there's literally no READY orders at first boot, just set an initial flag
      // by adding a dummy string so it doesn't stay size 0
      notifiedUnassignedReadyRef.current.add("__init__");
      return;
    }

    const readyOrders = orders.filter((o: Order) => o.status === "READY");

    readyOrders.forEach((order: Order) => {
      // Skip if already notified
      if (notifiedUnassignedReadyRef.current.has(order.id)) return;

      // Determine if it has a waiter
      const hasStaffPlacer = !!(order.placedByStaffId || order.placedByStaff?.id);

      let hasTableWaiter = false;
      if (order.tableId || order.table?.id) {
        const tableId = order.tableId || order.table?.id;
        const matchingTable = tables.find(t => t.id === tableId);
        if (matchingTable && (matchingTable.assignedWaiterId || matchingTable.assignedWaiter?.id)) {
          hasTableWaiter = true;
        }
      }

      const isUnassigned = !hasStaffPlacer && !hasTableWaiter;

      // Only show toast if the order was NOT just updated by the current user locally
      const isLocallyUpdated = localReadyOrdersRef.current.has(order.id);

      if (isUnassigned && !isLocallyUpdated) {
        notifiedUnassignedReadyRef.current.add(order.id);

        const orderNum = order.orderNumber ? String(order.orderNumber).padStart(4, "0") : order.id.slice(-4);
        const title = order.table?.tableNumber
          ? `Table ${order.table.tableNumber} Ready`
          : `Order #${orderNum} Ready`;

        toast.info(
          `${title} is READY to serve but has no assigned waiter.`,
          {
            duration: 8000,
            icon: <Utensils className="w-5 h-5 text-blue-500" />,
          }
        );

        try {
          playNotificationSound();
        } catch { }
      } else {
        // Automatically mark assigned ones so we only track newly ready ones
        notifiedUnassignedReadyRef.current.add(order.id);
      }
    });
  }, [orders, tables, isAdmin]);

  // Listen for customer order verification requests and call-waiter events
  useEffect(() => {
    const handleCallWaiter = (e: any) => {
      const detail = e.detail;
      const tableNum = detail?.tableNumber || "Unknown";
      toast.warning(`Table ${tableNum} is calling for a waiter!`, {
        duration: 10000,
        icon: <Utensils className="w-5 h-5 text-blue-500" />,
      });
      playAlertSound();
    };

    window.addEventListener("order_call_waiter", handleCallWaiter);
    return () => {
      window.removeEventListener("order_call_waiter", handleCallWaiter);
    };
  }, []);

  // Filter active orders (not paid/cancelled, and not pure-unverified QR requests)
  const activeOrders = useMemo(() => {
    return orders.filter((o: Order) => {
      // Exclude fully paid+closed+served orders and cancelled ones
      if (o.paymentStatus === "PAID" && o.status === "SERVED" && o.isClosed) return false;
      if (o.status === "CANCELLED") return false;
      // Exclude orders where every item is unverified — these are pending QR customer
      // requests that should only appear in the "Customer Request" section until accepted.
      const items: any[] = (o as any).items ?? [];
      if (items.length > 0 && items.every((i: any) => i.isVerified === false)) return false;
      return true;
    });
  }, [orders]);

  const currency = useMemo(() => restaurant?.currency || "₹", [restaurant?.currency]);
  const gstRate = useMemo(() => parseFloat(restaurant?.taxRateGst || "5") / 100, [restaurant?.taxRateGst]);
  const serviceRatePct = useMemo(() => parseFloat(restaurant?.taxRateService || "0"), [restaurant?.taxRateService]);

  // Set initial active category — Fix: useEffect for side effects, not useMemo
  useEffect(() => {
    if (!activeCategory && menuData?.categories && menuData.categories.length > 0) {
      setActiveCategory(menuData.categories[0].id);
    }
  }, [menuData, activeCategory]);

  const makeLineId = (menuItemId: string) =>
    `${menuItemId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const isItemCustomizable = useCallback((item: MenuItem) =>
    (item.variants && item.variants.length > 0) ||
    (item.modifierGroups && item.modifierGroups.length > 0), []);

  const addToManualCart = useCallback((item: MenuItem) => {
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
  }, [isItemCustomizable]);

  const decrementLineItem = useCallback((lineId: string) => {
    setManualCart((prev) =>
      prev
        .map((li) =>
          li.lineId === lineId ? { ...li, quantity: li.quantity - 1 } : li,
        )
        .filter((li) => li.quantity > 0),
    );
  }, []);

  const incrementLineItem = useCallback((lineId: string) => {
    setManualCart((prev) =>
      prev.map((li) =>
        li.lineId === lineId ? { ...li, quantity: li.quantity + 1 } : li,
      ),
    );
  }, []);

  const getMenuItemQuantity = useCallback((menuItemId: string) =>
    manualCart.reduce(
      (sum, li) => (li.menuItemId === menuItemId ? sum + li.quantity : sum),
      0,
    ), [manualCart]);

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
  const handleSave = async () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    try {
      if (selectedOrderForEdit) {
        const response = await addOrderItems.mutateAsync({
          orderId: selectedOrderForEdit.id,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
        });

        if (paymentMethod !== "due") {
          const paymentStatusMap = {
            "cash": "PAID",
            "card": "PAID",
            "upi": "PAID",
            "due": "DUE",
          };
          try {
            await updatePaymentStatus.mutateAsync({
              orderId: selectedOrderForEdit.id,
              paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
              paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
            });
          } catch (err) {
            console.error(err);
          }
        }

        // Admin direct-serve: mark ONLY the newly added items as SERVED (not the whole order)
        if (isAdmin && response.newItems?.length) {
          const newItemIds = response.newItems.map((i: any) => i.id);
          await markOrderItemsServed.mutateAsync({ orderId: selectedOrderForEdit.id, itemIds: newItemIds });
        }

        toast.success(`Items saved to Order #${selectedOrderForEdit.orderNumber || selectedOrderForEdit.id.slice(-4)}`);
      } else {
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

        const result = await createOrder.mutateAsync({
          tableId: orderMethod === "dine-in" ? selectedTableId : undefined,
          orderType: orderTypeMap[orderMethod] as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
          waiveServiceCharge: orderMethod === "dine-in" ? waiveServiceCharge : false,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
          assignedWaiterId: selectedWaiterId || undefined,
          paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
          paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
          notes: cookingNote.trim() || undefined,
        });

        const order = result.order;

        // Apply discount if set
        const discountNum = parseFloat(discountAmount || "0");
        if (isAdmin && discountAmount.trim() && !Number.isNaN(discountNum) && discountNum > 0) {
          try {
            await updateOrder.mutateAsync({
              orderId: order.id,
              data: { discountAmount: discountNum },
            });
          } catch {
            toast.error("Order created, but failed to apply discount");
          }
        }

        // Admin direct-serve: mark newly added items as SERVED (no kitchen step)
        // newItems array comes from createOrder response (works for both pure new and merged-to-existing orders)
        const itemsToMark = result.newItems || order.items;
        if (isAdmin && itemsToMark?.length) {
          // Double safeguard: only mark items not already served
          const newItemIds = itemsToMark
            .filter((i: any) => i.status !== "SERVED")
            .map((i: any) => i.id);
          if (newItemIds.length > 0) {
            await markOrderItemsServed.mutateAsync({ orderId: order.id, itemIds: newItemIds });
          }
        }

        const tableDisplayNum = tables?.find((t) => t.id === selectedTableId)?.tableNumber || selectedTableId;
        toast.success(`Order saved! ${orderMethod === "dine-in" ? `Table ${tableDisplayNum}` : ""}`);
      }

      await refetch();
      setManualCart([]);
      setSelectedTableId("");
      setSelectedWaiterId(null);
      setPaymentMethod("due");
      setCookingNote("");
      setDiscountAmount("");
      setWaiveServiceCharge(false);
      setIsNewOrderOpen(false);
      setShowMobilePOS(false);
      setSelectedOrderForEdit(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSaveAndPrint = async () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    // Printer must be connected — Bill print is the purpose of this button.
    if (!isPrinterConnected) {
      toast.error("Printer not connected, Connect to print Bill");
      return;
    }

    try {
      let order: any;

      if (selectedOrderForEdit) {
        const response = await addOrderItems.mutateAsync({
          orderId: selectedOrderForEdit.id,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
        });
        order = response.order;

        if (paymentMethod !== "due") {
          const paymentStatusMap = {
            "cash": "PAID",
            "card": "PAID",
            "upi": "PAID",
            "due": "DUE",
          };
          try {
            await updatePaymentStatus.mutateAsync({
              orderId: selectedOrderForEdit.id,
              paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
              paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
            });
          } catch (err) {
            console.error(err);
          }
        }

        toast.success(`Items added & Bill printed for Order #${order.orderNumber || order.id.slice(-4)}`);
      } else {
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

        const result = await createOrder.mutateAsync({
          tableId: orderMethod === "dine-in" ? selectedTableId : undefined,
          orderType: orderTypeMap[orderMethod] as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
          waiveServiceCharge: orderMethod === "dine-in" ? waiveServiceCharge : false,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
          assignedWaiterId: selectedWaiterId || undefined,
          paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
          paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
          notes: cookingNote.trim() || undefined,
        });
        order = result.order;

        // Apply discount if set
        const discountNum = parseFloat(discountAmount || "0");
        if (isAdmin && discountAmount.trim() && !Number.isNaN(discountNum) && discountNum > 0) {
          try {
            await updateOrder.mutateAsync({
              orderId: order.id,
              data: { discountAmount: discountNum },
            });
          } catch {
            toast.error("Order created, but failed to apply discount");
          }
        }

        toast.success(
          `Bill printed! ${orderMethod === "dine-in" ? `Table ${tables?.find((t) => t.id === selectedTableId)?.tableNumber || selectedTableId}` : ""} - ${manualCart.length} items`,
        );
      }

      // Print Bill to thermal printer
      if (restaurant) {
        try {
          // Fetch the full order for bill data (with discounts applied and all items merged)
          const refreshed = await refetch();
          const updatedOrder = (refreshed.data?.orders ?? []).find((o: any) => o.id === order.id);
          const finalOrderResult = updatedOrder || order;

          const billData = buildBillDataFromOrder({
            order: finalOrderResult,
            restaurant,
            currency,
            restaurantLogo,
          });
          await printThermalBill(billData);
        } catch (printErr) {
          console.error("Bill print error:", printErr);
        }
      }

      await refetch();
      setManualCart([]);
      setSelectedTableId("");
      setSelectedWaiterId(null);
      setPaymentMethod("due");
      setCookingNote("");
      setDiscountAmount("");
      setWaiveServiceCharge(false);
      setIsNewOrderOpen(false);
      setShowMobilePOS(false);
      setSelectedOrderForEdit(null);
      refetch();
    } catch (error) {
      // Error handled by mutation / printKOT toast
    }
  };

  const handleSaveAndPrintBill = async () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    if (!isPrinterConnected) {
      toast.error("Printer not connected, Connect to print Bill");
      return;
    }

    try {
      let order: any;

      if (selectedOrderForEdit) {
        const response = await addOrderItems.mutateAsync({
          orderId: selectedOrderForEdit.id,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
        });
        order = response.order;

        if (paymentMethod !== "due") {
          const paymentStatusMap = {
            "cash": "PAID",
            "card": "PAID",
            "upi": "PAID",
            "due": "DUE",
          };
          try {
            await updatePaymentStatus.mutateAsync({
              orderId: selectedOrderForEdit.id,
              paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
              paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
            });
          } catch (err) {
            console.error(err);
          }
        }

        if (isAdmin && response.newItems?.length) {
          const newItemIds = response.newItems.map((i: any) => i.id);
          await markOrderItemsServed.mutateAsync({ orderId: selectedOrderForEdit.id, itemIds: newItemIds });
        }

        toast.success(`Items saved to Order #${order.orderNumber || order.id.slice(-4)}`);
      } else {
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

        const result = await createOrder.mutateAsync({
          tableId: orderMethod === "dine-in" ? selectedTableId : undefined,
          orderType: orderTypeMap[orderMethod] as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
          waiveServiceCharge: orderMethod === "dine-in" ? waiveServiceCharge : false,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
          assignedWaiterId: selectedWaiterId || undefined,
          paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
          paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
          notes: cookingNote.trim() || undefined,
        });

        order = result.order;

        const discountNum = parseFloat(discountAmount || "0");
        if (isAdmin && discountAmount.trim() && !Number.isNaN(discountNum) && discountNum > 0) {
          try {
            await updateOrder.mutateAsync({
              orderId: order.id,
              data: { discountAmount: discountNum },
            });
            // Refetch to get the updated order with discount applied
            const refreshed = await refetch();
            const updatedOrder = (refreshed.data?.orders ?? []).find((o: any) => o.id === order.id);
            if (updatedOrder) order = updatedOrder;
          } catch {
            toast.error("Order created, but failed to apply discount");
          }
        }

        const itemsToMark = result.newItems || order.items;
        if (isAdmin && itemsToMark?.length) {
          const newItemIds = itemsToMark.filter((i: any) => i.status !== "SERVED").map((i: any) => i.id);
          if (newItemIds.length > 0) {
            await markOrderItemsServed.mutateAsync({ orderId: order.id, itemIds: newItemIds });
          }
        }

        const tableDisplayNum = tables?.find((t) => t.id === selectedTableId)?.tableNumber || selectedTableId;
        toast.success(`Order saved! ${orderMethod === "dine-in" ? `Table ${tableDisplayNum}` : ""}`);
      }

      // Print bill to thermal printer (if connected)
      if (isPrinterConnected && restaurant) {
        try {
          const billData = buildBillDataFromOrder({
            order,
            restaurant,
            currency,
            restaurantLogo,
          });
          await printThermalBill(billData);
        } catch (printErr) {
          console.error("Bill print error:", printErr);
        }
      }

      await refetch();
      setManualCart([]);
      setSelectedTableId("");
      setSelectedWaiterId(null);
      setPaymentMethod("due");
      setCookingNote("");
      setDiscountAmount("");
      setWaiveServiceCharge(false);
      setIsNewOrderOpen(false);
      setShowMobilePOS(false);
      setSelectedOrderForEdit(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSendToKitchen = async () => {
    if (orderMethod !== "dine-in" && waiveServiceCharge) {
      // Service charge is only relevant for dine-in orders.
      setWaiveServiceCharge(false);
    }
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    try {
      if (selectedOrderForEdit) {
        // Add items to existing order without printing KOT
        await addOrderItems.mutateAsync({
          orderId: selectedOrderForEdit.id,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
        });

        if (paymentMethod !== "due") {
          const paymentStatusMap = {
            "cash": "PAID",
            "card": "PAID",
            "upi": "PAID",
            "due": "DUE",
          };
          try {
            await updatePaymentStatus.mutateAsync({
              orderId: selectedOrderForEdit.id,
              paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
              paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
            });
          } catch (err) {
            console.error(err);
          }
        }

        toast.success(`Items sent to kitchen for Order #${selectedOrderForEdit.orderNumber || selectedOrderForEdit.id.slice(-4)}`);
      } else {
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

        const result = await createOrder.mutateAsync({
          tableId: orderMethod === "dine-in" ? selectedTableId : undefined,
          orderType: orderTypeMap[orderMethod] as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
          waiveServiceCharge: orderMethod === "dine-in" ? waiveServiceCharge : false,
          items: manualCart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            modifierIds: item.modifierIds,
          })),
          assignedWaiterId: selectedWaiterId || undefined,
          paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
          paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
          notes: cookingNote.trim() || undefined,
        });
        const order = result.order;

        // Apply discount (admin only) after order creation
        const discountNum = parseFloat(discountAmount || "0");
        if (isAdmin && discountAmount.trim() && !Number.isNaN(discountNum) && discountNum > 0) {
          try {
            const updated = await updateOrder.mutateAsync({
              orderId: order.id,
              data: { discountAmount: discountNum },
            });
            // Ensure any open bill/details will show updated discountAmount
            setSelectedOrder(updated);
          } catch {
            // If discount update fails, keep the order but warn
            toast.error("Order created, but failed to apply discount");
          }
        }

        const tableDisplayNum = tables?.find((t) => t.id === selectedTableId)?.tableNumber || selectedTableId;

        toast.success(
          `Order ${paymentMethod !== 'due' ? 'placed and paid' : 'sent to kitchen'}! ${orderMethod === 'dine-in' ? `Table ${tableDisplayNum}` : ''} - ${manualCart.length} items`,
        );

        // Refresh list so bill details reflects latest discount
        await refetch();
      }

      setManualCart([]);
      setSelectedTableId("");
      setSelectedWaiterId(null);
      setPaymentMethod("due");
      setCookingNote("");
      setDiscountAmount("");
      setWaiveServiceCharge(false);
      setIsNewOrderOpen(false);
      setShowMobilePOS(false);
      setSelectedOrderForEdit(null);
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

  const handleThermalPrint = async () => {
    if (!selectedOrder || !restaurant) {
      toast.error("Bill data not available");
      return;
    }

    if (!isPrinterConnected) {
      toast.error("Printer not connected. Please connect your thermal printer first.");
      return;
    }

    try {
      const billData = buildBillDataFromOrder({
        order: selectedOrder,
        restaurant,
        currency,
        restaurantLogo,
      });
      await printThermalBill(billData);
    } catch (error) {
      console.error("Thermal print error:", error);
    }
  };

  const applyBillDiscount = async () => {
    if (!selectedOrder) return;
    if (!isAdmin) {
      toast.error("Only admins can apply discounts");
      return;
    }

    const discountNum = parseFloat(billDiscountDraft || "0");
    if (Number.isNaN(discountNum) || discountNum < 0) {
      toast.error("Please enter a valid discount amount");
      return;
    }

    try {
      const updated = await updateOrder.mutateAsync({
        orderId: selectedOrder.id,
        data: { discountAmount: discountNum },
      });
      setSelectedOrder(updated);
      await refetch();
    } catch {
      // toast handled in hook
    }
  };

  const removeBillDiscount = async () => {
    if (!selectedOrder) return;
    if (!isAdmin) {
      toast.error("Only admins can remove discounts");
      return;
    }

    try {
      const updated = await updateOrder.mutateAsync({
        orderId: selectedOrder.id,
        data: { discountAmount: 0 },
      });
      setSelectedOrder(updated);
      setBillDiscountDraft("");
      await refetch();
    } catch {
      // toast handled in hook
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
    setSelectedOrderForEdit(null);
    setManualCart([]);
    setSelectedWaiterId(null);
    setSelectedTableId("");
    setCookingNote("");
    setDiscountAmount("");
    setSearchQuery("");
    setIsSearchOpen(false);
    setActiveCategory(menuData?.categories?.[0]?.id || "");
  };

  const handleNewOrderClick = () => {
    setSelectedOrderForEdit(null);
    setManualCart([]);
    setSelectedWaiterId(null);
    setSelectedTableId("");
    setCookingNote("");
    setDiscountAmount("");
    setSearchQuery("");
    setIsSearchOpen(false);
    setActiveCategory(menuData?.categories?.[0]?.id || "");

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32 hidden sm:block" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3 flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="w-full p-4 flex justify-between shadow-sm">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-3 items-end flex flex-col">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </Card>
            ))}
          </div>
          <div className="hidden lg:block lg:w-2/3">
            <Card className="h-full min-h-[600px] p-6">
              <div className="flex justify-between items-start mb-6 border-b pb-6">
                <div>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between pb-4 border-b">
                    <div>
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
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
            title={
              selectedOrderForEdit
                ? (selectedOrderForEdit.table?.tableNumber
                  ? `Add Items — T${selectedOrderForEdit.table.tableNumber}`
                  : `Add Items — Order #${selectedOrderForEdit.orderNumber ? String(selectedOrderForEdit.orderNumber).padStart(4, "0") : selectedOrderForEdit.id.slice(-4)}`)
                : "New Order"
            }
            hideTableSelect={!!selectedOrderForEdit}
            hideOrderTypeSelect={!!selectedOrderForEdit}
            serviceRatePct={serviceRatePct}
            waiveServiceCharge={waiveServiceCharge}
            onToggleWaiveServiceCharge={setWaiveServiceCharge}
            categories={menuData?.categories || []}
            menuItems={menuData?.items || []}
            activeCategory={activeCategory}
            cartItems={manualCart}
            tableNumber={selectedTableId}
            waiterName={selectedWaiterId}
            diningType={orderMethod}
            paymentMethod={paymentMethod}
            cookingNote={cookingNote}
            onCookingNoteChange={setCookingNote}
            showDiscount={isAdmin}
            discountAmount={discountAmount}
            onDiscountAmountChange={setDiscountAmount}
            onCategoryChange={setActiveCategory}
            onAddItem={addToManualCart}
            onDecrementLineItem={decrementLineItem}
            onIncrementLineItem={incrementLineItem}
            getMenuItemQuantity={getMenuItemQuantity}
            onPlusForCustomizableItem={handlePlusForCustomizableItem}
            onTableChange={setSelectedTableId}
            onWaiterChange={(value: string) => setSelectedWaiterId(value === "none" ? null : value)}
            onDiningTypeChange={(type) => {
              setOrderMethod(type);
              if (type !== "dine-in") setWaiveServiceCharge(false);
            }}
            onPaymentMethodChange={setPaymentMethod}
            onSendToKitchen={handleSendToKitchen}
            onSave={handleSave}
            onSaveAndPrint={handleSaveAndPrint}
            onSaveAndPrintBill={handleSaveAndPrintBill}
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
            onClick={handleRefresh}
            disabled={isRefetching || isRefreshing}
            className="shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", (isRefetching || isRefreshing) && "animate-spin")} />
          </Button>

          <Link href="/dashboard/orders/cancelled">
            <Button variant="outline" className="shrink-0">
              <XCircle className="w-2 h-2 text-red-600" />
              <span className="hidden sm:inline">Cancelled</span>
              {/* <span className="sm:hidden">Cancelled</span> */}
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
              open={isNewOrderOpen || !!selectedOrderForEdit}
              onOpenChange={(open) => {
                if (open) {
                  setIsNewOrderOpen(true);
                } else {
                  if (customizingItem) return;
                  // Close logic handles both Add Items vs New Order modes
                  setIsNewOrderOpen(false);
                  setSelectedOrderForEdit(null);
                  setSelectedWaiterId(null);
                  setSelectedTableId("1");
                  setManualCart([]);
                  setCookingNote("");
                  setDiscountAmount("");
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
                title={
                  selectedOrderForEdit
                    ? (selectedOrderForEdit.table?.tableNumber
                      ? `Add Items — T${selectedOrderForEdit.table.tableNumber}`
                      : `Add Items — Order #${selectedOrderForEdit.orderNumber ? String(selectedOrderForEdit.orderNumber).padStart(4, "0") : selectedOrderForEdit.id.slice(-4)}`)
                    : "New Order"
                }
                hideTableSelect={!!selectedOrderForEdit}
                hideOrderTypeSelect={!!selectedOrderForEdit}
                serviceRatePct={serviceRatePct}
                waiveServiceCharge={waiveServiceCharge}
                onToggleWaiveServiceCharge={setWaiveServiceCharge}
                categories={menuData?.categories || []}
                menuItems={menuData?.items || []}
                activeCategory={activeCategory}
                manualCart={manualCart}
                selectedTableId={selectedTableId}
                selectedWaiterId={selectedWaiterId}
                orderMethod={orderMethod}
                paymentMethod={paymentMethod}
                cookingNote={cookingNote}
                onCookingNoteChange={setCookingNote}
                showDiscount={isAdmin}
                discountAmount={discountAmount}
                onDiscountAmountChange={setDiscountAmount}
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
                onOrderMethodChange={(method) => {
                  setOrderMethod(method);
                  if (method !== "dine-in") setWaiveServiceCharge(false);
                }}
                onPaymentMethodChange={setPaymentMethod}
                onSendToKitchen={handleSendToKitchen}
                onSave={handleSave}
                onSaveAndPrint={handleSaveAndPrint}
                onSaveAndPrintBill={handleSaveAndPrintBill}
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
          <OrderVerificationRequests
            restaurantId={restaurantId!}
            orders={orders}
            currency={currency}
            gstRatePercent={gstRate * 100}
            serviceChargeRatePercent={serviceRatePct}
          />

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
                  className="relative overflow-hidden border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow"
                >
                  {/* Add Items Button - top-right of card */}
                  {(order.status === "PENDING" || order.status === "PREPARING" || order.status === "READY" || order.status === "SERVED") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors z-10 border border-primary/20 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Put the POS in edit mode
                        setSelectedOrderForEdit(order);
                        setManualCart([]);
                        setCookingNote("");
                        setSelectedWaiterId(order.placedByStaff?.id || null);
                        setActiveCategory(menuData?.categories?.[0]?.id || "");
                        setOrderMethod(order.orderType === "TAKEAWAY" ? "takeaway" : order.orderType === "DELIVERY" ? "delivery" : "dine-in");
                        setSelectedTableId(order.table?.id || order.tableId || "");

                        if (isMobile) {
                          setShowMobilePOS(true);
                        } else {
                          setIsNewOrderOpen(true);
                        }
                      }}
                      title="Add items to this order"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  )}
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      {/* Header Section */}
                      <div className="space-y-2 pr-10 sm:pr-12">
                        <div className="flex items-center gap-2 flex-wrap pr-2">
                          <span className="text-lg sm:text-xl font-bold font-heading">
                            {order.table?.tableNumber
                              ? `Table ${order.table.tableNumber}`
                              : `Order #${order.orderNumber ? String(order.orderNumber).padStart(4, "0") : order.id.slice(-4)}`
                            }
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
                                handleUpdateStatus(order.id, "PREPARING")
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
                                handleUpdateStatus(order.id, "READY")
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
                                handleUpdateStatus(order.id, "SERVED")
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
                        ? `Table ${selectedOrder.table.tableNumber} (${selectedOrder.guestName || "Guest"})`
                        : selectedOrder.guestName || `Order #${selectedOrder.orderNumber ? String(selectedOrder.orderNumber).padStart(4, "0") : selectedOrder.id.slice(-4)}`}
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
                    {selectedOrder.orderType === "DINE_IN" &&
                      selectedOrder.serviceTaxAmount &&
                      parseFloat(selectedOrder.serviceTaxAmount) > 0 && (
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Service Charge</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600 hover:text-red-700"
                              title="Remove service charge"
                              disabled={removeServiceCharge.isPending}
                              onClick={async () => {
                                if (!selectedOrder) return;
                                try {
                                  const updated = await removeServiceCharge.mutateAsync({
                                    orderId: selectedOrder.id,
                                  });
                                  setSelectedOrder(updated);
                                  await refetch();
                                } catch {
                                  // toast handled by mutation
                                }
                              }}
                            >
                              {removeServiceCharge.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MinusCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <span className="font-medium">
                            {currency}{parseFloat(selectedOrder.serviceTaxAmount).toFixed(2)}
                          </span>
                        </div>
                      )}

                    {(() => {
                      const currentDiscount = Math.max(0, parseFloat(selectedOrder.discountAmount || "0") || 0);
                      const draftNum = parseFloat(billDiscountDraft || "0");
                      const hasDraft = billDiscountDraft.trim().length > 0;
                      const canApply =
                        isAdmin &&
                        !updateOrder.isPending &&
                        hasDraft &&
                        !Number.isNaN(draftNum) &&
                        draftNum >= 0;

                      const showDiscountRow = currentDiscount > 0 || isAdmin;
                      if (!showDiscountRow) return null;

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Discount</span>
                              {isAdmin && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Edit discount"
                                  onClick={() => setBillDiscountDialogOpen(true)}
                                >
                                  <Percent className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <span className={cn("font-medium", currentDiscount > 0 && "text-green-700")}>
                              {currentDiscount > 0 ? `- ${currency}${currentDiscount.toFixed(2)}` : `${currency}0.00`}
                            </span>
                          </div>

                          {/* Discount dialog (admin only) */}
                          {isAdmin && (
                            <Dialog
                              open={billDiscountDialogOpen}
                              onOpenChange={setBillDiscountDialogOpen}
                            >
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Discount</DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <RadioGroup
                                      value={billDiscountMode}
                                      onValueChange={(v) => setBillDiscountMode(v as "amount" | "percent")}
                                      className="flex gap-4"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="amount" id="bill_disc_amount" />
                                        <Label htmlFor="bill_disc_amount">Amount</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="percent" id="bill_disc_percent" />
                                        <Label htmlFor="bill_disc_percent">Percent</Label>
                                      </div>
                                    </RadioGroup>
                                  </div>

                                  {billDiscountMode === "amount" ? (
                                    <div className="space-y-2">
                                      <Label>Discount Amount (optional)</Label>
                                      <Input
                                        value={billDiscountDraft}
                                        onChange={(e) => setBillDiscountDraft(e.target.value)}
                                        placeholder="0"
                                        inputMode="decimal"
                                      />
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <Label>Discount Percent (optional)</Label>
                                      <Input
                                        value={billDiscountPercent}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setBillDiscountPercent(v);

                                          const base = Math.max(
                                            0,
                                            parseFloat(selectedOrder.totalAmount) + currentDiscount,
                                          );
                                          const pct = Math.max(0, Math.min(100, parseFloat(v || "0") || 0));
                                          const amt = (base * pct) / 100;
                                          setBillDiscountDraft(amt ? amt.toFixed(2) : "");
                                        }}
                                        placeholder="0"
                                        inputMode="decimal"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        Applies on total ({currency}{(Math.max(0, parseFloat(selectedOrder.totalAmount) + currentDiscount)).toFixed(2)}). Amount: {currency}
                                        {(() => {
                                          const base = Math.max(0, parseFloat(selectedOrder.totalAmount) + currentDiscount);
                                          const pct = Math.max(0, Math.min(100, parseFloat(billDiscountPercent || "0") || 0));
                                          return ((base * pct) / 100 || 0).toFixed(2);
                                        })()}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex justify-between gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={updateOrder.isPending}
                                      onClick={() => {
                                        setBillDiscountPercent("");
                                        setBillDiscountDraft("");
                                      }}
                                    >
                                      Clear
                                    </Button>

                                    <div className="flex gap-2">
                                      {currentDiscount > 0 && (
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          disabled={updateOrder.isPending}
                                          onClick={async () => {
                                            await removeBillDiscount();
                                            setBillDiscountDialogOpen(false);
                                          }}
                                        >
                                          Remove
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        disabled={!canApply}
                                        onClick={async () => {
                                          await applyBillDiscount();
                                          setBillDiscountDialogOpen(false);
                                        }}
                                      >
                                        {updateOrder.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          "Apply"
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      );
                    })()}

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
                  <div className="sticky bottom-[-16px] sm:bottom-[-24px] bg-background pt-2 pb-4 sm:pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 border-t mt-4 z-10 flex flex-col gap-3">
                    {selectedOrder.paymentStatus !== "PAID" && (
                      <div>
                        <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-3">
                          {selectedOrder.paymentStatus === "PARTIALLY_PAID"
                            ? "Pay Outstanding Amount"
                            : "Accept Payment"}
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => handlePayment(selectedOrder, "CASH")}
                            variant="outline"
                            className="flex flex-col items-center justify-center gap-1 h-14 sm:h-auto sm:py-3"
                            disabled={updatePaymentStatus.isPending}
                          >
                            <DollarSign className="w-4 h-4 mb-0.5" />
                            <span className="text-[10px] sm:text-[11px] leading-tight flex-1">Cash</span>
                          </Button>
                          <Button
                            onClick={() => handlePayment(selectedOrder, "CARD")}
                            variant="outline"
                            className="flex flex-col items-center justify-center gap-1 h-14 sm:h-auto sm:py-3"
                            disabled={updatePaymentStatus.isPending}
                          >
                            <CreditCard className="w-4 h-4 mb-0.5" />
                            <span className="text-[10px] sm:text-[11px] leading-tight flex-1">Card</span>
                          </Button>
                          <Button
                            onClick={() => handlePayment(selectedOrder, "UPI")}
                            variant="outline"
                            className="flex flex-col items-center justify-center gap-1 h-14 sm:h-auto sm:py-3"
                            disabled={updatePaymentStatus.isPending}
                          >
                            <QrCode className="w-4 h-4 mb-0.5" />
                            <span className="text-[10px] sm:text-[11px] leading-tight flex-1">UPI</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Print Button (always shown) */}
                    <Button
                      variant="outline"
                      className="w-full h-12 sm:h-10 border-foreground/20 font-semibold"
                      onClick={handleThermalPrint}
                      disabled={isPrinting || !isPrinterConnected}
                      title={!isPrinterConnected ? "Pair/connect printer from the sidebar first" : undefined}
                    >
                      {isPrinting ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Printer className="w-5 h-5 mr-2" />
                      )}
                      Print Bill
                    </Button>
                  </div>
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
                  className="p-3 rounded-lg border border-border bg-white dark:bg-card shadow-sm"
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