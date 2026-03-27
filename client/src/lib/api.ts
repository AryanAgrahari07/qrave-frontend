/**
 * API client for orderzi backend.
 * - Access token is stored via Capacitor Preferences (native on iOS/Android, localStorage on web).
 * - Refresh token is stored as HttpOnly cookie on web; on mobile it can be stored in native secure storage.
 * - Includes a 401 interceptor that silently calls /api/auth/refresh and retries once.
 */

import { Capacitor } from "@capacitor/core";
import { preferences } from "@/lib/preferences";
import { secureStorage } from "@/lib/secureStorage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// On web/PWA the Vite dev-server proxy (and Nginx in prod) serve /api at the
// same origin as the page, so HttpOnly cookies are sent automatically.
// On native Capacitor the page origin is capacitor://localhost so we MUST use
// the absolute backend URL. Using a relative URL on native would 404.
const isNativePlatform = () => {
  try { return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform(); }
  catch { return false; }
};

const TOKEN_KEY = "orderzi_token";
const REFRESH_TOKEN_KEY = "orderzi_refresh_token";

export async function getStoredToken(): Promise<string | null> {
  const { value } = await preferences.get({ key: TOKEN_KEY });
  return value ?? null;
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (token) await preferences.set({ key: TOKEN_KEY, value: token });
  else await preferences.remove({ key: TOKEN_KEY });
}

// Legacy (pre-refresh architecture) localStorage key: migrate once if present.
export async function migrateLegacyTokenIfNeeded(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const legacy = localStorage.getItem(TOKEN_KEY);
  if (!legacy) return;
  const existing = await getStoredToken();
  if (!existing) {
    await setStoredToken(legacy);
  }
  localStorage.removeItem(TOKEN_KEY);
}

export function buildUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  // Web: use relative URL → goes through the Vite proxy (same origin as the
  // page), which means HttpOnly cookies are included automatically.
  // Native: must use absolute URL because there is no proxy.
  if (!isNativePlatform()) return p;
  return `${API_BASE}${p}`;
}

async function getHeaders(jsonBody?: boolean): Promise<HeadersInit> {
  const h: HeadersInit = {};
  if (jsonBody) h["Content-Type"] = "application/json";
  const t = await getStoredToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      throw new ApiError(j.message || text || res.statusText, res.status, j);
    } catch (e) {
      // If JSON parse fails, throw based on raw text.
      if (e instanceof ApiError) throw e;
      throw new ApiError(text || res.statusText, res.status);
    }
  }
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json();
  return res.text() as Promise<T>;
}

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const isNative = Capacitor.isNativePlatform();

      let refreshToken: string | null = null;
      if (isNative) {
        try { refreshToken = await secureStorage.get(REFRESH_TOKEN_KEY); } catch { /* corrupted storage */ }
      }
      const includeRefresh = isNative;

      const refreshUrl = includeRefresh ? "/api/auth/refresh?includeRefresh=true" : "/api/auth/refresh";

      const res = await fetch(buildUrl(refreshUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: includeRefresh ? JSON.stringify({ refreshToken }) : undefined,
      });

      if (!res.ok) {
        // Refresh failed -> clear local access token and native refresh token
        await setStoredToken(null);
        if (isNative) { try { await secureStorage.remove(REFRESH_TOKEN_KEY); } catch { /* ignore */ } }

        // Notify app-level auth state to reset UI immediately.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("orderzi_auth_expired"));
        }

        throw new Error("Session expired");
      }

      const data = await res.json();
      if (data?.token) await setStoredToken(data.token);

      // Rotation on native
      if (isNative && data?.refreshToken) {
        await secureStorage.set(REFRESH_TOKEN_KEY, data.refreshToken);
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// R1: Network level retry backoff utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(method: string, path: string, data?: unknown, retry = true, attempt = 1): Promise<T> {
  try {
    const res = await fetch(buildUrl(path), {
      method,
      headers: await getHeaders(!!data),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });

    const isAuthEndpoint = path.includes("/auth/login") || path.includes("/auth/register") || path.includes("/auth/staff/login");
    if (res.status === 401 && retry && !isAuthEndpoint) {
      await refreshAccessToken();
      return request<T>(method, path, data, false);
    }

    // Only retry on network errors (fetch fail) or 50x server errors
    if (res.status >= 500 && attempt < 3) {
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.warn(`[api] server error ${res.status} on ${path}, retrying in ${backoffDelay}ms (attempt ${attempt}/3)`);
      await wait(backoffDelay);
      return request<T>(method, path, data, retry, attempt + 1);
    }

    return handleResponse<T>(res);
  } catch (err: any) {
    if (err instanceof ApiError) throw err; // Don't retry client logic errors
    if (attempt < 3 && method === "GET") { // Only safely retry GETs on network split
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.warn(`[api] network error on ${path}, retrying in ${backoffDelay}ms (attempt ${attempt}/3)`);
      await wait(backoffDelay);
      return request<T>(method, path, data, retry, attempt + 1);
    }
    throw err;
  }
}

async function requestBlob(path: string, retry = true): Promise<Blob> {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    headers: await getHeaders(false),
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    await refreshAccessToken();
    return requestBlob(path, false);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res.blob();
}

export async function apiRequestRaw(
  method: string,
  path: string,
  data?: unknown,
  retry = true,
): Promise<Response> {
  const res = await fetch(buildUrl(path), {
    method,
    headers: await getHeaders(!!data),
    credentials: "include",
    body: data ? JSON.stringify(data) : undefined,
  });

  const isAuthEndpoint = path.includes("/auth/login") || path.includes("/auth/register") || path.includes("/auth/staff/login");
  if (res.status === 401 && retry && !isAuthEndpoint) {
    await refreshAccessToken();
    return apiRequestRaw(method, path, data, false);
  }

  return res;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, data?: unknown) => request<T>("POST", path, data),
  put: <T>(path: string, data?: unknown) => request<T>("PUT", path, data),
  patch: <T>(path: string, data?: unknown) => request<T>("PATCH", path, data),
  delete: <T>(path: string) => request<T>("DELETE", path),
  getBlob: (path: string) => requestBlob(path),
};

