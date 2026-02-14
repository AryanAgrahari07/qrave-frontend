import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCancelledOrdersSummary, useOrderDetail, useRestaurant } from "@/hooks/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, RefreshCw, XCircle, Clock, User, Table as TableIcon, IndianRupee, Eye } from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import type { CancelledOrderSummary } from "@/hooks/api";

function safeDate(dateLike: string | Date | null | undefined): Date | null {
  if (!dateLike) return null;
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function CancelledOrdersPage() {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const offset = (currentPage - 1) * pageSize;

  const { data: ordersData, isLoading, refetch } = useCancelledOrdersSummary(restaurantId, {
    limit: pageSize,
    offset,
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: selectedOrder, isLoading: isDetailsLoading } = useOrderDetail(
    restaurantId,
    isDetailsOpen ? selectedOrderId : null
  );

  const currency = restaurant?.currency || "₹";

  const orders = ordersData?.orders ?? [];
  const pagination = ordersData?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const sorted = useMemo(() => {
    // Orders already come sorted by createdAt desc from backend, but we want "cancel time" (updatedAt) if present.
    return [...orders].sort((a: any, b: any) => {
      const ad = safeDate(a.updatedAt)?.getTime() ?? safeDate(a.createdAt)?.getTime() ?? 0;
      const bd = safeDate(b.updatedAt)?.getTime() ?? safeDate(b.createdAt)?.getTime() ?? 0;
      return bd - ad;
    });
  }, [orders]);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/orders">
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" /> Cancelled Orders
            </h2>
            <p className="text-sm text-muted-foreground">
              Review cancelled orders with reason, time and amount.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base">All Cancelled Orders</CardTitle>
            <Badge variant="outline" className="w-fit">
              Total: {pagination?.total ?? sorted.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading cancelled orders...</div>
          ) : sorted.length === 0 ? (
            <div className="py-14 text-center">
              <XCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <div className="font-medium">No cancelled orders</div>
              <div className="text-sm text-muted-foreground">Cancelled orders will appear here.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((order: CancelledOrderSummary) => {
                const cancelledAt = safeDate(order.updatedAt) || safeDate(order.closedAt) || safeDate(order.createdAt);
                const cancelledAtText = cancelledAt ? format(cancelledAt, "dd MMM yyyy, hh:mm a") : "-";
                const reason = order.cancelReason || "-";

                return (
                  <div key={order.id} className="rounded-lg border bg-background">
                    <div className="p-4 sm:p-5 flex flex-col gap-3">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-heading font-bold text-lg truncate">
                              {order.table?.tableNumber
                                ? `Table ${order.table.tableNumber}`
                                : order.guestName || `Order #${order.id.slice(-6)}`}
                            </div>
                            <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                              CANCELLED
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {order.orderType?.toString().replaceAll("_", " ")}
                            </Badge>
                          </div>

                          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 min-w-0">
                              <Clock className="w-4 h-4" />
                              <span className="truncate">Cancelled: {cancelledAtText}</span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0">
                              <IndianRupee className="w-4 h-4" />
                              <span className="truncate">
                                Amount: {currency}
                                {parseFloat(order.totalAmount || "0").toFixed(2)}
                              </span>
                            </div>

                            {order.placedByStaff?.fullName && (
                              <div className="flex items-center gap-2 min-w-0">
                                <User className="w-4 h-4" />
                                <span className="truncate">Staff: {order.placedByStaff.fullName}</span>
                              </div>
                            )}

                            {order.table?.floorSection && (
                              <div className="flex items-center gap-2 min-w-0">
                                <TableIcon className="w-4 h-4" />
                                <span className="truncate">Section: {order.table.floorSection}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                          <div className="text-xs text-muted-foreground">ID: {order.id.slice(-8)}</div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" /> View details
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="text-sm">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                          Cancellation reason
                        </div>
                        <div className="break-words">{reason}</div>
                      </div>

                      {/* Summary endpoint intentionally does not include items */}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>

                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setSelectedOrderId(null);
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <div className="p-4 sm:p-6 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" /> Cancelled order details
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-90px)]">
            {isDetailsLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading details...</div>
            ) : !selectedOrder ? (
              <div className="py-10 text-center text-muted-foreground">No details available</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-lg font-heading font-bold truncate">
                      {selectedOrder.table?.tableNumber
                        ? `Table ${selectedOrder.table.tableNumber}`
                        : selectedOrder.guestName || `Order #${selectedOrder.id.slice(-6)}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {selectedOrder.id}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 w-fit">
                    CANCELLED
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Cancelled at</div>
                    <div className="mt-1">
                      {(() => {
                        const d = safeDate(selectedOrder.updatedAt) || safeDate(selectedOrder.closedAt);
                        return d ? format(d, "dd MMM yyyy, hh:mm a") : "-";
                      })()}
                    </div>
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Order type</div>
                    <div className="mt-1">{selectedOrder.orderType?.toString().replaceAll("_", " ")}</div>
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Amount</div>
                    <div className="mt-1 font-semibold">
                      {currency}{parseFloat(selectedOrder.totalAmount || "0").toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Payment status</div>
                    <div className="mt-1">{selectedOrder.paymentStatus}</div>
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">Cancellation reason</div>
                  <div className="mt-1 break-words">{selectedOrder.cancelReason || "-"}</div>
                </div>

                {selectedOrder.items?.length ? (
                  <div className="rounded-md border">
                    <div className="p-3 border-b">
                      <div className="text-sm font-semibold">Items ({selectedOrder.items.length})</div>
                    </div>
                    <div className="p-3 space-y-2">
                      {selectedOrder.items.map((it) => (
                        <div key={it.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{it.itemName}</div>
                            <div className="text-xs text-muted-foreground">Qty: {it.quantity}</div>
                          </div>
                          <div className="text-sm font-medium shrink-0">
                            {currency}{parseFloat(it.totalPrice || "0").toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No items found for this order.</div>
                )}

                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currency}{parseFloat(selectedOrder.subtotalAmount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">GST</span>
                    <span>{currency}{parseFloat(selectedOrder.gstAmount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Service</span>
                    <span>{currency}{parseFloat(selectedOrder.serviceTaxAmount || "0").toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedOrder.discountAmount || "0") > 0 ? (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Discount</span>
                      <span>-{currency}{parseFloat(selectedOrder.discountAmount || "0").toFixed(2)}</span>
                    </div>
                  ) : null}
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Grand Total</span>
                    <span>{currency}{parseFloat(selectedOrder.totalAmount || "0").toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
