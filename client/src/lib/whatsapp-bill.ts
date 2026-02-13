/**
 * Enhanced WhatsApp Bill Sharing Utility
 * Generates professional GST-compliant bill text for sharing via WhatsApp
 * Matches thermal printer bill quality with proper formatting
 */

import { BillData } from './thermal-printer-utils';

interface WhatsAppBillConfig {
  width: number; // Character width for formatting (default 40)
}

export class WhatsAppBillFormatter {
  private config: WhatsAppBillConfig;

  constructor(config: WhatsAppBillConfig = { width: 40 }) {
    this.config = config;
  }

  /**
   * Pad line with spaces between left and right text
   */
  private padLine(left: string, right: string = ''): string {
    const totalWidth = this.config.width;
    const leftLen = left.length;
    const rightLen = right.length;
    const spacesNeeded = totalWidth - leftLen - rightLen;
    const spaces = spacesNeeded > 0 ? ' '.repeat(spacesNeeded) : ' ';
    return left + spaces + right;
  }

  /**
   * Create separator line with different styles
   */
  private separator(char: string = '-'): string {
    return char.repeat(this.config.width);
  }

  /**
   * Center text within the width
   */
  private centerText(text: string): string {
    const padding = Math.max(0, Math.floor((this.config.width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Format bill data as professional WhatsApp-friendly text
   * Enhanced to match thermal receipt design
   */
  formatBill(billData: BillData): string {
    const lines: string[] = [];

    // ========================================
    // HEADER SECTION
    // ========================================
    lines.push(this.separator('━'));
    lines.push(this.centerText(`*${billData.restaurant.name.toUpperCase()}*`));
    lines.push(this.separator('━'));
    lines.push('');
    
    // Restaurant Address (Centered & Complete)
    if (billData.restaurant.addressLine1) {
      lines.push(this.centerText(billData.restaurant.addressLine1));
    }
    if (billData.restaurant.addressLine2) {
      lines.push(this.centerText(billData.restaurant.addressLine2));
    }
    const cityState = [];
    if (billData.restaurant.city) cityState.push(billData.restaurant.city);
    if (billData.restaurant.state) cityState.push(billData.restaurant.state);
    if (cityState.length > 0) {
      lines.push(this.centerText(cityState.join(', ')));
    }
    if (billData.restaurant.postalCode) {
      lines.push(this.centerText(billData.restaurant.postalCode));
    }
    if (billData.restaurant.phone || billData.restaurant.email) {
      const parts = [billData.restaurant.phone, billData.restaurant.email].filter(Boolean);
      lines.push(this.centerText(`Contact: ${parts.join(' | ')}`));
    }
    
    lines.push('');
    
    // ========================================
    // GST COMPLIANCE SECTION
    // ========================================
    if (billData.restaurant.gstNumber) {
      lines.push(this.centerText(`*GSTIN: ${billData.restaurant.gstNumber}*`));
    }
    if (billData.restaurant.fssaiNumber) {
      lines.push(this.centerText(`FSSAI LIC NO: ${billData.restaurant.fssaiNumber}`));
    }
    
    lines.push(this.separator('─'));
    lines.push('');
    
    // ========================================
    // CUSTOMER/TABLE INFO
    // ========================================
    if (billData.bill.guestName) {
      lines.push(`Name: ${billData.bill.guestName}`);
      lines.push('');
    }
    
    // ========================================
    // BILL DETAILS - Matching Receipt Format
    // ========================================
    lines.push(this.padLine(
      `Date: ${billData.bill.date}`,
      billData.bill.dineIn ? `Dine In: ${billData.bill.dineIn}` : ''
    ));
    lines.push(billData.bill.time);
    if (billData.bill.cashier) {
      lines.push(`Cashier: ${billData.bill.cashier}`);
    }
    lines.push(this.padLine(
      billData.bill.waiterName ? `Waiter: ${billData.bill.waiterName}` : '',
      `Bill No.: *${billData.bill.billNumber}*`
    ));
    
    lines.push(this.separator('─'));
    
    // ========================================
    // ITEMS SECTION - Receipt Format
    // ========================================
    lines.push(this.padLine('*Item*', '*Qty. Price Amount*'));
    lines.push(this.separator('─'));
    
    // List all items with proper formatting
    for (const item of billData.items) {
      // Item name
      lines.push(`*${item.name}*`);
      
      // Quantity, Price, Amount on next line (right-aligned)
      const qtyPriceAmount = this.padLine(
        '',
        `${item.quantity} ${item.price.toFixed(2)} ${item.total.toFixed(2)}`
      );
      lines.push(qtyPriceAmount);
    }
    
    lines.push(this.separator('─'));
    lines.push('');
    
    // ========================================
    // BILLING SUMMARY
    // ========================================
    const totalQty = billData.items.reduce((sum, item) => sum + item.quantity, 0);
    lines.push(this.padLine(
      `Total Qty: ${totalQty}`,
      `Sub Total ${billData.currency}${billData.totals.subtotal.toFixed(2)}`
    ));
    
    // Service Charge (if applicable)
    if (billData.totals.serviceCharge > 0) {
      const serviceRate = billData.taxRateService || 10;
      lines.push(this.padLine(
        `Service Charge ${serviceRate.toFixed(0)}%`,
        `${billData.currency}${billData.totals.serviceCharge.toFixed(2)}`
      ));
    }
    
    // GST Breakdown (SGST + CGST for intra-state transactions)
    if (billData.totals.cgst && billData.totals.sgst) {
      const gstRate = billData.taxRateGst || 5;
      const halfRate = (gstRate / 2).toFixed(1);
      lines.push(this.padLine(
        `SGST ${halfRate}%`,
        `${billData.currency}${billData.totals.sgst.toFixed(2)}`
      ));
      lines.push(this.padLine(
        `CGST ${halfRate}%`,
        `${billData.currency}${billData.totals.cgst.toFixed(2)}`
      ));
    } else if (billData.totals.gst > 0) {
      // IGST for inter-state transactions
      const gstRate = billData.taxRateGst || 5;
      lines.push(this.padLine(
        `GST ${gstRate.toFixed(1)}%`,
        `${billData.currency}${billData.totals.gst.toFixed(2)}`
      ));
    }
    
    lines.push(this.separator('─'));
    
    // Round Off (if applicable)
    if (billData.totals.roundOff && billData.totals.roundOff !== 0) {
      lines.push(this.padLine(
        'Round off',
        `${billData.currency}${billData.totals.roundOff.toFixed(2)}`
      ));
    }
    
    // ========================================
    // GRAND TOTAL
    // ========================================
    lines.push(this.padLine(
      '*Grand Total*',
      `*${billData.currency}${billData.totals.grandTotal.toFixed(2)}*`
    ));
    
    lines.push(this.separator('━'));
    
    // ========================================
    // FOOTER SECTION
    // ========================================
    lines.push('');
    lines.push(this.centerText('*THANKS FOR YOUR VISIT*'));
    lines.push(this.centerText('PLEASE VISIT AGAIN'));
    lines.push('');
    lines.push(this.centerText('_This is a GST Compliant Tax Invoice_'));
    lines.push(this.separator('━'));
    
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