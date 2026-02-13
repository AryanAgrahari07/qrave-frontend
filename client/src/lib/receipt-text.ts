import type { BillData } from "@/lib/thermal-printer-utils";

/**
 * Plain-text receipt formatter for printing/saving as PDF.
 *
 * Goals:
 * - Match the thermal receipt layout (monospace, fixed width)
 * - No WhatsApp markdown characters
 * - Stable output suitable for browser Print -> Save as PDF
 */
export class ReceiptTextFormatter {
  private width: number;

  constructor(width: number = 32) {
    this.width = width;
  }

  private line(char: string = "-"): string {
    return char.repeat(this.width);
  }

  private center(text: string): string {
    const t = text.trim();
    const pad = Math.max(0, Math.floor((this.width - t.length) / 2));
    return " ".repeat(pad) + t;
  }

  private padLine(left: string, right: string = ""): string {
    const l = left ?? "";
    const r = right ?? "";
    const spaces = this.width - l.length - r.length;
    return l + " ".repeat(Math.max(1, spaces)) + r;
  }

  private money(amount: number, currency: string): string {
    return `${currency}${amount.toFixed(2)}`;
  }

  private wrap(text: string, indent: number = 0): string[] {
    const words = (text || "").split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    const prefix = " ".repeat(indent);
    const max = Math.max(1, this.width - indent);

    let current = "";
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (next.length <= max) {
        current = next;
      } else {
        if (current) lines.push(prefix + current);
        // if a word is too long, hard-split
        if (w.length > max) {
          let i = 0;
          while (i < w.length) {
            lines.push(prefix + w.slice(i, i + max));
            i += max;
          }
          current = "";
        } else {
          current = w;
        }
      }
    }
    if (current) lines.push(prefix + current);
    return lines.length ? lines : [prefix];
  }

  format(billData: BillData): string {
    const out: string[] = [];

    // Header
    out.push(this.center(billData.restaurant.name.toUpperCase()));
    if (billData.restaurant.addressLine1) out.push(this.center(billData.restaurant.addressLine1));
    if (billData.restaurant.addressLine2) out.push(this.center(billData.restaurant.addressLine2));

    const cityState = [billData.restaurant.city, billData.restaurant.state].filter(Boolean).join(", ");
    if (cityState) out.push(this.center(cityState));
    if (billData.restaurant.postalCode) out.push(this.center(billData.restaurant.postalCode));

    if (billData.restaurant.phone) out.push(this.center(`Phone: ${billData.restaurant.phone}`));
    if (billData.restaurant.email) out.push(this.center(`Email: ${billData.restaurant.email}`));

    if (billData.restaurant.gstNumber) out.push(this.center(`GSTIN: ${billData.restaurant.gstNumber}`));
    if (billData.restaurant.fssaiNumber) out.push(this.center(`FSSAI LIC NO: ${billData.restaurant.fssaiNumber}`));

    out.push(this.line("="));

    // Bill meta
    if (billData.bill.guestName) out.push(`Name: ${billData.bill.guestName}`);

    const dateTime = `Date & time : ${billData.bill.time} ${billData.bill.date}`.trim();
    out.push(dateTime);

    if (billData.bill.dineIn) {
      const dine = typeof billData.bill.dineIn === "string" ? billData.bill.dineIn : String(billData.bill.dineIn);
      out.push(`Dine In: ${dine}`);
    }

    if (billData.bill.cashier) out.push(`Cashier: ${billData.bill.cashier}`);
    if (billData.bill.waiterName) out.push(`Waiter: ${billData.bill.waiterName}`);

    out.push(`Bill No.: ${billData.bill.billNumber}`);

    out.push(this.line("-"));
    out.push(this.padLine("Item", "Amount"));
    out.push(this.line("-"));

    // Items
    for (const item of billData.items) {
      const total = this.money(item.total, billData.currency);
      const qtyPrice = `${item.quantity} x ${this.money(item.price, billData.currency)}`;

      // First line: name (wrapped), last line includes amount aligned right
      const nameLines = this.wrap(item.name, 0);
      if (nameLines.length === 1) {
        // Keep amount on same line if possible
        const left = nameLines[0];
        if (left.length + 1 + total.length <= this.width) {
          out.push(this.padLine(left, total));
        } else {
          out.push(left);
          out.push(this.padLine(qtyPrice, total));
        }
      } else {
        out.push(...nameLines);
        out.push(this.padLine(qtyPrice, total));
      }
    }

    out.push(this.line("-"));

    // Totals
    out.push(this.padLine("Sub Total", this.money(billData.totals.subtotal, billData.currency)));

    if (billData.totals.serviceCharge > 0) {
      const sr = (billData.taxRateService ?? 0);
      const label = sr ? `Service Charge ${sr.toFixed(0)}%` : "Service Charge";
      out.push(this.padLine(label, this.money(billData.totals.serviceCharge, billData.currency)));
    }

    // GST breakdown
    if (billData.totals.cgst !== undefined && billData.totals.sgst !== undefined) {
      const gr = (billData.taxRateGst ?? 0);
      const half = gr ? (gr / 2) : 0;
      const sgstLabel = half ? `SGST ${half.toFixed(1)}%` : "SGST";
      const cgstLabel = half ? `CGST ${half.toFixed(1)}%` : "CGST";
      out.push(this.padLine(sgstLabel, this.money(billData.totals.sgst, billData.currency)));
      out.push(this.padLine(cgstLabel, this.money(billData.totals.cgst, billData.currency)));
    } else if (billData.totals.gst > 0) {
      const gr = (billData.taxRateGst ?? 0);
      const label = gr ? `GST ${gr.toFixed(1)}%` : "GST";
      out.push(this.padLine(label, this.money(billData.totals.gst, billData.currency)));
    }

    if (billData.totals.discount && billData.totals.discount > 0) {
      out.push(this.padLine("Discount", this.money(billData.totals.discount, billData.currency)));
    }

    if (billData.totals.roundOff && billData.totals.roundOff !== 0) {
      out.push(this.padLine("Round Off", this.money(billData.totals.roundOff, billData.currency)));
    }

    out.push(this.line("="));
    out.push(this.padLine("GRAND TOTAL", this.money(billData.totals.grandTotal, billData.currency)));
    out.push(this.line("="));

    out.push(this.center("Thank you! Visit Again"));

    return out.join("\n");
  }
}
