import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { preferences } from "@/lib/preferences";
import { api, migrateLegacyTokenIfNeeded, setStoredToken } from "@/lib/api";
import { secureStorage } from "@/lib/secureStorage";

import { useRestaurantWebSocket } from "@/hooks/useRestaurantWebSocket";

const RESTAURANT_ID_KEY = "orderzi_restaurant_id";
const AUTH_CACHE_KEY = "orderzi_auth_cache";
const REFRESH_TOKEN_KEY = "orderzi_refresh_token";

type User = { id: string; email: string; fullName?: string; role: string; restaurantId?: string | null };

type AuthState = {
  user: User | null;
  token: string | null;
  restaurantId: string | null;
  isLoading: boolean;
  isReady: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<{ user: User }>;
  staffLogin: (staffCode: string, passcode: string) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  setRestaurantId: (id: string | null) => void;
  onboardingComplete: (data: { user: User; token: string; refreshToken?: string; restaurant: { id: string } }) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Global WebSocket Listener to keep connection alive when authenticated (C1)
function GlobalWebSocketListener({
  restaurantId,
  token
}: {
  restaurantId: string | null;
  token: string | null
}) {
  useRestaurantWebSocket(restaurantId || "", token, { enabled: !!restaurantId });
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    restaurantId: null,
    isLoading: false,
    isReady: false,
  });

  const setRestaurantId = useCallback((id: string | null) => {
    (async () => {
      if (id) await preferences.set({ key: RESTAURANT_ID_KEY, value: id });
      else await preferences.remove({ key: RESTAURANT_ID_KEY });
    })();
    setState((s) => ({ ...s, restaurantId: id }));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ user: User }> => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const isNative = Capacitor.isNativePlatform();
      const res = await api.post<{ user: User; token: string; refreshToken?: string }>(
        isNative ? "/api/auth/login?includeRefresh=true" : "/api/auth/login",
        { email, password },
      );
      await setStoredToken(res.token);
      if (isNative && res.refreshToken) await secureStorage.set(REFRESH_TOKEN_KEY, res.refreshToken);

      // Cache identity for instant boot
      await preferences.set({
        key: AUTH_CACHE_KEY,
        value: JSON.stringify({ user: res.user, restaurantId: null }),
      });

      setState((s) => ({ ...s, user: res.user, token: res.token, isLoading: false }));

      // Fetch restaurants - IMPORTANT: This needs to happen AFTER the token is stored
      // so the api.get call includes the Authorization header
      try {
        console.log("Fetching restaurants for user:", res.user.id);
        const { restaurants } = await api.get<{ restaurants: { id: string; name: string; slug: string }[] }>("/api/restaurants");
        console.log("Fetched restaurants:", restaurants);

        if (restaurants?.length) {
          setRestaurantId(restaurants[0].id);
          console.log("Set restaurant ID:", restaurants[0].id);
        } else {
          console.warn("No restaurants found for user");
        }
      } catch (error) {
        console.error("Failed to fetch restaurants:", error);
        // Check if it's a 403 or other specific error
        if (error && typeof error === 'object' && 'status' in error) {
          console.error("Restaurant fetch error status:", error.status);
        }
      }

      return { user: res.user };
    } catch (e) {
      setState((s) => ({ ...s, isLoading: false }));
      throw e;
    }
  }, [setRestaurantId]);

  const staffLogin = useCallback(async (staffCode: string, passcode: string): Promise<{ user: User }> => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const isNative = Capacitor.isNativePlatform();
      const res = await api.post<{ user: User; token: string; refreshToken?: string; restaurantId?: string }>(
        isNative ? "/api/auth/staff/login?includeRefresh=true" : "/api/auth/staff/login",
        { staffCode, restaurantId: state.restaurantId ?? undefined, passcode },
      );
      await setStoredToken(res.token);
      if (isNative && res.refreshToken) await secureStorage.set(REFRESH_TOKEN_KEY, res.refreshToken);
      const rid = res.restaurantId ?? res.user?.restaurantId ?? null;
      if (rid) await preferences.set({ key: RESTAURANT_ID_KEY, value: rid });

      await preferences.set({
        key: AUTH_CACHE_KEY,
        value: JSON.stringify({ user: res.user, restaurantId: rid }),
      });

      setState((s) => ({
        ...s,
        user: res.user,
        token: res.token,
        restaurantId: rid,
        isLoading: false,
        isReady: true,
      }));
      return { user: res.user };
    } catch (e) {
      setState((s) => ({ ...s, isLoading: false }));
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    // Each step wrapped individually — logout must ALWAYS succeed
    try {
      const isNative = Capacitor.isNativePlatform();
      let rt: string | null = null;
      try { rt = isNative ? await secureStorage.get(REFRESH_TOKEN_KEY) : null; } catch { /* ignore */ }
      await api.post("/api/auth/logout", isNative && rt ? { refreshToken: rt } : undefined);
    } catch {
      /* ignore server-side logout failure */
    }

    try { await setStoredToken(null); } catch { /* ignore */ }
    if (Capacitor.isNativePlatform()) {
      try { await secureStorage.remove(REFRESH_TOKEN_KEY); } catch { /* ignore */ }
      try { await secureStorage.clear(); } catch { /* ignore */ }
    }
    try { await preferences.remove({ key: AUTH_CACHE_KEY }); } catch { /* ignore */ }
    setState((s) => ({ ...s, user: null, token: null, isLoading: false, isReady: true }));
  }, []);

  const onboardingComplete = useCallback((data: { user: User; token: string; refreshToken?: string; restaurant: { id: string } }) => {
    (async () => {
      await setStoredToken(data.token);
      if (Capacitor.isNativePlatform() && data.refreshToken) {
        await secureStorage.set(REFRESH_TOKEN_KEY, data.refreshToken);
      }
      await preferences.set({ key: RESTAURANT_ID_KEY, value: data.restaurant.id });
      await preferences.set({
        key: AUTH_CACHE_KEY,
        value: JSON.stringify({ user: data.user, restaurantId: data.restaurant.id }),
      });
    })();
    setRestaurantId(data.restaurant.id);
    setState((s) => ({
      ...s,
      user: data.user,
      token: data.token,
      restaurantId: data.restaurant.id,
      isReady: true,
    }));
  }, [setRestaurantId]);

  // Global: if refresh expires, force UI logout immediately.
  useEffect(() => {
    const handler = () => {
      (async () => {
        await setStoredToken(null);
        if (Capacitor.isNativePlatform()) await secureStorage.remove(REFRESH_TOKEN_KEY);
        await preferences.remove({ key: AUTH_CACHE_KEY });
        setState((s) => ({ ...s, user: null, token: null, isLoading: false, isReady: true }));
      })();
    };

    const refreshHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.token) {
        setState((s) => ({ ...s, token: detail.token }));
      }
    };

    window.addEventListener("orderzi_auth_expired", handler);
    window.addEventListener("orderzi_auth_refreshed", refreshHandler);
    
    return () => {
      window.removeEventListener("orderzi_auth_expired", handler);
      window.removeEventListener("orderzi_auth_refreshed", refreshHandler);
    };
  }, []);

  // Init: optimistic boot from cache, then validate in background.
  useEffect(() => {
    if (state.isReady) return;

    (async () => {
      try {
        await migrateLegacyTokenIfNeeded();
      } catch (e) {
        console.warn("[AuthContext] Legacy migration failed (non-critical):", e);
      }

      let cachedAuth: string | null = null;
      let cachedRestaurantId: string | null = null;
      let token: string | null = null;

      try {
        const results = await Promise.all([
          preferences.get({ key: AUTH_CACHE_KEY }),
          preferences.get({ key: RESTAURANT_ID_KEY }),
          preferences.get({ key: "orderzi_token" }),
        ]);
        cachedAuth = results[0].value;
        cachedRestaurantId = results[1].value;
        token = results[2].value;
      } catch (e) {
        // If preferences/secure storage is corrupted, clear everything and force fresh login
        console.error("[AuthContext] Failed to read stored data, clearing and forcing login:", e);
        try {
          await setStoredToken(null);
          await preferences.remove({ key: AUTH_CACHE_KEY });
          await preferences.remove({ key: RESTAURANT_ID_KEY });
          if (Capacitor.isNativePlatform()) {
            try { await secureStorage.clear(); } catch { /* ignore */ }
          }
        } catch { /* ignore cleanup errors */ }
        setState((s) => ({ ...s, user: null, token: null, isReady: true }));
        return;
      }

      let bootedFromCache = false;
      // Optimistic UI: if we have cached user, render immediately.
      if (cachedAuth) {
        try {
          const parsed = JSON.parse(cachedAuth);
          if (parsed?.user) {
            bootedFromCache = true;
            setState((s) => ({
              ...s,
              user: parsed.user,
              token: token ?? null,
              restaurantId: cachedRestaurantId ?? parsed.restaurantId ?? null,
              isReady: true,
            }));
          }
        } catch {
          // ignore bad cache
        }
      }

      // If no cached user set, still mark ready if no token.
      if (!cachedAuth && !token) {
        setState((s) => ({ ...s, isReady: true }));
        return;
      }

      // Background verify (will auto-refresh on 401 via interceptor)
      try {
        const user = await api.get<User>("/api/auth/me");

        // Ensure restaurantId is available
        let restaurantId = cachedRestaurantId ?? null;
        if (!restaurantId && user?.restaurantId) restaurantId = user.restaurantId;

        if (!restaurantId && user && user.role && user.role !== "KITCHEN" && user.role !== "WAITER") {
          // For owners/admins, fetch restaurants if needed.
          try {
            const { restaurants } = await api.get<{ restaurants: { id: string }[] }>("/api/restaurants");
            if (restaurants?.length) restaurantId = restaurants[0].id;
          } catch {
            // ignore
          }
        }

        if (restaurantId) await preferences.set({ key: RESTAURANT_ID_KEY, value: restaurantId });
        await preferences.set({
          key: AUTH_CACHE_KEY,
          value: JSON.stringify({ user, restaurantId }),
        });

        setState((s) => ({ ...s, user, restaurantId, isReady: true }));
      } catch (err) {
        // Offline/spotty network should NOT force logout.
        // Only logout on explicit auth failures.
        const status = (err && typeof err === "object" && "status" in err) ? (err as any).status : undefined;
        if ((status === 401 || status === 403) && !bootedFromCache) {
          await setStoredToken(null);
          await preferences.remove({ key: AUTH_CACHE_KEY });
          setState((s) => ({ ...s, user: null, token: null, isReady: true }));
          return;
        }

        // Keep optimistic session; mark ready so UI can render from cache.
        setState((s) => ({ ...s, isReady: true }));
      }
    })();
  }, [state.isReady, setRestaurantId]);

  const value: AuthContextValue = useMemo(() => ({
    ...state,
    login,
    staffLogin,
    logout,
    setRestaurantId,
    onboardingComplete,
  }), [state, login, staffLogin, logout, setRestaurantId, onboardingComplete]);

  return (
    <AuthContext.Provider value={value}>
      <GlobalWebSocketListener restaurantId={state.restaurantId} token={state.token} />
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth(): AuthContextValue {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}