import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API Base URL - uses environment variable or defaults to relative path
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // If url already starts with http, use as-is, otherwise prepend API_BASE_URL
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // If queryKey is an array starting with http, use as-is, otherwise prepend API_BASE_URL
    const queryUrl = queryKey.join("/") as string;
    const fullUrl = queryUrl.startsWith("http") ? queryUrl : `${API_BASE_URL}${queryUrl}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 minute stale time - data will refetch after invalidation
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
