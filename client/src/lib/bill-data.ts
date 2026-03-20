import type { Order, Restaurant } from "@/types";
import type { BillData } from "@/lib/thermal-printer-utils";

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeDiscount(val: unknown): number {
  // Backend may store discount as a negative amount; we normalize to positive number.
  const n = toNumber(val);
  return Math.abs(n);
}

export function buildBillDataFromOrder(opts: {
  order: Order;
  restaurant: Restaurant;
  currency: string;
  restaurantLogo?: { url: string; type: "predefined" | "custom" } | null;
  // Allows overriding the receipt timestamp (e.g., paidAt for transactions)
  at?: Date;
}): BillData {
  const { order, restaurant, currency, restaurantLogo, at } = opts;

  const dt = at ?? new Date(order.createdAt);

  return {
    restaurant: {
      name: restaurant.name,
      addressLine1: restaurant.addressLine1,
      addressLine2: restaurant.addressLine2,
      city: restaurant.city,
      state: restaurant.state,
      postalCode: restaurant.postalCode,
      phone: restaurant.phoneNumber,
      email: restaurant.email,
      gstNumber: restaurant.gstNumber,
      fssaiNumber: restaurant.fssaiNumber,
      logo: restaurantLogo ? { url: restaurantLogo.url, type: restaurantLogo.type } : undefined,
    },
    bill: {
      billNumber: order.transactionBillNumber || (order.orderNumber ? `INV-${String(order.orderNumber).padStart(6, "0")}` : order.id.slice(-6).toUpperCase()),
      date: dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
      time: dt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      tableNumber: order.table?.tableNumber,
      guestName: order.guestName,
      waiterName: order.placedByStaff?.fullName,
      cashier: order.placedByStaff?.fullName,
      dineIn: order.orderType === "DINE_IN" ? "Dine In" : order.orderType === "TAKEAWAY" ? "Takeaway" : "Delivery",
    },
    items:
      (order.items ?? []).map((it) => {
        const qty = Number(it.quantity || 0);
        const total = Number(it.totalPrice || 0);
        const unit = it.unitPrice !== undefined ? Number(it.unitPrice) : qty ? total / qty : 0;
        return {
          name: it.itemName,
          quantity: qty,
          price: unit,
          total,
        };
      }) ?? [],
    totals: {
      subtotal: toNumber(order.subtotalAmount),
      gst: toNumber(order.gstAmount),
      cgst: toNumber(order.gstAmount) / 2,
      sgst: toNumber(order.gstAmount) / 2,
      serviceCharge: toNumber(order.serviceTaxAmount),
      discount: normalizeDiscount(order.discountAmount),
      roundOff: 0,
      grandTotal: toNumber(order.totalAmount),
    },
    currency,
    taxRateGst: parseFloat(restaurant.taxRateGst ?? "0"),
    taxRateService: parseFloat(restaurant.taxRateService ?? "0"),
  };
}
