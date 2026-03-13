## Architecture Overview

Orderzi (QR-Menu-Design) is a multi-tenant, QR-based restaurant management system that provides:

- **Public guest experiences**: QR menu, queue registration/status, contact and location info.
- **Restaurant staff tooling**: kitchen display (KDS), waiter terminal, order and table management.
- **Owner/admin dashboards**: analytics, menu builder, floor map, staff & inventory management, QR generation, branding and settings.

The system is composed of:

- **Frontend**: React 19 + Vite SPA, deployed as web app and Capacitor PWA/native shell.
- **Backend**: Node.js + Express + drizzle ORM + PostgreSQL + WebSockets (inferred; lives in a separate repo).
- **Real-time layer**: WebSocket connections per restaurant for order, table, queue, and menu updates.
- **Storage**:
  - PostgreSQL for transactional data.
  - Object storage (e.g. S3) for uploaded menu cards and logos.
- **Authentication**: Short-lived access tokens + long-lived refresh tokens, with HttpOnly cookies on web and secure storage on native.

This document describes the high-level architecture and directory structure of the project as implemented in this repository (frontend) and the inferred backend.

---

## Project Layout

### Root

- **`package.json`**
  - Frontend dependencies: `react`, `react-dom`, `vite`, `@tanstack/react-query`, `wouter`, `tailwindcss`, Radix UI, animation libraries, Capacitor plugins.
  - Backend-stack dependencies (not used in this repo’s TS/JS code but indicate the backend architecture): `express`, `express-session`, `drizzle-orm`, `drizzle-kit`, `pg`, `passport`, `passport-local`, `ws`, `connect-pg-simple`, `memorystore`, `drizzle-zod`.

- **`vite.config.ts`**
  - Sets Vite root to `client`.
  - Aliases:
    - `@` → `client/src`
    - `@assets` → `attached_assets`
  - Builds to `dist/public`.
  - Dev server proxy:
    - Routes `/api` → `VITE_API_URL` (or `http://localhost:3001` when not set).
  - PWA, Tailwind and Replit plugin configuration.

- **`capacitor.config.ts`**
  - Capacitor configuration for wrapping the SPA as a native app (Android/iOS) using a shared codebase.

- **`client/.env`**
  - `NODE_ENV=production`
  - `VITE_API_URL=https://orderzi.com`
  - The frontend always talks to an external backend API at this base URL.

### Frontend Structure (`client/src`)

- **Entry and composition**
  - **`App.tsx`**
    - Defines routing using Wouter (`Switch`, `Route`).
    - Wraps the app with providers:
      - `ErrorBoundary`
      - `QueryClientProvider` (React Query)
      - `LanguageProvider`
      - `AuthProvider`
      - `SubscriptionProvider`
      - `PrinterProvider`
      - `TooltipProvider`
    - Renders global UI such as toasters and `OfflineBanner`.
  - **`main.tsx`** (standard React entry; initializes `App`).

- **Routing and pages (`client/src/pages`)**
  - **Public / marketing / auth**
    - `LandingPage.tsx`
    - `auth/LoginPage.tsx`
    - `onboarding/OnboardingPage.tsx`
    - `public/PublicMenuPage.tsx` (QR public menu)
    - `public/QueueRegistrationPage.tsx` (guest queue registration + status)
  - **Dashboard (owner/admin)**
    - `dashboard/DashboardPage.tsx`
    - `dashboard/MenuPage.tsx`
    - `dashboard/LiveOrdersPage.tsx`
    - `dashboard/TransactionsPage.tsx`
    - `dashboard/AnalyticsPage.tsx`
    - `dashboard/SettingsPage.tsx`
    - `dashboard/InventoryPage.tsx`
    - `dashboard/FloorMapPage.tsx`
    - `dashboard/QueuePage.tsx`
    - `dashboard/KitchenPage.tsx`
    - `dashboard/KitchenKDSPage.tsx`
    - `dashboard/WaiterTerminalPage.tsx`
    - `dashboard/StaffManagementPage.tsx`
    - `dashboard/QRCodesPage.tsx`
    - `dashboard/CancelledOrdersPage.tsx`
  - **Subscription / misc**
    - `admin/SubscriptionExpiredPage.tsx`
    - `public/StaffSubscriptionExpiredPage.tsx`
    - `not-found.tsx`

