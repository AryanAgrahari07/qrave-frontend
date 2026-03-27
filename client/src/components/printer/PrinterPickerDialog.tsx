import { useCallback, useEffect, useState } from "react";
import { usePrinter } from "@/context/PrinterContext";
import type { PairedDevice } from "@/lib/nativeBluetoothPrinter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Bluetooth,
  Loader2,
  RefreshCw,
  Check,
  Settings,
  Search,
  Smartphone,
} from "lucide-react";

export function PrinterPickerDialog() {
  const {
    isPickerOpen,
    closePicker,
    isConnecting,
    isScanning,
    discoveredDevices,
    startScan,
    stopScan,
    connectToAddress,
    pairAndConnect,
    listPairedDevices,
    openSettings,
  } = usePrinter();

  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [loadingPaired, setLoadingPaired] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);

  // Load paired devices when dialog opens
  useEffect(() => {
    if (!isPickerOpen) {
      setPairedDevices([]);
      setConnectingAddress(null);
      return;
    }
    loadPairedDevices();
  }, [isPickerOpen]);

  const loadPairedDevices = useCallback(async () => {
    setLoadingPaired(true);
    try {
      const devices = await listPairedDevices();
      setPairedDevices(devices);
    } catch (e) {
      console.error("Failed to load paired devices:", e);
    } finally {
      setLoadingPaired(false);
    }
  }, [listPairedDevices]);

  const handleConnectPaired = useCallback(async (device: PairedDevice) => {
    setConnectingAddress(device.address);
    await connectToAddress(device.address);
    setConnectingAddress(null);
  }, [connectToAddress]);

  const handlePairAndConnect = useCallback(async (device: PairedDevice) => {
    setConnectingAddress(device.address);
    await pairAndConnect(device.address);
    setConnectingAddress(null);
  }, [pairAndConnect]);

  const handleStartScan = useCallback(async () => {
    await startScan();
    // After scan completes, refresh paired devices  
    await loadPairedDevices();
  }, [startScan, loadPairedDevices]);

  // Filter discovered devices that are NOT already in paired list
  const newDevices = discoveredDevices.filter(
    d => !pairedDevices.some(p => p.address === d.address)
  );

  return (
    <Dialog open={isPickerOpen} onOpenChange={(open) => { if (!open) closePicker(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-primary" />
            Connect Printer
          </DialogTitle>
          <DialogDescription>
            Select a paired printer or scan for nearby devices.
          </DialogDescription>
        </DialogHeader>

        {/* ── Paired Devices ────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              Paired Devices
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadPairedDevices}
              disabled={loadingPaired}
              className="h-7 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loadingPaired ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingPaired ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : pairedDevices.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              <Bluetooth className="w-6 h-6 mx-auto mb-1 opacity-40" />
              No paired devices found
            </div>
          ) : (
            <div className="space-y-1.5">
              {pairedDevices.map((device) => (
                <button
                  key={device.address}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                  onClick={() => handleConnectPaired(device)}
                  disabled={isConnecting}
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{device.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{device.address}</p>
                  </div>
                  {connectingAddress === device.address ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="text-xs font-medium text-primary shrink-0">Connect</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Scan for New Devices ──────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              Nearby Devices
            </h3>
            <Button
              variant={isScanning ? "destructive" : "default"}
              size="sm"
              onClick={isScanning ? stopScan : handleStartScan}
              disabled={isConnecting}
              className="h-7 text-xs"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Stop Scan
                </>
              ) : (
                <>
                  <Search className="w-3 h-3 mr-1" />
                  Scan
                </>
              )}
            </Button>
          </div>

          {isScanning && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning for nearby devices...
            </div>
          )}

          {newDevices.length > 0 ? (
            <div className="space-y-1.5">
              {newDevices.map((device) => (
                <button
                  key={device.address}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                  onClick={() => handlePairAndConnect(device)}
                  disabled={isConnecting}
                >
                  <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{device.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{device.address}</p>
                  </div>
                  {connectingAddress === device.address ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="text-xs font-medium text-blue-500 shrink-0">Pair & Connect</div>
                  )}
                </button>
              ))}
            </div>
          ) : !isScanning ? (
            <div className="text-center py-3 text-muted-foreground text-xs">
              Tap "Scan" to discover nearby printers
            </div>
          ) : null}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={openSettings}
            className="h-8 text-xs text-muted-foreground"
          >
            <Settings className="w-3 h-3 mr-1" />
            Bluetooth Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={closePicker}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
