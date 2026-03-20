import { useState, useRef, useCallback, useEffect } from "react";
import { Bell, Package, ShoppingCart, Users, AlertTriangle, Info, X, Loader2, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAllNotificationsRead,
} from "@/hooks/api";
import { useSoundSettings } from "@/hooks/useSoundSettings";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "ORDER": return <ShoppingCart className="w-4 h-4 text-blue-500" />;
    case "QUEUE": return <Users className="w-4 h-4 text-violet-500" />;
    case "INVENTORY": return <Package className="w-4 h-4 text-amber-500" />;
    case "ALERT": return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default: return <Info className="w-4 h-4 text-primary" />;
  }
}

function getNotificationAccent(type: string) {
  switch (type) {
    case "ORDER": return "bg-blue-500/10 border-blue-500/20";
    case "QUEUE": return "bg-violet-500/10 border-violet-500/20";
    case "INVENTORY": return "bg-amber-500/10 border-amber-500/20";
    case "ALERT": return "bg-red-500/10 border-red-500/20";
    default: return "bg-primary/5 border-primary/10";
  }
}

export default function NotificationBell() {
  const { restaurantId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  const { soundEnabled, toggleSound } = useSoundSettings();

  const { data: unreadCount = 0 } = useUnreadNotificationCount(restaurantId);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useNotifications(restaurantId);
  const markAllRead = useMarkAllNotificationsRead(restaurantId);

  const notifications = data?.pages?.flatMap((p) => p.notifications) ?? [];

  const closePanel = useCallback(() => {
    setIsOpen(false);
    if (unreadCount > 0) {
      markAllRead.mutate();
    }
  }, [unreadCount, markAllRead]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, closePanel]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, closePanel]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!isOpen || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: panelRef.current, threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      closePanel();
    } else {
      setIsOpen(true);
      refetch();
    }
  }, [isOpen, closePanel, refetch]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground transition-colors relative"
        title="Notifications"
        id="notification-bell"
      >
        <Bell className={cn("h-[18px] w-[18px] transition-transform duration-200", isOpen && "scale-110")} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 sm:hidden"
            onClick={closePanel}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className={cn(
              // Mobile: full-width top sheet
              "fixed inset-x-0 top-0 z-50 sm:z-50",
              "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2",
              // Desktop: dropdown
              "sm:w-[380px] sm:rounded-xl",
              // Shared styles
              "bg-background/95 backdrop-blur-xl border border-border",
              "shadow-2xl shadow-black/10 dark:shadow-black/30",
              "flex flex-col",
              // Mobile height
              "max-h-[75vh] sm:max-h-[480px]",
              // Rounded bottom on mobile
              "rounded-b-2xl sm:rounded-xl",
              // Animation
              "animate-in fade-in slide-in-from-top-3 sm:slide-in-from-top-2 duration-200"
            )}
          >

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {notifications.length > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={toggleSound}
                  title={soundEnabled ? "Mute notifications" : "Unmute notifications"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground sm:hidden"
                  onClick={closePanel}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                    <Bell className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 text-center">
                    You'll see order updates, stock alerts, and more here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "px-4 py-3 flex gap-3 transition-colors hover:bg-muted/40",
                        !n.isRead && "bg-primary/[0.02]"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                        getNotificationAccent(n.type)
                      )}>
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-[13px] leading-snug break-words",
                            !n.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                          )}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 break-words">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="h-1" />

                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {!hasNextPage && notifications.length > 5 && (
                    <div className="text-center py-3">
                      <p className="text-[11px] text-muted-foreground/50">You're all caught up</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
