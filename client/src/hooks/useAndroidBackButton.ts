import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { toast } from "sonner";

/**
 * Root routes where the back button should trigger "exit" behaviour
 * instead of navigating history.
 */
const ROOT_ROUTES = ["/", "/auth", "/dashboard", "/kitchen", "/waiter", "/app"];

/**
 * Intercept the Android hardware / gesture back button so it navigates
 * backward through the WebView history instead of closing the app.
 *
 * On root routes, a double-press within 2 s exits the app.
 * On web this hook is a no-op.
 */
export function useAndroidBackButton() {
  const lastBackPress = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = App.addListener("backButton", ({ canGoBack }) => {
      const path = window.location.pathname;
      const isRoot = ROOT_ROUTES.includes(path);

      if (canGoBack && !isRoot) {
        // Normal back navigation
        window.history.back();
        return;
      }

      // At a root route — double-press to exit
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        App.exitApp();
      } else {
        lastBackPress.current = now;
        toast.info("Press back again to exit", {
          id: "exit_toast",
          duration: 2000,
        });
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, []);
}