- **Components**
  - **Layout**
    - `components/layout/DashboardLayout.tsx`
    - `components/layout/MarketingLayout.tsx`
  - **UI primitives**
    - `components/ui/*` – shared UI components (Radix based) such as buttons, dialogs, inputs, popovers, dropdowns.
  - **POS**
    - `components/pos/desktoppos.tsx`
    - `components/pos/mobilepos.tsx`
  - **Menu and customization**
    - `components/menu/MenuCardUploader.tsx`
    - `components/menu/ExtractionPreview.tsx`
    - `components/menu/MenuItemCustomization.tsx`
    - `components/menu/Itemcustomizationdialog.tsx`
    - `components/menu/ItemcustomizationContent.tsx`
  - **Branding / logos**
    - `components/logo/logo-selector.tsx`
  - **Guards / infrastructure**
    - `components/ProtectedRoute.tsx`
    - `components/AuthGate.tsx`
    - `components/SubscriptionGuard.tsx`
    - `components/ErrorBoundary.tsx`
    - `components/OfflineBanner.tsx`
    - `components/LanguageSelector.tsx`

- **Contexts / Providers**
  - `context/AuthContext.tsx` – authentication and current restaurant context.
  - `context/SubscriptionContext.tsx` – subscription/plan status and gating.
  - `context/PrinterContext.tsx` – thermal printer state and configuration.
  - `context/LanguageContext.tsx` – localization state and helpers.

- **Networking and data access**
  - `lib/api.ts` – generic HTTP client:
    - Constructs base URLs (web vs native).
    - Attaches auth headers / cookies.
    - Handles 401 refresh, retries, and unified error format (`ApiError`).
  - `hooks/api.ts` – feature-oriented React Query hooks, grouped by domain:
    - Auth
    - Restaurants
    - Menu, variants, modifiers
    - Orders and order items
    - Tables and floor map
    - Queue
    - Staff
    - Inventory
    - Analytics and dashboard
    - Transactions
    - QR codes and logos
    - Meta lookups
  - `lib/queryClient.ts` – singleton React Query `QueryClient` with default options.

- **Real-time**
  - `hooks/useRestaurantWebSocket.ts` – manages WebSocket connection:
    - Gets WS ticket from `/api/auth/ws-ticket`.
    - Connects to `wss://<API_HOST>/ws?token=<ticket>`.
    - Subscribes to restaurant-specific events (orders, tables, queue, menu).
    - Invalidates relevant React Query caches per event.

- **Domain types**
  - `types/index.ts` – core domain model definitions:
    - `User`, `Staff`
    - `Restaurant`, `RestaurantSettings`
    - `MenuCategory`, `MenuItem`, `Variant`, `ModifierGroup`, `Modifier`
    - `Table`
    - `Order`, `OrderItem`
    - `QueueEntry`, queue statistics
    - `Transactions`, analytics, dashboard aggregates
    - `QRCodeData`, `Logo` metadata
  - `types/pos.ts` – POS/cart-specific types.

- **Utilities and support libraries**
  - `lib/utils.ts` – misc helpers (formatting, classNames, etc.).
  - Printing and billing helpers:
    - `lib/bill-data.ts`
    - `lib/receipt-text.ts`
    - `lib/whatsapp-bill.ts`
    - `lib/thermal-printer-utils.ts`
    - `lib/kot-data.ts`
  - Storage:
    - `lib/preferences.ts` – Capacitor Preferences abstraction.
    - `lib/secureStorage.ts` – secure storage for tokens and secrets on native.
  - Additional hooks:
    - `hooks/useThermalPrinter.ts` – printer connectivity and status.
    - `hooks/useRazorpay.ts` – payment gateway integration wrapper.
    - `hooks/use-toast.ts` – unified toast API.
    - `hooks/use-mobile.tsx` – responsive behavior and layout tweaks.

- **Localization**
  - `locales/en.json`, `locales/hi.json`, `locales/es.json`.
  - Integrated via `LanguageContext` and language selectors in UI.

---

## Runtime Architecture

### Frontend Runtime

- **Composition**
  - The app is a single-page application rendered by React 19.
  - All routes and views are rendered inside `App.tsx`, which is nested in provider components that supply:
    - Authentication / user state
    - Restaurant subscription state
    - Printer connectivity
    - Localization
    - React Query server state

