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
  Modifier,
  ModifierGroup,
  Variant,
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
  cancelledOrdersSummary: (restaurantId: string | null, opts?: Record<string, unknown>) => ["cancelled-orders-summary", restaurantId, opts] as const,
  ordersKitchen: (restaurantId: string | null) => ["orders-kitchen", restaurantId] as const,
  ordersStats: (restaurantId: string | null) => ["orders-stats", restaurantId] as const,
  transactions: (restaurantId: string | null, opts?: Record<string, unknown>) => ["transactions", restaurantId, opts] as const,
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
    staleTime: 0,
    refetchInterval: 5000,
  });
}

// === Protected Menu ===
export function useMenuCategories(restaurantId: string | null, slug: string | null) {
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
    staleTime: 0,
    refetchInterval: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

export function useCreateCategory(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) =>
      api.post<{ category: MenuCategory }>(`/api/menu/${restaurantId}/categories`, data).then((r) => r.category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
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
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
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

// === Orders (with customization support) ===

export type CancelledOrderSummary = Pick<Order,
  | "id"
  | "status"
  | "orderType"
  | "paymentStatus"
  | "cancelReason"
  | "subtotalAmount"
  | "gstAmount"
  | "serviceTaxAmount"
  | "discountAmount"
  | "totalAmount"
  | "paid_amount"
  | "guestName"
  | "guestPhone"
  | "createdAt"
  | "updatedAt"
  | "closedAt"
  | "isClosed"
> & {
  table?: { id: string; tableNumber: string; floorSection?: string | null } | null;
  placedByStaff?: { id: string; fullName: string; role: string } | null;
};

export function useCancelledOrdersSummary(
  restaurantId: string | null,
  opts?: { orderType?: string; tableId?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number }
) {
  const params = new URLSearchParams();
  if (opts?.orderType) params.set("orderType", opts.orderType);
  if (opts?.tableId) params.set("tableId", opts.tableId);
  if (opts?.fromDate) params.set("fromDate", opts.fromDate);
  if (opts?.toDate) params.set("toDate", opts.toDate);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const q = params.toString();

  return useQuery({
    queryKey: queryKeys.cancelledOrdersSummary(restaurantId, opts),
    queryFn: () =>
      api.get<{
        orders: CancelledOrderSummary[];
        pagination?: {
          total: number;
          limit: number;
          offset: number;
          hasMore: boolean;
          totalPages: number;
          currentPage: number;
        };
      }>(`/api/restaurants/${restaurantId}/orders/cancelled/summary${q ? `?${q}` : ""}`),
    enabled: !!restaurantId,
    // Cancelled orders list doesn't need realtime polling
    refetchInterval: false,
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });
}

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
      api.get<{ 
        orders: Order[];
        pagination?: {
          total: number;
          limit: number;
          offset: number;
          hasMore: boolean;
          totalPages: number;
          currentPage: number;
        }
      }>(`/api/restaurants/${restaurantId}/orders${q ? `?${q}` : ""}`),
    enabled: !!restaurantId,
    refetchInterval: 3000,
  });
}

export function useKitchenOrders(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.ordersKitchen(restaurantId),
    queryFn: () =>
      api.get<{ orders: Order[] }>(`/api/restaurants/${restaurantId}/orders/kitchen/active`).then((r) => r.orders),
    enabled: !!restaurantId,
    refetchInterval: 2000,
  });
}

export function useOrderStats(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.ordersStats(restaurantId),
    queryFn: () =>
      api.get<{ stats: OrderStats }>(`/api/restaurants/${restaurantId}/orders/stats/summary`).then((r) => r.stats),
    enabled: !!restaurantId,
    refetchInterval: 30000,
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
        qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
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
        qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
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
        qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      }
      toast.success("Order cancelled");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to cancel order"),
  });
}


export function useAddOrderItems(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      orderId, 
      items,
      paymentMethod = "DUE",
      paymentStatus = "DUE"
    }: { 
      orderId: string; 
      items: Array<{ 
        menuItemId: string; 
        quantity: number; 
        notes?: string;
        variantId?: string;
        modifierIds?: string[];
      }>;
      paymentMethod?: "CASH" | "CARD" | "UPI" | "DUE";
      paymentStatus?: "PAID" | "DUE";
    }) =>
      api.post<{ order: Order; newItems: unknown[] }>(
        `/api/restaurants/${restaurantId}/orders/${orderId}/items`, 
        { 
          items,
          paymentMethod,
          paymentStatus
        }
      ).then((r) => r.order),
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

