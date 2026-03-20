import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./api";
import { useSoundSettings } from "./useSoundSettings";

interface WebSocketEvent {
    type: "event";
    restaurantId: string;
    event: string;
    data: any;
    ts: string;
}

export function useRestaurantWebSocket(
    restaurantId: string,
    token: string | null = null,
    options: { enabled?: boolean } = {}
) {
    const queryClient = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectAttemptRef = useRef(0);
    const pingIntervalRef = useRef<number | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const enabled = options.enabled !== false && !!restaurantId;
    
    // Notification sound for incoming events
    const { playNotificationSound } = useSoundSettings();

    useEffect(() => {
        if (!enabled) return;

        let isComponentMounted = true;

        function connect() {
            // Clear any pending reconnects
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
            }

            // L5: Exponential backoff calculation
            const baseDelay = 1000;
            const maxDelay = 30000;
            const delay = Math.min(
                maxDelay,
                baseDelay * Math.pow(2, reconnectAttemptRef.current)
            );

            const establishConnection = async () => {
                let wsToken = token;

                // If token is a JWT, exchange it for a short-lived WS ticket
                if (token && token.length > 50 && token.includes(".")) {
                    try {
                        const host = import.meta.env.VITE_API_URL || window.location.origin;
                        const res = await fetch(`${host}/api/auth/ws-ticket`, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${token}`
                            }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.ticket) wsToken = data.ticket;
                        }
                    } catch (e) {
                        console.warn("WS Ticket fetch failed", e);
                    }
                }

                if (!isComponentMounted) return;

                // Determine WS URL
                const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                const hostUrlInfo = import.meta.env.VITE_API_URL
                    ? new URL(import.meta.env.VITE_API_URL).host
                    : window.location.host;

                // Using secure ticket approach vs long-lived JWT in URL
                const url = `${protocol}//${hostUrlInfo}/ws${wsToken ? `?token=${wsToken}` : ""}`;

                const ws = new WebSocket(url);
                wsRef.current = ws;

                ws.onopen = () => {
                    reconnectAttemptRef.current = 0;
                    setIsConnected(true);
                    // FE-2: Notify global OfflineBanner that WS is connected
                    window.dispatchEvent(new Event("orderzi_ws_connected"));
                    // Join the restaurant room
                    ws.send(JSON.stringify({ type: "join", restaurantId }));

                    // R2: Active Heartbeat Ping
                    pingIntervalRef.current = window.setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: "ping" }));
                        }
                    }, 15000); // 15s interval (backend uses 30s timeout)
                };

                ws.onmessage = (messageEvent) => {
                    try {
                        const payload = JSON.parse(messageEvent.data);

                        if (payload.type === "hello") {
                            // Server acknowledged connection
                            return;
                        }

                        if (payload.type === "ping") {
                            // Respond to heartbeat
                            ws.send(JSON.stringify({ type: "pong" }));
                            return;
                        }

                        if (payload.type === "event" && payload.restaurantId === restaurantId) {
                            const ev = payload as WebSocketEvent;

                            // C1: WebSocket-driven Cache Invalidation
                            // This replaces expensive HTTP polling with targeted cache clears

                            if (ev.event.startsWith("order.")) {
                                queryClient.invalidateQueries({ queryKey: queryKeys.orders(restaurantId) });
                                queryClient.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
                                // PERF-2: Stats no longer polled — invalidate on WS event
                                queryClient.invalidateQueries({ queryKey: queryKeys.ordersStats(restaurantId) });
                                queryClient.invalidateQueries({ queryKey: queryKeys.notifications(restaurantId) });
                                queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(restaurantId) });
                                
                                if (ev.event === "order.created") {
                                    playNotificationSound();
                                }
                            }
                            else if (ev.event.startsWith("table.")) {
                                queryClient.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
                            }
                            else if (ev.event.startsWith("queue.")) {
                                queryClient.invalidateQueries({ queryKey: queryKeys.queue(restaurantId) });
                                queryClient.invalidateQueries({ queryKey: queryKeys.notifications(restaurantId) });
                                queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(restaurantId) });
                                
                                if (ev.event === "queue.registered") {
                                    playNotificationSound();
                                }
                            }
                            else if (ev.event.startsWith("menu.")) {
                                // Menu invalidation
                                queryClient.invalidateQueries({ queryKey: ["menu-categories", restaurantId] });
                                queryClient.invalidateQueries({ queryKey: ["menu-public", restaurantId] });
                            }
                        }
                    } catch (err) {
                        console.error("WebSocket message parsing error:", err);
                    }
                };

                ws.onclose = () => {
                    setIsConnected(false);
                    // FE-2: Notify global OfflineBanner that WS dropped
                    window.dispatchEvent(new Event("orderzi_ws_disconnected"));
                    if (!isComponentMounted) return;

                    if (pingIntervalRef.current) {
                        window.clearInterval(pingIntervalRef.current);
                        pingIntervalRef.current = null;
                    }

                    // Reconnect with exponential backoff (L5)
                    reconnectAttemptRef.current++;
                    reconnectTimeoutRef.current = window.setTimeout(connect, delay);
                };

                ws.onerror = (err) => {
                    setIsConnected(false);
                    console.error("WebSocket error:", err);
                    if (pingIntervalRef.current) {
                        window.clearInterval(pingIntervalRef.current);
                        pingIntervalRef.current = null;
                    }
                    // Let onclose handle reconnects
                };
            };

            establishConnection();
        }

        connect();

        return () => {
            isComponentMounted = false;
            if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
            if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
            if (wsRef.current) {
                // Send leave message before closing cleanly
                if (wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: "leave", restaurantId }));
                }
                wsRef.current.close();
            }
        };
    }, [restaurantId, token, enabled, queryClient]);

    return { ws: wsRef.current, isConnected };
}
