import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredToken, setStoredToken } from "@/lib/api";

const RESTAURANT_ID_KEY = "qrave_restaurant_id";

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
  staffLogin: (email: string, passcode: string) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  setRestaurantId: (id: string | null) => void;
  onboardingComplete: (data: { user: User; token: string; restaurant: { id: string } }) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getStoredToken(),
    restaurantId: localStorage.getItem(RESTAURANT_ID_KEY),
    isLoading: false,
    isReady: false,
  });

  const setRestaurantId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(RESTAURANT_ID_KEY, id);
    else localStorage.removeItem(RESTAURANT_ID_KEY);
    setState((s) => ({ ...s, restaurantId: id }));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ user: User }> => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const res = await api.post<{ user: User; token: string }>("/api/auth/login", { email, password });
      setStoredToken(res.token);
      
      // Set user and token first
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

  const staffLogin = useCallback(async (email: string, passcode: string): Promise<{ user: User }> => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const res = await api.post<{ user: User; token: string; restaurantId?: string }>(
        "/api/auth/staff/login",
        { email, passcode },
      );
      setStoredToken(res.token);
      const rid = res.restaurantId ?? res.user?.restaurantId ?? null;
      if (rid) localStorage.setItem(RESTAURANT_ID_KEY, rid);
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
    try {
      await api.post("/api/auth/logout");
    } catch { /* ignore */ }
    setStoredToken(null);
    localStorage.removeItem(RESTAURANT_ID_KEY);
    setState({ user: null, token: null, restaurantId: null, isLoading: false, isReady: true });
  }, []);

  const onboardingComplete = useCallback((data: { user: User; token: string; restaurant: { id: string } }) => {
    setStoredToken(data.token);
    setRestaurantId(data.restaurant.id);
    setState((s) => ({
      ...s,
      user: data.user,
      token: data.token,
      restaurantId: data.restaurant.id,
      isReady: true,
    }));
  }, [setRestaurantId]);

  // Init: validate token and optionally fetch restaurants
  useEffect(() => {
    if (state.isReady) return;
    const t = getStoredToken();
    if (!t) {
      setState((s) => ({ ...s, isReady: true }));
      return;
    }
    (async () => {
      try {
        console.log("Validating token and fetching user...");
        const user = await api.get<User>("/api/auth/me");
        console.log("User validated:", user);
        
        setState((s) => ({ ...s, user, isReady: true }));
        
        if (!state.restaurantId) {
          try {
            console.log("No restaurant ID in storage, fetching restaurants...");
            const { restaurants } = await api.get<{ restaurants: { id: string }[] }>("/api/restaurants");
            console.log("Fetched restaurants on init:", restaurants);
            
            if (restaurants?.length) {
              setRestaurantId(restaurants[0].id);
              console.log("Set restaurant ID on init:", restaurants[0].id);
            }
          } catch (error) {
            console.error("Failed to fetch restaurants on init:", error);
          }
        }
      } catch (error) {
        console.error("Token validation failed:", error);
        setStoredToken(null);
        localStorage.removeItem(RESTAURANT_ID_KEY);
        setState((s) => ({ ...s, user: null, token: null, restaurantId: null, isReady: true }));
      }
    })();
  }, [state.isReady, state.restaurantId, setRestaurantId]);

  const value: AuthContextValue = {
    ...state,
    login,
    staffLogin,
    logout,
    setRestaurantId,
    onboardingComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}