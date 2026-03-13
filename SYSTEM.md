## System Design Overview

Orderzi (QR-Menu-Design) is designed as a multi-tenant SaaS platform for restaurants, focusing on:

- **QR-driven experiences** for guests (menus, queues).
- **Operational tools** for staff (KDS, waiter terminal, POS, queue/floor management).
- **Business intelligence** for owners (analytics, transactions, dashboards).
- **Configurability** via menu builder, customizations, branding, and settings.

This document focuses on the logical design, data modeling, major flows, and cross-cutting concerns.

---

## Goals and Requirements

### Functional Requirements

- **Guest-facing**
  - View public restaurant menu by scanning a QR (per restaurant / table).
  - Filter by category and dietary preferences; view item customizations.
  - Join a waiting queue for a restaurant and track queue position.
  - View restaurant contact and location information.

- **Staff and operations**
  - Kitchen staff see live KDS view of all active orders, with item-level detail.
  - Waiters use a dedicated terminal for:
    - Viewing tables and statuses.
    - Managing the queue.
    - Creating and updating orders.
    - Managing bills and payments.
  - Staff authentication, roles, and access control.

- **Owner / admin**
  - Onboard new restaurants and configure settings.
  - Build and manage menu (categories, items, variants, modifiers).
  - Manage QR codes for tables and entry points.
  - Manage staff and their roles.
  - Manage inventory.
  - View analytics and dashboards: revenue, orders, popular items, scan activity, etc.
  - Manage branding (logos) and subscription status.

### Non-Functional Requirements

- **Performance**
  - Fast, responsive UI with minimal data latency.
  - Real-time updates for operational views (KDS, waiter, queue, dashboard).
- **Scalability**
  - Horizontal scalability at the backend (stateless HTTP and WebSocket workers, central DB and cache).
  - Multi-tenant design to host many restaurants on a single deployment.
- **Reliability**
  - Robust connection handling and graceful degradation when real-time channels are unavailable.
  - Safe state handling for orders and payments.
- **Security**
  - Secure authentication and session management.
  - Role-based access control (RBAC).
  - Safe handling of guest PII and payment data.
- **Extensibility**
  - Clear modularization for adding features like loyalty, coupons, or additional payment providers.

---

## High-Level Architecture

### Logical Components

- **Client (Web + Native)**
  - React SPA and Capacitor wrappers.
  - Domains: auth, menu, orders, tables, queue, staff, inventory, analytics, QR, branding.
  - Uses React Query for server state and contexts for cross-cutting state.

- **API Gateway / Backend Service**
  - Express application under `https://orderzi.com/api/*`.
  - Modules (inferred from routes):
    - Auth
    - Restaurants
    - Menu
    - Orders
    - Tables
    - Queue
    - Staff
    - Inventory
    - Analytics & Dashboard
    - Transactions & Payments
    - QR Codes & Logos
    - Meta lookup

- **Database**
  - PostgreSQL with drizzle ORM.
  - Relational models keyed by `restaurant_id` for tenancy.

- **Real-Time Layer**
  - WebSocket server under `wss://orderzi.com/ws`.
  - Broadcasts entity-level events to connected clients.

- **External Integrations**
  - Payment gateway (Razorpay).
  - Object storage for menu cards and logos.
  - OCR/LLM services for AI menu card extraction.

---

## Data Model

> Based on frontend `types` and API design; actual backend schema may have different column names and additional fields.

### Core Entities

#### User and Staff

- **User**
  - Represents platform user accounts (owners, admins, platform admins, potentially staff in some flows).
  - Attributes:
    - `id`
    - `email`
    - `password_hash`
    - `name`
    - `global_role` (`owner`, `admin`, `platform_admin`, `WAITER`, `KITCHEN`)
    - timestamps

- **Staff**
  - Per-restaurant staff member with a role.
  - Attributes:
    - `id`
    - `restaurant_id` (FK → `Restaurant`)
    - `name`
    - `phone`
    - `role` (`ADMIN`, `WAITER`, `KITCHEN`)
    - `passcode` (hashed PIN)
    - `is_active`
    - timestamps

- **Relationships**
  - A `User` can own one or more `Restaurant` records.
  - A `Restaurant` has many `Staff`.
  - Orders optionally reference `Staff` via `placed_by_staff_id`.

#### Restaurant

