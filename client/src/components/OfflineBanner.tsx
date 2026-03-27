import { useEffect, useRef, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";
import { Capacitor } from "@capacitor/core";

// FE-2: Enhanced offline banner that shows when:
// 1. navigator.onLine === false (device is offline)
// 2. A "orderzi_ws_disconnected" custom event fires and WS stays disconnected
//    for longer than the grace period (60s on native, 30s on web)
export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [wsDisconnected, setWsDisconnected] = useState(false);
    const wsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Android WebSockets take longer to establish (WSS handshake over mobile).
        // Use a longer grace period on native so transient reconnects don't show the banner.
        const isNative = typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();
        const GRACE_MS = isNative ? 60_000 : 30_000;

        const handleWsDisconnect = () => {
            if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
            wsTimerRef.current = setTimeout(() => {
                // Don't show WS banner if the device is already offline (handled by isOffline)
                if (navigator.onLine) setWsDisconnected(true);
            }, GRACE_MS);
        };

        const handleWsConnect = () => {
            // Always clear immediately when WS comes back online
            if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
            wsTimerRef.current = null;
            setWsDisconnected(false);
        };

        window.addEventListener("orderzi_ws_disconnected", handleWsDisconnect);
        window.addEventListener("orderzi_ws_connected", handleWsConnect);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("orderzi_ws_disconnected", handleWsDisconnect);
            window.removeEventListener("orderzi_ws_connected", handleWsConnect);
            if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
        };
    }, []);

    if (!isOffline && !wsDisconnected) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white shadow-lg flex items-center justify-center gap-2 transition-all duration-300">
            {isOffline ? (
                <>
                    <WifiOff className="h-4 w-4 shrink-0" />
                    You are currently offline. Changes will not be saved.
                </>
            ) : (
                <>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Connection lost — data may be outdated. Attempting to reconnect&hellip;
                </>
            )}
        </div>
    );
}
