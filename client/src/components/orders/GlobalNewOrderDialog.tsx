import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ShoppingBag, X, ExternalLink, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const alertAudio =
  typeof window !== "undefined" ? new Audio("/sounds/order-notification.mp3") : null;
if (alertAudio) alertAudio.preload = "auto";
let alertStopTimer: ReturnType<typeof setTimeout> | null = null;

function playAlert() {
  if (!alertAudio) return;
  if (alertStopTimer) { clearTimeout(alertStopTimer); alertStopTimer = null; }
  alertAudio.currentTime = 0;
  alertAudio.play().catch(() => { });
  alertStopTimer = setTimeout(() => {
    if (!alertAudio) return;
    alertAudio.pause();
    alertAudio.currentTime = 0;
  }, 2000);
}

interface QueuedOrder {
  key: string;
  orderId: string;
  tableNum: string | null;
  orderNumber?: number;
  requiresVerification: boolean;
  itemIds: string[];
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    totalPrice: string;
    variantName?: string | null;
  }>;
  isAddingToExistingSession?: boolean;
  hasExistingTableOrder?: boolean;
  existingTableOrderId?: string | null;
}

export function GlobalNewOrderDialog({
  restaurantId,
}: {
  restaurantId: string | null;
}) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [queue, setQueue] = useState<QueuedOrder[]>([]);
  const processingRef = useRef<Set<string>>(new Set());
  // Use a ref to always read latest restaurantId inside the stable event handler
  const restaurantIdRef = useRef(restaurantId);
  useEffect(() => { restaurantIdRef.current = restaurantId; }, [restaurantId]);

  const active = queue[0] || null;

  const dismiss = useCallback(
    (key: string) => setQueue((prev) => prev.filter((r) => r.key !== key)),
    []
  );

  const respond = useCallback(
    async (req: QueuedOrder, action: "accept" | "reject" | "merge") => {
      const rId = restaurantIdRef.current;
      if (!rId) return;
      if (processingRef.current.has(req.key)) return;
      processingRef.current.add(req.key);
      try {
        const token = localStorage.getItem("token");
        const body: any = { action, itemIds: req.itemIds };
        if (action === "merge" && req.existingTableOrderId) {
          body.mergeTargetOrderId = req.existingTableOrderId;
        }

        const res = await fetch(`/api/restaurants/${rId}/orders/${req.orderId}/verify-items`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to process order items");
        dismiss(req.key);
        
        const successMsg = action === "accept" 
          ? "Order accepted successfully" 
          : action === "merge" 
            ? "Merged with existing order successfully" 
            : "Order rejected successfully";
        toast.success(successMsg);
        
        queryClient.invalidateQueries({ queryKey: ["orders", rId] });
        queryClient.invalidateQueries({ queryKey: ["orders-kitchen", rId] });
        queryClient.invalidateQueries({ queryKey: ["orders-stats", rId] });
      } catch (err: any) {
        toast.error(err?.message || "Failed to process order");
      } finally {
        processingRef.current.delete(req.key);
      }
    },
    [queryClient, dismiss]
  );

  // Register the listener UNCONDITIONALLY on mount — no restaurantId gate here
  // so we never miss events that fire before restaurantId resolves
  useEffect(() => {
    const handle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const order = detail?.order;
      if (!order?.id) return;

      const requiresVerification = !!detail.requiresVerification;

      // For verification orders: show only unverified items
      // For confirmed orders: show all items
      const relevantItems = requiresVerification
        ? (order.items || []).filter((i: any) => i.isVerified === false)
        : (order.items || []);

      if (relevantItems.length === 0) return;

      const itemIds = relevantItems.map((i: any) => i.id as string);
      const requestKey = `${order.id}:${requiresVerification ? "v" : "c"}`;
      const tableNum: string | null =
        order?.table?.tableNumber ?? order?.tableNumber ?? null;

      setQueue((prev) => {
        if (prev.some((r) => r.key === requestKey)) return prev;
        return [
          {
            key: requestKey,
            orderId: order.id,
            tableNum,
            orderNumber: order?.orderNumber,
            requiresVerification,
            itemIds,
            items: relevantItems.map((item: any) => ({
              id: item.id,
              itemName: item.itemName,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
              variantName: item.variantName ?? null,
            })),
            isAddingToExistingSession: !!order.isAddingToExistingSession,
            hasExistingTableOrder: !!order.hasExistingTableOrder,
            existingTableOrderId: order.existingTableOrderId ?? null,
          },
          ...prev,
        ];
      });
      playAlert();
    };

    window.addEventListener("order_new_customer_order", handle);
    return () => window.removeEventListener("order_new_customer_order", handle);
  }, []); // ← empty deps — register once, never re-register

  const orderTotal = active
    ? active.items.reduce((sum, i) => sum + parseFloat(i.totalPrice || "0"), 0).toFixed(2)
    : "0";

  const orderLabel = active
    ? active.tableNum
      ? `Table ${active.tableNum}`
      : active.orderNumber
        ? `Order #${String(active.orderNumber).padStart(4, "0")}`
        : "New Order"
    : "";

  return (
    // Always render Dialog — control visibility via open={!!active}
    // This avoids mounting/unmounting the portal on every order, keeping it stable
    <Dialog
      open={!!active}
      onOpenChange={(open) => {
        if (!open && active) dismiss(active.key);
      }}
    >
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
        {active && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg pr-8">
                <ShoppingBag className="w-5 h-5 text-primary shrink-0" />
                New Customer Order
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="font-semibold text-foreground text-sm">{orderLabel}</span>
                  {active.requiresVerification ? (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Needs Approval
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                      Confirmed
                    </Badge>
                  )}
                  {queue.length > 1 && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      +{queue.length - 1} more
                    </Badge>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            {/* Items list */}
            <div className="rounded-md border bg-muted/20 p-3 space-y-1.5 max-h-[200px] overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {active.requiresVerification ? "Items Pending Approval" : "Items Ordered"}
              </p>
              {active.items.map((item, idx) => (
                <div
                  key={item.id ?? idx}
                  className="flex items-start justify-between gap-2 rounded border bg-background px-2 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {item.quantity}× {item.itemName}
                    </div>
                    {item.variantName && (
                      <p className="text-xs text-muted-foreground mt-0.5">Size: {item.variantName}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    ₹{parseFloat(item.totalPrice || "0").toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <Separator />
            <div className="flex items-baseline justify-between font-bold text-sm sm:text-base">
              <span>{active.requiresVerification ? "Request Total" : "Order Total"}</span>
              <span className="text-primary text-lg tabular-nums">₹{orderTotal}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                className="sm:mr-auto gap-2 text-muted-foreground w-full sm:w-auto"
                onClick={() => {
                  setLocation(`/dashboard/orders#verify-${active.orderId}`);
                  dismiss(active.key);
                }}
              >
                <ExternalLink className="w-4 h-4" />
                More Details
              </Button>

              {active.requiresVerification ? (
                <>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                    onClick={() => respond(active, "reject")}
                    disabled={processingRef.current.has(active.key)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject
                  </Button>
                  
                  {active.hasExistingTableOrder && !active.isAddingToExistingSession ? (
                    <>
                      <Button
                        variant="outline"
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex-1 sm:flex-none whitespace-nowrap"
                        onClick={() => respond(active, "merge")}
                        disabled={processingRef.current.has(active.key)}
                      >
                        <ShoppingBag className="w-4 h-4 mr-1.5" />
                        Add to Existing
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold flex-1 sm:flex-none whitespace-nowrap"
                        onClick={() => respond(active, "accept")}
                        disabled={processingRef.current.has(active.key)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        New Order
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold flex-1 sm:flex-none"
                      onClick={() => respond(active, "accept")}
                      disabled={processingRef.current.has(active.key)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Accept
                    </Button>
                  )}
                </>
              ) : (
                <Button className="flex-1 sm:flex-none" onClick={() => dismiss(active.key)}>
                  Got it
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
