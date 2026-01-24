import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, LayoutGrid, Users, Languages, MapPin, Check, ShoppingCart, Plus, Minus, X, 
  Loader2, RefreshCw, LogOut, Clock, Bell, ChefHat, Utensils, Receipt, Edit2, Trash2,
  AlertCircle
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
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [selectedGuestForSeating, setSelectedGuestForSeating] = useState<QueueEntry | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"floor" | "orders">("floor");
  const [dietaryFilter, setDietaryFilter] = useState<'any' | 'veg' | 'non-veg'>('any');
  
  // Track served orders for notifications
  const servedOrdersRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<{ id: string; message: string; time: Date }[]>([]);

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
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const submitOrder = async () => {
    if (!selectedTableForOrder || cart.length === 0) return;
    
    try {
      await createOrder.mutateAsync({
        tableId: selectedTableForOrder.id,
        orderType: "DINE_IN",
        items: cart.map(c => ({
          menuItemId: c.item.id,
          quantity: c.quantity,
        })),
      });
      setSelectedTableForOrder(null);
      setCart([]);
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
        })),
      });
      setCart([]);
      // Refresh the order
      refetchOrders();
    } catch {
      // Error handled by mutation
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

  const cartTotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const currency = restaurant?.currency || "₹";

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
                              setSelectedTableForOrder(table);
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
                        {order.items?.map((item: OrderItem) => (
                          <div key={item.id} className="flex justify-between items-center text-sm group">
                            <span>{item.quantity}x {item.itemName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{currency}{parseFloat(item.totalPrice).toFixed(0)}</span>
                              {order.status === "PENDING" && (
                                <button 
                                  onClick={() => handleRemoveItem(order.id, item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
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
                            onClick={() => {
                              setSelectedOrderForEdit(order);
                              setCart([]);
                            }}
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
      <Dialog open={!!selectedTableForOrder} onOpenChange={() => { setSelectedTableForOrder(null); setCart([]); setDietaryFilter('any'); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              {t.order} - Table {selectedTableForOrder?.tableNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Menu Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
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

            {/* Cart Section */}
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l flex flex-col bg-slate-50">
              <div className="p-3 border-b font-bold text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> {t.items} ({cart.reduce((s, c) => s + c.quantity, 0)})
              </div>
              <ScrollArea className="flex-1 p-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <ShoppingCart className="w-6 h-6 mx-auto mb-1 opacity-20" />
                    <p>No items added</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(({ item, quantity }) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate">{item.name}</p>
                          <p className="text-xs text-slate-500">{currency}{item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-bold">{quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t bg-white space-y-3">
                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span className="text-primary text-lg">{currency}{cartTotal.toFixed(0)}</span>
                </div>
                <Button 
                  className="w-full" 
                  disabled={cart.length === 0 || createOrder.isPending} 
                  onClick={submitOrder}
                >
                  {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChefHat className="w-4 h-4 mr-2" />}
                  {t.confirm}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Items to Existing Order Dialog */}
      <Dialog open={!!selectedOrderForEdit} onOpenChange={() => { setSelectedOrderForEdit(null); setCart([]); setDietaryFilter('any'); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              {t.addItems} - {selectedOrderForEdit?.table?.tableNumber ? `Table ${selectedOrderForEdit.table.tableNumber}` : `Order #${selectedOrderForEdit?.id.slice(-4)}`}
            </DialogTitle>
            <DialogDescription>
              Current items: {selectedOrderForEdit?.items?.map(i => `${i.quantity}x ${i.itemName}`).join(", ")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Menu Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
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

            {/* Cart Section */}
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l flex flex-col bg-slate-50">
              <div className="p-3 border-b font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Items ({cart.reduce((s, c) => s + c.quantity, 0)})
              </div>
              <ScrollArea className="flex-1 p-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Plus className="w-6 h-6 mx-auto mb-1 opacity-20" />
                    <p>Select items to add</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(({ item, quantity }) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate">{item.name}</p>
                          <p className="text-xs text-slate-500">{currency}{item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-bold">{quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t bg-white space-y-3">
                <div className="flex justify-between items-center font-bold">
                  <span>New Items Total</span>
                  <span className="text-primary text-lg">{currency}{cartTotal.toFixed(0)}</span>
                </div>
                <Button 
                  className="w-full" 
                  disabled={cart.length === 0 || addOrderItems.isPending} 
                  onClick={handleAddItemsToOrder}
                >
                  {addOrderItems.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add to Order
                </Button>
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
