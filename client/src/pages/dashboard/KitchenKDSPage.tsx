import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Languages, Utensils, Timer, Loader2, RefreshCw, AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useKitchenOrders, useKitchenStartOrder, useKitchenCompleteOrder, useRestaurant } from "@/hooks/api";
import type { Order, OrderItem } from "@/types";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { useLocation } from "wouter";
import { CustomizedOrderItemDisplay, getCustomizationSummary } from "@/components/menu/Customizedorderitemdisplay";

export default function KitchenKDSPage() {
  const [_, setLocation] = useLocation();
  const { restaurantId, user, logout } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: orders, isLoading, refetch } = useKitchenOrders(restaurantId);
  const startOrder = useKitchenStartOrder(restaurantId);
  const completeOrder = useKitchenCompleteOrder(restaurantId);

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  const [language, setLanguage] = useState<"en" | "es" | "hi">("en");

  const t = {
    en: { 
      title: "Kitchen Display (KDS)", 
      active: "Active Orders", 
      prepare: "Start Preparing", 
      ready: "Mark Ready", 
      table: "Table",
      noOrders: "No active orders",
      allDone: "Kitchen is all caught up!",
      mins: "min",
      new: "NEW",
      preparing: "COOKING",
    },
    es: { 
      title: "Pantalla de Cocina", 
      active: "Pedidos Activos", 
      prepare: "Empezar", 
      ready: "Listo",
      table: "Mesa",
      noOrders: "Sin pedidos activos",
      allDone: "¡La cocina está al día!",
      mins: "min",
      new: "NUEVO",
      preparing: "COCINANDO",
    },
    hi: { 
      title: "किचन डिस्प्ले", 
      active: "एक्टिव ऑर्डर", 
      prepare: "शुरू करें", 
      ready: "तैयार",
      table: "टेबल",
      noOrders: "कोई ऑर्डर नहीं",
      allDone: "किचन खाली है!",
      mins: "मिनट",
      new: "नया",
      preparing: "बन रहा",
    }
  }[language];

  const handleStartOrder = async (orderId: string) => {
    try {
      await startOrder.mutateAsync(orderId);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await completeOrder.mutateAsync(orderId);
    } catch {
      // Error handled by mutation
    }
  };

  const getTimeSince = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch {
      return "just now";
    }
  };

  const getMinutesSince = (dateString: string) => {
    try {
      return differenceInMinutes(new Date(), new Date(dateString));
    } catch {
      return 0;
    }
  };

  const isUrgent = (order: Order) => {
    const mins = getMinutesSince(order.createdAt);
    return order.status === "PENDING" && mins > 10;
  };

  // Sort orders: PENDING first, then PREPARING, then READY, then by creation time (oldest first)
  const sortedOrders = [...(orders || [])].sort((a: Order, b: Order) => {
    const statusOrder = { PENDING: 1, PREPARING: 2, READY: 3 };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 99;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Utensils className="w-8 h-8 text-primary" /> {t.title}
          </h1>
          <p className="text-slate-400">
            {restaurant?.name || "Restaurant"} • {user?.fullName || user?.email} • {sortedOrders.length} {t.active}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()}
            className="bg-slate-800 border-slate-700 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <Languages className="w-5 h-5 text-slate-400" />
            <div className="flex gap-1">
              {(["en", "es", "hi"] as const).map((l) => (
                <Button 
                  key={l}
                  variant={language === l ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage(l)}
                  className="uppercase text-xs font-bold"
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleLogout}
            className="bg-slate-800 border-slate-700 hover:bg-red-900/50 hover:border-red-500 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-32">
          <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-green-500 opacity-50" />
          <p className="text-2xl font-bold text-slate-400">{t.noOrders}</p>
          <p className="text-slate-500 mt-2">{t.allDone}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedOrders.map((order: Order) => {
            const urgent = isUrgent(order);
            const mins = getMinutesSince(order.createdAt);
            
            return (
              <Card key={order.id} className={cn(
                "bg-slate-800 border-slate-700 text-slate-50 overflow-hidden transition-all",
                order.status === "PENDING" 
                  ? urgent 
                    ? "ring-2 ring-red-500 animate-pulse" 
                    : "ring-2 ring-yellow-500/50" 
                  : order.status === "READY"
                    ? "ring-2 ring-green-500/50"
                    : "ring-1 ring-blue-500/50"
              )}>
                <CardHeader className={cn(
                  "pb-3 flex flex-row items-center justify-between",
                  order.status === "PENDING" 
                    ? urgent ? "bg-red-500/20" : "bg-yellow-500/10" 
                    : order.status === "READY"
                      ? "bg-green-500/20"
                      : "bg-blue-500/10"
                )}>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {order.table?.tableNumber ? (
                        <>{t.table} {order.table.tableNumber}</>
                      ) : (
                        order.guestName || `#${order.id.slice(-4)}`
                      )}
                      {urgent && <AlertCircle className="w-5 h-5 text-red-500" />}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                      <Timer className="w-4 h-4" /> 
                      <span className={cn(mins > 15 && "text-red-400 font-bold")}>
                        {mins} {t.mins}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="uppercase text-xs">{order.orderType}</span>
                      {order.placedByStaff && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-blue-400">👤 {order.placedByStaff.fullName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={order.status === "PENDING" ? "destructive" : order.status === "READY" ? "default" : "default"} 
                    className={cn(
                      order.status === "PENDING" && "animate-pulse",
                      order.status === "PREPARING" && "bg-blue-600",
                      order.status === "READY" && "bg-green-600"
                    )}
                  >
                    {order.status === "PENDING" ? t.new : order.status === "READY" ? "READY" : t.preparing}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2 min-h-[120px] max-h-[200px] overflow-y-auto">
                    {order.items?.map((item: OrderItem, i: number) => {
                    // Check if item has customization
                    const hasCustomization = !!(
                      item.variantName ||
                      (item.selectedModifiers && item.selectedModifiers.length > 0)
                    );

                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "flex items-start gap-3 text-lg font-medium border-b border-slate-700/50 pb-2",
                          hasCustomization && "bg-blue-900/20 p-2 rounded-lg border-blue-500/30"
                        )}
                      >
                        <span className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Item Name */}
                          <p className="truncate font-bold">{item.itemName}</p>
                          
                          {/* Variant (Size/Portion) */}
                          {item.variantName && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                                SIZE:
                              </span>
                              <span className="text-sm text-blue-200 font-semibold">
                                {item.variantName}
                              </span>
                            </div>
                          )}
                          
                          {/* Modifiers */}
                          {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded font-bold">
                                ADD-ONS:
                              </span>
                              <div className="pl-2 space-y-0.5">
                                {item.selectedModifiers.map((mod, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                    <span className="text-yellow-200">{mod.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Special Notes */}
                          {item.notes && (
                            <p className="text-sm text-yellow-400 mt-1">
                              <span className="bg-yellow-500/20 px-2 py-0.5 rounded font-bold text-xs">
                                ⚠️ NOTE:
                              </span>
                              {" "}{item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {order.items?.some((item: OrderItem) => 
                    item.variantName || (item.selectedModifiers && item.selectedModifiers.length > 0)
                  ) && (
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                      Customized
                    </Badge>
                  )}
                
                  {order.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-200">
                      <strong>Note:</strong> {order.notes}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {order.status === "PENDING" ? (
                      <Button 
                        className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 font-bold" 
                        onClick={() => handleStartOrder(order.id)}
                        disabled={startOrder.isPending}
                      >
                        {startOrder.isPending ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <Utensils className="w-5 h-5 mr-2" />
                        )}
                        {t.prepare}
                      </Button>
                    ) : order.status === "PREPARING" ? (
                      <Button 
                        className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 font-bold" 
                        onClick={() => handleCompleteOrder(order.id)}
                        disabled={completeOrder.isPending}
                      >
                        {completeOrder.isPending ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                        )}
                        {t.ready}
                      </Button>
                    ) : (
                      <div className="w-full h-14 flex items-center justify-center bg-green-600/50 border-2 border-green-500 rounded-lg font-bold text-green-300">
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        READY FOR PICKUP
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