export function useOrderDetail(restaurantId: string | null, orderId: string | null) {
  return useQuery({
    queryKey: ["order-detail", restaurantId, orderId],
    queryFn: () =>
      api.get<{ order: Order }>(`/api/restaurants/${restaurantId}/orders/${orderId}`).then((r) => r.order),
    enabled: !!restaurantId && !!orderId,
    // Details are fetched on demand (dialogs), no polling
    refetchInterval: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useOrder(restaurantId: string | null, orderId: string | null) {
  return useQuery({
    queryKey: ["order", restaurantId, orderId],
    queryFn: () =>
      api.get<{ order: Order }>(`/api/restaurants/${restaurantId}/orders/${orderId}`).then((r) => r.order),
    enabled: !!restaurantId && !!orderId,
    refetchInterval: 3000,
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
    refetchInterval: 15000,
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
      api
        .patch<{ table: Table }>(
          `/api/restaurants/${restaurantId}/tables/${tableId}/assign-waiter`,
          { staffId },
        )
        .then((r) => r.table),

    // Optimistic update so floor map updates instantly
    onMutate: async ({ tableId, staffId }) => {
      if (!restaurantId) return;
      await qc.cancelQueries({ queryKey: queryKeys.tables(restaurantId) });

      const prev = qc.getQueryData<Table[]>(queryKeys.tables(restaurantId));

      if (prev) {
        qc.setQueryData<Table[]>(queryKeys.tables(restaurantId),
          prev.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  assignedWaiterId: staffId,
                  // Clear old waiter object; server will return enriched waiter on success
                  assignedWaiter: staffId ? t.assignedWaiter : null,
                  // If assigning to an AVAILABLE table, mimic backend behavior (it switches to OCCUPIED)
                  currentStatus:
                    staffId && t.currentStatus === "AVAILABLE" ? "OCCUPIED" : t.currentStatus,
                }
              : t,
          ),
        );
      }

      return { prev };
    },

    onError: (e: Error, _vars, ctx) => {
      if (restaurantId && ctx?.prev) {
        qc.setQueryData(queryKeys.tables(restaurantId), ctx.prev);
      }
      toast.error(e.message || "Failed to assign waiter");
    },

    onSuccess: (table) => {
      if (restaurantId) {
        // Update cache with the server response (includes assignedWaiter enrichment)
        qc.setQueryData<Table[]>(queryKeys.tables(restaurantId), (prev) => {
          if (!prev) return prev;
          return prev.map((t) => (t.id === table.id ? table : t));
        });
      }
      toast.success("Waiter assigned successfully");
    },

    onSettled: () => {
      if (restaurantId) qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
    },
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
// OPTIMIZED TRANSACTION HOOKS
// Key changes:
// 1. List view fetches minimal fields only
// 2. Detail view (modal) fetches full data on-demand
// 3. Removed unnecessary refetch intervals for static data

export function useTransactions(
  restaurantId: string | null, 
  opts?: { 
    limit?: number; 
    offset?: number; 
    fromDate?: string; 
    toDate?: string; 
    paymentMethod?: string;
    search?: string;
  }
) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.fromDate) params.set("fromDate", opts.fromDate);
  if (opts?.toDate) params.set("toDate", opts.toDate);
  if (opts?.paymentMethod) params.set("paymentMethod", opts.paymentMethod);
  if (opts?.search) params.set("search", opts.search);
  const q = params.toString();

  return useQuery({
    queryKey: queryKeys.transactions(restaurantId, opts),
    queryFn: () =>
      api.get<{ 
        transactions: Array<{
          id: string;
          billNumber: string;
          paidAt: string;
          paymentMethod: string;
          grandTotal: string;
          subtotal: string;
          gstAmount: string;
          serviceTaxAmount: string;
          order: {
            id: string;
            orderType: string;
            guestName?: string;
            table?: {
              tableNumber: string;
            } | null;
          } | null;
        }>; 
        pagination: { 
          total: number; 
          limit: number; 
          offset: number; 
          hasMore: boolean;
          totalPages: number;
          currentPage: number;
        } 
      }>(`/api/restaurants/${restaurantId}/transactions${q ? `?${q}` : ""}`),
    enabled: !!restaurantId,
    // OPTIMIZATION: Remove aggressive refetch for historical data
    // Only refetch on window focus or manual invalidation
    refetchInterval: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

// NEW: Separate hook for transaction details (used in modal)
export function useTransactionDetail(restaurantId: string | null, transactionId: string | null) {
  return useQuery({
    queryKey: ["transaction-detail", restaurantId, transactionId],
    queryFn: () =>
      api.get<{ 
        transaction: {
          id: string;
          billNumber: string;
          paidAt: string;
          paymentMethod: string;
          grandTotal: string;
          subtotal: string;
          gstAmount: string;
          serviceTaxAmount: string;
          discountAmount: string;
          taxRateGst?: string | null;
          taxRateService?: string | null;
          order: {
            id: string;
            orderType: string;
            guestName?: string;
            items: Array<{
              id: string;
              itemName: string;
              quantity: number;
              totalPrice: string;
            }>;
            table?: {
              id: string;
              tableNumber: string;
              floorSection?: string;
            } | null;
            placedByStaff?: {
              id: string;
              fullName: string;
              role: string;
            } | null;
          } | null;
        }
      }>(`/api/restaurants/${restaurantId}/transactions/${transactionId}`).then(r => r.transaction),
    enabled: !!restaurantId && !!transactionId,
    // This is only fetched when modal opens, no need for refetch
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useExportTransactionsCSV(restaurantId: string | null) {
  return useMutation({
    mutationFn: async (opts?: { 
      fromDate?: string; 
      toDate?: string; 
      paymentMethod?: string;
    }) => {
      const params = new URLSearchParams();
      if (opts?.fromDate) params.set("fromDate", opts.fromDate);
      if (opts?.toDate) params.set("toDate", opts.toDate);
      if (opts?.paymentMethod) params.set("paymentMethod", opts.paymentMethod);
      const q = params.toString();

      const response = await fetch(
        `/api/restaurants/${restaurantId}/transactions/export/csv${q ? `?${q}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast.success("CSV downloaded successfully");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to export CSV");
    },
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


// Add this new hook to your api.ts file

/**
 * Optimized hook for fetching recent transactions (for widgets/sidebar)
 * Fetches minimal data - much lighter than full useTransactions hook
 */
export function useRecentTransactions(restaurantId: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ["transactions-recent", restaurantId, limit],
    queryFn: () =>
      api.get<{ 
        transactions: Array<{
          id: string;
          billNumber: string;
          paidAt: string;
          paymentMethod: string;
          grandTotal: string;
          orderType?: string;
          guestName?: string;
          tableNumber?: string;
          staffName?: string;
        }>
      }>(`/api/restaurants/${restaurantId}/transactions/recent?limit=${limit}`)
      .then(r => r.transactions),
    enabled: !!restaurantId,
    // OPTIMIZATION: Cache for 30 seconds - recent bills don't change that often
    staleTime: 30000,
    // No aggressive refetching for historical data
    refetchInterval: false,
    // Refetch on window focus to stay reasonably fresh
    refetchOnWindowFocus: true,
  });
}

export function useUpdatePaymentStatus(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      orderId, 
      paymentStatus, 
      paymentMethod 
    }: { 
      orderId: string; 
      paymentStatus: "DUE" | "PAID" | "PARTIALLY_PAID";
      paymentMethod?: "CASH" | "CARD" | "UPI" | "DUE";
    }) =>
      api.patch<{ order: Order; message: string }>(
        `/api/restaurants/${restaurantId}/orders/${orderId}/payment-status`, 
        { paymentStatus, paymentMethod }
      ).then((r) => r.order), // ✅ Return the order, not the whole response
    onSuccess: async (updatedOrder) => { // ✅ Receive the updated order
      if (restaurantId) {
        // Invalidate all order-related queries
        await qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        await qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        await qc.invalidateQueries({ queryKey: queryKeys.ordersStats(restaurantId) });
        await qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
        await qc.invalidateQueries({ queryKey: ["transactions", restaurantId] });
        await qc.invalidateQueries({ queryKey: ["transactions-recent", restaurantId] });
        
        // Also invalidate the specific order
        await qc.invalidateQueries({ queryKey: ["order", restaurantId, updatedOrder.id] });
        
        console.log("✅ Caches invalidated after payment update");
        console.log("  Updated order paidAmount:", updatedOrder.paid_amount);
      }
      toast.success("Payment status updated successfully");
    },
    onError: (e: Error) => {
      console.error("❌ Payment status update error:", e);
      toast.error(e.message || "Failed to update payment status");
    },
  });
}


// Add this new hook to api.ts
export function useCloseOrder(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<{ order: Order; message: string }>(
        `/api/restaurants/${restaurantId}/orders/${orderId}/close`
      ).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.ordersStats(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      }
      toast.success("Order closed successfully. Future orders will create a new session.");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to close order"),
  });
}


/**
 * Cancel order with reason
 */
export function useCancelOrderWithReason(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      api.post<{ order: Order; message: string }>(
        `/api/restaurants/${restaurantId}/orders/${orderId}/cancel-with-reason`,
        { reason }
      ).then((r) => r.order),
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
        qc.invalidateQueries({ queryKey: queryKeys.ordersKitchen(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.ordersStats(restaurantId) });
        qc.invalidateQueries({ queryKey: queryKeys.tables(restaurantId) });
      }
      toast.success("Order cancelled successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to cancel order"),
  });
}


// === Dashboard Stats ===
export function useDashboardStats(restaurantId: string | null) {
  const { data: tables } = useTables(restaurantId);
  const { data: orderStats } = useOrderStats(restaurantId);
  const { data: queueStats } = useQueueStats(restaurantId);

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

// === Meta: Locations & Currencies ===
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

export function useCities(countryCode: string | null, stateCode: string | null, search: string) {
  return useQuery({
    queryKey: queryKeys.cities(stateCode, search),
    queryFn: () =>
      api
        .get<{ cities: LocationOption[] }>(
          `/api/meta/cities?country=${encodeURIComponent(countryCode || "")}&state=${encodeURIComponent(stateCode || "")}${
            search ? `&q=${encodeURIComponent(search)}` : ""
          }`,
        )
        .then((r) => r.cities ?? []),
    enabled: !!countryCode && !!stateCode,
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
    staleTime: 60000,
    refetchInterval: 60000,
  });
}

// === Dashboard hooks ===
export function useDashboardSummary(restaurantId: string | null) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => api.get<DashboardSummary>(`/api/dashboard/${restaurantId}/summary`),
    staleTime: 30000,
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

// ============================================================================
// MENU EXTRACTION
// ============================================================================

export function useExtractionJob(
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

export function useCreateExtractionJob(restaurantId: string | null) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { imageUrl: string; imageS3Key: string; imageSizeBytes: number }) =>
      api.post<{ job: ExtractionJob }>(`/api/menu/${restaurantId}/extract`, data).then(r => r.job),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: queryKeys.extraction.jobs(restaurantId) });
      qc.setQueryData(queryKeys.extraction.job(restaurantId, job.id), { job });
      toast.success("Extraction started");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to start extraction"),
  });
}

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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["menu-public"] }),
        qc.invalidateQueries({ queryKey: ["menu-categories"] }),
        qc.invalidateQueries({ queryKey: queryKeys.extraction.job(restaurantId, jobId) }),
        qc.invalidateQueries({ queryKey: queryKeys.extraction.jobs(restaurantId) }),
        qc.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) }),
        qc.invalidateQueries({ queryKey: queryKeys.restaurantBySlug(slug) }),
      ]);
      
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

