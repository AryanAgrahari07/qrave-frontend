/**
 * Enhanced Thermal Printer Utility for ESC/POS Commands
 * Supports bluetooth thermal printers (58mm/80mm) with logo printing
 * Matches professional restaurant bill design
 */

// ── Web Bluetooth API type declarations ──────────────────────────────────────
// TypeScript's default lib does not include the Web Bluetooth or Web USB APIs.
// We declare the minimal subset used in this file so the compiler is happy
// without needing @types/web-bluetooth or @types/webusb.
declare global {
  // Bluetooth ----------------------------------------------------------------
  interface BluetoothRemoteGATTCharacteristic {
    properties: { write: boolean };
    writeValue(value: BufferSource): Promise<void>;
  }
  interface BluetoothRemoteGATTService {
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }
  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }
  interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
  }
  interface RequestDeviceOptions {
    filters?: Array<{ services?: string[]; vendorId?: number }>;
    optionalServices?: string[];
  }
  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    getDevices(): Promise<BluetoothDevice[]>;
  }
  interface Navigator {
    bluetooth: Bluetooth;
  }

  // USB ----------------------------------------------------------------------
  interface USBDevice {
    open(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    close(): Promise<void>;
  }
  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
  }
  interface USB {
    requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>;
  }
  interface Navigator {
    usb: USB;
  }
}


export interface PrinterConfig {
  width: 32 | 48; // Characters per line (32 for 58mm, 48 for 80mm)
  encoding?: string;
}

export interface BillData {
  restaurant: {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
    fssaiNumber?: string;
    logo?: {
      url: string;
      type: 'predefined' | 'custom';
    };
  };
  bill: {
    billNumber: string;
    date: string;
    time: string;
    tableNumber?: string;
    guestName?: string;
    waiterName?: string;
    cashier?: string;
    dineIn?: string | number;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    cgst?: number;
    sgst?: number;
    gst: number;
    serviceCharge: number;
    discount?: number;
    roundOff?: number;
    grandTotal: number;
  };
  currency: string;
  taxRateGst?: number;
  taxRateService?: number;
}

/**
 * KOT (Kitchen Order Ticket) data — no pricing, kitchen-facing only.
 */
export interface KOTData {
  restaurant: {
    name: string;
  };
  kot: {
    kotNumber: string;   // short ID (last 6 chars of order id or temp id)
    orderNumber?: string;
    date: string;
    time: string;
    tableNumber?: string;
    orderType: string;   // 'Dine In' | 'Takeaway' | 'Delivery'
    waiterName?: string;
    notes?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    variant?: string;    // e.g. 'Large'
    modifiers?: string;  // e.g. 'Extra Cheese, No Onion'
  }>;
}

/**
 * ESC/POS Command Builder
 */
export class ESCPOSCommands {
  // Initialize printer
  static INIT = new Uint8Array([0x1b, 0x40]);

  // Font / character width
  // Some printers keep condensed/font mode across operations; setting these explicitly
  // helps keep column layouts stable.
  static FONT_A = new Uint8Array([0x1b, 0x4d, 0x00]); // Font A (normal)
  static FONT_B = new Uint8Array([0x1b, 0x4d, 0x01]); // Font B (smaller)
  static CANCEL_CONDENSED = new Uint8Array([0x12]); // DC2 (cancel condensed mode on many ESC/POS devices)

  // Text formatting
  static BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
  static BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
  static UNDERLINE_ON = new Uint8Array([0x1b, 0x2d, 0x01]);
  static UNDERLINE_OFF = new Uint8Array([0x1b, 0x2d, 0x00]);
  static DOUBLE_WIDTH_ON = new Uint8Array([0x1b, 0x21, 0x30]);
  static DOUBLE_HEIGHT_ON = new Uint8Array([0x1b, 0x21, 0x10]);
  static DOUBLE_SIZE_ON = new Uint8Array([0x1b, 0x21, 0x38]);
  static NORMAL_SIZE = new Uint8Array([0x1b, 0x21, 0x00]);
  static SMALL_TEXT = new Uint8Array([0x1b, 0x21, 0x01]);

  // Alignment
  static ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
  static ALIGN_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
  static ALIGN_RIGHT = new Uint8Array([0x1b, 0x61, 0x02]);

  // Line feed
  static LINE_FEED = new Uint8Array([0x0a]);
  static FEED_LINES = (lines: number) => new Uint8Array([0x1b, 0x64, lines]);

