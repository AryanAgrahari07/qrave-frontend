import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  Restaurant,
  MenuCategory,
  MenuItem,
  MenuData,
  Table,
  TableStatus,
  Order,
  OrderStats,
  OrderStatus,
  CreateOrderInput,
  QueueEntry,
  QueueStats,
  RegisterQueueInput,
  QRCodeData,
  DashboardStats,
  Staff,
  InventoryItem,
  LocationOption,
  CurrencyOption,
  AnalyticsData,
  RecentOrder,
  ScanActivity,
  TableStats,
  DashboardSummary,
} from "@/types";

// === Extraction Types ===
interface ExtractionJob {
  id: string;
  restaurant_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CONFIRMED';
  uploaded_by: string;
  image_url: string;
  image_s3_key: string;
  image_size_bytes: number;
  extracted_data?: {
    currency?: string;
    categories?: Array<{
      name: string;
      items: Array<{
        name: string;
        price: number;
        description: string;
        dietaryType: string;
        confidence: number;
      }>;
    }>;
  };
  extraction_confidence?: number;
  ai_model_used?: string;
  items_extracted?: number;
  items_confirmed?: number;
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  confirmed_at?: string;
}

// === Query Keys ===
const queryKeys = {
  restaurants: ["restaurants"] as const,
  restaurant: (id: string | null) => ["restaurant", id] as const,
  restaurantBySlug: (slug: string | null) => ["restaurant-by-slug", slug] as const,
  menuPublic: (slug: string | null, dietaryFilter?: 'veg' | 'non-veg' | 'any' | null) => ["menu-public", slug, dietaryFilter] as const,
  orders: (restaurantId: string | null, opts?: Record<string, unknown>) => ["orders", restaurantId, opts] as const,
  ordersKitchen: (restaurantId: string | null) => ["orders-kitchen", restaurantId] as const,
  ordersStats: (restaurantId: string | null) => ["orders-stats", restaurantId] as const,
  ordersHistory: (restaurantId: string | null) => ["orders-history", restaurantId] as const,
  tables: (restaurantId: string | null) => ["tables", restaurantId] as const,
  queue: (restaurantId: string | null) => ["queue", restaurantId] as const,
  queueActive: (restaurantId: string | null) => ["queue-active", restaurantId] as const,
  queueStats: (restaurantId: string | null) => ["queue-stats", restaurantId] as const,
  qrCodes: (restaurantId: string | null) => ["qr-codes", restaurantId] as const,
  dashboardStats: (restaurantId: string | null) => ["dashboard-stats", restaurantId] as const,
  staff: (restaurantId: string | null) => ["staff", restaurantId] as const,
  inventory: (restaurantId: string | null) => ["inventory", restaurantId] as const,
  countries: (search: string) => ["countries", search] as const,
  states: (countryCode: string | null, search: string) => ["states", countryCode, search] as const,
  cities: (stateCode: string | null, search: string) => ["cities", stateCode, search] as const,
  currencies: (search: string) => ["currencies", search] as const,
  analytics: (restaurantId: string | null, timeframe: string) => 
    ["analytics", restaurantId, timeframe] as const,
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => ["dashboard", "summary"] as const,
    tables: () => ["dashboard", "tables"] as const,
    orders: () => ["dashboard", "orders"] as const,
    queue: () => ["dashboard", "queue"] as const,
    scanActivity: () => ["dashboard", "scan-activity"] as const,
    recentOrders: (limit?: number) => ["dashboard", "recent-orders", limit] as const,
  },
  extraction: {
    job: (restaurantId: string | null, jobId: string | null) => 
      ["extraction-job", restaurantId, jobId] as const,
    jobs: (restaurantId: string | null) => 
      ["extraction-jobs", restaurantId] as const,
  },
};

// === Restaurants ===
// export function useRestaurants() {
//   return useQuery({
//     queryKey: queryKeys.restaurants,
//     queryFn: () => api.get<{ restaurants: Restaurant[] }>("/api/restaurants").then((r) => r.restaurants),
//     enabled: true,
//   });
// }

export function useRestaurant(id: string | null) {
  return useQuery({
    queryKey: queryKeys.restaurant(id),
    queryFn: () => api.get<{ restaurant: Restaurant }>(`/api/restaurants/${id}`).then((r) => r.restaurant),
    enabled: !!id,
  });
}

