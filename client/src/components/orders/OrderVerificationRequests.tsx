import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function OrderVerificationRequests({
  restaurantId,
  orders,
  currency,
  gstRatePercent = 0,
  serviceChargeRatePercent = 0,
}: {
  restaurantId: string;
  orders: any[];
  currency: string;
  gstRatePercent?: number;
  serviceChargeRatePercent?: number;
}) {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const verifyItemsMutation = useMutation({
    mutationFn: async ({ orderId, action, itemIds, mergeTargetOrderId }: { orderId: string; action: "accept" | "reject" | "merge"; itemIds: string[]; mergeTargetOrderId?: string }) => {
      const body: any = { action, itemIds };
      if (action === "merge" && mergeTargetOrderId) {
        body.mergeTargetOrderId = mergeTargetOrderId;
      }
      const res = await fetch(`/api/restaurants/${restaurantId}/orders/${orderId}/verify-items`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to verify items");
      return res.json();
    },
    onSuccess: (_, variables) => {
      const actionName = variables.action === "accept" ? "accepted" : variables.action === "merge" ? "merged" : "rejected";
      toast.success(`Order items ${actionName} successfully`);
      setDetailOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["orders:kitchen", restaurantId] });
    },
    onError: () => {
      toast.error("Failed to process verification request");
    },
  });

  if (!orders || orders.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {orders.map((order) => {
        const unverifiedItems = order.items.filter((i: any) => i.isVerified === false);
        if (unverifiedItems.length === 0) return null;

        const isAddingToExistingSession = order.items.some((i: any) => i.isVerified === true);
        const existingTableOrder = !isAddingToExistingSession && order.table?.id
          ? orders.find((o: any) => o.table?.id === order.table?.id && o.id !== order.id && o.status !== "CANCELLED")
          : null;

        const tableNum = order.table?.tableNumber || null;
        const orderNum = order.orderNumber
          ? String(order.orderNumber).padStart(4, "0")
          : order.id.slice(-4);
        const subtotalNewAmount = unverifiedItems.reduce(
          (acc: number, item: any) => acc + parseFloat(item.totalPrice),
          0
        );
        const gstAmount = subtotalNewAmount * (Math.max(0, gstRatePercent) / 100);
        const serviceChargeAmount =
          order.orderType === "DINE_IN"
            ? subtotalNewAmount * (Math.max(0, serviceChargeRatePercent) / 100)
            : 0;
        const totalNewAmount = subtotalNewAmount + gstAmount + serviceChargeAmount;

        const isTargeted =
          typeof window !== "undefined" && window.location.hash === `#verify-${order.id}`;

        const isDetailOpen = detailOrderId === order.id;

        return (
          <Card
            key={order.id}
            id={`verify-${order.id}`}
            className={cn(
              "relative overflow-hidden border-l-4 border-l-yellow-500 shadow-md hover:shadow-lg transition-all duration-700",
              isTargeted && "ring-2 ring-yellow-400 ring-offset-2 scale-[1.01]"
            )}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">

                {/* Header — same pattern as active order cards */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg sm:text-xl font-bold font-heading">
                      {tableNum ? `Table ${tableNum}` : `Order #${orderNum}`}
                    </span>
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs px-2 py-1">
                      Customer Request
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {unverifiedItems.length} new item{unverifiedItems.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {/* Item preview chips — same as active order cards (up to 3) */}
                  <div className="space-y-1.5">
                    {unverifiedItems.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="text-xs bg-muted/60 px-2.5 py-1.5 rounded-md border">
                        <div className="font-medium">
                          {item.quantity}x {item.itemName}
                        </div>
                        {item.variantName && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Size: {item.variantName}
                          </div>
                        )}
                      </div>
                    ))}
                    {unverifiedItems.length > 3 && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1.5 rounded-md inline-block">
                        +{unverifiedItems.length - 3} more
                      </span>
                    )}
                  </div>

                  {order.notes && (
                    <div className="bg-muted/30 border rounded px-2.5 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">Customer note:</span>{" "}
                      <span className="italic">"{order.notes}"</span>
                    </div>
                  )}
                </div>

                {/* Footer — total left, actions right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-0.5">
                      Request Total
                    </p>
                    <p className="text-xl sm:text-2xl font-bold font-heading text-yellow-600">
                      +{currency}{totalNewAmount.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {/* View Bill button — opens same-style dialog as orders */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                      onClick={() => setDetailOrderId(order.id)}
                    >
                      <Receipt className="w-4 h-4" />
                      View Bill
                    </Button>
                    
                    {existingTableOrder ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex-1 sm:flex-none whitespace-nowrap"
                          onClick={() =>
                            verifyItemsMutation.mutate({
                              orderId: order.id,
                              action: "merge",
                              itemIds: unverifiedItems.map((i: any) => i.id),
                              mergeTargetOrderId: existingTableOrder.id,
                            })
                          }
                          disabled={verifyItemsMutation.isPending}
                        >
                          {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "merge" ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <Receipt className="w-4 h-4 mr-1.5" />
                          )}
                          Add to Existing
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold flex-1 sm:flex-none whitespace-nowrap"
                          onClick={() =>
                            verifyItemsMutation.mutate({
                              orderId: order.id,
                              action: "accept",
                              itemIds: unverifiedItems.map((i: any) => i.id),
                            })
                          }
                          disabled={verifyItemsMutation.isPending}
                        >
                          {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "accept" ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          )}
                          New Order
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold flex-1 sm:flex-none"
                        onClick={() =>
                          verifyItemsMutation.mutate({
                            orderId: order.id,
                            action: "accept",
                            itemIds: unverifiedItems.map((i: any) => i.id),
                          })
                        }
                        disabled={verifyItemsMutation.isPending}
                      >
                        {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "accept" ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        )}
                        Accept
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                      onClick={() =>
                        verifyItemsMutation.mutate({
                          orderId: order.id,
                          action: "reject",
                          itemIds: unverifiedItems.map((i: any) => i.id),
                        })
                      }
                      disabled={verifyItemsMutation.isPending}
                    >
                      {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "reject" ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-1.5" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>

              </div>
            </CardContent>

            {/* Bill-style detail Dialog — same layout as the Billing Dialog in LiveOrdersPage */}
            <Dialog open={isDetailOpen} onOpenChange={(open) => !open && setDetailOrderId(null)}>
              <DialogContent
                className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6"
              >
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    New Items Request
                  </DialogTitle>
                  <DialogDescription>
                    <span className="block mt-1 font-semibold text-sm">
                      {tableNum ? `Table ${tableNum}` : `Order #${orderNum}`}
                    </span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Items list */}
                  <div className="max-h-[50vh] sm:max-h-[240px] overflow-y-auto pr-1">
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      New Items
                    </h4>
                    <div className="space-y-1.5">
                      {unverifiedItems.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-2 rounded-md border bg-muted/40 px-2 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium leading-snug break-words">
                              {item.quantity}× {item.itemName}
                            </div>
                            {item.variantName && (
                              <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                                Size: {item.variantName}
                              </div>
                            )}
                            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.selectedModifiers.map((mod: any, j: number) => (
                                  <span key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                    {mod.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {currency}{parseFloat(item.totalPrice || "0").toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="bg-muted/30 border rounded p-2 text-xs italic text-muted-foreground">
                      "{order.notes}" — Customer Note
                    </div>
                  )}

                  <Separator />

                  {/* Price breakdown — same as bill dialog */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal (new items)</span>
                      <span className="font-medium">{currency}{subtotalNewAmount.toFixed(2)}</span>
                    </div>
                    {gstAmount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CGST ({(gstRatePercent / 2).toFixed(1)}%)</span>
                          <span className="font-medium">{currency}{(gstAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">SGST ({(gstRatePercent / 2).toFixed(1)}%)</span>
                          <span className="font-medium">{currency}{(gstAmount / 2).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {serviceChargeAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Charge ({serviceChargeRatePercent.toFixed(1)}%)</span>
                        <span className="font-medium">{currency}{serviceChargeAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm sm:text-base font-bold">
                      <span>Request Total</span>
                      <span className="text-yellow-600 text-lg sm:text-xl tabular-nums">
                        +{currency}{totalNewAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Dialog action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {existingTableOrder ? (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 min-w-[120px]"
                          onClick={() =>
                            verifyItemsMutation.mutate({
                              orderId: order.id,
                              action: "merge",
                              itemIds: unverifiedItems.map((i: any) => i.id),
                              mergeTargetOrderId: existingTableOrder.id,
                            })
                          }
                          disabled={verifyItemsMutation.isPending}
                        >
                          {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "merge" ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Receipt className="w-4 h-4 mr-2" />
                          )}
                          Add to Existing
                        </Button>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold min-w-[120px]"
                          onClick={() =>
                            verifyItemsMutation.mutate({
                              orderId: order.id,
                              action: "accept",
                              itemIds: unverifiedItems.map((i: any) => i.id),
                            })
                          }
                          disabled={verifyItemsMutation.isPending}
                        >
                          {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "accept" ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          New Order
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        onClick={() =>
                          verifyItemsMutation.mutate({
                            orderId: order.id,
                            action: "accept",
                            itemIds: unverifiedItems.map((i: any) => i.id),
                          })
                        }
                        disabled={verifyItemsMutation.isPending}
                      >
                        {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "accept" ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Accept Request
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() =>
                        verifyItemsMutation.mutate({
                          orderId: order.id,
                          action: "reject",
                          itemIds: unverifiedItems.map((i: any) => i.id),
                        })
                      }
                      disabled={verifyItemsMutation.isPending}
                    >
                      {verifyItemsMutation.isPending && verifyItemsMutation.variables?.action === "reject" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          </Card>
        );
      })}
    </div>
  );
}
