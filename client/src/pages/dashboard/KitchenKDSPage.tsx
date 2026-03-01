import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Languages, Utensils, Timer, Loader2, RefreshCw, AlertCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useKitchenOrders, useKitchenStartOrder, useKitchenCompleteOrder, useRestaurant } from "@/hooks/api";
import type { Order, OrderItem } from "@/types";
import { differenceInMinutes } from "date-fns";
import { useLocation } from "wouter";
export default function KitchenKDSPage() {
  const [_, setLocation] = useLocation();
  const { restaurantId, user, logout } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: orders, isLoading, refetch } = useKitchenOrders(restaurantId);
  const startOrder = useKitchenStartOrder(restaurantId);
  const completeOrder = useKitchenCompleteOrder(restaurantId);

  // Local-only KDS convenience: allow kitchen staff to tick off items as they prepare them.
  // This is intentionally not persisted to the backend.
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(() => new Set());

  const allVisibleItemIds = useMemo(() => {
    const ids: string[] = [];
    for (const o of orders || []) {
      for (const it of o.items || []) ids.push(it.id);
    }
    return ids;
  }, [orders]);

  // Prune checked items that are no longer visible (e.g. order completed / list refreshed)
  useEffect(() => {
    setCheckedItemIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(allVisibleItemIds);
      const next = new Set<string>();
      prev.forEach(id => {
        if (visible.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [allVisibleItemIds]);

  const toggleItemChecked = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  const { t, language } = useLanguage();
  const [section, setSection] = useState<"active" | "ready">("active");

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

  // Sort orders only by time (oldest first).
  // This prevents cards from re-ordering when status changes (e.g. clicking "Start Preparing").
  const sortedOrders = [...(orders || [])].sort((a: Order, b: Order) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Keep READY orders "aside" so they don't mix with the cooking workflow.
  const readyOrders = sortedOrders.filter((o) => o.status === "READY");
  const activeOrders = sortedOrders.filter((o) => o.status !== "READY");

  // If there are no READY orders anymore, force the view back to Active.
  useEffect(() => {
    if (readyOrders.length === 0) setSection("active");
  }, [readyOrders.length]);

  const renderOrderCard = (order: Order) => {
    const urgent = isUrgent(order);
    const mins = getMinutesSince(order.createdAt);

    return (
      <Card
        key={order.id}
        className={cn(
          "bg-white border border-black text-black overflow-hidden transition-all shadow-sm ",
          "ring-0"
        )}
      >
        <CardHeader
          className={cn(
            "py-2 px-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between bg-gray-100 border-b border-black",
            // Keep header consistently light gray for readability; use a left border as status indicator.
            order.status === "PENDING"
              ? urgent
                ? "border-l-4 border-gray-500"
                : "border-l-4 border-yellow-500"
              : order.status === "READY"
                ? "border-l-4 border-green-600"
                : "border-l-4 border-blue-600"
          )}
        >
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2 leading-tight flex-wrap">
              {order.table?.tableNumber ? (
                <>
                  {t("kitchen.table")} {order.table.tableNumber}
                </>
              ) : (
                order.guestName || `#${order.id.slice(-4)}`
              )}
              {urgent && <AlertCircle className="w-5 h-5 text-gray-500" />}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-600 text-xs mt-0.5">
              <Timer className="w-4 h-4" />
              <span className={cn(mins > 15 && "text-yellow-700 font-bold")}>
                {mins} {t("kitchen.mins")}
              </span>
              <span className="text-gray-400">•</span>
              <span className="uppercase text-xs">{order.orderType}</span>
              {order.placedByStaff && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs text-blue-700">👤 {order.placedByStaff.fullName}</span>
                </>
              )}
            </div>
          </div>
          <Badge
            variant={order.status === "PENDING" ? "destructive" : order.status === "READY" ? "default" : "default"}
            className={cn(
              "text-[10px] px-2 py-0.5 self-start sm:self-auto",
              order.status === "PREPARING" && "bg-blue-600",
              order.status === "READY" && "bg-green-600"
            )}
          >
            {order.status === "PENDING" ? t("kitchen.new") : order.status === "READY" ? t("kitchen.ready") : t("kitchen.preparing")}
          </Badge>
        </CardHeader>

        <CardContent className="pt-3 px-3 pb-3 space-y-3">
          <div className="space-y-2 min-h-[120px] max-h-[180px] sm:max-h-[200px] overflow-y-auto">
            {order.items?.filter((item: OrderItem) => item.status !== "SERVED").sort((a: OrderItem, b: OrderItem) => {
              const statusOrder = { "PENDING": 0, "PREPARING": 1, "READY": 2, "SERVED": 3 };
              const aVal = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
              const bVal = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
              return aVal - bVal;
            }).map((item: OrderItem) => {
              const strikeThrough = item.status === "SERVED" || item.status === "READY";
              const checked = strikeThrough || checkedItemIds.has(item.id);

              const hasCustomization = !!(
                item.variantName ||
                (item.selectedModifiers && item.selectedModifiers.length > 0)
              );

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start justify-between gap-3 border-b border-gray-200 pb-2 relative",
                    hasCustomization && !strikeThrough && "bg-blue-50 p-2 rounded-none border border-blue-200",
                    strikeThrough && "bg-gray-50 opacity-50",
                    checked && !strikeThrough && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <Checkbox
                      checked={checked}
                      disabled={strikeThrough}
                      onCheckedChange={() => toggleItemChecked(item.id)}
                      className="mt-1"
                      aria-label={`Mark ${item.itemName} as done`}
                    />

                    <div className="min-w-0 flex-1 space-y-0.5 mt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={cn(
                            "font-semibold text-sm whitespace-normal break-words",
                            checked && "line-through"
                          )}
                        >
                          {item.itemNameTranslations?.[language] || item.itemName}
                        </p>
                        {item.status === "PENDING" && order.status !== "PENDING" && (
                          <Badge variant="destructive" className="px-1 py-0 text-[9px] h-4">{t("kitchen.new")}</Badge>
                        )}
                        {item.status === "PREPARING" && (
                          <Badge variant="secondary" className="px-1 py-0 text-[9px] h-4 bg-blue-100 text-blue-700">PREPARING</Badge>
                        )}
                        {item.status === "READY" && (
                          <Badge variant="default" className="px-1 py-0 text-[9px] h-4 bg-green-600">READY</Badge>
                        )}
                        {item.status === "SERVED" && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px] h-4 text-gray-500">SERVED</Badge>
                        )}
                      </div>

                      {item.variantName && (
                        <div className={cn("flex items-center gap-2", checked && "line-through")}>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                            SIZE
                          </span>
                          <span className="text-xs text-blue-900 font-medium">
                            {item.variantNameTranslations?.[language] || item.variantName}
                          </span>
                        </div>
                      )}

                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div className={cn("space-y-0.5", checked && "line-through")}>
                          <span className="text-[10px] bg-yellow-100 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
                            ADD-ONS
                          </span>
                          <div className="pl-2 space-y-0.5">
                            {item.selectedModifiers.map((mod: any, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                <span className="text-yellow-900">
                                  {mod.nameTranslations?.[language] || mod.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.notes && (
                        <p className={cn("text-xs text-yellow-900 mt-0.5", checked && "line-through")}>
                          <span className="bg-yellow-100 px-1.5 py-0.5 rounded font-bold text-[10px]">NOTE</span>{" "}
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="ml-2 w-8 h-8 rounded-none bg-gray-200 text-black flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {item.quantity}
                  </span>
                </div>
              );
            })}
          </div>

          {order.items?.some((item: OrderItem) => item.variantName || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
            <Badge className="bg-blue-50 text-blue-800 border border-blue-200">Customized</Badge>
          )}

          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-none p-3 text-sm text-yellow-900">
              <strong>Note:</strong> {order.notes}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 pt-2">
            {order.status === "PENDING" ? (
              <Button
                className="w-full h-11 text-sm bg-blue-600 hover:bg-blue-700 font-semibold"
                onClick={() => handleStartOrder(order.id)}
                disabled={startOrder.isPending}
              >
                {startOrder.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Utensils className="w-5 h-5 mr-2" />
                )}
                {t("kitchen.prepare")}
              </Button>
            ) : order.status === "PREPARING" ? (
              <Button
                className="w-full h-11 text-sm bg-green-600 hover:bg-green-700 font-semibold"
                onClick={() => handleCompleteOrder(order.id)}
                disabled={completeOrder.isPending}
              >
                {completeOrder.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                {t("kitchen.ready")}
              </Button>
            ) : (
              <div className="w-full h-11 flex items-center justify-center bg-green-50 border-2 border-green-200 rounded-none font-semibold text-sm text-green-800">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {t("kitchen.readyForPickup").toUpperCase()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-200 text-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 text-black p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <Utensils className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" /> {t("kitchen.title")}
          </h1>
          <p className="text-gray-600">
            {restaurant?.name || "Restaurant"} • {user?.fullName || user?.email} • {activeOrders.length} {t("kitchen.active")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="bg-white border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <LanguageSelector className="bg-white text-black" />

          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            className="bg-white border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {readyOrders.length > 0 && (
        <div className="mb-3">
          <div className="inline-flex w-full sm:w-auto bg-white border border-black shadow-sm h-10">
            <button
              onClick={() => setSection("active")}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-black/30",
                section === "active" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
              )}
            >
              Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setSection("ready")}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2 text-sm font-semibold transition-colors border-l border-black focus:outline-none focus:ring-2 focus:ring-black/30",
                section === "ready" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
              )}
            >
              Ready ({readyOrders.length})
            </button>
          </div>
        </div>
      )}

      {activeOrders.length === 0 && readyOrders.length === 0 ? (
        <div className="text-center py-32">
          <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-green-500 opacity-50" />
          <p className="text-2xl font-bold text-gray-700">{t("kitchen.noOrders")}</p>
          <p className="text-gray-600 mt-2">{t("kitchen.allDone")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {section === "ready" ? (
            readyOrders.length > 0 ? (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">
                  Ready for pickup ({readyOrders.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {readyOrders.map(renderOrderCard)}
                </div>
              </div>
            ) : null
          ) : (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">
                Active ({activeOrders.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                {activeOrders.map(renderOrderCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
