import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { BillData, BluetoothPrinter, KOTData } from "@/lib/thermal-printer-utils";
import * as NativeBT from "@/lib/nativeBluetoothPrinter";
import type { PairedDevice } from "@/lib/nativeBluetoothPrinter";

const LAST_PRINTER_ID_KEY = "orderzi_last_printer_id";

const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

type PrinterContextValue = {
  printer: BluetoothPrinter | null;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  lastPrinterId: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printBill: (billData: BillData) => Promise<void>;
  printKOT: (kotData: KOTData) => Promise<void>;
  testPrint: () => Promise<void>;
  /** Native only — list paired Bluetooth devices. */
  listPairedDevices: () => Promise<PairedDevice[]>;
  /** Native only — connect to a specific device by address. */
  connectToAddress: (address: string) => Promise<void>;
};

const PrinterContext = createContext<PrinterContextValue | null>(null);

export function PrinterProvider({
  children,
  width = 32,
}: {
  children: React.ReactNode;
  width?: 32 | 48;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [lastPrinterId, setLastPrinterId] = useState<string | null>(() =>
    localStorage.getItem(LAST_PRINTER_ID_KEY),
  );

  // Web Bluetooth printer (used on web only)
  const printerRef = useRef<BluetoothPrinter | null>(null);
  if (!printerRef.current) {
    printerRef.current = new BluetoothPrinter(
      { width },
      {
        onDisconnected: () => {
          if (!isNative()) setIsConnected(false);
        },
      },
    );
    
    // Bind native sender if we are running on mobile
    if (isNative()) {
      printerRef.current.customSendFn = NativeBT.writeToPrinter;
    }
  }

  const printer = printerRef.current;

  const setStoredPrinterId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(LAST_PRINTER_ID_KEY, id);
    else localStorage.removeItem(LAST_PRINTER_ID_KEY);
    setLastPrinterId(id);
  }, []);

  // ── Native: auto-connect & auto-reconnect on mount ─────────────────────────
  useEffect(() => {
    if (!isNative()) return;

    let mounted = true;

    const setup = async () => {
      try {
        // Enable auto-reconnect in the native plugin
        await NativeBT.enableAutoReconnect();

        // Listen for native connection events
        const connListener = await NativeBT.onPrinterConnected((data) => {
          if (!mounted) return;
          setIsConnected(true);
          if (data.address) setStoredPrinterId(data.address);
          toast.success("Printer connected", { id: "printer_connected" });
        });

        const disconnListener = await NativeBT.onPrinterDisconnected(() => {
          if (!mounted) return;
          setIsConnected(false);
          toast.info("Printer disconnected — reconnecting…", { id: "printer_disconnected" });
        });

        // Attempt auto-connect to last printer
        const result = await NativeBT.autoConnect();
        if (mounted && result.connected) {
          setIsConnected(true);
          if (result.address) setStoredPrinterId(result.address);
        }

        return () => {
          mounted = false;
          connListener.remove();
          disconnListener.remove();
        };
      } catch (e) {
        console.error("[PrinterContext] Native setup error:", e);
      }
    };

    const cleanupPromise = setup();

    return () => {
      mounted = false;
      cleanupPromise?.then((cleanup) => cleanup?.());
    };
  }, [setStoredPrinterId]);

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (isNative()) {
      // On native: list paired devices and let user pick (or auto-connect)
      setIsConnecting(true);
      try {
        const devices = await NativeBT.listPairedDevices();
        if (devices.length === 0) {
          toast.error("No paired Bluetooth devices found. Pair your printer in Android Settings first.");
          return;
        }

        // If only one device, connect directly. Otherwise connect to first one.
        // TODO: Could show a picker dialog in future
        const target = devices[0];
        const result = await NativeBT.connectToPrinter(target.address);
        if (result.connected) {
          setIsConnected(true);
          setStoredPrinterId(target.address);
          toast.success(`Connected to ${result.name || target.name}`, { id: "printer_connected" });
        }
      } catch (error) {
        console.error("Native printer connection error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to connect to printer");
        setIsConnected(false);
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    // Web Bluetooth path
    if (!printer) return;
    setIsConnecting(true);
    try {
      await printer.connect();
      setIsConnected(true);
      const id = printer.getDevice()?.id ?? null;
      if (id) setStoredPrinterId(id);

      toast.success("Printer connected", { id: "printer_connected" });
    } catch (error) {
      console.error("Printer connection error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect to printer");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [printer, setStoredPrinterId]);

  // ── Connect to specific address (native) ───────────────────────────────────

  const connectToAddress = useCallback(async (address: string) => {
    if (!isNative()) return;
    setIsConnecting(true);
    try {
      const result = await NativeBT.connectToPrinter(address);
      if (result.connected) {
        setIsConnected(true);
        setStoredPrinterId(address);
        toast.success(`Connected to ${result.name || "printer"}`, { id: "printer_connected" });
      }
    } catch (error) {
      console.error("Native connect error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [setStoredPrinterId]);

  // ── List paired devices (native) ───────────────────────────────────────────

  const listPairedDevices = useCallback(async (): Promise<PairedDevice[]> => {
    if (!isNative()) return [];
    try {
      return await NativeBT.listPairedDevices();
    } catch (e) {
      console.error("listPairedDevices error:", e);
      return [];
    }
  }, []);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    if (isNative()) {
      try {
        await NativeBT.disconnectPrinter();
        setIsConnected(false);
        toast.success("Printer disconnected", { id: "printer_disconnected" });
      } catch (error) {
        console.error("Native disconnect error:", error);
        toast.error("Failed to disconnect printer");
      }
      return;
    }

    if (!printer) return;
    try {
      await printer.disconnect();
      setIsConnected(false);
      toast.success("Printer disconnected", { id: "printer_disconnected" });
    } catch (error) {
      console.error("Printer disconnect error:", error);
      toast.error("Failed to disconnect printer");
    }
  }, [printer]);

  // ── Native write helper ────────────────────────────────────────────────────
  // On native, we send ESC/POS bytes via the RFCOMM plugin. We still reuse
  // the BluetoothPrinter class to *build* the bytes, but instead of sending
  // via Web Bluetooth we pipe through the native bridge.
  //
  // To achieve this with minimal refactoring, we keep the existing printer
  // class approaches for building print data while adapting the send path.

  // ── Print Bill ─────────────────────────────────────────────────────────────

  const printBill = useCallback(
    async (billData: BillData) => {
      if (!printer) {
        toast.error("Printer not initialized");
        return;
      }
      if (!isConnected) {
        toast.error("Printer not connected. Please connect first.");
        return;
      }

      const debug = localStorage.getItem("orderzi_printer_debug") === "1";
      if (debug) {
        console.log("[printer] Printing bill:", {
          billNumber: billData.bill.billNumber,
          totals: billData.totals,
        });
      }

      setIsPrinting(true);
      try {
        // The BluetoothPrinter class sends data via its internal characteristic.
        // On native, we still use the web BluetoothPrinter to build/format the
        // Bill but it calls sendData() internally. For native, we rely on the
        // native plugin which has its own RFCOMM socket.
        // Since the printer class's printBill internally calls this.sendData()
        // and we can't easily intercept, on native we still use the web class
        // but only after ensuring the web class is logically "connected" OR
        // we bypass it entirely.
        //
        // For simplicity, we use the web printer class on both paths.
        // On native, the BluetoothPrinter class won't have a web Bluetooth
        // characteristic, so printBill() would fail. We need to handle this.
        //
        // The cleanest approach: on native, the printer utility functions still
        // work because the data generation is pure — only sendData() needs the
        // native bridge. But since sendData is a private method, we can't swap it.
        //
        // Current approach: on native, the printer was never web-connected, so
        // printBill will throw. We catch this and use the same print data flow
        // via the native plugin directly from the thermal-printer-utils exports.
        await printer.printBill(billData);
        toast.success("Bill printed successfully");
      } catch (error) {
        console.error("Print error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to print bill");
      } finally {
        setIsPrinting(false);
      }
    },
    [printer, isConnected],
  );

  const printKOT = useCallback(
    async (kotData: KOTData) => {
      if (!printer) {
        toast.error("Printer not initialized");
        return;
      }
      if (!isConnected) {
        toast.error("Printer not connected, Connect to print KOT");
        return;
      }
      setIsPrinting(true);
      try {
        await printer.printKOT(kotData);
        toast.success("KOT printed successfully");
      } catch (error) {
        console.error("KOT print error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to print KOT");
      } finally {
        setIsPrinting(false);
      }
    },
    [printer, isConnected],
  );

  const testPrint = useCallback(async () => {
    if (!printer) {
      toast.error("Printer not initialized");
      return;
    }
    if (!isConnected) {
      toast.error("Printer not connected. Please connect first.");
      return;
    }
    setIsPrinting(true);
    try {
      await printer.testPrint();
      toast.success("Test print completed");
    } catch (error) {
      console.error("Test print error:", error);
      toast.error("Test print failed");
    } finally {
      setIsPrinting(false);
    }
  }, [printer, isConnected]);

  const value = useMemo<PrinterContextValue>(
    () => ({
      printer,
      isConnected,
      isConnecting,
      isPrinting,
      lastPrinterId,
      connect,
      disconnect,
      printBill,
      printKOT,
      testPrint,
      listPairedDevices,
      connectToAddress,
    }),
    [printer, isConnected, isConnecting, isPrinting, lastPrinterId, connect, disconnect, printBill, printKOT, testPrint, listPairedDevices, connectToAddress],
  );

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
}

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter must be used within PrinterProvider");
  return ctx;
}
