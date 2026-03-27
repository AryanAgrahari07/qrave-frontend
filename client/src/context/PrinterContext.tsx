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
  quickConnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printBill: (billData: BillData) => Promise<void>;
  printKOT: (kotData: KOTData) => Promise<void>;
  testPrint: () => Promise<void>;
  /** Native only — list paired Bluetooth devices. */
  listPairedDevices: () => Promise<PairedDevice[]>;
  /** Native only — connect to a specific device by address. */
  connectToAddress: (address: string) => Promise<void>;
  /** Whether the device picker dialog is open. */
  isPickerOpen: boolean;
  /** Open the device picker dialog (scan + pair + connect). */
  openPicker: () => void;
  /** Close the device picker dialog. */
  closePicker: () => void;
  /** Discovered devices from scanning. */
  discoveredDevices: PairedDevice[];
  /** Whether we are currently scanning for devices. */
  isScanning: boolean;
  /** Start scanning for nearby devices. */
  startScan: () => Promise<void>;
  /** Stop scanning. */
  stopScan: () => Promise<void>;
  /** Pair a discovered device by address, then connect. */
  pairAndConnect: (address: string) => Promise<void>;
  /** Open Android Bluetooth settings. */
  openSettings: () => Promise<void>;
  /** True if running as a native app (Capacitor). */
  isNativeDevice: boolean;
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<PairedDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

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

        // Listen for devices found during discovery
        const deviceFoundListener = await NativeBT.onDeviceFound((device) => {
          if (!mounted) return;
          setDiscoveredDevices(prev => {
            // Don't add duplicates
            if (prev.some(d => d.address === device.address)) return prev;
            return [...prev, device];
          });
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
          deviceFoundListener.remove();
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

  // ── Open/close picker ──────────────────────────────────────────────────────

  const openPicker = useCallback(() => {
    setIsPickerOpen(true);
    setDiscoveredDevices([]);
  }, []);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setDiscoveredDevices([]);
    setIsScanning(false);
    // Stop any ongoing scan
    if (isNative()) {
      NativeBT.stopDiscovery().catch(() => {});
    }
  }, []);

  // ── Start/stop scanning ────────────────────────────────────────────────────

  const startScan = useCallback(async () => {
    if (!isNative()) return;
    setIsScanning(true);
    setDiscoveredDevices([]);
    try {
      const devices = await NativeBT.startDiscovery();
      // Discovery finished, add all found devices
      setDiscoveredDevices(devices);
    } catch (e) {
      console.error("Scan error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to scan for devices");
    } finally {
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(async () => {
    if (!isNative()) return;
    try {
      await NativeBT.stopDiscovery();
    } catch (e) {
      console.error("Stop scan error:", e);
    }
    setIsScanning(false);
  }, []);

  // ── Pair and connect ───────────────────────────────────────────────────────

  const pairAndConnect = useCallback(async (address: string) => {
    if (!isNative()) return;
    setIsConnecting(true);
    try {
      // Step 1: Pair if not already paired
      const pairResult = await NativeBT.pairDevice(address);
      if (!pairResult.paired) {
        toast.error("Pairing failed. Please try again.");
        setIsConnecting(false);
        return;
      }
      toast.success(`Paired with ${pairResult.name || "printer"}`, { id: "printer_paired" });

      // Step 2: Connect
      const connectResult = await NativeBT.connectToPrinter(address);
      if (connectResult.connected) {
        setIsConnected(true);
        setStoredPrinterId(address);
        toast.success(`Connected to ${connectResult.name || "printer"}`, { id: "printer_connected" });
        closePicker();
      }
    } catch (error) {
      console.error("Pair+connect error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to pair/connect");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [setStoredPrinterId, closePicker]);

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (isNative()) {
      // On native: open the device picker dialog
      openPicker();
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
  }, [printer, setStoredPrinterId, openPicker]);

  // ── Quick Connect to Last Printer (native) ─────────────────────────────────

  const quickConnect = useCallback(async () => {
    if (!isNative() || !lastPrinterId) return;
    setIsConnecting(true);
    try {
      const result = await NativeBT.connectToPrinter(lastPrinterId);
      if (result.connected) {
        setIsConnected(true);
        toast.success(`Connected to ${result.name || "printer"}`, { id: "printer_connected" });
      }
    } catch (error) {
      console.error("Native quickConnect error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect to printer");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [lastPrinterId]);

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
        closePicker();
      }
    } catch (error) {
      console.error("Native connect error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [setStoredPrinterId, closePicker]);

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

  // ── Open settings ──────────────────────────────────────────────────────────

  const openSettings = useCallback(async () => {
    if (!isNative()) return;
    try {
      await NativeBT.openBluetoothSettings();
    } catch (e) {
      console.error("Open settings error:", e);
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

      setIsPrinting(true);
      try {
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
      quickConnect,
      disconnect,
      printBill,
      printKOT,
      testPrint,
      listPairedDevices,
      connectToAddress,
      isPickerOpen,
      openPicker,
      closePicker,
      discoveredDevices,
      isScanning,
      startScan,
      stopScan,
      pairAndConnect,
      openSettings,
      isNativeDevice: isNative(),
    }),
    [printer, isConnected, isConnecting, isPrinting,      lastPrinterId, connect, quickConnect, disconnect, printBill, printKOT, testPrint, listPairedDevices, connectToAddress, isPickerOpen, openPicker, closePicker, discoveredDevices, isScanning, startScan, stopScan, pairAndConnect, openSettings],
  );

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
}

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter must be used within PrinterProvider");
  return ctx;
}
