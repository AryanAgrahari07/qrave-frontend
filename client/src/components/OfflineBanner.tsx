import { useEffect, useRef, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";

// FE-2: Enhanced offline banner that shows when:
// 1. navigator.onLine === false (device is offline)
// 2. A "orderzi_ws_disconnected" custom event fires and WS stays down for >30s
export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [wsDisconnected, setWsDisconnected] = useState(false);
    const wsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Listen for custom WS connectivity events dispatched by useRestaurantWebSocket
        const handleWsDisconnect = () => {
            // Only show the banner if WS stays disconnected for >30s
            if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
            wsTimerRef.current = setTimeout(() => {
                // Don't show WS banner if device is already offline (handled by isOffline)
                if (navigator.onLine) setWsDisconnected(true);
            }, 30000);
        };

        const handleWsConnect = () => {
            if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
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
