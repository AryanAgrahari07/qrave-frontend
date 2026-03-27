import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus, LayoutGrid, Users, Languages, MapPin, Check, ShoppingCart, Plus, Minus, X,
  Loader2, RefreshCw, LogOut, Clock, Bell, ChefHat, Utensils, Receipt, Edit2, Trash2,
  AlertCircle, Grid3x3, ArrowLeft, Search, Save, Printer, UtensilsCrossed, Moon, Sun
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
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
  useUpdateOrder,
  useUpdateOrderItemStatus,
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
import { OrderVerificationRequests } from "@/components/orders/OrderVerificationRequests";
import { GlobalNewOrderDialog } from "@/components/orders/GlobalNewOrderDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MobilePOS } from "@/components/pos/mobilepos";
import { DesktopPOS } from "@/components/pos/desktoppos";
import type { POSCartLineItem, POSCustomizationSelection } from "@/types/pos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// PERF: Pre-load notification audio once at module level instead of creating new Audio() per event
const notificationAudio = typeof window !== 'undefined' ? new Audio("/notification.mp3") : null;
if (notificationAudio) notificationAudio.preload = "auto";

function playNotificationSound() {
  if (!notificationAudio) return;
  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(() => { });
}

// Distinct loud audio for QR requests/calls
const alertAudio = typeof window !== 'undefined' ? new Audio("/sounds/order-notification.mp3") : null;
if (alertAudio) alertAudio.preload = "auto";

function playAlertSound() {
  if (!alertAudio) return;
  alertAudio.currentTime = 0;
  alertAudio.play().catch(() => { });
}

