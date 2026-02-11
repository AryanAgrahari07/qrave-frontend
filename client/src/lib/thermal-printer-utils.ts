/**
 * Enhanced Thermal Printer Utility for ESC/POS Commands
 * Supports bluetooth thermal printers (58mm/80mm) with logo printing
 * Matches professional restaurant bill design
 */

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
 * ESC/POS Command Builder
 */
export class ESCPOSCommands {
  // Initialize printer
  static INIT = new Uint8Array([0x1b, 0x40]);
  
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

  constructor(config: PrinterConfig = { width: 32 }) {
    this.config = config;
  }

  /**
   * Connect to bluetooth printer
   */
  async connect(): Promise<void> {
    try {
      // Request bluetooth device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Common thermal printer service
        ],
        optionalServices: [
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Another common service UUID
        ]
      });

      if (!this.device.gatt) {
        throw new Error('GATT not available');
      }

      // Connect to GATT server
      const server = await this.device.gatt.connect();
      
      // Get service (try common service UUIDs)
      let service;
      try {
        service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      } catch {
        service = await server.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
      }

      // Get characteristic
      const characteristics = await service.getCharacteristics();
      this.characteristic = characteristics.find(c => c.properties.write) || characteristics[0];

      if (!this.characteristic) {
        throw new Error('No writable characteristic found');
      }

      console.log('✅ Printer connected successfully');
    } catch (error) {
      console.error('❌ Printer connection failed:', error);
      throw new Error('Failed to connect to printer. Please ensure bluetooth is enabled and printer is powered on.');
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
      this.device = null;
      this.characteristic = null;
    }
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return !!this.device?.gatt?.connected;
  }

  /**
   * Send raw data to printer
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Printer not connected');
    }

    // Split data into chunks (max 20 bytes for BLE)
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
      // Small delay to prevent overwhelming the printer
      await new Promise(resolve => setTimeout(resolve, 10));
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
    const leftLen = left.length;
    const rightLen = right.length;
    const spacesNeeded = totalWidth - leftLen - rightLen;
    const spaces = spacesNeeded > 0 ? ' '.repeat(spacesNeeded) : ' ';
    return left + spaces + right;
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
   * Convert image URL to ESC/POS bitmap data
   * This is a simplified version - actual implementation would need proper image processing
   */
  private async convertImageToBitmap(imageUrl: string): Promise<Uint8Array | null> {
    try {
      // Create an image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Load the image
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Create canvas to process image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Set canvas size (scale down for thermal printer)
      const maxWidth = this.config.width === 48 ? 384 : 256; // pixels
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to black and white bitmap
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // ESC/POS bitmap format
      const width = canvas.width;
      const height = canvas.height;
      const bytesPerLine = Math.ceil(width / 8);
      
      const bitmapData: number[] = [];
      
      // ESC * m nL nH d1...dk - Bitmap mode
      bitmapData.push(0x1b, 0x2a, 33); // m=33 for 24-dot double-density
      bitmapData.push(bytesPerLine & 0xff, (bytesPerLine >> 8) & 0xff);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x += 8) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const px = x + bit;
            if (px < width) {
              const idx = (y * width + px) * 4;
              // Convert to grayscale and threshold
              const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
              if (gray < 128) { // Black pixel
                byte |= (1 << (7 - bit));
              }
            }
          }
          bitmapData.push(byte);
        }
        bitmapData.push(0x0a); // Line feed after each line
      }
      
      return new Uint8Array(bitmapData);
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
      if (billData.restaurant.phone || billData.restaurant.email) {
        const parts = [billData.restaurant.phone, billData.restaurant.email].filter(Boolean);
        await this.sendText(`Contact: ${parts.join(' | ')}\n`);
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
      
      // Bill Details - Matching receipt format
      const dateTimeLine = this.padLine(
        `Date: ${billData.bill.date}`,
        billData.bill.dineIn ? `Dine In: ${billData.bill.dineIn}` : ''
      );
      await this.sendText(dateTimeLine);
      
      const timeBillLine = this.padLine(
        billData.bill.time,
        ''
      );
      await this.sendText(timeBillLine);
      
      if (billData.bill.cashier) {
        await this.sendText(`Cashier: ${billData.bill.cashier}\n`);
      }
      
      await this.sendText(this.padLine(
        billData.bill.waiterName ? `Waiter: ${billData.bill.waiterName}` : '',
        `Bill No.: ${billData.bill.billNumber}`
      ));
      
      await this.sendText(this.separator('-'));
      
      // Items Header - Qty, Price, Amount format
      await this.sendData(ESCPOSCommands.BOLD_ON);
      await this.sendText(this.padLine('Item', 'Qty. Price Amount'));
      await this.sendData(ESCPOSCommands.BOLD_OFF);
      await this.sendText(this.separator('-'));
      
      // Items - Multi-line format like receipt
      for (const item of billData.items) {
        // Item name on first line
        await this.sendText(`${item.name}\n`);
        
        // Quantity, price, and total on second line
        const qtyPriceAmount = this.padLine(
          '',
          `${item.quantity} ${item.price.toFixed(2)} ${item.total.toFixed(2)}`
        );
        await this.sendText(qtyPriceAmount);
      }
      
      await this.sendText(this.separator('-'));
      
      // Totals Section
      await this.sendText('\n');
      await this.sendText(this.padLine(
        `Total Qty: ${billData.items.reduce((sum, item) => sum + item.quantity, 0)}`,
        `Sub Total ${billData.currency}${billData.totals.subtotal.toFixed(2)}`
      ));
      
      // Service Charge
      if (billData.totals.serviceCharge > 0) {
        const serviceRate = billData.taxRateService || 10;
        await this.sendText(this.padLine(
          `Service Charge ${serviceRate.toFixed(0)}%`,
          `${billData.currency}${billData.totals.serviceCharge.toFixed(2)}`
        ));
      }
      
      // GST Breakdown - SGST & CGST
      if (billData.totals.cgst && billData.totals.sgst) {
        const gstRate = billData.taxRateGst || 5;
        const halfRate = (gstRate / 2);
        await this.sendText(this.padLine(
          `SGST ${halfRate.toFixed(1)}%`,
          `${billData.currency}${billData.totals.sgst.toFixed(2)}`
        ));
        await this.sendText(this.padLine(
          `CGST ${halfRate.toFixed(1)}%`,
          `${billData.currency}${billData.totals.cgst.toFixed(2)}`
        ));
      } else if (billData.totals.gst > 0) {
        const gstRate = billData.taxRateGst || 5;
        await this.sendText(this.padLine(
          `GST ${gstRate.toFixed(1)}%`,
          `${billData.currency}${billData.totals.gst.toFixed(2)}`
        ));
      }
      
      await this.sendText(this.separator('-'));
      
      // Round Off (if applicable)
      if (billData.totals.roundOff && billData.totals.roundOff !== 0) {
        await this.sendText(this.padLine(
          'Round off',
          `${billData.currency}${billData.totals.roundOff.toFixed(2)}`
        ));
      }
      
      // Grand Total (Bold, Larger)
      await this.sendData(ESCPOSCommands.BOLD_ON);
      await this.sendData(ESCPOSCommands.DOUBLE_HEIGHT_ON);
      await this.sendText(this.padLine(
        'Grand Total',
        `${billData.currency}${billData.totals.grandTotal.toFixed(2)}`
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