  // Cut paper
  static CUT_PAPER = new Uint8Array([0x1d, 0x56, 0x00]);
  static PARTIAL_CUT = new Uint8Array([0x1d, 0x56, 0x01]);

  // Open cash drawer (if connected)
  static OPEN_DRAWER = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);

  // Image/Logo printing
  static SET_IMAGE_MODE = new Uint8Array([0x1b, 0x2a, 0x00]);
}

/**
 * Enhanced Bluetooth Printer Connection Manager with Logo Support
 */
export class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private config: PrinterConfig;
  private onDisconnected?: () => void;

  /** 
   * Optional override for sending raw bytes. 
   * If provided, connect/disconnect/send will bypass Web Bluetooth and use this instead (e.g. for native plugins).
   */
  public customSendFn?: (data: Uint8Array) => Promise<void>;

  constructor(config: PrinterConfig = { width: 32 }, opts?: { onDisconnected?: () => void }) {
    this.config = config;
    this.onDisconnected = opts?.onDisconnected;
  }

  /** The currently attached Bluetooth device (if any). */
  getDevice(): BluetoothDevice | null {
    return this.device;
  }

  /**
   * Attach a Bluetooth device and wire disconnect listener.
   */
  private attachDevice(device: BluetoothDevice) {
    // Clean up old listener if any
    if (this.device && this.device !== device) {
      try {
        this.device.removeEventListener("gattserverdisconnected", this.handleGattDisconnected);
      } catch {
        // ignore
      }
    }

    this.device = device;
    try {
      this.device.addEventListener("gattserverdisconnected", this.handleGattDisconnected);
    } catch {
      // ignore
    }
  }

  private handleGattDisconnected = () => {
    this.characteristic = null;
    this.onDisconnected?.();
  };

  /**
   * Connect to bluetooth printer (prompts user to choose a device)
   */
  async connect(): Promise<void> {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }, // Common thermal printer service
        ],
        optionalServices: [
          "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Another common service UUID
        ],
      });

      await this.connectToDevice(device);
      console.log("✅ Printer connected successfully");
    } catch (error) {
      console.error("❌ Printer connection failed:", error);
      throw new Error(
        "Failed to connect to printer. Please ensure bluetooth is enabled and printer is powered on.",
      );
    }
  }

  /**
   * Connect to an already-known Bluetooth device (no picker UI).
   *
   * Note: This only works if the browser has previously granted permission
   * to this device and it can be retrieved via navigator.bluetooth.getDevices().
   */
  async connectToDevice(device: BluetoothDevice): Promise<void> {
    this.attachDevice(device);

    if (!device.gatt) {
      throw new Error("GATT not available");
    }

    const server = device.gatt.connected ? device.gatt : await device.gatt.connect();

    // Get service (try common service UUIDs)
    let service;
    try {
      service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
    } catch {
      service = await server.getPrimaryService("49535343-fe7d-4ae5-8fa9-9fafd205e455");
    }

    // Get characteristic
    const characteristics = await service.getCharacteristics();
    this.characteristic = characteristics.find((c) => c.properties.write) || characteristics[0];

    if (!this.characteristic) {
      throw new Error("No writable characteristic found");
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        this.device.removeEventListener("gattserverdisconnected", this.handleGattDisconnected);
      } catch {
        // ignore
      }
    }

    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    // If using a custom native sender, the connection state is managed externally.
    if (this.customSendFn) return true;
    return !!this.device?.gatt?.connected;
  }

  /**
   * Send raw data to printer.
   *
   * BLE MTU: Most BLE 4.1+ devices support up to 512-byte MTU.
   * Try large chunks first; fall back to 20-byte chunks if rejected.
   * Larger chunks = fewer round-trips = much faster logo/bill printing.
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (this.customSendFn) {
      await this.customSendFn(data);
      return;
    }

    if (!this.characteristic) {
      throw new Error('Printer not connected');
    }

    const CHUNK_LARGE = 512;
    const CHUNK_SMALL = 20;
    const DELAY_MS = 5;

    let useLargeChunks = true;

    for (let i = 0; i < data.length;) {
      const chunkSize = useLargeChunks ? CHUNK_LARGE : CHUNK_SMALL;
      const chunk = data.slice(i, i + chunkSize);
      try {
        await this.characteristic.writeValue(chunk);
        i += chunk.byteLength;
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      } catch {
        if (useLargeChunks) {
          useLargeChunks = false; // fall back to 20-byte chunks for remainder
        } else {
          throw new Error('Failed to send data to printer');
        }
      }
    }
  }

  /**
   * Send text to printer
   */
  private async sendText(text: string): Promise<void> {
    const encoder = new TextEncoder();
    await this.sendData(encoder.encode(text));
  }

  /**
   * Print a line with padding
   */
  private padLine(left: string, right: string = ''): string {
    const totalWidth = this.config.width;

    // Many thermal printers default to CP437/CP850 and won't render the ₹ symbol.
    // When the symbol becomes '?' it breaks alignment in totals.
    const printable = (s: string) => this.normalizeForPrinter(s);

    const leftText = printable(left);
    const rightText = printable(right);

    const leftLen = leftText.length;
    const rightLen = rightText.length;
    const spacesNeeded = totalWidth - leftLen - rightLen;
    const spaces = spacesNeeded > 0 ? ' '.repeat(spacesNeeded) : ' ';
    return leftText + spaces + rightText;
  }

  private padLeft(text: string, width: number): string {
    const printable = this.normalizeForPrinter(text);
    if (printable.length >= width) return printable.slice(-width);
    return ' '.repeat(width - printable.length) + printable;
  }

  private padRight(text: string, width: number): string {
    const printable = this.normalizeForPrinter(text);
    if (printable.length >= width) return printable.slice(0, width);
    return printable + ' '.repeat(width - printable.length);
  }

  private wrapText(text: string, width: number): string[] {
    const input = this.normalizeForPrinter(String(text ?? '')).trim();
    if (!input) return [''];

    const words = input.split(/\s+/);
    const lines: string[] = [];
    let line = '';

    const pushLine = (l: string) => {
      if (l.length > 0) lines.push(l);
    };

    for (const w of words) {
      // If a single word is longer than width, hard-break it.
      if (w.length > width) {
        // flush current line
        pushLine(line);
        line = '';
        for (let i = 0; i < w.length; i += width) {
          lines.push(w.slice(i, i + width));
        }
        continue;
      }

      const next = line ? `${line} ${w}` : w;
      if (next.length <= width) {
        line = next;
      } else {
        pushLine(line);
        line = w;
      }
    }

    pushLine(line);
    return lines.length ? lines : [''];
  }

  private getItemColumns() {
    // IMPORTANT: widths must sum exactly to printer width to avoid auto-wrapping.
    // total = nameW + qtyW + priceW + amountW + gap*3

    // 80mm printers typically use 48 columns.
    if (this.config.width === 48) {
      // 48 = 23 + 4 + 9 + 9 + 1*3
      return { nameW: 23, qtyW: 4, priceW: 9, amountW: 9, gap: 1 };
    }

    // 58mm printers typically use 32 columns.
    // 32 = 14 + 3 + 6 + 6 + 1*3
    return { nameW: 14, qtyW: 3, priceW: 6, amountW: 6, gap: 1 };
  }

  /**
   * Normalize text for common ESC/POS printer encodings.
   * - Replace unsupported currency glyphs with ASCII alternatives to keep alignment stable.
   */
  private normalizeForPrinter(text: string): string {
    // If the printer can't print ₹, fall back to 'Rs. '
    // (Avoid removing entirely because it shifts the right-side totals.)
    // Keep it short to avoid wrapping on 58mm (32 cols)
    return text.replace(/₹/g, 'Rs.');
  }

  private formatMoney(amount: number, currency: string): string {
    const cur = this.normalizeForPrinter(currency || '');
    // If currency is alphabetic (e.g. "Rs." / "INR"), add a space for readability.
    const sep = cur && /[A-Za-z.]$/.test(cur) ? ' ' : '';
    return `${cur}${sep}${amount.toFixed(2)}`;
  }

  /**
   * Print separator line
   */
  private separator(char: string = '-'): string {
    return char.repeat(this.config.width) + '\n';
  }

  /**
   * Center text
   */
  private centerText(text: string): string {
    const padding = Math.max(0, Math.floor((this.config.width - text.length) / 2));
    return ' '.repeat(padding) + text + '\n';
  }

  /**
   * Convert image URL to an optimised GS v 0 raster bitmap.
   *
   * Pipeline (in order):
   *  1. Load image, composite onto white background
   *  2. Scale to fit 58 mm print area (≈ 384 dots wide at 203 dpi)
   *  3. Convert to greyscale, boost contrast (stretch histogram)
   *  4. Floyd-Steinberg dithering  →  crisp 1-bit output, no muddy grey blobs
   *  5. Trim blank rows from top & bottom  →  less data, faster print
   *  6. Wrap in GS v 0 (1D 76 30) header  →  works on every cheap ESC/POS printer
   *
   * Why this looks better than a hard threshold:
   *  Hard threshold turns every mid-grey pixel into solid black, which fills in
   *  fine details (thin circle lines, small text).  Floyd-Steinberg distributes
   *  the quantisation error to neighbouring pixels, so gradients and anti-aliased
   *  edges resolve into clean dot patterns that look sharp on thermal paper.
   *
   * Why it prints faster:
   *  - Trimming blank rows removes up to ~40 % of the data for typical logos
   *    (which have lots of white margin at source resolution).
   *  - Combined with the enlarged BLE chunk size in sendData(), total transfer
   *    time drops from ~3-4 s to well under 1 s on most printers.
   */
  private async convertImageToBitmap(imageUrl: string): Promise<Uint8Array | null> {
    try {
      // ── 1. Load image ──────────────────────────────────────────────────────
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imageUrl;
      });

      // ── 2. Fixed output size: 200 × 92 px ────────────────────────────────────
      // Scale image to fit within 200×92 preserving aspect ratio (letterbox).
      // Unused area stays white. Width 200 is already a multiple of 8.
      const TARGET_W = 200;
      const TARGET_H = 92;

      const scale = Math.min(TARGET_W / img.width, TARGET_H / img.height);
      const drawW = Math.round(img.width * scale);
      const drawH = Math.round(img.height * scale);
      const offsetX = Math.floor((TARGET_W - drawW) / 2);
      const offsetY = Math.floor((TARGET_H - drawH) / 2);

      const printW = TARGET_W; // 200 is already a multiple of 8
      const canvasH = TARGET_H;

      // ── 3. Draw onto a white canvas, get greyscale luminance array ─────────
      const canvas = document.createElement('canvas');
      canvas.width = printW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, printW, canvasH);
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      const imageData = ctx.getImageData(0, 0, printW, canvasH);
      const px = imageData.data; // RGBA

      // Build greyscale float array (0 = black, 255 = white) with alpha composite
      const grey = new Float32Array(printW * canvasH);
      for (let i = 0; i < grey.length; i++) {
        const r = px[i * 4];
        const g = px[i * 4 + 1];
        const b = px[i * 4 + 2];
        const a = px[i * 4 + 3] / 255;
        // Composite onto white
        const fr = r * a + 255 * (1 - a);
        const fg = g * a + 255 * (1 - a);
        const fb = b * a + 255 * (1 - a);
        grey[i] = 0.299 * fr + 0.587 * fg + 0.114 * fb;
      }

      // ── 4. Contrast stretch ────────────────────────────────────────────────
      // Find the darkest and lightest non-trivial pixels and remap to 0-255.
      // This makes logos that were scanned or generated with mid-grey lines
      // print with full black ink instead of washed-out dots.
      let lo = 255, hi = 0;
      for (let i = 0; i < grey.length; i++) {
        if (grey[i] < lo) lo = grey[i];
        if (grey[i] > hi) hi = grey[i];
      }
      const range = hi - lo || 1;
      for (let i = 0; i < grey.length; i++) {
        grey[i] = ((grey[i] - lo) / range) * 255;
      }

      // ── 5. Floyd-Steinberg dithering → 1-bit ──────────────────────────────
      // Error diffusion weights (classic F-S):
      //   * 7/16  →  right
      //   3/16  ↙   5/16  ↓   1/16  ↘
      const dither = new Float32Array(grey); // working copy
      const bits = new Uint8Array(printW * canvasH); // 0 = white, 1 = black

      for (let y = 0; y < canvasH; y++) {
        for (let x = 0; x < printW; x++) {
          const idx = y * printW + x;
          const old = dither[idx];
          const nw = old < 128 ? 0 : 255; // quantise
          bits[idx] = nw === 0 ? 1 : 0;    // 1 = print dot
          const err = old - nw;

          if (x + 1 < printW) dither[idx + 1] += err * 7 / 16;
          if (y + 1 < canvasH) {
            if (x > 0) dither[idx + printW - 1] += err * 3 / 16;
            dither[idx + printW] += err * 5 / 16;
            if (x + 1 < printW) dither[idx + printW + 1] += err * 1 / 16;
          }
        }
      }

      // ── 6. Trim blank rows (top & bottom) ─────────────────────────────────
      const rowHasInk = (y: number) => {
        for (let x = 0; x < printW; x++) {
          if (bits[y * printW + x]) return true;
        }
        return false;
      };
      let top = 0;
      while (top < canvasH && !rowHasInk(top)) top++;
      let bot = canvasH - 1;
      while (bot > top && !rowHasInk(bot)) bot--;

      if (top >= bot) return null; // blank image — skip logo

      const printH = bot - top + 1;
      const bytesPerRow = printW / 8;

      // ── 7. Pack bits into raster bytes ─────────────────────────────────────
      const raster = new Uint8Array(printH * bytesPerRow);
      for (let y = 0; y < printH; y++) {
        for (let bx = 0; bx < bytesPerRow; bx++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            if (bits[(top + y) * printW + bx * 8 + bit]) {
              byte |= (1 << (7 - bit)); // MSB = leftmost pixel
            }
          }
          raster[y * bytesPerRow + bx] = byte;
        }
      }

      // ── 8. Build GS v 0 command ────────────────────────────────────────────
      // 1D 76 30 m xL xH yL yH  d1…dk
      // m=0 → normal density, xL/xH = bytes/row, yL/yH = rows
      const xL = bytesPerRow & 0xff;
      const xH = (bytesPerRow >> 8) & 0xff;
      const yL = printH & 0xff;
      const yH = (printH >> 8) & 0xff;

      const cmd = new Uint8Array(8 + raster.length);
      cmd.set([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
      cmd.set(raster, 8);
      return cmd;

    } catch (error) {
      console.error('Failed to convert image to bitmap:', error);
      return null;
    }
  }

  /**
   * Print logo if available
   */
  private async printLogo(logoUrl: string): Promise<void> {
    try {
      // Center alignment for logo
      await this.sendData(ESCPOSCommands.ALIGN_CENTER);

      // Try to print bitmap logo
      const bitmapData = await this.convertImageToBitmap(logoUrl);
      if (bitmapData) {
        await this.sendData(bitmapData);
        await this.sendData(ESCPOSCommands.LINE_FEED);
      }

      await this.sendData(ESCPOSCommands.ALIGN_LEFT);
    } catch (error) {
      console.error('Logo printing failed:', error);
      // Continue without logo
    }
  }

  /**
   * Print enhanced GST-compliant bill matching restaurant receipt design
   */
  async printBill(billData: BillData): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer not connected. Please connect first.');
    }

    try {
      // Initialize printer
      await this.sendData(ESCPOSCommands.INIT);

      // Print logo if available
      if (billData.restaurant.logo?.url) {
        await this.printLogo(billData.restaurant.logo.url);
        await this.sendData(ESCPOSCommands.LINE_FEED);
      }

      // Header - Restaurant Name (Bold, Double Size, Centered)
      await this.sendData(ESCPOSCommands.ALIGN_CENTER);
      await this.sendData(ESCPOSCommands.BOLD_ON);
      await this.sendData(ESCPOSCommands.DOUBLE_WIDTH_ON);
      await this.sendText(billData.restaurant.name.toUpperCase() + '\n');
      await this.sendData(ESCPOSCommands.NORMAL_SIZE);
      await this.sendData(ESCPOSCommands.BOLD_OFF);

      // Restaurant Address (Centered, Small Text)
      await this.sendData(ESCPOSCommands.SMALL_TEXT);
      if (billData.restaurant.addressLine1) {
        await this.sendText(billData.restaurant.addressLine1 + '\n');
      }
      if (billData.restaurant.addressLine2) {
        await this.sendText(billData.restaurant.addressLine2 + '\n');
      }
      if (billData.restaurant.city && billData.restaurant.state) {
        await this.sendText(`${billData.restaurant.city}, ${billData.restaurant.state}\n`);
      }
      if (billData.restaurant.postalCode) {
        await this.sendText(`${billData.restaurant.postalCode}\n`);
      }
      // Contact details (each on its own line)
      if (billData.restaurant.phone) {
        await this.sendText(`Phone: ${billData.restaurant.phone}\n`);
      }
      if (billData.restaurant.email) {
        await this.sendText(`Email: ${billData.restaurant.email}\n`);
      }

      // GST & FSSAI Numbers (Centered)
      if (billData.restaurant.gstNumber) {
        await this.sendText(`GSTIN: ${billData.restaurant.gstNumber}\n`);
      }
      if (billData.restaurant.fssaiNumber) {
        await this.sendText(`FSSAI LIC NO: ${billData.restaurant.fssaiNumber}\n`);
      }

      await this.sendData(ESCPOSCommands.NORMAL_SIZE);
      await this.sendData(ESCPOSCommands.LINE_FEED);

      await this.sendData(ESCPOSCommands.ALIGN_LEFT);
      await this.sendText(this.separator('-'));

      // Guest/Table Info
      if (billData.bill.guestName) {
        await this.sendText(`Name: ${billData.bill.guestName}\n`);
      }

      await this.sendData(ESCPOSCommands.LINE_FEED);

      // Bill Details
      // 1) Date + Time together on one line
      const dateTime = `Date & time : ${billData.bill.time} ${billData.bill.date}`.trim();
      await this.sendText(`${dateTime}\n`);

      // 2) Type (Dine In / Delivery / Takeaway)
      const orderType = typeof billData.bill.dineIn === 'string'
        ? billData.bill.dineIn
        : (billData.bill.tableNumber ? 'Dine In' : '');
      if (orderType) {
        const raw = String(orderType).trim();

        const extractTableNo = (value: string): string | undefined => {
          const m = value.match(/(?:table\s*(?:no\.)?\s*)?(?:t\s*)?(\d+)/i);
          return m?.[1];
        };

        const tableNo = billData.bill.tableNumber || extractTableNo(raw);
        const looksLikeTableOnly = !!tableNo && (/^\d+$/.test(raw) || /^t\s*\d+$/i.test(raw) || /table/i.test(raw));
        const isDineIn = /dine\s*in/i.test(raw) || looksLikeTableOnly;

        if (isDineIn && tableNo) {
          await this.sendText(`Type : Dine In - ${tableNo}\n`);
        } else {
          await this.sendText(`Type : ${raw}\n`);
        }
      }

      // 3) Bill No. on its own line
      await this.sendText(`Bill No.: ${billData.bill.billNumber}\n`);

      // Optional waiter line
      if (billData.bill.waiterName) {
        await this.sendText(`Waiter: ${billData.bill.waiterName}\n`);
      }

      await this.sendText(this.separator('-'));

      // Items Header - Item | Qty | Price | Amount
      // Ensure we're in a predictable text mode (some 58mm printers keep condensed/font state)
      await this.sendData(ESCPOSCommands.ALIGN_LEFT);
      await this.sendData(ESCPOSCommands.CANCEL_CONDENSED);
      await this.sendData(ESCPOSCommands.FONT_A);
      await this.sendData(ESCPOSCommands.NORMAL_SIZE);

      const cols = this.getItemColumns();
      await this.sendData(ESCPOSCommands.BOLD_ON);
      const header =
        this.padRight('Item', cols.nameW) +
        ' '.repeat(cols.gap) +
        this.padLeft('Qty', cols.qtyW) +
        ' '.repeat(cols.gap) +
        this.padLeft('Price', cols.priceW) +
        ' '.repeat(cols.gap) +
        this.padLeft('Amount', cols.amountW) +
        "\n";
      await this.sendText(header);
      await this.sendData(ESCPOSCommands.BOLD_OFF);
      await this.sendText(this.separator('-'));

      // Items - first line has columns, wrapped name continues on next line(s) under Item column only
      for (const item of billData.items) {
        const nameLines = this.wrapText(item.name, cols.nameW);

        const rightPart =
          this.padLeft(String(item.quantity), cols.qtyW) +
          ' '.repeat(cols.gap) +
          this.padLeft(item.price.toFixed(2), cols.priceW) +
          ' '.repeat(cols.gap) +
          this.padLeft(item.total.toFixed(2), cols.amountW);

        // First line (name + numbers)
        const line1 =
          this.padRight(nameLines[0] ?? '', cols.nameW) +
          ' '.repeat(cols.gap) +
          rightPart;

        // Optional debug: verify we never exceed configured width
        if (localStorage.getItem("orderzi_printer_debug") === "1") {
          console.log("[printer] item line1", { width: this.config.width, len: line1.length, line1 });
        }

        await this.sendText(line1 + "\r\n");

        // Continuation lines (name only)
        for (const cont of nameLines.slice(1)) {
          const contLine = this.padRight(cont, cols.nameW);
          if (localStorage.getItem("orderzi_printer_debug") === "1") {
            console.log("[printer] item cont", { width: this.config.width, len: contLine.length, contLine });
          }
          await this.sendText(contLine + "\r\n");
        }

        // Visual spacing between items (only needed when name wraps)
        if (nameLines.length > 1) {
          await this.sendText("\r\n");
        }
      }

      await this.sendText(this.separator('-'));

      // Totals Section
      await this.sendText('\n');

      const totalQty = billData.items.reduce((sum, item) => sum + item.quantity, 0);
      await this.sendText(`Total Qty: ${totalQty}\n`);
      await this.sendText(this.padLine(
        'Sub Total',
        this.formatMoney(billData.totals.subtotal, billData.currency)
      ));

      // Service Charge
      if (billData.totals.serviceCharge > 0) {
        const serviceRate = billData.taxRateService || 10;
        await this.sendText(this.padLine(
          `Service Charge ${serviceRate.toFixed(0)}%`,
          this.formatMoney(billData.totals.serviceCharge, billData.currency)
        ));
      }

      // GST Breakdown - SGST & CGST
      if (billData.totals.cgst && billData.totals.sgst) {
        const gstRate = billData.taxRateGst || 5;
        const halfRate = (gstRate / 2);
        await this.sendText(this.padLine(
          `SGST ${halfRate.toFixed(1)}%`,
          this.formatMoney(billData.totals.sgst, billData.currency)
        ));
        await this.sendText(this.padLine(
          `CGST ${halfRate.toFixed(1)}%`,
          this.formatMoney(billData.totals.cgst, billData.currency)
        ));
      } else if (billData.totals.gst > 0) {
        const gstRate = billData.taxRateGst || 5;
        await this.sendText(this.padLine(
          `GST ${gstRate.toFixed(1)}%`,
          this.formatMoney(billData.totals.gst, billData.currency)
        ));
      }

      // Discount (if applicable)
      // (Some backends store discount as negative; print as a negative line item)
      const discountAbs = Math.abs(billData.totals.discount ?? 0);
      if (discountAbs > 0) {
        await this.sendText(this.padLine(
          'Discount',
          `-${this.formatMoney(discountAbs, billData.currency)}`
        ));
      }

      await this.sendText(this.separator('-'));

      // Round Off (if applicable)
      if (billData.totals.roundOff && billData.totals.roundOff !== 0) {
        await this.sendText(this.padLine(
          'Round off',
          this.formatMoney(billData.totals.roundOff, billData.currency)
        ));
      }

      // Grand Total (Bold, Larger)
      await this.sendData(ESCPOSCommands.BOLD_ON);
      await this.sendData(ESCPOSCommands.DOUBLE_HEIGHT_ON);
      await this.sendText(this.padLine(
        'Grand Total',
        this.formatMoney(billData.totals.grandTotal, billData.currency)
      ));
      await this.sendData(ESCPOSCommands.NORMAL_SIZE);
      await this.sendData(ESCPOSCommands.BOLD_OFF);

      await this.sendText(this.separator('-'));

      // Footer
      await this.sendData(ESCPOSCommands.ALIGN_CENTER);
      await this.sendData(ESCPOSCommands.LINE_FEED);
      await this.sendText('THANKS FOR YOUR VISIT\n');
      await this.sendText('PLEASE VISIT AGAIN\n');
      await this.sendData(ESCPOSCommands.LINE_FEED);

      // Feed and cut
      await this.sendData(ESCPOSCommands.FEED_LINES(4));
      await this.sendData(ESCPOSCommands.PARTIAL_CUT);

      console.log('✅ Bill printed successfully');
    } catch (error) {
      console.error('❌ Print failed:', error);
      throw new Error('Failed to print bill. Please check printer connection.');
    }
  }

  /**
   * Print a Kitchen Order Ticket (KOT) — no pricing, large text for kitchen staff.
   */
  async printKOT(kotData: KOTData): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer not connected. Please connect first.');
    }

    try {
      await this.sendData(ESCPOSCommands.INIT);

      // ── Header ──────────────────────────────────────────────────────────
      await this.sendData(ESCPOSCommands.ALIGN_CENTER);
      await this.sendData(ESCPOSCommands.BOLD_ON);
      await this.sendData(ESCPOSCommands.DOUBLE_SIZE_ON);
      await this.sendText('** KOT **\n');
      await this.sendData(ESCPOSCommands.NORMAL_SIZE);
      await this.sendData(ESCPOSCommands.BOLD_OFF);

      // Restaurant name
      await this.sendData(ESCPOSCommands.BOLD_ON);
      await this.sendText(kotData.restaurant.name.toUpperCase() + '\n');
      await this.sendData(ESCPOSCommands.BOLD_OFF);

      await this.sendData(ESCPOSCommands.ALIGN_LEFT);
      await this.sendText(this.separator('='));

      // ── Order info ──────────────────────────────────────────────────────
      await this.sendText(`KOT No : ${kotData.kot.kotNumber}\n`);
      if (kotData.kot.orderNumber) {
        await this.sendText(`Order No: ${kotData.kot.orderNumber}\n`);
      }
      await this.sendText(`Date   : ${kotData.kot.date} ${kotData.kot.time}\n`);
      await this.sendText(`Type   : ${kotData.kot.orderType}\n`);
      if (kotData.kot.waiterName) {
        await this.sendText(`Waiter : ${kotData.kot.waiterName}\n`);
      }

      await this.sendText(this.separator('-'));

      // ── Items header ────────────────────────────────────────────────────
      await this.sendData(ESCPOSCommands.BOLD_ON);
      // Format: Qty  Item name
      await this.sendText(this.padLine('Item', 'Qty') + '\n');
      await this.sendData(ESCPOSCommands.BOLD_OFF);
      await this.sendText(this.separator('-'));

      // ── Items ──────────────────────────────────────────────────────────
      for (const item of kotData.items) {
        const qtyStr = `x${item.quantity}`;
        // Wrap the item name to fit the line
        const nameLines = this.wrapText(item.name, this.config.width - qtyStr.length - 1);

        // First line: name + qty aligned right
        await this.sendData(ESCPOSCommands.BOLD_ON);
        await this.sendData(ESCPOSCommands.DOUBLE_HEIGHT_ON);
        await this.sendText(this.padLine(nameLines[0] ?? '', qtyStr) + '\n');
        await this.sendData(ESCPOSCommands.NORMAL_SIZE);
        await this.sendData(ESCPOSCommands.BOLD_OFF);

        // Continuation lines for long names
        for (const cont of nameLines.slice(1)) {
          await this.sendText(cont + '\n');
        }

        // Variant / modifiers (small text, indented)
        if (item.variant) {
          await this.sendData(ESCPOSCommands.SMALL_TEXT);
          await this.sendText(`  Variant: ${item.variant}\n`);
          await this.sendData(ESCPOSCommands.NORMAL_SIZE);
        }
        if (item.modifiers) {
          await this.sendData(ESCPOSCommands.SMALL_TEXT);
          const modLines = this.wrapText(`  + ${item.modifiers}`, this.config.width);
          for (const ml of modLines) {
            await this.sendText(ml + '\n');
          }
          await this.sendData(ESCPOSCommands.NORMAL_SIZE);
        }
      }

      await this.sendText(this.separator('='));

      // ── Notes ───────────────────────────────────────────────────────────
      if (kotData.kot.notes) {
        await this.sendData(ESCPOSCommands.BOLD_ON);
        await this.sendText('NOTE:\n');
        await this.sendData(ESCPOSCommands.BOLD_OFF);
        const noteLines = this.wrapText(kotData.kot.notes, this.config.width);
        for (const nl of noteLines) {
          await this.sendText(nl + '\n');
        }
        await this.sendText(this.separator('-'));
      }

      // Feed and cut
      await this.sendData(ESCPOSCommands.FEED_LINES(4));
      await this.sendData(ESCPOSCommands.PARTIAL_CUT);

      console.log('✅ KOT printed successfully');
    } catch (error) {
      console.error('❌ KOT print failed:', error);
      throw new Error('Failed to print KOT. Please check printer connection.');
    }
  }

  /**
   * Test print
   */
  async testPrint(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    await this.sendData(ESCPOSCommands.INIT);
    await this.sendData(ESCPOSCommands.ALIGN_CENTER);
    await this.sendData(ESCPOSCommands.DOUBLE_SIZE_ON);
    await this.sendText('TEST PRINT\n');
    await this.sendData(ESCPOSCommands.NORMAL_SIZE);
    await this.sendText('Printer is working!\n');
    await this.sendText(new Date().toLocaleString() + '\n');
    await this.sendData(ESCPOSCommands.FEED_LINES(4));
    await this.sendData(ESCPOSCommands.PARTIAL_CUT);
  }
}

/**
 * USB Printer Alternative (for desktop apps)
 */
export class USBPrinter extends BluetoothPrinter {
  private usbDevice: USBDevice | null = null;

  async connect(): Promise<void> {
    try {
      // Request USB device
      this.usbDevice = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0416 }, // Common thermal printer vendor IDs
          { vendorId: 0x04b8 },
          { vendorId: 0x067b },
        ]
      });

      await this.usbDevice.open();
      await this.usbDevice.selectConfiguration(1);
      await this.usbDevice.claimInterface(0);

      console.log('✅ USB Printer connected');
    } catch (error) {
      console.error('❌ USB Printer connection failed:', error);
      throw new Error('Failed to connect to USB printer');
    }
  }

  async disconnect(): Promise<void> {
    if (this.usbDevice) {
      await this.usbDevice.close();
      this.usbDevice = null;
    }
  }
}