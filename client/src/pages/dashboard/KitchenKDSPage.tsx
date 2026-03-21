import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Languages, Utensils, Timer, Loader2, RefreshCw, AlertCircle, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useKitchenOrders, useKitchenStartOrder, useKitchenCompleteOrder, useRestaurant } from "@/hooks/api";
import type { Order, OrderItem } from "@/types";
import { differenceInMinutes } from "date-fns";
import { useLocation } from "wouter";
export default function KitchenKDSPage() {
  const [_, setLocation] = useLocation();
  const { restaurantId, user, logout } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: orders, isLoading, refetch, isRefetching } = useKitchenOrders(restaurantId);
  const startOrder = useKitchenStartOrder(restaurantId);
  const completeOrder = useKitchenCompleteOrder(restaurantId);

  const { t, language } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();

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

  const toggleItemChecked = useCallback((itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setLocation("/auth");
  }, [logout, setLocation]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refetch]);

  const [section, setSection] = useState<"active" | "ready">("active");

  const handleStartOrder = useCallback(async (orderId: string) => {
    try {
      await startOrder.mutateAsync(orderId);
    } catch {
      // Error handled by mutation
    }
  }, [startOrder]);

  const handleCompleteOrder = useCallback(async (orderId: string) => {
    try {
      await completeOrder.mutateAsync(orderId);
    } catch {
      // Error handled by mutation
    }
  }, [completeOrder]);

  const getMinutesSince = useCallback((dateString: string) => {
    try {
      return differenceInMinutes(new Date(), new Date(dateString));
    } catch {
      return 0;
    }
  }, []);

  const isUrgent = useCallback((order: Order) => {
    const mins = getMinutesSince(order.createdAt);
    return order.status === "PENDING" && mins > 10;
  }, [getMinutesSince]);

  // PERF: Memoize sorted/filtered order lists
  const sortedOrders = useMemo(() =>
    [...(orders || [])].sort((a: Order, b: Order) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ), [orders]);

  const readyOrders = useMemo(() => sortedOrders.filter((o) => o.status === "READY"), [sortedOrders]);
  const activeOrders = useMemo(() => sortedOrders.filter((o) => o.status !== "READY"), [sortedOrders]);

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
          "bg-white dark:bg-card border border-black dark:border-border text-black dark:text-card-foreground overflow-hidden transition-all shadow-sm",
          "ring-0"
        )}
      >
        <CardHeader
          className={cn(
            "py-2 px-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between bg-gray-100 dark:bg-muted/30 border-b border-black dark:border-border",
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
                order.guestName || `#${order.orderNumber ? String(order.orderNumber).padStart(4, "0") : order.id.slice(-4)}`
              )}
              {urgent && <AlertCircle className="w-5 h-5 text-gray-500" />}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-600 dark:text-muted-foreground text-xs mt-0.5">
              <Timer className="w-4 h-4" />
              <span className={cn(mins > 15 && "text-yellow-700 dark:text-yellow-500 font-bold")}>
                {mins} {t("kitchen.mins")}
              </span>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <span className="uppercase text-xs">{order.orderType}</span>
              {order.placedByStaff && (
                <>
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span className="text-xs text-blue-700 dark:text-blue-400">👤 {order.placedByStaff.fullName}</span>
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
                    "flex items-start justify-between gap-3 border-b border-gray-200 dark:border-border pb-2 relative",
                    hasCustomization && !strikeThrough && "bg-blue-50 dark:bg-blue-950/20 p-2 rounded-none border border-blue-200 dark:border-blue-900/50",
                    strikeThrough && "bg-gray-50 dark:bg-transparent opacity-50",
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
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                            SIZE
                          </span>
                          <span className="text-xs text-blue-900 dark:text-blue-200 font-medium">
                            {item.variantNameTranslations?.[language] || item.variantName}
                          </span>
                        </div>
                      )}

                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div className={cn("space-y-0.5", checked && "line-through")}>
                          <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-400 px-1.5 py-0.5 rounded font-bold">
                            ADD-ONS
                          </span>
                          <div className="pl-2 space-y-0.5">
                            {item.selectedModifiers.map((mod: any, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 dark:bg-yellow-500" />
                                <span className="text-yellow-900 dark:text-yellow-400">
                                  {mod.nameTranslations?.[language] || mod.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.notes && (
                        <p className={cn("text-xs text-yellow-900 dark:text-yellow-400 mt-0.5", checked && "line-through")}>
                          <span className="bg-yellow-100 dark:bg-yellow-900/40 px-1.5 py-0.5 rounded font-bold text-[10px]">NOTE</span>{" "}
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="ml-2 w-8 h-8 rounded-none bg-gray-200 dark:bg-muted text-black dark:text-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {item.quantity}
                  </span>
                </div>
              );
            })}
          </div>

          {order.items?.some((item: OrderItem) => item.variantName || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
            <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">Customized</Badge>
          )}

          {order.notes && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-none p-3 text-sm text-yellow-900 dark:text-yellow-400">
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
              <div className="w-full h-11 flex items-center justify-center bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-900/50 rounded-none font-semibold text-sm text-green-800 dark:text-green-400">
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
      <div className="min-h-screen bg-gray-200 dark:bg-background p-3 sm:p-4 lg:p-6 text-black dark:text-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
          <Skeleton className="h-10 w-64 bg-gray-300 dark:bg-muted" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 bg-gray-300" />
            <Skeleton className="h-10 w-32 bg-gray-300" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-white dark:bg-card border-gray-300 dark:border-border text-black dark:text-card-foreground shadow-sm ring-0">
              <CardHeader className="py-2 px-3 bg-gray-100 dark:bg-muted/20 border-b border-gray-200 dark:border-border">
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent className="p-3">
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-background text-black dark:text-foreground p-3 sm:p-4 lg:p-6">
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
            onClick={handleRefresh}
            disabled={isRefetching || isRefreshing}
            className="bg-white dark:bg-card border-gray-300 dark:border-border hover:bg-gray-50 dark:hover:bg-muted"
          >
            <RefreshCw className={cn("w-4 h-4", (isRefetching || isRefreshing) && "animate-spin")} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 border border-gray-300 dark:border-border rounded-md text-slate-500 dark:text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-card transition-colors shrink-0 bg-white dark:bg-card"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 transition-transform duration-300 rotate-0" />
            ) : (
              <Moon className="h-4 w-4 transition-transform duration-300 rotate-0" />
            )}
          </Button>

          <LanguageSelector className="bg-white dark:bg-card text-foreground shrink-0" />

          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            className="bg-white dark:bg-card border-gray-300 dark:border-border hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-300 dark:hover:border-red-900 hover:text-red-700 dark:hover:text-red-400"
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
          <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-green-500 opacity-50 dark:opacity-30" />
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{t("kitchen.noOrders")}</p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t("kitchen.allDone")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {section === "ready" ? (
            readyOrders.length > 0 ? (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2">
                  Ready for pickup ({readyOrders.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {readyOrders.map(renderOrderCard)}
                </div>
              </div>
            ) : null
          ) : (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2">
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
