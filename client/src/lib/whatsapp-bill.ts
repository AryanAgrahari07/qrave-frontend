/**
 * WhatsApp Bill Sharing Utility
 * Generates a simple, mobile-friendly bill message for sharing via WhatsApp.
 * Note: This is intentionally NOT the same as the thermal printer format (readability first).
 */

import { BillData } from './thermal-printer-utils';

interface WhatsAppBillConfig {
  /**
   * Kept for backward-compatibility with existing call-sites.
   * (Width is no longer used because WhatsApp messages are not fixed-width.)
   */
  width: number;
}

export class WhatsAppBillFormatter {
  private config: WhatsAppBillConfig;

  constructor(config: WhatsAppBillConfig = { width: 40 }) {
    this.config = config;
  }

  private money(amount: number, currency: string): string {
    const cur = (currency || '').trim();
    // WhatsApp renders ₹ fine in most phones; keep as-is.
    const sep = cur && /[A-Za-z.]$/.test(cur) ? ' ' : '';
    return `${cur}${sep}${Number(amount || 0).toFixed(2)}`;
  }

  private nonEmpty(parts: Array<string | undefined | null | false>): string[] {
    return parts.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
  }

  /**
   * Format bill data as a readable WhatsApp message.
   *
   * Goal: easy to read on a phone (no fixed-width alignment, no thermal-style padding).
   */
  formatBill(billData: BillData): string {
    const lines: string[] = [];

    // Header
    lines.push(`*${(billData.restaurant.name || '').toUpperCase()}*`);

    const addressParts = this.nonEmpty([
      billData.restaurant.addressLine1,
      billData.restaurant.addressLine2,
      [billData.restaurant.city, billData.restaurant.state].filter(Boolean).join(', '),
      billData.restaurant.postalCode,
    ]);
    if (addressParts.length) {
      lines.push(addressParts.join(', '));
    }

    const contactParts = this.nonEmpty([
      billData.restaurant.phone ? `Phone: ${billData.restaurant.phone}` : '',
      billData.restaurant.email ? `Email: ${billData.restaurant.email}` : '',
    ]);
    if (contactParts.length) {
      lines.push(contactParts.join('  '));
    }

    const complianceParts = this.nonEmpty([
      billData.restaurant.gstNumber ? `GSTIN: ${billData.restaurant.gstNumber}` : '',
      billData.restaurant.fssaiNumber ? `FSSAI: ${billData.restaurant.fssaiNumber}` : '',
    ]);
    if (complianceParts.length) {
      lines.push(complianceParts.join('  '));
    }

    lines.push('');

    // Bill meta
    lines.push(`*Bill:* ${billData.bill.billNumber}`);

    const dateTime = this.nonEmpty([
      billData.bill.date ? `Date: ${billData.bill.date}` : '',
      billData.bill.time ? `Time: ${billData.bill.time}` : '',
    ]);
    if (dateTime.length) lines.push(dateTime.join(' | '));

    const orderInfo = this.nonEmpty([
      billData.bill.tableNumber ? `Table: ${billData.bill.tableNumber}` : '',
      billData.bill.dineIn ? `Type: ${String(billData.bill.dineIn)}` : '',
      billData.bill.guestName ? `Customer: ${billData.bill.guestName}` : '',
      billData.bill.waiterName ? `Waiter: ${billData.bill.waiterName}` : '',
      billData.bill.cashier ? `Cashier: ${billData.bill.cashier}` : '',
    ]);
    if (orderInfo.length) {
      lines.push(orderInfo.join('\n'));
    }

    lines.push('');
    lines.push('*Items*');

    if (!billData.items?.length) {
      lines.push('- (No items)');
    } else {
      billData.items.forEach((it, idx) => {
        lines.push(
          `${idx + 1}. ${it.name}`,
          `   Qty: ${it.quantity}  Price: ${this.money(it.price, billData.currency)}  Total: ${this.money(it.total, billData.currency)}`
        );
      });
    }

    lines.push('');
    lines.push('*Summary*');

    lines.push(`Subtotal: ${this.money(billData.totals.subtotal, billData.currency)}`);

    if (billData.totals.serviceCharge > 0) {
      const sr = billData.taxRateService ?? 0;
      const label = sr ? `Service charge (${sr.toFixed(0)}%)` : 'Service charge';
      lines.push(`${label}: ${this.money(billData.totals.serviceCharge, billData.currency)}`);
    }

    // GST breakdown (handle 0 values correctly)
    const hasCgstSgst = billData.totals.cgst !== undefined && billData.totals.sgst !== undefined;
    if (hasCgstSgst) {
      const gr = billData.taxRateGst ?? 0;
      const half = gr ? gr / 2 : 0;
      const sgstLabel = half ? `SGST (${half.toFixed(1)}%)` : 'SGST';
      const cgstLabel = half ? `CGST (${half.toFixed(1)}%)` : 'CGST';
      lines.push(`${sgstLabel}: ${this.money(billData.totals.sgst || 0, billData.currency)}`);
      lines.push(`${cgstLabel}: ${this.money(billData.totals.cgst || 0, billData.currency)}`);
    } else if (billData.totals.gst > 0) {
      const gr = billData.taxRateGst ?? 0;
      const gstLabel = gr ? `GST (${gr.toFixed(1)}%)` : 'GST';
      lines.push(`${gstLabel}: ${this.money(billData.totals.gst, billData.currency)}`);
    }

    if ((billData.totals.discount ?? 0) > 0) {
      lines.push(`Discount: -${this.money(billData.totals.discount || 0, billData.currency)}`);
    }

    if ((billData.totals.roundOff ?? 0) !== 0) {
      lines.push(`Round off: ${this.money(billData.totals.roundOff || 0, billData.currency)}`);
    }

    lines.push('');
    lines.push(`*Grand Total: ${this.money(billData.totals.grandTotal, billData.currency)}*`);

    lines.push('');
    lines.push('Thank you! Visit again.');

    return lines.join('\n');
  }

