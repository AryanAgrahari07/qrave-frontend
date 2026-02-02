/**
 * Qrave Frontend Types
 * API response types matching backend schemas
 */

// === User & Auth ===
export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: "owner" | "admin" | "platform_admin" | "WAITER" | "KITCHEN";
}

export interface AuthResponse {
  user: User;
  token: string;
}

// === Restaurant ===
export interface RestaurantSettingsLanguages {
  [code: string]: boolean | undefined;
  es?: boolean;
  hi?: boolean;
}

export interface RestaurantSettingsNotifications {
  emailReports?: boolean;
  tableAlerts?: boolean;
  [key: string]: boolean | undefined;
}

export interface RestaurantSettings {
  languages?: RestaurantSettingsLanguages;
  notifications?: RestaurantSettingsNotifications;
  // Allow future settings keys without breaking the type
  [key: string]: unknown;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  type?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  currency: string;
  taxRateGst?: string;
  taxRateService?: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// === Menu ===
export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  dietaryTags?: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  
  // Customization options (loaded when needed)
  variants?: Variant[];
  modifierGroups?: ModifierGroup[];
}

export interface MenuData {
  restaurant: Restaurant;
  categories: MenuCategory[];
  items: MenuItem[];
}

// === Table ===
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BLOCKED";

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  floorSection?: string;
  positionX?: number;
  positionY?: number;
  qrCodePayload?: string;
  qrCodeVersion: number;
  currentStatus: TableStatus;
  assignedWaiterId?: string;
  assignedWaiter?: {
    id: string;
    fullName: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// === Order ===
export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "SERVED" | "PAID" | "CANCELLED";
export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export interface OrderItem {
  id: string;
  restaurantId: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  notes?: string;
  createdAt: string;
  selectedVariantId?: string | null;
  variantName?: string | null;
  variantPrice?: string | null;
  selectedModifiers?: Array<{
    id: string;
    name: string;
    price: number;
    groupId?: string;
    groupName?: string;
  }>;
  customizationAmount?: string | null;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId?: string;
  guestName?: string;
  guestPhone?: string;
  placedByStaffId?: string;
  placedByStaff?: {
    id: string;
    fullName: string;
    role: string;
  };
  status: OrderStatus;
  orderType: OrderType;
  subtotalAmount: string;
  gstAmount: string;
  serviceTaxAmount: string;
  discountAmount?: string;
  totalAmount: string;
  notes?: string;
  items?: OrderItem[];
  table?: {
    id: string;
    tableNumber: string;
    floorSection?: string;
  };
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: string;
  avgOrderValue: string;
  pendingOrders: number;
  preparingOrders: number;
  servedOrders: number;
  paidOrders: number;
  cancelledOrders: number;
}

export interface CreateOrderInput {
  tableId?: string;
  guestName?: string;
  guestPhone?: string;
  orderType?: OrderType;
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
    // Customization fields
    variantId?: string;
    modifierIds?: string[];
  }>;
  notes?: string;
  assignedWaiterId?: string; // Optional waiter assignment when admin places order manually
}

// === Queue ===
export type QueueStatus = "WAITING" | "CALLED" | "SEATED" | "CANCELLED";

export interface QueueEntry {
  id: string;
  restaurantId: string;
  guestName: string;
  partySize: number;
  phoneNumber?: string;
  status: QueueStatus;
  position?: number;
  estimatedWaitMinutes?: number;
  entryTime: string;
  calledTime?: string;
  seatedTime?: string;
  cancelledTime?: string;
  notes?: string;
}

export interface QueueStats {
  totalWaiting: number;
  totalCalled: number;
  totalSeated: number;
  totalCancelled: number;
  avgPartySize: string;
  oldestWaitingTime?: string;
  avgWaitTimeMinutes?: string;
}

export interface RegisterQueueInput {
  guestName: string;
  partySize: number;
  phoneNumber?: string;
  notes?: string;
}

// === QR Code ===
export interface QRCodeData {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  tableId?: string;
  tableNumber?: string;
  menuUrl: string;
  qrCodeDataURL: string;
  type: "RESTAURANT" | "TABLE";
  qrCodeVersion: number;
}

// === Dashboard Stats ===
export interface DashboardStats {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  totalOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  todayRevenue: string;
  queueWaiting: number;
}

// === Staff ===
export interface Staff {
  id: string;
  restaurantId?: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  role: "ADMIN" | "WAITER" | "KITCHEN";
  isActive: boolean;
  createdAt?: string;
}

// === Inventory ===
export interface InventoryItem {
  id: string;
  restaurantId: string;
  materialName: string;
  unit: string;
  currentStock: string;
  reorderLevel: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// === Meta / Lookup ===
export interface LocationOption {
  code: string;
  name: string;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

// === Pagination ===
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// === API Response Wrappers ===
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface ApiError {
  message: string;
  errors?: { path: string[]; message: string }[];
}

// Add these types to your types file
export interface AnalyticsData {
  revenueData: { name: string; total: number }[];
  topDishes: { name: string; orders: number; trend: "up" | "down" }[];
  peakHours: { startHour: number; endHour: number };
  avgOrderValue: { avg_value: number; growth_percent: number };
  tableTurnover: number;
  salesByCategory: { name: string; value: number }[];
  trafficVolume: { hour: string; count: number }[];
}


// Dashboard interfaces 
export interface TableStats {
  total_tables: number;
  occupied_tables: number;
  available_tables: number;
  reserved_tables: number;
  occupancy_rate: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  servedOrders: number;
  paidOrders: number;
  totalRevenue: string;
  avgOrderValue: string;
}

export interface QueueStats {
  totalWaiting: number;
  seatedToday: number;
  avgWaitTime: number;
}

export interface ScanActivity {
  name: string;
  scans: number;
}

export interface RecentOrder {
  id: string;
  orderType: string;
  status: string;
  totalAmount: string;
  guestName: string | null;
  createdAt: string;
  table: { tableNumber: string } | null;
  items: { length: number };
}

export interface DashboardSummary {
  tableStats: TableStats;
  orderStats: OrderStats;
  queueStats: QueueStats;
  scanActivity: ScanActivity[];
  recentOrders: RecentOrder[];
}



export interface Variant {
  id: string;
  menuItemId: string;
  restaurantId: string;
  variantName: string;
  price: number ;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Modifier {
  id: string;
  modifierGroupId: string;
  restaurantId: string;
  name: string;
  price: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  minSelections: number;
  maxSelections?: number;
  isRequired: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  modifiers: Modifier[];
}