// ============================================================================
// MENU CUSTOMIZATION - VARIANTS
// ============================================================================

export function useCreateVariant(restaurantId: string | null, menuItemId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { variantName: string; price: number; isDefault: boolean }) =>
      api.post<{ variant: Variant }>(`/api/menu/${restaurantId}/items/${menuItemId}/variants`, data).then((r) => r.variant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variants", restaurantId, menuItemId] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success("Variant created successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create variant"),
  });
}

export function useUpdateVariant(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: { variantName: string; price: number; isDefault: boolean } }) =>
      api.put<{ variant: Variant }>(`/api/menu/${restaurantId}/variants/${variantId}`, data).then((r) => r.variant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variants"] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success("Variant updated successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update variant"),
  });
}

export function useDeleteVariant(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) =>
      api.delete<{ deleted: boolean }>(`/api/menu/${restaurantId}/variants/${variantId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variants"] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success("Variant deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete variant"),
  });
}

export function useVariantsForMenuItem(restaurantId: string | null, menuItemId: string | null) {
  return useQuery({
    queryKey: ["variants", restaurantId, menuItemId],
    queryFn: () =>
      api
        .get<{ variants: Variant[] }>(
          `/api/menu/${restaurantId}/items/${menuItemId}/variants`
        )
        .then((r) => r.variants),
    enabled: !!restaurantId && !!menuItemId,
  });
}

// ============================================================================
// MENU CUSTOMIZATION - MODIFIER GROUPS
// ============================================================================

export function useCreateModifierGroup(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      selectionType: 'SINGLE' | 'MULTIPLE';
      minSelections: number;
      maxSelections?: number;
      isRequired: boolean;
    }) =>
      api.post<{ modifierGroup: ModifierGroup }>(`/api/menu/${restaurantId}/modifier-groups`, data).then((r) => r.modifierGroup),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modifier-groups-for-item"] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      toast.success("Modifier group created successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create modifier group"),
  });
}

export function useLinkModifierGroup(restaurantId: string | null, menuItemId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      api.post<Record<string, unknown>>(`/api/menu/${restaurantId}/items/${menuItemId}/modifier-groups/${groupId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modifier-groups-for-item", restaurantId, menuItemId] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success("Modifier group linked successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to link modifier group"),
  });
}