  /**
   * Generate WhatsApp share URL with pre-filled message
   */
  generateWhatsAppURL(phoneNumber: string, billData: BillData): string {
    const billText = this.formatBill(billData);
    const message = encodeURIComponent(billText);
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // WhatsApp Web/App URL format
    // For mobile: whatsapp://send?phone=...
    // For web: https://wa.me/...
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      return `whatsapp://send?phone=${cleanNumber}&text=${message}`;
    } else {
      return `https://wa.me/${cleanNumber}?text=${message}`;
    }
  }

  /**
   * Open WhatsApp with bill
   */
  async shareViaWhatsApp(phoneNumber: string, billData: BillData): Promise<void> {
    const url = this.generateWhatsAppURL(phoneNumber, billData);
    window.open(url, '_blank');
  }
}

/**
 * Validate Indian phone number with comprehensive checks
 */
export function validateIndianPhoneNumber(phone: string): { valid: boolean; error?: string; formatted?: string } {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's empty
  if (!cleaned) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Indian phone numbers should be 10 digits
  if (cleaned.length === 10) {
    // Should start with 6, 7, 8, or 9
    if (!/^[6-9]/.test(cleaned)) {
      return { valid: false, error: 'Invalid Indian mobile number' };
    }
    return { valid: true, formatted: `91${cleaned}` }; // Add country code
  }
  
  // If 11 digits and starts with 0, remove leading 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const withoutZero = cleaned.substring(1);
    if (!/^[6-9]/.test(withoutZero)) {
      return { valid: false, error: 'Invalid Indian mobile number' };
    }
    return { valid: true, formatted: `91${withoutZero}` };
  }
  
  // If 12 digits and starts with 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const number = cleaned.substring(2);
    if (!/^[6-9]/.test(number)) {
      return { valid: false, error: 'Invalid Indian mobile number' };
    }
    return { valid: true, formatted: cleaned };
  }
  
  // If it starts with +91
  if (phone.startsWith('+91')) {
    const number = cleaned.substring(2);
    if (number.length !== 10) {
      return { valid: false, error: 'Phone number must be 10 digits' };
    }
    if (!/^[6-9]/.test(number)) {
      return { valid: false, error: 'Invalid Indian mobile number' };
    }
    return { valid: true, formatted: cleaned };
  }
  
  return { valid: false, error: 'Invalid phone number format' };
}