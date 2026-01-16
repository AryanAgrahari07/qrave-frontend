
import { LayoutDashboard, UtensilsCrossed, QrCode, BarChart3, Settings, LogOut, ShoppingCart, CookingPot, Users } from "lucide-react";

export const MOCK_RESTAURANT = {
  id: "1",
  name: "Gourmet Haven",
  slug: "gourmet-haven",
  plan: "PRO",
  currency: "$",
};

export const MOCK_MENU_CATEGORIES = [
  {
    id: "c1",
    name: "Starters",
    items: [
      {
        id: "i1",
        name: "Truffle Fries",
        description: "Hand-cut fries with truffle oil and parmesan",
        price: 12,
        image: "https://images.unsplash.com/photo-1573080496987-8198cb147a71?auto=format&fit=crop&q=80&w=300&h=300",
        available: true,
      },
      {
        id: "i2",
        name: "Crispy Calamari",
        description: "Served with marinara and lemon wedges",
        price: 16,
        image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&q=80&w=300&h=300",
        available: true,
      },
    ],
  },
  {
    id: "c2",
    name: "Mains",
    items: [
      {
        id: "i3",
        name: "Wagyu Burger",
        description: "Aged cheddar, caramelized onions, brioche bun",
        price: 24,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300&h=300",
        available: true,
      },
      {
        id: "i4",
        name: "Pan-Seared Salmon",
        description: "Asparagus, quinoa, lemon butter sauce",
        price: 28,
        image: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&q=80&w=300&h=300",
        available: false,
      },
    ],
  },
];

export const MOCK_ORDERS = [
  { id: "ord-1", table: "5", items: ["Wagyu Burger", "Truffle Fries"], total: 36, status: "PENDING", time: "2 mins ago" },
  { id: "ord-2", table: "2", items: ["Crispy Calamari"], total: 16, status: "PREPARING", time: "5 mins ago" },
  { id: "ord-3", table: "8", items: ["Pan-Seared Salmon", "Coke"], total: 32, status: "SERVED", time: "15 mins ago" },
];

export const MOCK_STAFF = [
  { id: "ST-001", name: "Alice Johnson", role: "WAITER", pin: "1234" },
  { id: "ST-002", name: "Bob Smith", role: "KITCHEN", pin: "5678" },
];

export const MOCK_QUEUE = [
  { id: "Q-1", name: "Smith Family", partySize: 4, waitTime: "15m", status: "WAITING" },
  { id: "Q-2", name: "Jessica R.", partySize: 2, waitTime: "5m", status: "CALLING" },
  { id: "Q-3", name: "Michael T.", partySize: 6, waitTime: "25m", status: "WAITING" },
];

export const MOCK_STATS = {
  activeTables: 12,
  totalTables: 20,
  scansToday: 145,
  scansWeek: 890,
  mostPopular: "Wagyu Burger",
};

export const NAV_LINKS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "Live Orders", href: "/dashboard/orders" },
  { icon: CookingPot, label: "Kitchen KDS", href: "/dashboard/kitchen" },
  { icon: Users, label: "Staff & Queue", href: "/dashboard/staff" },
  { icon: UtensilsCrossed, label: "Menu Builder", href: "/dashboard/menu" },
  { icon: QrCode, label: "QR Codes", href: "/dashboard/qr" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];
