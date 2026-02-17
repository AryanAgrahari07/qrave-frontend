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
  useUpdateOrder,
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

export default function WaiterTerminalPage() {
  const [_, setLocation] = useLocation();
  const { restaurantId, user, logout } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: tables, isLoading: tablesLoading, refetch: refetchTables } = useTables(restaurantId);
  const { data: queueEntries, isLoading: queueLoading, refetch: refetchQueue } = useQueueActive(restaurantId);
  const { data: menuData, refetch: refetchMenu } = useMenuCategories(restaurantId, restaurant?.slug ?? null);
  const { data: ordersData, refetch: refetchOrders } = useOrders(restaurantId, { limit: 50 });

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
  const addOrderItems = useAddOrderItems(restaurantId);
  const removeOrderItem = useRemoveOrderItem(restaurantId);
  const updateOrder = useUpdateOrder(restaurantId);

  const [language, setLanguage] = useState<"en" | "es" | "hi">("en");
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
        setNotifications((prev) => [notification, ...prev].slice(0, 10));
        toast.success(notification.message, {
          duration: 10000,
          icon: <ChefHat className="w-5 h-5 text-green-500" />,
        });

        // Play notification sound if available
        try {
          const audio = new Audio("/notification.mp3");
          audio.play().catch(() => {});
        } catch {}
      }
    });
  }, [orders]);

  // Notify waiter when a new table is assigned to them
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
        toast.success(msg, { duration: 9000, icon: <Bell className="w-5 h-5 text-primary" /> });
        try {
          const audio = new Audio("/notification.mp3");
          audio.play().catch(() => {});
        } catch {}
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

      const who = order.table?.tableNumber
        ? `Table ${order.table.tableNumber}`
        : order.guestName || `Order #${order.id.slice(-4)}`;
      const msg = `🧾 New order assigned: ${who}`;
      const notification = { id: `order-${order.id}`, message: msg, time: new Date() };
      setNotifications((p) => [notification, ...p].slice(0, 10));
      toast.success(msg, { duration: 9000, icon: <Receipt className="w-5 h-5 text-primary" /> });
      try {
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {});
      } catch {}
    }
  }, [orders, user?.id]);

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

  const makeLineId = (menuItemId: string) =>
    `${menuItemId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const isItemCustomizable = (item: MenuItem) =>
    (item.variants && item.variants.length > 0) ||
    (item.modifierGroups && item.modifierGroups.length > 0);

  const getMenuItemQuantity = (menuItemId: string) =>
    cart.reduce(
      (sum, li) => (li.menuItemId === menuItemId ? sum + li.quantity : sum),
      0,
    );

  const addToCart = (item: MenuItem) => {
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
      const newLine: POSCartLineItem = {
        lineId: makeLineId(item.id),
        menuItemId: item.id,
        name: item.name,
        unitPrice: parseFloat(item.price as any),
        quantity: 1,
        isVeg,
        menuItem: item,
      };
      return [...prev, newLine];
    });
  };

  const decrementLineItem = (lineId: string) => {
    setCart((prev) =>
      prev
        .map((li) =>
          li.lineId === lineId ? { ...li, quantity: li.quantity - 1 } : li,
        )
        .filter((li) => li.quantity > 0),
    );
  };

  const incrementLineItem = (lineId: string) => {
    setCart((prev) =>
      prev.map((li) =>
        li.lineId === lineId ? { ...li, quantity: li.quantity + 1 } : li,
      ),
    );
  };

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Render mobile POS overlay when active
  if (showMobilePOS && isMobile) {
    const title = posMode === "addItems" ? "Add Items" : "New Order";

    return (
      <>
        {customizingItem ? (
          <div className="fixed inset-0 z-50 bg-white">
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