- **Routing**
  - Implemented via **Wouter**:
    - Public routes (`/`, `/auth`, `/onboarding`, `/r/:slug`, `/q/:slug`).
    - Authenticated routes under `/dashboard`, `/kitchen`, `/waiter`.
  - `ProtectedRoute` wraps authenticated routes and checks:
    - `AuthContext.user`
    - Inline route-level constraints (required role, subscription requirement).
    - `SubscriptionGuard` for plan-based gating.

- **State Management**
  - **Server state**:
    - Managed exclusively with React Query.
    - Each domain (menu, orders, queue, etc.) has typed hooks in `hooks/api.ts`.
    - WebSocket events trigger `queryClient.invalidateQueries` for specific cache keys.
  - **Client state**:
    - Managed with React context (e.g., `AuthContext`, `LanguageContext`, `PrinterContext`).
    - Local component state for UI interactions (filters, dialogs, etc.).

### Backend Runtime (Inferred)

- **Stack**
  - **Express** for HTTP routing under `/api`.
  - **drizzle-orm** over **PostgreSQL** for persistence.
  - **passport + passport-local** for login strategies (owner/admin and staff).
  - **express-session** with `connect-pg-simple` or `memorystore` for sessions.
  - **ws** for WebSocket connections at `/ws`.
  - **drizzle-zod** for shared schema validation.

- **Responsibilities**
  - Authentication and authorization.
  - Restaurant onboarding and management.
  - Menu, orders, tables, queue, inventory, transactions, analytics, QR, and logos.
  - WebSocket event broadcasting when entities change.
  - Payment integration with Razorpay (or similar).
  - AI-powered menu extraction (OCR/LLM pipeline) from uploaded menu cards.

---

## Request Flow

### HTTP Request Flow

1. UI calls a domain-specific hook (e.g., `useOrders`, `useMenu`, `useQueue`).
2. The hook uses the `api` client from `lib/api.ts` to construct:
   - URL (based on `VITE_API_URL`).
   - HTTP method and body.
   - Headers with `Authorization` when needed.
3. `api` executes a fetch with:
   - `credentials: "include"` to carry cookies (for refresh token).
   - JSON request/response parsing.
4. On `401`:
   - Attempts `/api/auth/refresh`.
   - If successful, updates token storage and retries the original request.
   - If unsuccessful, throws an `ApiError` that triggers logout inside `AuthContext`.
5. Data is cached with a domain-specific React Query key.
6. UI subscribes to that key via the hook.

### WebSocket Flow

1. After login and restaurant selection, `AuthContext` (and supporting hooks) request a WS ticket from `/api/auth/ws-ticket`.
2. `useRestaurantWebSocket` connects to `wss://<API_HOST>/ws?token=<ticket>`.
3. Backend identifies:
   - User
   - Restaurant
   - Allowed rooms (e.g., `restaurant:<id>`).
4. Client subscribes to restaurant events.
5. When server-side state changes (e.g., new order, table status change, queue updated), backend broadcasts an event:
   - Example: `order.updated`, `queue.updated`, `table.updated`.
6. `useRestaurantWebSocket` maps event types to a set of React Query keys and invalidates them.
7. UI automatically re-renders with fresh data from the next query refetch.

---

## Deployment and Environments

- **Frontend**
  - Built with Vite.
  - Deployed as static assets (e.g. CDN + object storage) or within a Node/Express server’s `public` directory.
  - Packaged via Capacitor as a native app for iOS/Android, using the same SPA.

- **Backend**
  - Deployed as a Node.js service (e.g. on a PaaS or container orchestrator).
  - Exposes:
    - `https://orderzi.com/api/*` for REST.
    - `wss://orderzi.com/ws` for WebSockets.
  - Connects to PostgreSQL and object storage (e.g., S3).

- **Environments**
  - **Production**
    - `VITE_API_URL=https://orderzi.com`.
  - **Development**
    - `VITE_API_URL` may point to `http://localhost:3001`.
    - Vite dev server proxies `/api` to the backend to avoid CORS issues.

---

## High-Level Component Relationships

- **Frontend**
  - Pages consume React Query hooks.
  - Hooks call `lib/api.ts` and handle domain-level caching and mutations.
  - Contexts provide cross-cutting state (auth, language, printer, subscription).
  - WebSocket hook acts as a real-time invalidation driver.

- **Backend**
  - Express routes organize features into modules (auth, restaurants, menu, orders, tables, queue, staff, inventory, analytics, transactions, QR, logos, meta).
  - ORM models correspond closely to frontend `types` (with some naming differences).
  - WebSocket server listens to DB changes or service events and broadcasts to connected clients.