export function useUnlinkModifierGroup(restaurantId: string | null, menuItemId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      api.delete<Record<string, unknown>>(`/api/menu/${restaurantId}/items/${menuItemId}/modifier-groups/${groupId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modifier-groups-for-item", restaurantId, menuItemId] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      qc.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success("Modifier group unlinked successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to unlink modifier group"),
  });
}

export function useModifierGroupsForMenuItem(restaurantId: string | null, menuItemId: string | null) {
  return useQuery({
    queryKey: ["modifier-groups-for-item", restaurantId, menuItemId],
    queryFn: () =>
      api
        .get<{ modifierGroups: ModifierGroup[] }>(
          `/api/menu/${restaurantId}/items/${menuItemId}/modifier-groups`
        )
        .then((r) => r.modifierGroups),
    enabled: !!restaurantId && !!menuItemId,
  });
}

// ============================================================================
// MENU CUSTOMIZATION - MODIFIERS
// ============================================================================

export function useCreateModifier(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: { name: string; price: number; isDefault: boolean } }) =>
      api.post<{ modifier: Modifier }>(`/api/menu/${restaurantId}/modifier-groups/${groupId}/modifiers`, data).then((r) => r.modifier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modifier-groups-for-item"] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      toast.success("Modifier created successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create modifier"),
  });
}

export function useDeleteModifier(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (modifierId: string) =>
      api.delete<{ deleted: boolean }>(`/api/menu/${restaurantId}/modifiers/${modifierId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modifier-groups-for-item"] });
      qc.invalidateQueries({ queryKey: ["menu-public"] });
      toast.success("Modifier deleted successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete modifier"),
  });
}

