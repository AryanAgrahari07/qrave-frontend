import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { buildUrl } from "@/lib/api";

export function CartDrawer({
  restaurantSlug,
  restaurantName,
  currency,
  qrOrderingVerification,
  gstRatePercent = 0,
  serviceChargeRatePercent = 0,
}: {
  restaurantSlug: string;
  restaurantName: string;
  currency: string;
  qrOrderingVerification: boolean; // Tells us what the status will be
  gstRatePercent?: number;
  serviceChargeRatePercent?: number;
}) {
  const { state, isCartOpen, setIsCartOpen, removeItem, updateQuantity, setOrderSession, clearOrderSession } = useCart();
  const [orderNotes, setOrderNotes] = useState("");

  const hasItems = state.items.length > 0;
  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gstAmount = subtotal * (Math.max(0, gstRatePercent) / 100);
  const serviceChargeAmount = subtotal * (Math.max(0, serviceChargeRatePercent) / 100);
  const grandTotal = subtotal + gstAmount + serviceChargeAmount;

  const placeOrderMut = useMutation({
    mutationFn: async () => {
      const isAppend = !!state.orderId && !!state.customerSessionId;

      const payload = {
        tableId: state.tableId,
        items: state.items.map((i) => {
          const modIds = i.selectedModifiers?.map((m) => m.id) || [];
          return {
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes || undefined,
            variantId: i.selectedVariantId || undefined,
            modifierIds: modIds.length > 0 ? modIds : undefined,
          };
        }),
        notes: orderNotes || undefined,
      };

      const url = isAppend
        ? `/api/public/restaurants/${restaurantSlug}/orders/${state.orderId}/items`
        : `/api/public/restaurants/${restaurantSlug}/orders`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (isAppend) {
        headers["x-customer-session-id"] = state.customerSessionId!;
      }

      const res = await fetch(buildUrl(url), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json();
        const thrownErr: any = new Error(errBody.message || "Failed to place order");
        thrownErr.code = errBody.code; // e.g. "ORDER_CANCELLED"
        throw thrownErr;
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (!state.orderId) {
        // First time order
        setOrderSession(data.orderId, data.customerSessionId);
      } else {
        // Appended
        // Clear cart items because they've been added to the order
        // setOrderSession clears the cart items but keeps the same order info
        setOrderSession(state.orderId, state.customerSessionId!);
      }
      setIsCartOpen(false);
      setOrderNotes("");
      toast.success(
        qrOrderingVerification
          ? "Items sent for verification!"
          : "Order placed successfully!"
      );
    },
    onError: (err: any) => {
      // If the server tells us the existing order was cancelled (e.g. admin rejected all
      // items), clear the stale session so the next tap creates a fresh order.
      if (err?.code === "ORDER_CANCELLED" || err?.message?.includes("cancelled")) {
        clearOrderSession();
        toast.info(
          "Your previous order was cancelled. Tap 'Place Order' to start a new one.",
          { duration: 6000 }
        );
      } else {
        toast.error(err.message || "Something went wrong.");
      }
    },
  });

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 sm:px-6 border-b">
          <SheetTitle className="flex items-center gap-2 text-xl font-heading">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Your Order
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-6 bg-muted/20">
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
              <ShoppingCart className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Button variant="outline" onClick={() => setIsCartOpen(false)}>
                Browse Menu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {state.items.map((item) => (
                <div key={item.id} className="bg-background border rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-medium text-sm sm:text-base leading-tight">
                      {item.name}
                    </div>
                    <div className="font-bold text-primary shrink-0">
                      {currency}
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  {item.variantName && (
                    <p className="text-xs text-muted-foreground mt-1 tracking-wide uppercase">
                      Size: {item.variantName}
                    </p>
                  )}

                  {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.selectedModifiers.map((m) => m.name).join(", ")}
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-xs italic text-muted-foreground bg-muted/50 p-1.5 rounded mt-2 border-l-2 border-primary/50">
                      "{item.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-background rounded-md text-foreground"
                        onClick={() => {
                          if (item.quantity === 1) removeItem(item.id);
                          else updateQuantity(item.id, -1);
                        }}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-background rounded-md text-foreground"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Cooking Instructions
                </label>
                <Input
                  placeholder="E.g., less spicy, no onions..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="bg-background text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {hasItems && (
          <div className="p-4 sm:p-6 bg-background border-t shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                <span className="text-base font-semibold">
                  {currency}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              {gstAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    GST ({gstRatePercent.toFixed(1)}%)
                  </span>
                  <span className="text-base font-semibold">
                    {currency}
                    {gstAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {serviceChargeAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Service Charge ({serviceChargeRatePercent.toFixed(1)}%)
                  </span>
                  <span className="text-base font-semibold">
                    {currency}
                    {serviceChargeAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-xl font-bold font-heading">
                  {currency}
                  {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {!state.tableId && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-200 text-center">
                Please exit the cart and select your table number first.
              </div>
            )}

            <Button
              className="w-full h-12 sm:h-14 text-base sm:text-lg rounded-xl shadow-md"
              disabled={!state.tableId || placeOrderMut.isPending}
              onClick={() => placeOrderMut.mutate()}
            >
              {placeOrderMut.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending to kitchen...
                </>
              ) : (
                state.orderId ? "Add Items to Order" : "Place Order"
              )}
            </Button>

            {qrOrderingVerification && !state.orderId && (
              <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-3">
                Your order will be verified by our staff before preparation.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