export default function WaiterTerminalPage() {
  const [_, setLocation] = useLocation();
  const { restaurantId, user, logout } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: tables, isLoading: tablesLoading, refetch: refetchTables, isRefetching: isRefetchingTables } = useTables(restaurantId);
  const { data: queueEntries, isLoading: queueLoading, refetch: refetchQueue, isRefetching: isRefetchingQueue } = useQueueActive(restaurantId);
  const { data: menuData, refetch: refetchMenu, isRefetching: isRefetchingMenu } = useMenuCategories(restaurantId, restaurant?.slug ?? null);
  const { data: ordersData, refetch: refetchOrders, isRefetching: isRefetchingOrders } = useOrders(restaurantId, { limit: 50 });

  const isRefetching = isRefetchingTables || isRefetchingQueue || isRefetchingMenu || isRefetchingOrders;

  // `useOrders` returns `{ orders, pagination }` in most places, but some older code treated it as `Order[]`.
  // Normalize to a plain array to avoid runtime crashes like `(orders || []).filter is not a function`.
  const orders: Order[] = useMemo(() => {
    if (Array.isArray(ordersData)) return ordersData as Order[];
    const maybe = (ordersData as any)?.orders;
    return Array.isArray(maybe) ? (maybe as Order[]) : [];
  }, [ordersData]);

  const updateTableStatus = useUpdateTableStatus(restaurantId);
  const createOrder = useCreateOrder(restaurantId);
  const seatGuest = useSeatGuest(restaurantId);
  const callNext = useCallNextGuest(restaurantId);
  const updateOrderStatus = useUpdateOrderStatus(restaurantId);
  const updateOrderItemStatus = useUpdateOrderItemStatus(restaurantId);
  const addOrderItems = useAddOrderItems(restaurantId);
  const removeOrderItem = useRemoveOrderItem(restaurantId);
  const updateOrder = useUpdateOrder(restaurantId);

  const { t, language } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);

  // POS cart lines (same structure as Live Orders POS)
  const [cart, setCart] = useState<POSCartLineItem[]>([]);

  const [selectedGuestForSeating, setSelectedGuestForSeating] = useState<QueueEntry | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"floor" | "orders">("floor");
  const [dietaryFilter, setDietaryFilter] = useState<'any' | 'veg' | 'non-veg'>('any');

  // Mobile detection and POS state
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePOS, setShowMobilePOS] = useState(false);
  const [posMode, setPosMode] = useState<"new" | "addItems">("new");
  /** Used as the table selector value for the POS overlay (mobile). */
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Minimal POS state for DesktopPOS (waiter mode keeps most options hidden)
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [orderMethod, setOrderMethod] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "due">("due");
  const [discountAmount, setDiscountAmount] = useState("");
  const [waiveServiceCharge, setWaiveServiceCharge] = useState(false);

  // Track served orders for notifications
  const servedOrdersRef = useRef<Set<string>>(new Set());

  // Track new table/order assignments for this waiter
  const assignmentTablesInitRef = useRef(false);
  const assignmentOrdersInitRef = useRef(false);
  const prevTableAssignmentsRef = useRef<Map<string, string | null | undefined>>(new Map());
  const seenAssignedOrdersRef = useRef<Set<string>>(new Set());

  const [notifications, setNotifications] = useState<{ id: string; message: string; time: Date }[]>([]);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Cooking note (maps to Order.notes)
  const [cookingNote, setCookingNote] = useState("");
  const [editCookingNote, setEditCookingNote] = useState("");


  // Mobile detection — PERF: debounced to avoid 60+ setState/sec during resize
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const checkMobile = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsMobile(window.innerWidth < 768), 150);
    };
    setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => { window.removeEventListener("resize", checkMobile); clearTimeout(timeout); };
  }, []);

  // Set initial active category
  useEffect(() => {
    if (!activeCategory && menuData?.categories && menuData.categories.length > 0) {
      setActiveCategory(menuData.categories[0].id);
    }
  }, [menuData, activeCategory]);

  // Check for newly ready orders and notify
  useEffect(() => {
    const readyOrders = orders.filter((o: Order) => o.status === "READY");
    readyOrders.forEach((order: Order) => {
      if (!servedOrdersRef.current.has(order.id)) {
        servedOrdersRef.current.add(order.id);
        const orderNum = order.orderNumber ? String(order.orderNumber).padStart(4, "0") : order.id.slice(-4);
        const tableName = order.table?.tableNumber ? `Table ${order.table.tableNumber}` : order.guestName || `Order #${orderNum}`;
        const notification = {
          id: order.id,
          message: `🍽️ ${tableName} is READY for pickup!`,
          time: new Date(),
        };
        setNotifications((prev) => [notification, ...prev].slice(0, 10));

        playNotificationSound();
      }
    });
  }, [orders]);

  // Notify waiter when a new table is assigned to them
  useEffect(() => {
    const handleVerificationRequired = (e: any) => {
      const order = e.detail.order;
      const orderNum = order.orderNumber ? String(order.orderNumber).padStart(4, "0") : order.id.slice(-4);
      const guestOrTableStr = order.table?.tableNumber
        ? `Table ${order.table.tableNumber}`
        : order.guestName || `Order #${orderNum}`;
      toast(`🔔 New Request: ${guestOrTableStr}`, {
        description: "Customer has sent a new order request.",
        duration: 15000,
        position: 'top-center'
      });
      playAlertSound();
    };

    const handleCallWaiter = (e: any) => {
      const { tableNumber, tableId } = e.detail;
      const tableStr = tableNumber ? `Table ${tableNumber}` : (tableId ? `Table ID ${tableId.slice(0, 4)}` : "A table");
      toast.error(`🛎️ Waiter Called!`, {
        description: `${tableStr} needs assistance.`,
        duration: 20000,
        position: 'top-center'
      });
      playAlertSound();
    };

    window.addEventListener("order_verification_required", handleVerificationRequired);
    window.addEventListener("order_call_waiter", handleCallWaiter);

    return () => {
      window.removeEventListener("order_verification_required", handleVerificationRequired);
      window.removeEventListener("order_call_waiter", handleCallWaiter);
    };
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    if (!tables) return;

    // First load: prime cache without notifications
    if (!assignmentTablesInitRef.current) {
      tables.forEach((t) => prevTableAssignmentsRef.current.set(t.id, t.assignedWaiterId));
      assignmentTablesInitRef.current = true;
      return;
    }

    for (const table of tables) {
      const prev = prevTableAssignmentsRef.current.get(table.id);
      const next = table.assignedWaiterId;
      prevTableAssignmentsRef.current.set(table.id, next);

      if (next === uid && prev !== uid) {
        const msg = `🪑 New table assigned: Table ${table.tableNumber}`;
        const notification = { id: `table-${table.id}`, message: msg, time: new Date() };
        setNotifications((p) => [notification, ...p].slice(0, 10));
        playNotificationSound();
      }
    }
  }, [tables, user?.id]);

  // Notify waiter when a new order is assigned to them
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    const assignedToMe = orders.filter((o) => (o.placedByStaffId || "") === uid);

    // First load: prime set without notifications
    if (!assignmentOrdersInitRef.current) {
      assignedToMe.forEach((o) => seenAssignedOrdersRef.current.add(o.id));
      assignmentOrdersInitRef.current = true;
      return;
    }

    for (const order of assignedToMe) {
      if (seenAssignedOrdersRef.current.has(order.id)) continue;
      seenAssignedOrdersRef.current.add(order.id);

      const orderNum = order.orderNumber ? String(order.orderNumber).padStart(4, "0") : order.id.slice(-4);
      const guestOrTableStr = order.table?.tableNumber
        ? `Table ${order.table.tableNumber}`
        : order.guestName || `Order #${orderNum}`;
      const msg = `🧾 New order assigned: ${guestOrTableStr}`;
      const notification = { id: `order-${order.id}`, message: msg, time: new Date() };
      setNotifications((p) => [notification, ...p].slice(0, 10));
      playNotificationSound();
    }
  }, [orders, user?.id]);

  const handleLogout = useCallback(async () => {
    await logout();
    setLocation("/auth");
  }, [logout, setLocation]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    refetchTables();
    refetchQueue();
    refetchOrders();
    refetchMenu();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refetchTables, refetchQueue, refetchOrders, refetchMenu]);

  const toggleTableStatus = async (table: Table) => {
    const newStatus = table.currentStatus === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE";

    if (newStatus === "AVAILABLE") {
      const hasActiveOrders = orders.some(
        (o) => (o.tableId === table.id || o.table?.id === table.id) &&
          !["PAID", "CANCELLED"].includes(o.status)
      );

      if (hasActiveOrders) {
        toast.error("Cannot mark table unoccupied while there are active unpaid orders.");
        return;
      }
    }

    updateTableStatus.mutate({ tableId: table.id, status: newStatus });
  };

  const makeLineId = (menuItemId: string) =>
    `${menuItemId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const isItemCustomizable = useCallback((item: MenuItem) =>
    (item.variants && item.variants.length > 0) ||
    (item.modifierGroups && item.modifierGroups.length > 0), []);

  const getMenuItemQuantity = useCallback((menuItemId: string) =>
    cart.reduce(
      (sum, li) => (li.menuItemId === menuItemId ? sum + li.quantity : sum),
      0,
    ), [cart]);

  const addToCart = useCallback((item: MenuItem) => {
    if (isItemCustomizable(item)) {
      setCustomizingItem(item);
      setIsCustomizing(true);
      return;
    }

    setCart((prev) => {
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
      const nameToUse = (item as any).nameTranslations?.[language] || item.name;
      const newLine: POSCartLineItem = {
        lineId: makeLineId(item.id),
        menuItemId: item.id,
        name: nameToUse,
        unitPrice: parseFloat(item.price as any),
        quantity: 1,
        isVeg,
        menuItem: item,
      };
      return [...prev, newLine];
    });
  }, [isItemCustomizable, language]);

  const decrementLineItem = useCallback((lineId: string) => {
    setCart((prev) =>
      prev
        .map((li) =>
          li.lineId === lineId ? { ...li, quantity: li.quantity - 1 } : li,
        )
        .filter((li) => li.quantity > 0),
    );
  }, []);

  const incrementLineItem = useCallback((lineId: string) => {
    setCart((prev) =>
      prev.map((li) =>
        li.lineId === lineId ? { ...li, quantity: li.quantity + 1 } : li,
      ),
    );
  }, []);

  const handlePlusForCustomizableItem = (item: MenuItem) => {
    // For waiter flow we always open customization for customizable items.
    setCustomizingItem(item);
    setIsCustomizing(true);
  };

  const handleAddCustomizedItem = (selection: POSCustomizationSelection) => {
    if (!customizingItem) return;

    let price = parseFloat(customizingItem.price as any);

    if (selection.variantId) {
      const variant = customizingItem.variants?.find((v) => v.id === selection.variantId);
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
    const nameToUse = (customizingItem as any).nameTranslations?.[language] || customizingItem.name;

    const cartLine: POSCartLineItem = {
      lineId: makeLineId(customizingItem.id),
      menuItemId: customizingItem.id,
      name: nameToUse,
      unitPrice: price,
      quantity: selection.quantity,
      variantId: selection.variantId,
      modifierIds: selection.modifierIds,
      isVeg,
      menuItem: customizingItem,
    };

    setCart((prev) => [...prev, cartLine]);
    setCustomizingItem(null);
    setIsCustomizing(false);
  };


  const submitOrder = async () => {
    const tableId = isMobile ? selectedTableId : selectedTableForOrder?.id;
    if (!tableId || cart.length === 0) return;

    try {
      await createOrder.mutateAsync({
        tableId,
        orderType: "DINE_IN",
        items: cart.map((li) => ({
          menuItemId: li.menuItemId,
          quantity: li.quantity,
          variantId: li.variantId,
          modifierIds: li.modifierIds,
        })),
        notes: cookingNote.trim() || undefined,
      });
      if (isMobile) {
        handleCloseMobilePOS();
      } else {
        setSelectedTableForOrder(null);
      }
      setCart([]);
      setCookingNote("");
      refetchOrders();
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddItemsToOrder = async () => {
    if (!selectedOrderForEdit || cart.length === 0) return;

    try {
      // Update cooking note for the order (optional)
      if (editCookingNote.trim() !== (selectedOrderForEdit.notes || "").trim()) {
        await updateOrder.mutateAsync({
          orderId: selectedOrderForEdit.id,
          data: { notes: editCookingNote.trim() || undefined },
        });
      }

      await addOrderItems.mutateAsync({
        orderId: selectedOrderForEdit.id,
        items: cart.map((li) => ({
          menuItemId: li.menuItemId,
          quantity: li.quantity,
          variantId: li.variantId,
          modifierIds: li.modifierIds,
        })),
      });
      if (isMobile) {
        handleCloseMobilePOS();
      } else {
        setSelectedOrderForEdit(null);
      }
      setCart([]);
      setEditCookingNote("");
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
    setCookingNote("");
    setCart([]);
    if (isMobile) {
      setPosMode("new");
      setSelectedTableId(table.id);
      setShowMobilePOS(true);
    } else {
      setSelectedTableForOrder(table);
    }
  };

  const handleAddItemsClick = (order: Order) => {
    setEditCookingNote(order.notes || "");
    setCart([]);
    if (isMobile) {
      setPosMode("addItems");
      setSelectedOrderForEdit(order);
      setSelectedTableId(order.table?.id || "");
      setShowMobilePOS(true);
    } else {
      setSelectedOrderForEdit(order);
    }
  };

  const handleMobileAddItem = (item: MenuItem) => {
    addToCart(item);
  };

  const handleCloseMobilePOS = () => {
    setShowMobilePOS(false);
    setCart([]);
    setSelectedTableId("");
    setSelectedOrderForEdit(null);
    setCookingNote("");
    setEditCookingNote("");
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
  };

  const handleSaveAndPrint = () => {
    if (cart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
  };

  const currency = restaurant?.currency || "₹";
  const gstRate = parseFloat(restaurant?.taxRateGst || "5") / 100;

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, li) => {
      // `cart` is POSCartLineItem[] (same as Live Orders POS)
      // Prefer the computed unitPrice captured at add-to-cart time.
      const baseUnit = Number.isFinite(li.unitPrice)
        ? li.unitPrice
        : parseFloat((li.menuItem?.price as any) ?? "0");

      // If a variant was selected, use that variant price.
      let unit = baseUnit;
      if (li.variantId && li.menuItem?.variants) {
        const v = li.menuItem.variants.find((vv) => vv.id === li.variantId);
        if (v) unit = parseFloat(v.price as any);
      }

      // Add modifiers price.
      let modifiersTotal = 0;
      if (li.modifierIds && li.modifierIds.length > 0 && li.menuItem?.modifierGroups) {
        li.menuItem.modifierGroups.forEach((group) => {
          group.modifiers?.forEach((mod) => {
            if (li.modifierIds!.includes(mod.id)) {
              modifiersTotal += parseFloat(mod.price as any);
            }
          });
        });
      }

      return sum + (unit + modifiersTotal) * li.quantity;
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
      case "PENDING": return <Badge variant="destructive" className="animate-pulse">{t("waiter.pending")}</Badge>;
      case "PREPARING": return <Badge variant="secondary" className="bg-blue-100 text-blue-700">{t("waiter.preparing")}</Badge>;
      case "READY": return <Badge variant="default" className="bg-green-600 text-white animate-pulse">READY</Badge>;
      case "SERVED": return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">{t("waiter.ready")}</Badge>;
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

  // Filter menu items by active category and search query
  const filteredMenuItems = useMemo(() => {
    if (!menuData?.items) return [];

    let items = menuData.items as MenuItem[];

    // Filter by category if not searching
    if (!searchQuery && activeCategory) {
      items = items.filter(
        (item: MenuItem) => item.categoryId === activeCategory && item.isAvailable
      );
    } else if (searchQuery) {
      // Filter by search query across all categories
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item: MenuItem) => {
          if (!item.isAvailable) return false;
          const translatedName = item.nameTranslations?.[language] || item.name;
          return translatedName.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
        }
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

  // Active orders for THIS waiter
  // - Exclude cancelled
  // - Exclude served+closed (not actionable anymore)
  // - Restrict to orders either placed by this staff OR belonging to a table assigned to this waiter
  const waiterTableIds = useMemo(() => {
    const uid = user?.id;
    if (!uid || !tables) return new Set<string>();
    return new Set(
      tables
        .filter((t) => t.assignedWaiterId === uid || t.assignedWaiter?.id === uid)
        .map((t) => t.id),
    );
  }, [tables, user?.id]);

  const activeOrders = useMemo(() => {
    const uid = user?.id;
    if (!uid) return [] as Order[];

    return orders.filter((o: Order) => {
      if (o.status === "CANCELLED") return false;
      if (o.status === "SERVED" && o.isClosed) return false;

      // Consider "active" as: pending/preparing/ready (and optionally served but not closed)
      const isActiveStatus =
        o.status === "PENDING" ||
        o.status === "PREPARING" ||
        o.status === "READY" ||
        (o.status === "SERVED" && !o.isClosed);

      if (!isActiveStatus) return false;

      const placedByThisWaiter =
        o.placedByStaffId === uid || o.placedByStaff?.id === uid;

      const onWaiterTable =
        (!!o.tableId && waiterTableIds.has(o.tableId)) ||
        (!!o.table?.id && waiterTableIds.has(o.table.id));

      return placedByThisWaiter || onWaiterTable;
    });
  }, [orders, user?.id, waiterTableIds]);

  // Count ready orders for notification badge
  const readyOrdersCount = activeOrders.filter((o: Order) => o.status === "READY").length;

  const isLoading = tablesLoading || queueLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Render mobile POS overlay when active
  if (showMobilePOS && isMobile) {
    const title = posMode === "addItems" ? "Add Items" : "New Order";

    return (
      <>
        <GlobalNewOrderDialog restaurantId={restaurantId} />
        {customizingItem ? (
          <div className="fixed inset-0 z-50 bg-background">
            <ItemCustomizationContent
              menuItem={customizingItem}
              currency={currency}
              onClose={() => setCustomizingItem(null)}
              onAddToCart={handleAddCustomizedItem}
            />
          </div>
        ) : (
          <MobilePOS
            mode="waiter"
            title={title}
            categories={menuData?.categories || []}
            menuItems={menuData?.items || []}
            activeCategory={activeCategory}
            cartItems={cart}
            tableNumber={selectedTableId}
            waiterName={null}
            diningType="dine-in"
            paymentMethod="due"
            cookingNote={posMode === "addItems" ? editCookingNote : cookingNote}
            onCookingNoteChange={posMode === "addItems" ? setEditCookingNote : setCookingNote}
            onCategoryChange={setActiveCategory}
            onAddItem={addToCart}
            onDecrementLineItem={decrementLineItem}
            onIncrementLineItem={incrementLineItem}
            getMenuItemQuantity={getMenuItemQuantity}
            onPlusForCustomizableItem={handlePlusForCustomizableItem}
            onTableChange={setSelectedTableId}
            onSendToKitchen={posMode === "addItems" ? handleAddItemsToOrder : submitOrder}
            onClose={handleCloseMobilePOS}
            currency={currency}
            gstRate={gstRate}
            tables={tables}
            isLoading={posMode === "addItems" ? addOrderItems.isPending : createOrder.isPending}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background p-4 md:p-6">
      <GlobalNewOrderDialog restaurantId={restaurantId} />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-foreground">{t("waiter.title")}</h1>
            <p className="text-slate-500 dark:text-muted-foreground text-sm">{restaurant?.name || "Restaurant"} • {user?.fullName || user?.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefetching || isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", (isRefetching || isRefreshing) && "animate-spin")} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-slate-500 dark:text-muted-foreground hover:text-foreground transition-colors"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 transition-transform duration-300 rotate-0" />
              ) : (
                <Moon className="h-4 w-4 transition-transform duration-300 rotate-0" />
              )}
            </Button>

            <LanguageSelector className="bg-background" />

            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 dark:text-muted-foreground hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Notification Banner */}
        {notifications.length > 0 && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg p-3 flex items-center gap-3 animate-in slide-in-from-top">
            <Bell className="w-5 h-5 text-green-600 dark:text-green-500 animate-bounce" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-400">{notifications[0].message}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications(prev => prev.slice(1))}
              className="text-green-600 dark:text-green-500 hover:text-green-800 dark:hover:text-green-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "floor" | "orders")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="floor" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> {t("waiter.floor")}
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 relative">
              <Utensils className="w-4 h-4" /> {t("waiter.orders")}
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
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> {t("waiter.available")}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400" /> {t("waiter.occupied")}</span>
                  </div>
                </div>

                {tables && tables.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                    {tables.map((table: Table) => {
                      const isOccupied = table.currentStatus === "OCCUPIED";
                      const isMyTable = table.assignedWaiter?.id === user?.id || table.assignedWaiterId === user?.id;

                      return (
                        <div key={table.id} className="relative group">
                          <button
                            onClick={() => toggleTableStatus(table)}
                            disabled={updateTableStatus.isPending}
                            className={cn(
                              "w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                              !isOccupied
                                ? "bg-white dark:bg-card border-green-200 dark:border-green-900/50 shadow-sm"
                                : isMyTable
                                  ? "bg-red-50 dark:bg-red-950/20 border-primary shadow-inner text-slate-900 dark:text-foreground cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 ring-1 ring-primary/20"
                                  : "bg-slate-100 dark:bg-muted/50 border-slate-300 dark:border-slate-700 shadow-inner text-slate-600 dark:text-muted-foreground cursor-pointer hover:bg-slate-200 dark:hover:bg-muted/80 opacity-80"
                            )}
                          >
                            <span className={cn(
                              "text-2xl font-bold",
                              !isOccupied || isMyTable ? "dark:text-foreground" : "dark:text-muted-foreground"
                            )}>
                              {table.tableNumber}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-muted-foreground">Cap: {table.capacity}</span>

                            {table.assignedWaiter && (
                              <span className={cn(
                                "text-[9px] font-semibold mt-0.5 px-1.5 py-0.5 rounded max-w-[90%] truncate",
                                isMyTable
                                  ? "text-primary bg-primary/10"
                                  : "text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800"
                              )}>
                                👤 {isMyTable ? t("waiter.me") || "Me" : table.assignedWaiter.fullName}
                              </span>
                            )}

                          </button>

                          {/* Order Button - Bottom Center Overlay */}
                          {isOccupied && (
                            <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 flex z-10 translate-y-1/3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  
                                  // Find the active order for this table
                                  const existingOrder = activeOrders
                                    .filter((o) => o.table?.id === table.id)
                                    // Prefer most recent active order
                                    .sort((a, b) => {
                                      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                      return tb - ta;
                                    })[0];
                                    
                                  if (existingOrder) {
                                    handleAddItemsClick(existingOrder);
                                  } else {
                                    handleNewOrderClick(table);
                                  }
                                }}
                                className={cn(
                                  "h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white dark:bg-card border-2 flex items-center justify-center shadow-md hover:shadow-lg transition-all",
                                  isMyTable
                                    ? "border-red-400 dark:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-500"
                                    : "border-slate-400 dark:border-slate-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-500"
                                )}
                                title={t("waiter.order") || "Order"}
                              >
                                <Plus className={cn("w-4 h-4 sm:w-5 sm:h-5", isMyTable ? "text-red-500" : "text-slate-500")} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <LayoutGrid className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground">{t("waiter.noTables")}</p>
                  </div>
                )}
              </div>

              {/* Queue Sidebar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> {t("waiter.queue")}
                  </h2>
                  <Button size="sm" variant="outline" onClick={handleCallNext} disabled={callNext.isPending || waitingGuests.length === 0}>
                    {callNext.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {t("waiter.callNext")}
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
                      <p>{t("waiter.noQueue")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {/* Customer Requests Verification */}
            <OrderVerificationRequests
              restaurantId={restaurantId!}
              orders={activeOrders}
              currency={currency}
            />

            {activeOrders.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Utensils className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">{t("waiter.noOrders")}</p>
                <p className="text-sm text-muted-foreground">Orders will appear here</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order: Order) => (
                  <Card key={order.id} className={cn(
                    "overflow-hidden transition-all dark:bg-card dark:border-border",
                    order.status === "READY" && "ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/30",
                    order.status === "SERVED" && "ring-1 ring-green-300 bg-green-50/30 dark:bg-green-950/10"
                  )}>
                    <CardHeader className={cn(
                      "py-3 px-4",
                      order.status === "PENDING" && "bg-red-50 dark:bg-red-950/30",
                      order.status === "PREPARING" && "bg-blue-50 dark:bg-blue-950/30",
                      order.status === "READY" && "bg-green-50 dark:bg-green-950/30",
                      order.status === "SERVED" && "bg-green-50/50 dark:bg-green-950/20"
                    )}>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg dark:text-foreground">
                            {order.table?.tableNumber ? `Table ${order.table.tableNumber}` : order.guestName || `#${order.orderNumber ? String(order.orderNumber).padStart(4, "0") : order.id.slice(-4)}`}
                          </CardTitle>
                          <p className="text-xs text-slate-500 dark:text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {getTimeSince(order.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {/* Order Items */}
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {order.items?.map((item) => {
                          const nameToUse = (item as any).itemNameTranslations?.[language] || item.itemName;

                          return (
                            <CustomizedOrderItemDisplay
                              key={item.id}
                              item={{ ...item, itemName: nameToUse } as any}
                              currency={currency}
                              compact={true}
                              onMarkDelivered={() => {
                                updateOrderItemStatus.mutate({
                                  orderId: order.id,
                                  orderItemId: item.id,
                                  status: "SERVED",
                                });
                              }}
                              isUpdating={updateOrderItemStatus.isPending && updateOrderItemStatus.variables?.orderItemId === item.id}
                            />
                          );
                        })}
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
            setSelectedTableId("");
            setCart([]);
            setSearchQuery("");
            setIsSearchOpen(false);
            setCookingNote("");
          }
        }}
      >
        <DesktopPOS
          mode="waiter"
          title={selectedTableForOrder?.tableNumber ? `New Order - T${selectedTableForOrder.tableNumber}` : "New Order"}
          categories={menuData?.categories || []}
          menuItems={menuData?.items || []}
          activeCategory={activeCategory}
          manualCart={cart}
          selectedTableId={selectedTableId || selectedTableForOrder?.id || ""}
          selectedWaiterId={null}
          orderMethod="dine-in"
          paymentMethod="due"
          cookingNote={cookingNote}
          onCookingNoteChange={setCookingNote}
          customizingItem={customizingItem}
          searchQuery={searchQuery}
          isSearchOpen={isSearchOpen}
          onCategoryChange={setActiveCategory}
          onAddToManualCart={addToCart}
          onDecrementLineItem={decrementLineItem}
          onIncrementLineItem={incrementLineItem}
          getMenuItemQuantity={getMenuItemQuantity}
          onPlusForCustomizableItem={handlePlusForCustomizableItem}
          onTableChange={(tableId) => {
            setSelectedTableId(tableId);
            const next = tables?.find((t) => t.id === tableId) || null;
            setSelectedTableForOrder(next);
          }}
          onSendToKitchen={submitOrder}
          onCloseCustomization={() => setCustomizingItem(null)}
          onAddCustomizedToCart={handleAddCustomizedItem}
          onSearchQueryChange={setSearchQuery}
          onSearchOpenChange={setIsSearchOpen}
          currency={currency}
          gstRate={gstRate}
          tables={tables}
          staff={[]}
          isLoading={createOrder.isPending}
        />
      </Dialog>

      {/* Add Items to Existing Order Dialog */}
      <Dialog
        open={!!selectedOrderForEdit}
        onOpenChange={(open) => {
          if (!open && customizingItem) return;
          if (!open) {
            setSelectedOrderForEdit(null);
            setSelectedTableId("");
            setCart([]);
            setSearchQuery("");
            setIsSearchOpen(false);
            setEditCookingNote("");
            setDietaryFilter("any");
          }
        }}
      >
        <DesktopPOS
          mode="waiter"
          title={
            selectedOrderForEdit?.table?.tableNumber
              ? `Add Items - T${selectedOrderForEdit.table.tableNumber}`
              : "Add Items"
          }
          categories={menuData?.categories || []}
          menuItems={menuData?.items || []}
          activeCategory={activeCategory}
          manualCart={cart}
          selectedTableId={selectedTableId || selectedOrderForEdit?.table?.id || ""}
          selectedWaiterId={null}
          orderMethod="dine-in"
          paymentMethod="due"
          cookingNote={editCookingNote}
          onCookingNoteChange={setEditCookingNote}
          customizingItem={customizingItem}
          searchQuery={searchQuery}
          isSearchOpen={isSearchOpen}
          onCategoryChange={setActiveCategory}
          onAddToManualCart={addToCart}
          onDecrementLineItem={decrementLineItem}
          onIncrementLineItem={incrementLineItem}
          getMenuItemQuantity={getMenuItemQuantity}
          onPlusForCustomizableItem={handlePlusForCustomizableItem}
          onTableChange={(tableId) => {
            setSelectedTableId(tableId);

            // In "Add Items" flow, changing the table should also switch the target order.
            const nextOrder = activeOrders
              .filter((o) => o.table?.id === tableId)
              // Prefer most recent order for that table
              .sort((a, b) => {
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                return tb - ta;
              })[0];

            if (nextOrder) {
              setSelectedOrderForEdit(nextOrder);
              setEditCookingNote(nextOrder.notes || "");
              setCart([]);
            } else {
              toast.error("No active order found for that table");
            }
          }}
          onSendToKitchen={handleAddItemsToOrder}
          onCloseCustomization={() => setCustomizingItem(null)}
          onAddCustomizedToCart={handleAddCustomizedItem}
          onSearchQueryChange={setSearchQuery}
          onSearchOpenChange={setIsSearchOpen}
          currency={currency}
          gstRate={gstRate}
          tables={tables}
          staff={[]}
          isLoading={addOrderItems.isPending}
        />
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
