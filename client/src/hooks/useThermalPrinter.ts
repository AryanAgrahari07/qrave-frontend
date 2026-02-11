import { useState, useCallback, useEffect } from 'react';
import { BluetoothPrinter, BillData } from '@/lib/thermal-printer-utils';
import { toast } from 'sonner';

interface UseThermalPrinterReturn {
  printer: BluetoothPrinter | null;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printBill: (billData: BillData) => Promise<void>;
  testPrint: () => Promise<void>;
}

/**
 * Hook for managing thermal printer connection and printing
 */
export function useThermalPrinter(printerWidth: 32 | 48 = 32): UseThermalPrinterReturn {
  const [printer, setPrinter] = useState<BluetoothPrinter | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Initialize printer instance
  useEffect(() => {
    const printerInstance = new BluetoothPrinter({ width: printerWidth });
    setPrinter(printerInstance);

    return () => {
      // Cleanup on unmount
      if (printerInstance.isConnected()) {
        printerInstance.disconnect();
      }
    };
  }, [printerWidth]);

  /**
   * Connect to bluetooth printer
   */
  const connect = useCallback(async () => {
    if (!printer) return;
    
    setIsConnecting(true);
    try {
      await printer.connect();
      setIsConnected(true);
      toast.success('Printer connected successfully');
    } catch (error) {
      console.error('Printer connection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect to printer');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [printer]);

  /**
   * Disconnect from printer
   */
  const disconnect = useCallback(async () => {
    if (!printer) return;

    try {
      await printer.disconnect();
      setIsConnected(false);
      toast.success('Printer disconnected');
    } catch (error) {
      console.error('Printer disconnect error:', error);
      toast.error('Failed to disconnect printer');
    }
  }, [printer]);

  /**
   * Print bill
   */
  const printBill = useCallback(async (billData: BillData) => {
    if (!printer) {
      toast.error('Printer not initialized');
      return;
    }

    if (!isConnected) {
      toast.error('Printer not connected. Please connect first.');
      return;
    }

    setIsPrinting(true);
    try {
      await printer.printBill(billData);
      toast.success('Bill printed successfully');
    } catch (error) {
      console.error('Print error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to print bill');
    } finally {
      setIsPrinting(false);
    }
  }, [printer, isConnected]);

  /**
   * Test print
   */
  const testPrint = useCallback(async () => {
    if (!printer) {
      toast.error('Printer not initialized');
      return;
    }

    if (!isConnected) {
      toast.error('Printer not connected. Please connect first.');
      return;
    }

    setIsPrinting(true);
    try {
      await printer.testPrint();
      toast.success('Test print completed');
    } catch (error) {
      console.error('Test print error:', error);
      toast.error('Test print failed');
    } finally {
      setIsPrinting(false);
    }
  }, [printer, isConnected]);

  return {
    printer,
    isConnected,
    isConnecting,
    isPrinting,
    connect,
    disconnect,
    printBill,
    testPrint,
  };
}