export function useRestaurantBySlug(slug: string | null) {
  return useQuery({
    queryKey: queryKeys.restaurantBySlug(slug),
    queryFn: () => api.get<{ restaurant: Restaurant }>(`/api/restaurants/by-slug/${slug}`).then((r) => r.restaurant),
    enabled: !!slug,
  });
}

export function useUpdateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Restaurant> }) =>
      api.put<{ restaurant: Restaurant }>(`/api/restaurants/${id}`, data).then((r) => r.restaurant),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurant(id) });
      qc.invalidateQueries({ queryKey: queryKeys.restaurants });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update restaurant"),
  });
}

// === Public Menu (no auth) ===
export function usePublicMenu(slug: string | null, dietaryFilter?: 'veg' | 'non-veg' | 'any' | null) {
  return useQuery({
    queryKey: queryKeys.menuPublic(slug, dietaryFilter),
    queryFn: () => {
      const params = new URLSearchParams();
      if (dietaryFilter && dietaryFilter !== 'any') {
        params.append('dietary', dietaryFilter);
      }
      const queryString = params.toString();
      const url = `/api/menu/public/${slug}${queryString ? `?${queryString}` : ''}`;
      return api.get<MenuData>(url);
    },
    enabled: !!slug,
    staleTime: 0, // Always consider stale for instant updates
    refetchInterval: 5000, // Poll every 5 seconds for menu changes
  });
}

// === Protected Menu ===
export function useMenuCategories(restaurantId: string | null, slug: string | null) {
  // Uses public endpoint but organizes data for admin use
  return useQuery({
    queryKey: ["menu-categories", restaurantId, slug],
    queryFn: async () => {
      if (!slug) return { categories: [], items: [] };
      const data = await api.get<MenuData>(`/api/menu/public/${slug}`);
      return {
        categories: data.categories || [],
        items: data.items || [],
      };
    },
    enabled: !!slug,
    staleTime: 0, // Always consider stale for instant updates
    refetchInterval: 5000, // Poll every 5 seconds for menu changes
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export function useCreateCategory(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) =>
      api.post<{ category: MenuCategory }>(`/api/menu/${restaurantId}/categories`, data).then((r) => r.category),
    onSuccess: () => {
      // Invalidate ALL menu-related queries more aggressively
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      // Force immediate refetch
      qc.refetchQueries({ queryKey: ["menu-public"], type: "active" });
      qc.refetchQueries({ queryKey: ["menu-categories"], type: "active" });

      toast.success("Category created successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create category"),
  });
}

export function useUpdateCategory(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: Partial<MenuCategory> }) =>
      api.put<{ category: MenuCategory }>(`/api/menu/${restaurantId}/categories/${categoryId}`, data).then((r) => r.category),
    onSuccess: () => {
      // Invalidate ALL menu-related queries more aggressively
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      // Force immediate refetch
      qc.refetchQueries({ queryKey: ["menu-public"], type: "active" });
      qc.refetchQueries({ queryKey: ["menu-categories"], type: "active" });
      toast.success("Category updated successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update category"),
  });
}