- Captures the core configuration for a tenant:

- Attributes:
  - `id`
  - `owner_user_id` (FK → `User`)
  - `name`
  - `slug` (unique, used in QR URL)
  - `address`, `city`, `state`, `country`, `pincode`
  - `phone`, `email`
  - `tax_number`, `currency`
  - `plan` (`STARTER`, `PRO`, `ENTERPRISE`)
  - `qr_design` (JSON: style, color, logo, template)
  - `settings` (JSON: opening hours, service charge, tipping, languages, notifications)
  - `subscription_expires_at`
  - `is_active`
  - timestamps

#### Menu

- **MenuCategory**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `name`
    - `description`
    - `sort_order`
    - `is_active`
    - `translations` (JSON per locale)
    - timestamps

- **MenuItem**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `category_id`
    - `name`
    - `description`
    - `base_price`
    - `dietary_tags` (e.g. `VEG`, `NON_VEG`, `VEGAN`, `JAIN`)
    - `is_available`
    - `is_recommended`
    - `image_url`
    - `sort_order`
    - `translations`
    - timestamps

- **Variant**
  - Attributes:
    - `id`
    - `menu_item_id`
    - `name`
    - `price`
    - `is_default`
    - `is_available`
    - `sort_order`

- **ModifierGroup**
  - Attributes:
    - `id`
    - `menu_item_id`
    - `name`
    - `description`
    - `min_selections`
    - `max_selections`
    - `is_required`
    - `sort_order`

- **Modifier**
  - Attributes:
    - `id`
    - `modifier_group_id`
    - `name`
    - `price`
    - `is_default`
    - `sort_order`

- **Relationships**
  - `Restaurant` 1–N `MenuCategory`.
  - `MenuCategory` 1–N `MenuItem`.
  - `MenuItem` 1–N `Variant`.
  - `MenuItem` 1–N `ModifierGroup` 1–N `Modifier`.

#### Tables and Floor Map

- **Table**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `table_number`
    - `label`
    - `capacity`
    - `floor_section`
    - `status` (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `BLOCKED`)
    - `qr_slug` (links table to QR)
    - `assigned_waiter_id` (FK → `Staff`)
    - timestamps

- **Relationship**
  - `Restaurant` 1–N `Table`.

#### Orders and Order Items