// ============================================================================
// MENU CARD UPLOAD
// ============================================================================

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



// Add these hooks to your existing api.ts file

// === Logo Management ===

export function usePredefinedLogos(category?: string) {
  return useQuery({
    queryKey: ["predefined-logos", category],
    queryFn: () =>
      api.get<{ logos: Array<{
        id: string;
        name: string;
        thumbnail: string;
        url: string;
        category: string;
      }> }>(
        `/api/logos/templates${category ? `?category=${category}` : ""}`
      ).then(r => r.logos),
  });
}

export function useRestaurantLogo(restaurantId: string | null) {
  return useQuery({
    queryKey: ["restaurant-logo", restaurantId],
    queryFn: () =>
      api.get<{ logo: {
        type: 'predefined' | 'custom';
        url: string;
        key?: string;
        updatedAt: string;
      } | null }>(
        `/api/logos/${restaurantId}`
      ).then(r => r.logo),
    enabled: !!restaurantId,
  });
}

export function useLogoUploadUrl(restaurantId: string | null) {
  return useMutation({
    mutationFn: (data: { contentType: string }) =>
      api.post<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
        expiresIn: number;
      }>(`/api/logos/${restaurantId}/upload-url`, data),
    onError: (e: Error) => toast.error(e.message || "Failed to get upload URL"),
  });
}

export function useUpdateRestaurantLogo(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: 'predefined' | 'custom';
      url: string;
      key?: string | null;
    }) =>
      api.put<{
        success: boolean;
        restaurant: Restaurant;
        message: string;
      }>(`/api/logos/${restaurantId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-logo", restaurantId] });
      qc.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update logo"),
  });
}

export function useDeleteRestaurantLogo(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.delete<{
        success: boolean;
        restaurant: Restaurant;
        message: string;
      }>(`/api/logos/${restaurantId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-logo", restaurantId] });
      qc.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to remove logo"),
  });
}