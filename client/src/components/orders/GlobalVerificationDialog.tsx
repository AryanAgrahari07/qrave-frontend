import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Utensils, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const alertAudio = typeof window !== "undefined" ? new Audio("/sounds/order-notification.mp3") : null;
if (alertAudio) alertAudio.preload = "auto";
let alertStopTimer: ReturnType<typeof setTimeout> | null = null;

function playVerificationAlert() {
  if (!alertAudio) return;
  if (alertStopTimer) {
    clearTimeout(alertStopTimer);
    alertStopTimer = null;
  }
  alertAudio.currentTime = 0;
  alertAudio.play().catch(() => {});
  alertStopTimer = setTimeout(() => {
    if (!alertAudio) return;
    alertAudio.pause();
    alertAudio.currentTime = 0;
  }, 4000);
}

export function GlobalVerificationDialog({ restaurantId }: { restaurantId: string | null }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [queue, setQueue] = useState<Array<{
    key: string;
    orderId: string;
    itemIds: string[];
    tableNum: string;
    orderNumber?: number;
    unverifiedItems: Array<{ id: string; itemName: string; quantity: number; totalPrice: string; variantName?: string | null }>;
  }>>([]);
  const processingRef = useRef<Set<string>>(new Set());
  const active = useMemo(() => queue[0] || null, [queue]);

  const respond = useCallback(async (requestKey: string, orderId: string, itemIds: string[], action: "accept" | "reject") => {
    if (!restaurantId) return;
    if (processingRef.current.has(requestKey)) return;
    processingRef.current.add(requestKey);
    try {
      await api.patch(`/api/restaurants/${restaurantId}/orders/${orderId}/verify-items`, { action, itemIds });
      setQueue((prev) => prev.filter((req) => req.key !== requestKey));
      toast.success(`Order items ${action === "accept" ? "accepted" : "rejected"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["orders-kitchen", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["orders-stats", restaurantId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to process verification request");
    } finally {
      processingRef.current.delete(requestKey);
    }
  }, [queryClient, restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    const handleVerificationRequired = (e: any) => {
      const detail = e.detail;
      const order = detail?.order;
      const unverifiedItems = (order?.items || []).filter((item: any) => item?.isVerified === false);
      if (!order?.id || unverifiedItems.length === 0) return;

      const itemIds = unverifiedItems.map((i: any) => i.id);
      const requestKey = `${order.id}:${itemIds.slice().sort().join(",")}`;
      const tableNum = order?.table?.tableNumber || order?.tableId?.slice(-4) || "—";

      setQueue((prev) => {
        if (prev.some((r) => r.key === requestKey)) return prev;
        return [{
          key: requestKey,
          orderId: order.id,
          itemIds,
          tableNum,
          orderNumber: order?.orderNumber,
          unverifiedItems: unverifiedItems.map((item: any) => ({
            id: item.id,
            itemName: item.itemName,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            variantName: item.variantName,
          })),
        }, ...prev];
      });
      playVerificationAlert();
    };

    window.addEventListener("order_verification_required", handleVerificationRequired);
    return () => {
      window.removeEventListener("order_verification_required", handleVerificationRequired);
    };
  }, [restaurantId]);

  return (
    <AlertDialog open={!!active} onOpenChange={(open) => { if (!open) return; }}>
      <AlertDialogContent className="max-w-md border-orange-200">
        <button
          type="button"
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
          onClick={() => {
            if (!active) return;
            setQueue((prev) => prev.filter((req) => req.key !== active.key));
          }}
          aria-label="Close verification dialog"
        >
          <X className="w-4 h-4" />
        </button>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
            <Utensils className="w-5 h-5" />
            New Customer Verification
          </AlertDialogTitle>
          <AlertDialogDescription>
            {active
              ? `Table ${active.tableNum} sent an order that needs approval${active.orderNumber ? ` (Order #${String(active.orderNumber).padStart(4, "0")})` : ""}.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {active && (
          <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items Pending</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {active.unverifiedItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 rounded border bg-background px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="font-medium">{item.quantity}x {item.itemName}</div>
                    {item.variantName && (
                      <p className="text-[11px] text-muted-foreground">Size: {item.variantName}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold">
                    {`₹${parseFloat(item.totalPrice || "0").toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="font-medium">Request Total</span>
              <span className="font-bold text-orange-700">
                ₹{active.unverifiedItems.reduce((sum, i) => sum + parseFloat(i.totalPrice || "0"), 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <AlertDialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground mr-auto gap-2"
            onClick={() => {
              if (!active) return;
              setLocation(`/dashboard/orders#verify-${active.orderId}`);
              setQueue((prev) => prev.filter((req) => req.key !== active.key));
            }}
          >
            <ExternalLink className="w-4 h-4" />
            View Full Order
          </Button>
          <div className="flex gap-2">
            <AlertDialogCancel
              onClick={() => {
                if (!active) return;
                respond(active.key, active.orderId, active.itemIds, "reject");
              }}
              disabled={!active || processingRef.current.has(active.key)}
              className="border-red-300 text-red-700 hover:bg-red-50 mt-0"
            >
              Reject
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!active) return;
                respond(active.key, active.orderId, active.itemIds, "accept");
              }}
              disabled={!active || processingRef.current.has(active.key)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Accept Request
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