export function useDeleteCategory(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      api.delete<{ category: MenuCategory; deleted: boolean }>(`/api/menu/${restaurantId}/categories/${categoryId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      // Force immediate refetch
      qc.refetchQueries({ queryKey: ["menu-public"], type: "active" });
      qc.refetchQueries({ queryKey: ["menu-categories"], type: "active" });
      toast.success("Category deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete category"),
  });
}

export function useCreateMenuItem(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { categoryId: string; name: string; description?: string; price: number; imageUrl?: string; isAvailable?: boolean; dietaryTags?: string[] }) =>
      api.post<{ item: MenuItem }>(`/api/menu/${restaurantId}/items`, data).then((r) => r.item),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["menu-public"], type: "active" });
      qc.refetchQueries({ queryKey: ["menu-categories"], type: "active" });
      toast.success("Item added to menu");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create item"),
  });
}

export function useUpdateMenuItem(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<MenuItem> }) =>
      api.put<{ item: MenuItem }>(`/api/menu/${restaurantId}/items/${itemId}`, data).then((r) => r.item),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["menu-public"], type: "active" });
      qc.refetchQueries({ queryKey: ["menu-categories"], type: "active" });
      toast.success("Item updated successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update item"),
  });
}

export function useDeleteMenuItem(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete<{ item: MenuItem; deleted: boolean }>(`/api/menu/${restaurantId}/items/${itemId}`),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["menu-public"], type: "active" });
      qc.refetchQueries({ queryKey: ["menu-categories"], type: "active" });
      toast.success("Item deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete item"),
  });
}

export function useUpdateMenuItemAvailability(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      api.patch<{ item: MenuItem }>(`/api/menu/${restaurantId}/items/${itemId}/availability`, { isAvailable }).then((r) => r.item),
    onSuccess: (item) => {
      qc.refetchQueries({ queryKey: ["menu-public"], type: "active" });
      qc.refetchQueries({ queryKey: ["menu-categories"], type: "active" });
      toast.success(`${item.name} is now ${item.isAvailable ? "available" : "unavailable"}`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update availability"),
  });
}

// === Orders ===
export function useOrders(restaurantId: string | null, opts?: { status?: string; orderType?: string; tableId?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.orderType) params.set("orderType", opts.orderType);
  if (opts?.tableId) params.set("tableId", opts.tableId);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const q = params.toString();
  
  return useQuery({
    queryKey: queryKeys.orders(restaurantId, opts),
    queryFn: () =>
      api.get<{ orders: Order[] }>(`/api/restaurants/${restaurantId}/orders${q ? `?${q}` : ""}`).then((r) => r.orders),
    enabled: !!restaurantId,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });
}

export function useKitchenOrders(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.ordersKitchen(restaurantId),
    queryFn: () =>
      api.get<{ orders: Order[] }>(`/api/restaurants/${restaurantId}/orders/kitchen/active`).then((r) => r.orders),
    enabled: !!restaurantId,
    refetchInterval: 2000, // Poll every 2 seconds for kitchen - fastest updates
  });
}

export function useOrderStats(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.ordersStats(restaurantId),
    queryFn: () =>
      api.get<{ stats: OrderStats }>(`/api/restaurants/${restaurantId}/orders/stats/summary`).then((r) => r.stats),
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useOrderHistory(restaurantId: string | null, opts?: { limit?: number; offset?: number; fromDate?: string; toDate?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.fromDate) params.set("fromDate", opts.fromDate);
  if (opts?.toDate) params.set("toDate", opts.toDate);
  const q = params.toString();

  return useQuery({
    queryKey: queryKeys.ordersHistory(restaurantId),
    queryFn: () =>
      api.get<{ orders: Order[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>(`/api/restaurants/${restaurantId}/orders/history/all${q ? `?${q}` : ""}`),
    enabled: !!restaurantId,
  });
}

export function useCreateOrder(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderInput) =>
      api.post<{ order: Order }>(`/api/restaurants/${restaurantId}/orders`, data).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.ordersStats(restaurantId) });
      }
      toast.success("Order created successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create order"),
  });
}

export function useUpdateOrderStatus(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      api.patch<{ order: Order }>(`/api/restaurants/${restaurantId}/orders/${orderId}/status`, { status }).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.ordersStats(restaurantId) });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update status"),
  });
}

export function useCancelOrder(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<{ order: Order; message: string }>(`/api/restaurants/${restaurantId}/orders/${orderId}/cancel`).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.ordersStats(restaurantId) });
      }
      toast.success("Order cancelled");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to cancel order"),
  });
}

export function useAddOrderItems(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: { menuItemId: string; quantity: number; notes?: string }[] }) =>
      api.post<{ order: Order; newItems: unknown[] }>(`/api/restaurants/${restaurantId}/orders/${orderId}/items`, { items }).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
      }
      toast.success("Items added to order");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add items"),
  });
}

export function useRemoveOrderItem(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, orderItemId }: { orderId: string; orderItemId: string }) =>
      api.delete<{ order: Order; deleted: boolean }>(`/api/restaurants/${restaurantId}/orders/${orderId}/items/${orderItemId}`).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
      }
      toast.success("Item removed from order");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to remove item"),
  });
}

// Get a single order by ID
export function useOrder(restaurantId: string | null, orderId: string | null) {
  return useQuery({
    queryKey: ["order", restaurantId, orderId],
    queryFn: () =>
      api.get<{ order: Order }>(`/api/restaurants/${restaurantId}/orders/${orderId}`).then((r) => r.order),
    enabled: !!restaurantId && !!orderId,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });
}

export function useKitchenStartOrder(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<{ order: Order; message: string }>(`/api/restaurants/${restaurantId}/orders/${orderId}/kitchen/start`).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
      }
      toast.success("Order started");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to start order"),
  });
}

export function useKitchenCompleteOrder(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<{ order: Order; message: string }>(`/api/restaurants/${restaurantId}/orders/${orderId}/kitchen/complete`).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
      }
      toast.success("Order ready for serving");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to complete order"),
  });
}

// === Tables ===
export function useTables(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.tables(restaurantId),
    queryFn: () =>
      api.get<{ tables: Table[] }>(`/api/restaurants/${restaurantId}/tables`).then((r) => r.tables),
    enabled: !!restaurantId,
    refetchInterval: 15000, // Poll every 15 seconds
  });
}

export function useCreateTable(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tableNumber: string; capacity: number; floorSection?: string; positionX?: number; positionY?: number; qrCodePayload: string }) =>
      api.post<{ table: Table }>(`/api/restaurants/${restaurantId}/tables`, data).then((r) => r.table),
    onSuccess: () => {
      if (restaurantId) qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      toast.success("Table created successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create table"),
  });
}

export function useUpdateTable(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: Partial<Table> }) =>
      api.put<{ table: Table }>(`/api/restaurants/${restaurantId}/tables/${tableId}`, data).then((r) => r.table),
    onSuccess: () => {
      if (restaurantId) qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      toast.success("Table updated successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update table"),
  });
}

export function useAssignWaiterToTable(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, staffId }: { tableId: string; staffId: string | null }) =>
      api.patch<{ table: Table }>(`/api/restaurants/${restaurantId}/tables/${tableId}/assign-waiter`, { staffId }).then((r) => r.table),
    onSuccess: () => {
      if (restaurantId) qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      toast.success("Waiter assigned successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to assign waiter"),
  });
}

export function useDeleteTable(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tableId: string) =>
      api.delete<{ table: Table; deleted: boolean }>(`/api/restaurants/${restaurantId}/tables/${tableId}`),
    onSuccess: () => {
      if (restaurantId) qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      toast.success("Table deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete table"),
  });
}

export function useUpdateTableStatus(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, status }: { tableId: string; status: TableStatus }) =>
      api.patch<{ table: Table }>(`/api/restaurants/${restaurantId}/tables/${tableId}/status`, { status }).then((r) => r.table),
    onSuccess: (table) => {
      if (restaurantId) qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      toast.success(`Table ${table.tableNumber} is now ${table.currentStatus.toLowerCase()}`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update table"),
  });
}

// === Queue ===
export function useQueue(restaurantId: string | null, opts?: { status?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const q = params.toString();

  return useQuery({
    queryKey: queryKeys.queue(restaurantId),
    queryFn: () =>
      api.get<{ entries: QueueEntry[] }>(`/api/restaurants/${restaurantId}/queue${q ? `?${q}` : ""}`).then((r) => r.entries ?? []),
    enabled: !!restaurantId,
    refetchInterval: 8000,
  });
}

export function useQueueActive(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.queueActive(restaurantId),
    queryFn: () =>
      api.get<{ entries: QueueEntry[] }>(`/api/restaurants/${restaurantId}/queue/active`).then((r) => r.entries ?? []),
    enabled: !!restaurantId,
    refetchInterval: 5000,
  });
}

export function useQueueStats(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.queueStats(restaurantId),
    queryFn: () =>
      api.get<{ stats: QueueStats }>(`/api/restaurants/${restaurantId}/queue/stats/summary`).then((r) => r.stats),
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });
}

export function useRegisterInQueue(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterQueueInput) =>
      api.post<{ entry: QueueEntry }>(`/api/restaurants/${restaurantId}/queue`, data).then((r) => r.entry),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.queue(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueActive(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueStats(restaurantId) });
      }
      toast.success("Guest added to queue");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add to queue"),
  });
}

export function useUpdateQueueStatus(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ queueId, status }: { queueId: string; status: "WAITING" | "CALLED" | "SEATED" | "CANCELLED" }) =>
      api.patch<{ entry: QueueEntry }>(`/api/restaurants/${restaurantId}/queue/${queueId}/status`, { status }).then((r) => r.entry),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.queue(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueActive(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueStats(restaurantId) });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update status"),
  });
}

export function useCallNextGuest(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ entry: QueueEntry; message: string }>(`/api/restaurants/${restaurantId}/queue/call-next`).then((r) => r.entry),
    onSuccess: (entry) => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.queue(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueActive(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueStats(restaurantId) });
      }
      toast.success(`Calling ${entry.guestName}!`);
    },
    onError: (e: Error) => toast.error(e.message || "No guests waiting"),
  });
}

export function useSeatGuest(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ queueId, tableId }: { queueId: string; tableId?: string }) =>
      api.post<{ entry: QueueEntry; message: string }>(`/api/restaurants/${restaurantId}/queue/${queueId}/seat`, { tableId }).then((r) => r.entry),
    onSuccess: (entry) => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.queue(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueActive(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueStats(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      }
      toast.success(`${entry.guestName} has been seated`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to seat guest"),
  });
}

export function useCancelQueueEntry(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueId: string) =>
      api.post<{ entry: QueueEntry; message: string }>(`/api/restaurants/${restaurantId}/queue/${queueId}/cancel`).then((r) => r.entry),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.queue(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueActive(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.queueStats(restaurantId) });
      }
      toast.success("Queue entry cancelled");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to cancel entry"),
  });
}

// === Public Queue Registration (no auth) ===
export function usePublicRegisterQueue(restaurantId: string | null) {
  return useMutation({
    mutationFn: (data: RegisterQueueInput) =>
      api.post<{ entry: QueueEntry; message: string }>(`/api/queue/register/${restaurantId}`, data).then((r) => r.entry),
    onSuccess: () => {
      toast.success("You've been added to the queue!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to join queue"),
  });
}

export function usePublicQueueStatus(restaurantId: string | null, phone: string | null) {
  return useQuery({
    queryKey: ["queue-status-public", restaurantId, phone],
    queryFn: () =>
      api.get<{ entry: QueueEntry }>(`/api/queue/status/${restaurantId}?phone=${encodeURIComponent(phone || "")}`).then((r) => r.entry),
    enabled: !!restaurantId && !!phone,
    refetchInterval: 10000,
  });
}

// === QR Codes ===
export function useGenerateQR(restaurantId: string | null) {
  return useMutation({
    mutationFn: (data: { type: "RESTAURANT" | "TABLE"; tableId?: string }) =>
      api.post<QRCodeData>(`/api/qr/${restaurantId}/generate`, data),
    onError: (e: Error) => toast.error(e.message || "Failed to generate QR code"),
  });
}

export function useGenerateAllQR(restaurantId: string | null) {
  return useMutation({
    mutationFn: () =>
      api.post<{ restaurantId: string; totalGenerated: number; qrCodes: QRCodeData[] }>(`/api/qr/${restaurantId}/generate-all`),
    onSuccess: (data) => {
      toast.success(`Generated ${data.totalGenerated} QR codes`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to generate QR codes"),
  });
}

export function useQRStats(restaurantId: string | null) {
  return useQuery({
    queryKey: ["qr-stats", restaurantId],
    queryFn: () =>
      api.get<{ totalTables: number; tablesWithQR: number; lastUpdated: string }>(`/api/qr/${restaurantId}/stats`),
    enabled: !!restaurantId,
  });
}

// === Transactions ===
export function useTransactions(restaurantId: string | null, opts?: { limit?: number; offset?: number; fromDate?: string; toDate?: string; paymentMethod?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.fromDate) params.set("fromDate", opts.fromDate);
  if (opts?.toDate) params.set("toDate", opts.toDate);
  if (opts?.paymentMethod) params.set("paymentMethod", opts.paymentMethod);
  const q = params.toString();

  return useQuery({
    queryKey: ["transactions", restaurantId, opts],
    queryFn: () =>
      api.get<{ transactions: any[] }>(`/api/restaurants/${restaurantId}/transactions${q ? `?${q}` : ""}`).then((r) => r.transactions ?? []),
    enabled: !!restaurantId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useCreateTransaction(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderId: string; billNumber: string; paymentMethod: string; paymentReference?: string }) =>
      api.post<{ transaction: any }>(`/api/restaurants/${restaurantId}/transactions`, data).then((r) => r.transaction),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["transactions", restaurantId] });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create transaction"),
  });
}

// === Dashboard Stats ===
export function useDashboardStats(restaurantId: string | null) {
  const { data: tables } = useTables(restaurantId);
  const { data: orderStats } = useOrderStats(restaurantId);
  const { data: queueStats } = useQueueStats(restaurantId);

  // Combine stats from different sources
  const stats: DashboardStats | null = restaurantId
    ? {
        totalTables: tables?.length ?? 0,
        availableTables: tables?.filter((t) => t.currentStatus === "AVAILABLE").length ?? 0,
        occupiedTables: tables?.filter((t) => t.currentStatus === "OCCUPIED").length ?? 0,
        totalOrders: orderStats?.totalOrders ?? 0,
        pendingOrders: orderStats?.pendingOrders ?? 0,
        preparingOrders: orderStats?.preparingOrders ?? 0,
        todayRevenue: orderStats?.totalRevenue ?? "0.00",
        queueWaiting: queueStats?.totalWaiting ?? 0,
      }
    : null;

  return {
    data: stats,
    isLoading: !tables || !orderStats,
  };
}

// === Staff ===
export function useStaff(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.staff(restaurantId),
    queryFn: () => api.get<{ staff: Staff[] }>(`/api/restaurants/${restaurantId}/staff`).then((r) => r.staff),
    enabled: !!restaurantId,
  });
}

// === Inventory ===
export function useInventory(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory(restaurantId),
    queryFn: () =>
      api
        .get<{ items: InventoryItem[] }>(`/api/restaurants/${restaurantId}/inventory`)
        .then((r) => r.items ?? []),
    enabled: !!restaurantId,
  });
}

// === Meta: Locations & Currencies (server-side search) ===
export function useCountries(search: string) {
  return useQuery({
    queryKey: queryKeys.countries(search),
    queryFn: () =>
      api
        .get<{ countries: LocationOption[] }>(`/api/meta/countries${search ? `?q=${encodeURIComponent(search)}` : ""}`)
        .then((r) => r.countries ?? []),
  });
}

export function useStates(countryCode: string | null, search: string) {
  return useQuery({
    queryKey: queryKeys.states(countryCode, search),
    queryFn: () =>
      api
        .get<{ states: LocationOption[] }>(
          `/api/meta/states${countryCode ? `?country=${encodeURIComponent(countryCode)}` : ""}${
            search ? `${countryCode ? "&" : "?"}q=${encodeURIComponent(search)}` : ""
          }`,
        )
        .then((r) => r.states ?? []),
    enabled: !!countryCode,
  });
}

export function useCities(stateCode: string | null, search: string) {
  return useQuery({
    queryKey: queryKeys.cities(stateCode, search),
    queryFn: () =>
      api
        .get<{ cities: LocationOption[] }>(
          `/api/meta/cities${stateCode ? `?state=${encodeURIComponent(stateCode)}` : ""}${
            search ? `${stateCode ? "&" : "?"}q=${encodeURIComponent(search)}` : ""
          }`,
        )
        .then((r) => r.cities ?? []),
    enabled: !!stateCode,
  });
}

export function useCurrencies(search: string) {
  return useQuery({
    queryKey: queryKeys.currencies(search),
    queryFn: () =>
      api
        .get<{ currencies: CurrencyOption[] }>(
          `/api/meta/currencies${search ? `?q=${encodeURIComponent(search)}` : ""}`,
        )
        .then((r) => r.currencies ?? []),
  });
}

export function useAnalytics(restaurantId: string | null, timeframe: string = "day") {
  return useQuery({
    queryKey: queryKeys.analytics(restaurantId, timeframe),
    queryFn: async () => {
      const response = await api.get<{ analytics: AnalyticsData }>(
        `/api/analytics/${restaurantId}/summary?timeframe=${timeframe}`
      );
      return response.analytics;
    },
    enabled: !!restaurantId,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

// Dashboard hooks
export function useDashboardSummary(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => api.get<DashboardSummary>(`/api/dashboard/${restaurantId}/summary`),
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000,
  });
}

export function useTableStatsAPI(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.dashboard.tables(),
    queryFn: () => api.get<TableStats>(`/api/dashboard/${restaurantId}/tables`),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useOrderStatsAPI(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.dashboard.orders(),
    queryFn: () => api.get<OrderStats>(`/api/dashboard/${restaurantId}/orders`),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useQueueStatsAPI(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.dashboard.queue(),
    queryFn: () => api.get<QueueStats>(`/api/dashboard/${restaurantId}/queue`),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useScanActivity(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.dashboard.scanActivity(),
    queryFn: () => api.get<ScanActivity[]>(`/api/dashboard/${restaurantId}/scan-activity`),
    staleTime: 60000,
    refetchInterval: 60000,
  });
}

export function useRecentOrders(restaurantId: string | null, limit: number = 5) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentOrders(limit),
    queryFn: () => api.get<RecentOrder[]>(`/api/dashboard/${restaurantId}/recent-orders?limit=${limit}`),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

// === Menu Extraction ===

/**
 * Get extraction job status (with automatic polling)
 */export function useExtractionJob(
  restaurantId: string | null,
  jobId: string | null
) {
  return useQuery({
    queryKey: queryKeys.extraction.job(restaurantId, jobId),
    queryFn: () =>
      api
        .get<{ job: ExtractionJob }>(
          `/api/menu/${restaurantId}/extract/${jobId}`
        )
        .then(r => r.job),

    enabled: !!restaurantId && !!jobId,

    refetchInterval: (query) => {
      const data = query.state.data;

      if (!data) return 2000;

      return data.status === 'PROCESSING' ? 2000 : false;
    },

    staleTime: 0,
  });
}


/**
 * Get extraction history for a restaurant
 */
export function useExtractionJobs(restaurantId: string | null, limit?: number) {
  return useQuery({
    queryKey: queryKeys.extraction.jobs(restaurantId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));
      const queryString = params.toString();
      return api.get<{ extractions: ExtractionJob[] }>(
        `/api/menu/${restaurantId}/extractions${queryString ? `?${queryString}` : ''}`
      ).then(r => r.extractions);
    },
    enabled: !!restaurantId,
  });
}

/**
 * Create extraction job
 */
export function useCreateExtractionJob(restaurantId: string | null) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { imageUrl: string; imageS3Key: string; imageSizeBytes: number }) =>
      api.post<{ job: ExtractionJob }>(`/api/menu/${restaurantId}/extract`, data).then(r => r.job),
    onSuccess: (job) => {
      // Invalidate extraction jobs list
      qc.invalidateQueries({ queryKey: queryKeys.extraction.jobs(restaurantId) });
      // Set the initial job data
      qc.setQueryData(queryKeys.extraction.job(restaurantId, job.id), { job });
      toast.success("Extraction started");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to start extraction"),
  });
}

/**
 * Confirm extraction and add items to menu
 */
export function useConfirmExtraction(restaurantId: string | null, jobId: string | null, slug: string | null) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { items: Array<{
      categoryName: string;
      name: string;
      price: number;
      description?: string;
      dietaryType?: 'Veg' | 'Non-Veg';
    }> }) =>
      api.post<{ 
        success: boolean;
        itemsCreated: number;
        items: MenuItem[];
        timestamp: number;
      }>(`/api/menu/${restaurantId}/extract/${jobId}/confirm`, data),
    onSuccess: async (data) => {
      toast.success(`🎉 Added ${data.itemsCreated} items to your menu!`);
      
      // Wait for backend cache invalidation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
       // Invalidate and refetch ALL menu-related queries
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["menu-public"] }),
        qc.invalidateQueries({ queryKey: ["menu-categories"] }),
        qc.invalidateQueries({ queryKey: queryKeys.extraction.job(restaurantId, jobId) }),
        qc.invalidateQueries({ queryKey: queryKeys.extraction.jobs(restaurantId) }),
        qc.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) }),
        qc.invalidateQueries({ queryKey: queryKeys.restaurantBySlug(slug) }),
      ]);
      
      // Force immediate refetch
      await Promise.all([
        qc.refetchQueries({ queryKey: ["menu-public", slug], type: "active" }),
        qc.refetchQueries({ queryKey: ["menu-categories", restaurantId], type: "active" }),
      ]);
      
      console.log('[Cache] Menu cache invalidated and refetched after extraction confirmation');
    },
    onError: (e: Error) => {
      console.error("Extraction confirmation error:", e);
      toast.error(e.message || "Failed to add items. Please try again.");
    },
  });
}

/**
 * Get presigned URL for menu card upload
 */
export function useMenuCardUploadUrl(restaurantId: string | null) {
  return useMutation({
    mutationFn: (data?: { contentType?: string }) =>
      api.post<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
        expiresIn: number;
      }>(`/api/menu/${restaurantId}/menu-card/upload-url`, data || {}),
    onError: (e: Error) => toast.error(e.message || "Failed to get upload URL"),
  });
}