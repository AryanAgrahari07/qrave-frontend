import { useEffect, useRef, useCallback } from "react";
import { useCart } from "./CartContext";
import { buildUrl } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Receipt,
  Clock,
  BellRing,
  CheckCircle2,
  XCircle,
  PartyPopper,
  Download,
  LogOut,
  ChefHat,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generatePDFBill } from "@/lib/pdf-utils";
import { BillData } from "@/lib/thermal-printer-utils";

/* ─── helpers ─────────────────────────────────────────────────────────── */

const TERMINAL_STATUSES = new Set(["PAID", "CLOSED", "CANCELLED"]);

function humanStatus(status: string): string {
  const map: Record<string, string> = {
    AWAITING_VERIFICATION: "Awaiting Confirmation",
    PENDING: "Pending",
    PREPARING: "Being Prepared",
    READY: "Ready to Serve",
    SERVED: "Served",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

/* ─── main component ─────────────────────────────────────────────────── */

export function OrderTrackingDrawer({
  restaurantSlug,
  restaurantName,
  currency,
  open,
  onOpenChange,
}: {
  restaurantSlug: string;
  restaurantName: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, setOrderSession, clearOrderSession } = useCart();
  const queryClient = useQueryClient();

  // Fetch current order status
  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ["customerOrder", state.orderId],
    queryFn: async () => {
      if (!state.orderId || !state.customerSessionId) return null;
      const res = await fetch(
        buildUrl(`/api/public/restaurants/${restaurantSlug}/orders/${state.orderId}`),
        { headers: { "x-customer-session-id": state.customerSessionId } }
      );
      if (!res.ok) {
        if (res.status === 404 || res.status === 403) {
          clearOrderSession();
          onOpenChange(false);
          throw new Error("Order not found or expired");
        }
        throw new Error("Failed to fetch order status");
      }
      return res.json();
    },
    enabled: !!state.orderId && !!state.customerSessionId && open,
    refetchInterval: 15000, // Backup polling in case WS fails
  });

  // Fallback recovery if WebSocket drops and the REST API tells us it was merged
  useEffect(() => {
    if (orderData?.mergedIntoOrderId && state.customerSessionId && open) {
      toast.success("Your request was added to the table's active order.", { duration: 5000, id: "merge-fallback" });
      setOrderSession(orderData.mergedIntoOrderId, state.customerSessionId);
    }
  }, [orderData?.mergedIntoOrderId, state.customerSessionId, setOrderSession, open]);

  // Call Waiter API
  const callWaiterMut = useMutation({
    mutationFn: async () => {
      if (!state.orderId || !state.customerSessionId) return;
      const res = await fetch(
        buildUrl(`/api/public/restaurants/${restaurantSlug}/orders/${state.orderId}/call-waiter`),
        {
          method: "POST",
          headers: { "x-customer-session-id": state.customerSessionId },
        }
      );
      if (!res.ok) throw new Error("Failed to call waiter");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Waiter has been notified! They will be with you shortly.", {
        icon: <BellRing className="w-5 h-5 text-primary" />,
      });
    },
    onError: () =>
      toast.error("Failed to notify waiter. Please try again or wave to staff."),
  });

  // Track the last toast-notified status to avoid duplicate toasts
  const lastNotifiedStatus = useRef<string | null>(null);

  // WebSocket real-time updates
  useEffect(() => {
    if (!state.customerSessionId || !open) return;

    let isMounted = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostUrlInfo = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host;

    const url = `${protocol}//${hostUrlInfo}/ws`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      if (!isMounted) return;
      socket.send(
        JSON.stringify({
          type: "join_customer_order",
          customerSessionId: state.customerSessionId,
        })
      );

      const pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 15000);
      (socket as any)._pingInterval = pingInterval;
    };

    socket.onmessage = (messageEvent) => {
      try {
        const payload = JSON.parse(messageEvent.data);
        if (
          payload.type === "pong" ||
          payload.type === "hello" ||
          payload.type === "joined_customer_order"
        )
          return;

        if (
          payload.type === "event" &&
          payload.event === "order.customer_status_updated"
        ) {
          const data = payload.data;
          if (data.orderId !== state.orderId) return;

          // Refresh order data
          queryClient.invalidateQueries({
            queryKey: ["customerOrder", state.orderId],
          });

          // Only toast if status changed
          if (lastNotifiedStatus.current === data.status) return;
          lastNotifiedStatus.current = data.status;

          const wasRejectionAction = data.verificationAction === "reject";

          if (data.status === "PAID") {
            toast.success("Your bill has been generated! 🎉", {
              description: "Tap 'View Order' to see your bill and download it.",
              duration: 8000,
            });
            onOpenChange(true);
          } else if (data.status === "CLOSED") {
            toast.info("Your order session has been closed.", { duration: 6000 });
            onOpenChange(true);
          } else if (data.status === "MERGED") {
            toast.success("Your request was added to the table's active order.", { duration: 5000 });
            if (data.mergeTargetOrderId && state.customerSessionId) {
              setOrderSession(data.mergeTargetOrderId, state.customerSessionId);
            }
          } else if (data.status === "CANCELLED") {
            if (wasRejectionAction) {
              toast.error("All your items were declined by the restaurant.", {
                description: "You can add new items and place a fresh order.",
                duration: 8000,
              });
            } else {
              toast.error("Your order has been cancelled.", { duration: 6000 });
            }
            clearOrderSession();
            onOpenChange(false);
          } else if (wasRejectionAction) {
            // Partial rejection — some items removed but order is still alive
            toast.warning("Some items were declined by the restaurant.", {
              description:
                "The remaining items are being prepared. Check your order for details.",
              duration: 8000,
            });
          } else {
            toast("Order Update", {
              description: `Status: ${humanStatus(data.status)}`,
            });
          }
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    return () => {
      isMounted = false;
      if ((socket as any)._pingInterval) clearInterval((socket as any)._pingInterval);
      if (socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [state.customerSessionId, state.orderId, open, queryClient]);

  const handleCloseSession = useCallback(() => {
    clearOrderSession();
    onOpenChange(false);
  }, [clearOrderSession, onOpenChange]);

  const handleDownloadBill = useCallback(() => {
    if (!orderData?.order || !restaurantName) return;
    const order = orderData.order;

    // Build items
    const items = order.items?.map((item: any) => {
      const qty = Number(item.quantity || 0);
      const total = Number(item.totalPrice || 0);
      const unit = Number(item.unitPrice) || (qty ? total / qty : 0);
      return {
        name: item.itemName + (item.variantName ? ` (${item.variantName})` : ''),
        quantity: qty,
        price: unit,
        total: total,
      };
    }) || [];

    const billData: BillData = {
      restaurant: {
        name: restaurantName,
      },
      bill: {
        billNumber: `ORD-${order.orderNumber || ''}`,
        date: new Date(order.closedAt || order.updatedAt || Date.now()).toLocaleDateString('en-IN'),
        time: new Date(order.closedAt || order.updatedAt || Date.now()).toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: false
        }),
        dineIn: order.tableId ? 'Dine In' : 'Takeaway',
        guestName: order.guestName,
      },
      items,
      totals: {
        subtotal: parseFloat(order.subtotalAmount || "0"),
        gst: parseFloat(order.gstAmount || "0"),
        cgst: parseFloat(order.gstAmount || "0") / 2,
        sgst: parseFloat(order.gstAmount || "0") / 2,
        serviceCharge: parseFloat(order.serviceTaxAmount || "0"),
        discount: parseFloat(order.discountAmount || "0"),
        roundOff: 0,
        grandTotal: parseFloat(order.totalAmount || "0"),
      },
      currency: currency
    };

    generatePDFBill(billData);
  }, [orderData?.order, restaurantName, currency]);

  const order = orderData?.order;
  const isPaid = order?.status === "PAID" || order?.paymentStatus === "PAID";
  const isClosed = order?.status === "CLOSED" || order?.isClosed === true;
  const isTerminal = isClosed || (order && TERMINAL_STATUSES.has(order.status));
  const showBill = isPaid || isClosed;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-4 sm:px-6 border-b bg-muted/20">
            <SheetTitle className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xl font-heading">
                <Receipt className="w-5 h-5 text-primary" />
                {showBill ? "Your Bill" : "Order Tracking"}
              </div>
              {order && (
                <div className="flex items-center text-xs font-semibold text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded-md mt-1">
                  # {order.orderNumber}
                </div>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Checking order status...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <XCircle className="w-10 h-10 text-destructive opacity-80" />
                <p className="text-sm text-muted-foreground">
                  {(error as Error).message || "Failed to load order"}
                </p>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            ) : !order ? (
              <div className="text-center text-sm py-12 text-muted-foreground">
                No active order found.
              </div>
            ) : (
              <>
                {/* ── Status Banner ── */}
                {isPaid ? (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-5 text-center">
                    <div className="flex justify-center mb-3">
                      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <PartyPopper className="w-7 h-7 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <p className="text-green-700 dark:text-green-300 font-bold text-lg">
                      Payment Received!
                    </p>
                    <p className="text-green-600/80 dark:text-green-400/70 text-sm mt-1">
                      Thank you for dining with us. Your bill is ready below.
                    </p>
                  </div>
                ) : isClosed ? (
                  <div className="bg-muted/60 border border-border rounded-2xl p-5 text-center">
                    <div className="flex justify-center mb-3">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-foreground/60" />
                      </div>
                    </div>
                    <p className="font-bold text-lg">Order Closed</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      This order session has been closed.
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-xl p-4 flex items-center justify-between",
                      order.status === "PREPARING"
                        ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                        : order.status === "READY" || order.status === "SERVED"
                        ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                        : "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <div>
                      <p
                        className={cn(
                          "text-xs font-bold uppercase tracking-wider mb-1",
                          order.status === "PREPARING"
                            ? "text-orange-600 dark:text-orange-400"
                            : order.status === "READY" || order.status === "SERVED"
                            ? "text-green-600 dark:text-green-400"
                            : "text-primary"
                        )}
                      >
                        Current Status
                      </p>
                      <p className="text-lg font-bold">{humanStatus(order.status)}</p>
                    </div>
                    {order.status === "AWAITING_VERIFICATION" ||
                    order.status === "PENDING" ? (
                      <Clock className="w-8 h-8 text-primary animate-pulse" />
                    ) : order.status === "PREPARING" ? (
                      <ChefHat className="w-8 h-8 text-orange-500 animate-pulse" />
                    ) : order.status === "READY" || order.status === "SERVED" ? (
                      <Utensils className="w-8 h-8 text-green-500" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                    )}
                  </div>
                )}

                {/* ── Call Waiter (only for non-terminal orders) ── */}
                {!isTerminal && (
                  <div className="grid gap-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-base font-semibold border-primary/20 text-foreground"
                      onClick={() => callWaiterMut.mutate()}
                      disabled={callWaiterMut.isPending}
                    >
                      <BellRing className="w-5 h-5 mr-3 text-primary" />
                      {callWaiterMut.isPending ? "Calling..." : "Call Waiter"}
                    </Button>
                  </div>
                )}

                {/* ── Items List ── */}
                <div className="space-y-4 pt-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    Items Ordered
                  </h3>
                  <div className="space-y-3">
                    {order.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          {item.isVerified === false && (
                            <Badge
                              variant="outline"
                              className="mb-1 text-[9px] h-4 leading-none bg-orange-50 text-orange-600 border-orange-200 uppercase px-1"
                            >
                              Unverified
                            </Badge>
                          )}
                          <p className="font-medium text-sm">
                            <span className="text-primary font-bold mr-2">
                              {item.quantity}×
                            </span>
                            {item.itemName}
                          </p>
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Size: {item.variantName}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.selectedModifiers?.map((mod: any, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                              >
                                {mod.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="font-semibold text-sm whitespace-nowrap ml-4">
                          {currency}
                          {parseFloat(item.totalPrice).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Bill Download Section (only for PAID/CLOSED) ── */}
                {showBill && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                      Bill Summary
                    </h3>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>
                        {currency}
                        {parseFloat(order.subtotalAmount).toFixed(2)}
                      </span>
                    </div>
                    {parseFloat(order.gstAmount) > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>GST</span>
                        <span>
                          {currency}
                          {parseFloat(order.gstAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {parseFloat(order.serviceTaxAmount) > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Service Charge</span>
                        <span>
                          {currency}
                          {parseFloat(order.serviceTaxAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                      <span>Total {isPaid ? "Paid" : ""}</span>
                      <span className="text-primary">
                        {currency}
                        {parseFloat(order.totalAmount).toFixed(2)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full mt-3 h-11 font-semibold border-primary/30 text-primary hover:bg-primary/5"
                      onClick={handleDownloadBill}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download / Print Bill
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          {order && (
            <div className="p-4 sm:p-6 bg-background border-t shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
              <Button
                className="w-full h-12 text-base rounded-xl"
                variant={isPaid || isClosed ? "default" : "outline"}
                onClick={handleCloseSession}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Close Order & Clear Session
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