- **Order**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `table_id` (nullable)
    - `order_number`
    - `order_type` (`DINE_IN`, `TAKEAWAY`, `DELIVERY`)
    - `status` (`PENDING`, `PREPARING`, `READY`, `SERVED`, `CANCELLED`)
    - `payment_status` (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`)
    - `guest_name`
    - `guest_phone`
    - `subtotal_amount`
    - `tax_amount`
    - `service_charge_amount`
    - `discount_amount`
    - `total_amount`
    - `paid_amount`
    - `notes`
    - `placed_by_staff_id`
    - `is_closed`
    - `closed_at`
    - timestamps

- **OrderItem**
  - Attributes:
    - `id`
    - `order_id`
    - `menu_item_id`
    - `item_name_snapshot`
    - `quantity`
    - `unit_price`
    - `total_price`
    - `status` (`PENDING`, `PREPARING`, `READY`, `SERVED`, `CANCELLED`)
    - `notes`
    - `kot_number`
    - `variant_snapshot` (JSON)
    - `modifiers_snapshot` (JSON)

- **Relationships**
  - `Restaurant` 1–N `Order`.
  - `Order` 1–N `OrderItem`.
  - `Order` (optional) 1–1 `Table`.

#### Queue

- **QueueEntry**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `guest_name`
    - `phone`
    - `party_size`
    - `status` (`WAITING`, `CALLED`, `SEATED`, `CANCELLED`)
    - `position`
    - `quoted_wait_minutes`
    - `actual_wait_minutes`
    - `table_id` (nullable)
    - `created_at`, `called_at`, `seated_at`, `cancelled_at`

- **Relationships**
  - `Restaurant` 1–N `QueueEntry`.
  - Queue entry may link to a `Table` when seated.

#### Transactions and Analytics

- **Transaction**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `order_id`
    - `amount`
    - `payment_method` (`CASH`, `CARD`, `UPI`, etc.)
    - `reference_id` (payment gateway ref)
    - `status` (`SUCCESS`, `FAILED`, `PENDING`)
    - `paid_at`
    - timestamps

- **Analytics Aggregates** (denormalized views / computed data)
  - Daily revenue, order counts, average order value.
  - Top dishes, top categories.
  - Traffic volume and peak hours.
  - QR scan activity (per QR / per day).

#### Inventory

- **InventoryItem**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `name`
    - `category`
    - `unit`
    - `stock_quantity`
    - `reorder_level`
    - `is_active`
    - timestamps

#### QR and Logos

- **QRCode**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `table_id` (optional)
    - `type` (`MENU`, `QUEUE`, `COMBINED`)
    - `slug`
    - `url`
    - `scan_count`
    - `last_scanned_at`
    - timestamps

- **Logo**
  - Attributes:
    - `id`
    - `restaurant_id`
    - `type` (`PREDEFINED`, `CUSTOM`)
    - `key` (storage key)
    - `url`
    - timestamps

---

## Key Feature Designs

### 1. Authentication and Authorization

- **Login**
  - Owner/admin:
    - Email/password based authentication (Passport local strategy).
  - Staff:
    - Restaurant code + passcode (PIN) based login.
- **Tokens and Sessions**
  - On success:
    - Backend issues short-lived access token and long-lived refresh token.
    - Web:
      - Refresh token stored as HttpOnly cookie.
      - Access token attached via cookie or `Authorization` header.
    - Native:
      - Access token stored in Capacitor `Preferences`.
      - Refresh token stored in secure storage (via `secureStorage`).
- **Frontend**
  - `AuthContext`:
    - Bootstraps from local storage.
    - Fetches `/api/auth/me` to verify validity.
    - Exposes `login`, `logout`, and `setRestaurantId`.
  - `ProtectedRoute` and `SubscriptionGuard`:
    - Enforce route-level access based on:
      - Authentication status.
      - Role (owner/admin/staff).
      - Subscription plan / expiry.

- **Authorization**
  - Backend enforces RBAC:
    - Owner/admin:
      - Full access to restaurant configuration, staff, menu, QR, analytics, inventory, subscription.
    - Staff:
      - Limited to operational flows (KDS, waiter, queue, order and table interactions).
    - Guests:
      - Only public endpoints (menu, public queue).

### 2. Menu Management and AI Extraction

- **Manual CRUD**
  - Admin uses `MenuPage` to:
    - Create and reorder categories.
    - Create, update, delete menu items.
    - Configure variants and modifiers.
    - Toggle availability, recommendation flags, dietary tags.

- **AI Extraction Flow**
  - Upload:
    - `MenuCardUploader` requests a presigned upload URL via `/api/menu/:restaurantId/menu-card/upload-url`.
    - File is uploaded directly to storage.
  - Extraction:
    - Client calls `/api/menu/:restaurantId/menu-card/extract` with file key.
    - Backend runs OCR/LLM pipeline to extract categories and items.
    - Response is a structured menu proposal.
  - Review:
    - `ExtractionPreview` renders extracted structure.
    - User can edit names, prices, categories, dietary tags, etc.
  - Confirmation:
    - On confirm, client POSTs final structure to `/api/menu/:restaurantId/menu-card/confirm`.
    - Backend:
      - Validates structure.
      - Inserts/updates `MenuCategory` and `MenuItem` rows.

### 3. Orders, POS and Billing

- **POS UI**
  - Desktop POS and mobile POS share core logic:
    - Menu browsing, search, and filters.
    - Cart with variants and modifiers.
    - Bill breakdown (subtotal, tax, service, discount, total).
    - Payment selection and confirmation.

- **Order Lifecycle**
  1. **Create order**
     - For dine-in:
       - Attach to a `Table` (selected from floor map).
     - For take-away/delivery:
       - Guest name/phone captured instead of table.
     - `POST /api/restaurants/:restaurantId/orders`.
  2. **Add items**
     - `POST /api/orders/:orderId/items` for each batch of items.
     - Snapshot variant/modifier configurations and prices.
  3. **Kitchen workflow**
     - KDS screen subscribes to WebSocket events (`order.created`, `order.updated`).
     - Kitchen staff mark items or orders as `PREPARING`, `READY`.
     - Updates via `PATCH /api/orders/:id/status` or item-level endpoints.
  4. **Serving / closing**
     - Waiters mark items `SERVED`.
     - Order transitions toward `SERVED` then `CLOSED` when payment is done.
  5. **Payment**
     - POS uses `useRazorpay`:
       - Initiates payment intent with backend.
       - Backend interacts with Razorpay and returns an order/payment id.
       - After successful payment, backend records `Transaction` and updates `Order.payment_status` and `paid_amount`.
  6. **Bill and receipts**
     - `bill-data`, `receipt-text`, `whatsapp-bill`:
       - Format totals and line items for:
         - Thermal receipt printing.
         - WhatsApp message with bill details.
         - On-screen bill preview.

### 4. Queue Management

- **Public Flow**
  - Guest scans queue QR (`/q/:slug` → restaurant ID).
  - `QueueRegistrationPage`:
    - Calls `/api/queue/register/:restaurantId` with name, phone, party size.
    - Polls `/api/queue/status/:restaurantId?phone=...` for position.
  - Guest sees:
    - Position in queue.
    - Estimated wait time.
    - Status updates (`WAITING`, `CALLED`, `SEATED`, `CANCELLED`).

- **Internal Flow**
  - Host/FOH sees queue in `QueuePage` and waiter terminal:
    - `useQueue`, `useQueueActive`, `useQueueStats`.
  - Actions:
    - Call next guest: `/api/restaurants/:restaurantId/queue/:id/call`.
    - Seat: `/api/restaurants/:restaurantId/queue/:id/seat`.
    - Cancel: `/api/restaurants/:restaurantId/queue/:id/cancel`.
  - Seating may:
    - Assign a `Table`.
    - Optionally create/open an `Order`.

- **Real-time**
  - WebSocket events:
    - `queue.updated` triggers invalidation of queue query keys.
  - Waiter and dashboard screens see up-to-date queues without heavy polling.

### 5. Kitchen Display (KDS)

- **Design**
  - Full-screen single-page view optimized for large screens and quick scanning.
  - Displays:
    - Active orders grouped by status or prep time.
    - Items per order with counts and notes.
  - Interaction:
    - Toggle item/order statuses (local and/or via API).
    - Use color coding for statuses and deadlines.

- **Data**
  - Hooks call endpoints like `GET /api/restaurants/:restaurantId/orders/active`.
  - WebSocket events keep data fresh.

### 6. Waiter Terminal

- **Layout**
  - Combined:
    - Floor map (table statuses and assigned waiters).
    - Queue sidebar.
    - Order list.
    - POS (inline on desktop / overlay on mobile).

- **Capabilities**
  - View and update table statuses.
  - Assign themselves to tables.
  - Open or add to orders per table.
  - Seat guests from queue into tables.
  - Send orders to kitchen and manage course flow.

- **Data**
  - Uses `useTables`, `useOrders`, `useQueue`, and other hooks.
  - WebSocket keeps all aspects synchronized across waiter devices and KDS.

### 7. Staff Management

- **Owner/Admin View**
  - `StaffManagementPage` provides:
    - List of all staff with roles and contact info.
    - Add / edit / delete staff.
    - Reset passcodes/PINs.
  - Backend endpoints:
    - `GET/POST/PATCH/DELETE /api/restaurants/:restaurantId/staff`.

- **Constraints**
  - Only owners/admins (and possibly restaurant-level admins) can manage staff.
  - Validations include:
    - Role restrictions (e.g. at least one admin).
    - Unique phone or passcode constraints per restaurant.

### 8. Inventory

- **Capabilities**
  - Track materials and stock levels.
  - View items nearing or below reorder thresholds.
  - Update quantities after deliveries and consumption.

- **Data**
  - `InventoryItem` entities keyed by restaurant.
  - Exposed via `/api/restaurants/:restaurantId/inventory`.

### 9. Analytics and Dashboards

- **Dashboard**
  - `DashboardPage` aggregates:
    - Revenue KPIs.
    - Orders in different states.
    - Table usage.
    - Queue stats.
    - Recent orders.
    - Scan activity for QR.
  - Data from:
    - `GET /api/dashboard/:restaurantId/summary`
    - `GET /api/dashboard/:restaurantId/tables`
    - `GET /api/dashboard/:restaurantId/orders`
    - `GET /api/dashboard/:restaurantId/queue`
    - `GET /api/dashboard/:restaurantId/scan-activity`

- **Analytics**
  - `AnalyticsPage` provides deeper insights:
    - Revenue over time.
    - Category and item-level popularity.
    - Peak hours and traffic volume.
  - Data from:
    - `GET /api/analytics/:restaurantId/summary`
    - `GET /api/analytics/:restaurantId/overview`

- **Transactions**
  - `TransactionsPage`:
    - Shows individual bill-level records.
    - Filters by date, payment method, etc.
    - Exports via `/transactions/export`.

---

## Cross-Cutting Concerns

### Validation

- **Server-side**
  - `drizzle-zod` likely used to derive Zod schemas from DB models.
  - Applied at API boundaries for:
    - Request body validation.
    - Query parameter validation.
    - Payload shaping for responses.

- **Client-side**
  - Light validation in forms (required fields, email formats).
  - Relies on server messages for deeper validation (e.g. uniqueness, complex constraints).

### Error Handling

- **Frontend**
  - `ErrorBoundary` catches render errors and shows fallback UI.
  - `ApiError` standardizes HTTP error response parsing.
  - React Query `onError` handlers show toast notifications.
  - Specific cases (e.g., auth expiry) trigger:
    - Global logout.
    - Friendly error messages.

- **Backend**
  - Central error middleware in Express:
    - Logs server errors.
    - Returns JSON with `status`, `message`, and optionally `errors`.

### Real-Time Updates

- **Events**
  - Orders: `order.created`, `order.updated`, `order.status_changed`.
  - Tables: `table.updated`.
  - Queue: `queue.updated`.
  - Menu: `menu.updated` / `menu.item_updated`.

- **Client Handling**
  - `useRestaurantWebSocket`:
    - Opens socket.
    - Maps event types to query keys.
    - Calls `queryClient.invalidateQueries` for:
      - Orders (dashboard, KDS, POS).
      - Tables (floor map, waiter).
      - Queue (queue screens).
      - Menu (KDS and POS view if menu changed).
  - Guarantees near real-time UX with minimal polling.

### Configuration and Secrets

- **Frontend**
  - Only non-secret config is stored in `VITE_*` envs (e.g. API origin).
  - Sensitive data (tokens) are:
    - HttpOnly cookies for web.
    - SecureStorage/Preferences on native.

- **Backend**
  - Uses system environment variables or a secret manager for:
    - DB credentials.
    - JWT/cookie secrets.
    - Payment provider keys.
    - Storage provider credentials.

---

## Non-Functional Design

### Performance

- **Frontend**
  - Code splitting via lazy-loaded routes.
  - React Query caching and background refetch.
  - WebSockets to avoid constant polling.
  - Tailwind CSS for efficient styling.

- **Backend**
  - Postgres + drizzle with suitable indexes.
  - Paginated endpoints for heavy data (transactions, history).
  - Read models for analytics to avoid expensive queries on hot paths.

### Scalability

- Stateless Express workers with:

  - Central PostgreSQL instance (or cluster).
  - Shared session store (Postgres or Redis).
  - Shared pub/sub for WebSocket broadcasting (e.g. Redis).

- Multi-tenant:
  - All major entities carry `restaurant_id` and queries are scoped to it.
  - Potential for sharding by `restaurant_id` in future.

### Security

- **Transport**
  - HTTPS only in production.
  - WSS for WebSockets.

- **Auth**
  - HttpOnly cookies for refresh tokens on web.
  - Short-lived access tokens.
  - Proper invalidation on logout and token refresh failures.

- **RBAC**
  - Authorization checks on every backend route, based on:
    - User/global role.
    - Staff role.
    - Restaurant ownership.

- **Data Protection**
  - Least-privilege endpoints (no cross-restaurant access).
  - Input validation to prevent injection and misuse.

---

## Extension Points

The current design supports extension in multiple directions:

- **Loyalty and coupons**
  - New entities (e.g., `LoyaltyProgram`, `Coupon`) linked to `Restaurant` and `Order`.
  - Additional endpoints and UI widgets in POS and public flows.

- **Additional payment providers**
  - Abstract payment gateway integration in backend.
  - Add provider-specific implementations while reusing the `Transaction` schema.

- **Integrations**
  - Third-party delivery platforms.
  - Accounting systems (export of transactions).

- **Advanced analytics**
  - More detailed time series and predictive analytics.
  - Segment-based insights (e.g. per waiter, per section).

This concludes the system design overview for the current version of Orderzi (QR-Menu-Design).