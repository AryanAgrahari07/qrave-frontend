/**
 * API client for Qrave backend.
 * Sends Authorization: Bearer when token is in localStorage.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TOKEN_KEY = "qrave_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function buildUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return path.startsWith("http") ? path : `${API_BASE}${p}`;
}

function getHeaders(jsonBody?: boolean): HeadersInit {
  const h: HeadersInit = {};
  if (jsonBody) h["Content-Type"] = "application/json";
  const t = getStoredToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      throw new Error(j.message || text || res.statusText);
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
      throw new Error(text || res.statusText);
    }
  }
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json();
  return res.text() as Promise<T>;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "POST",
      headers: getHeaders(!!data),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "PUT",
      headers: getHeaders(!!data),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "PATCH",
      headers: getHeaders(!!data),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "DELETE",
      headers: getHeaders(),
      credentials: "include",
    });
    return handleResponse<T>(res);
  },
};

