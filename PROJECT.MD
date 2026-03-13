High-level note
The backend source code (Express + drizzle + Postgres) is not inside this repo; only the React/Capacitor frontend is. I’ll base the full architecture and system design on the concrete frontend code plus the strongly implied backend behavior / schemas from types and API usage.
Below is an end‑to‑end, long‑form documentation you can drop into a ARCHITECTURE.md or SYSTEM_DESIGN.md.
1. System overview
Orderzi / QR-Menu-Design is a multi-tenant restaurant management platform with:
Public guests: scan QR → see menu, place orders (if enabled), join queue, see queue status.
Restaurant staff: kitchen display (KDS), waiter terminal, staff login.
Owners/admins: rich dashboard (analytics, menu builder, floor map, staff, inventory, QR, settings, logos, subscription).
The system is split into:
Frontend: React 19 + Vite SPA (web + Capacitor PWA/native shell).
Backend (external): Node.js + Express + drizzle ORM + Postgres + WebSockets ws (inferred from dependencies).
Client‑side real time: WebSocket subscription per restaurant, invalidating React Query caches on events.
Storage:
Postgres for core data (restaurants, users, staff, menu, orders, queue, etc.).
Object storage (e.g., S3) for menu card images and logos, via presigned upload URLs.
Auth: Access token + refresh token; HttpOnly cookies in web; secure storage on native.
2. Project architecture and layout
2.1 Root / tooling
package.json
Frontend: react, react-dom, vite, @tanstack/react-query, wouter, tailwindcss, Radix UI, motion libs.
Backend‑type deps (not used locally): express, express-session, drizzle-orm, drizzle-kit, pg, passport, passport-local, ws, connect-pg-simple, memorystore. These indicate the technology stack of the external backend.
vite.config.ts
Sets root to client.
Aliases:
@ → client/src
@assets → attached_assets
Build:
Outputs to dist/public.
Dev proxy:
/api → VITE_API_URL (or http://localhost:3001) to avoid CORS in dev.
PWA, Replit, Tailwind plugins.
capacitor.config.ts
Capacitor configuration for packaging the SPA as an Android/iOS app, sharing the same codebase.
client/.env
NODE_ENV=production
VITE_API_URL=https://orderzi.com
→ All API traffic and WebSockets go to an external backend.
2.2 Frontend structure (client/src)
Entry / root composition
App.tsx – central router and provider tree.
main.tsx – standard React root bootstrap (not listed but implied).
Routing / pages (client/src/pages/**)
auth/LoginPage.tsx
onboarding/OnboardingPage.tsx
LandingPage.tsx
Dashboard:
dashboard/DashboardPage.tsx
dashboard/MenuPage.tsx
dashboard/LiveOrdersPage.tsx
dashboard/TransactionsPage.tsx
dashboard/AnalyticsPage.tsx
dashboard/SettingsPage.tsx
dashboard/InventoryPage.tsx
dashboard/FloorMapPage.tsx
dashboard/QueuePage.tsx
dashboard/KitchenPage.tsx
dashboard/KitchenKDSPage.tsx
dashboard/WaiterTerminalPage.tsx
dashboard/StaffManagementPage.tsx
dashboard/QRCodesPage.tsx
dashboard/CancelledOrdersPage.tsx
Public:
public/PublicMenuPage.tsx
public/QueueRegistrationPage.tsx
public/StaffSubscriptionExpiredPage.tsx
Admin subscription:
admin/SubscriptionExpiredPage.tsx
Misc:
not-found.tsx
Components
components/layout/DashboardLayout.tsx, MarketingLayout.tsx.
components/ui/* – shared UI primitives (Radix + Tailwind).
POS:
components/pos/desktoppos.tsx
components/pos/mobilepos.tsx
Menu customization & AI extraction:
components/menu/MenuCardUploader.tsx
components/menu/ExtractionPreview.tsx
components/menu/MenuItemCustomization.tsx
components/menu/Itemcustomizationdialog.tsx
components/menu/ItemcustomizationContent.tsx
Logos:
components/logo/logo-selector.tsx
Guards & helpers:
components/ProtectedRoute.tsx
components/AuthGate.tsx
components/SubscriptionGuard.tsx
components/ErrorBoundary.tsx
components/OfflineBanner.tsx
components/LanguageSelector.tsx
Context / providers
context/AuthContext.tsx
context/SubscriptionContext.tsx
context/PrinterContext.tsx
context/LanguageContext.tsx
Networking & data
lib/api.ts – low‑level HTTP + auth + retry client.
hooks/api.ts – high-level, domain‑specific React Query hooks organized by feature.
lib/queryClient.ts – QueryClient instance and config.
hooks/useRestaurantWebSocket.ts – real-time channel per restaurant.
hooks/useThermalPrinter.ts
hooks/useRazorpay.ts
hooks/use-toast.ts
hooks/use-mobile.tsx
Domain types
types/index.ts – main domain entities (Restaurant, Menu, Orders, Queue, Analytics, etc.).
types/pos.ts – POS/cart representations.
Utilities
lib/utils.ts – generic helpers (classNames, formatting, etc.).
lib/bill-data.ts, lib/receipt-text.ts, lib/whatsapp-bill.ts, lib/thermal-printer-utils.ts, lib/kot-data.ts – billing and printing helpers.
lib/preferences.ts – Capacitor Preferences wrapper.
lib/secureStorage.ts – secure storage for sensitive native values.
Localization
locales/en.json, hi.json, es.json.
Wire-up via LanguageContext and UI toggles.
3. Runtime architecture and request flow
3.1 Frontend behavior
App composition (App.tsx):
Provider tree (simplified):
ErrorBoundary
QueryClientProvider (React Query)
LanguageProvider
AuthProvider
SubscriptionProvider
PrinterProvider
TooltipProvider
Router (Wouter)
OfflineBanner, toaster, route tree…
Routing:
Public routes:
/ – LandingPage
/auth – LoginPage
/onboarding – OnboardingPage
/r/:slug – PublicMenuPage
/q/:slug – QueueRegistrationPage
Protected routes (ProtectedRoute):
/dashboard + sub‑routes – require authenticated owner/admin (and valid subscription for most).
/kitchen – Kitchen terminal.
/waiter – Waiter terminal.
/admin/subscription-expired, /staff/subscription-expired – specialized expiration screens.
Server state:
All server interactions go through React Query hooks in hooks/api.ts, which in turn use lib/api.ts’s api client.
WS events call queryClient.invalidateQueries to keep data fresh.
3.2 HTTP client and auth flow (lib/api.ts)
Base URL resolution:
Uses import.meta.env.VITE_API_URL if present, else falls back to window.location.origin.
In Capacitor native environment, special handling for URL building and ports.
Token handling:
Access token:
On native:
Stored in Capacitor Preferences as a string key, e.g., orderzi_token.
On web:
Typically attached by backend via cookies; but if using Bearer, Authorization: Bearer <token> header is attached.
Refresh token:
On web:
Stored in HttpOnly cookie by backend; not directly accessible to JS, but attach via credentials: "include".
On native:
Stored via secureStorage under orderzi_refresh_token; used in /api/auth/refresh calls.
Request lifecycle:
api.request builds URL and fetch options with:
credentials: "include" (so cookies and refresh cookie travel).
Appropriate headers, Content-Type: application/json for JSON requests.
On 401 Unauthorized:
Tries to refresh via /api/auth/refresh (body includes refresh token if on native).
If refresh success:
Updates stored access token.
Replays original request.
If refresh fails:
Throws ApiError(401, …) and triggers logout in AuthContext.
For 5xx / transient network errors:
Implements limited exponential backoff with retries (configurable).
Errors:
Parsed JSON body becomes ApiError with status, message, details.
React Query hooks can surface these via toasts.
3.3 Auth context and route protection (AuthContext.tsx, ProtectedRoute.tsx)
AuthContext responsibilities:
Holds:
user: authenticated User or null.
restaurantId: currently active restaurant ID.
token: access token (used mostly on native).
Loading/error states.
Bootstrapping:
Reads cached user and restaurantId from Preferences.
Tries to validate session via /api/auth/me.
On success: sets user, restaurantId; obtains WS ticket for useRestaurantWebSocket.
On failure: clears any session state and notifies routes.
Login / logout:
login(email, password, type):
Calls /api/auth/login or /api/auth/staff/login.
Receives access + refresh tokens (cookie/native) and user.
Saves tokens and user to storage.
logout():
Calls /api/auth/logout.
Clears all auth data and optionally navigates to /auth.
ProtectedRoute:
Accepts props: requiredRole, requireSubscription, etc.
Reads from AuthContext and SubscriptionContext.
Redirects unauthenticated users to /auth.
For subscription-guarded areas (e.g., analytics, some dashboards) it wraps content with SubscriptionGuard → may redirect to subscription expired pages.
4. Backend architecture (inferred)
> Note: backend is inferred from deps + API usage. Actual implementation may differ slightly.
4.1 Stack and deployment
Technology:
Node.js
Express as HTTP server.
drizzle-orm as ORM.
PostgreSQL as database.
ws (or express-ws) as WebSocket layer.
passport + passport-local for local email/password + staff PIN auth.
express-session, connect-pg-simple or memorystore for sessions.
drizzle-zod indicates server-side schema validation.
Topology:
Single backend service exposing:
REST API under /api/*.
WebSocket server under /ws.
Multi-tenancy:
Most tables carry a restaurant_id foreign key.
Tenancy is enforced by:
Query filters based on authenticated user’s restaurantId.
Authorization checks (role + restaurant assignment).
4.2 API modules (from hooks/api.ts)
Organized roughly as:
Auth:
POST /api/auth/login
POST /api/auth/staff/login
GET /api/auth/me
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/ws-ticket – issues signed WebSocket ticket (JWT).
Restaurant:
GET /api/restaurants
GET /api/restaurants/:id
GET /api/restaurants/by-slug/:slug
POST /api/restaurants – onboarding new restaurant.
PATCH /api/restaurants/:id – settings and profile.
Menu:
Public:
GET /api/menu/public/:slug – full public menu data (MenuData).
Private/owner:
Categories:
GET /api/menu/:restaurantId/categories
POST /api/menu/:restaurantId/categories
PATCH /api/menu/:restaurantId/categories/:id
DELETE /api/menu/:restaurantId/categories/:id
Items:
GET /api/menu/:restaurantId/items
POST /api/menu/:restaurantId/items
PATCH /api/menu/:restaurantId/items/:id
DELETE /api/menu/:restaurantId/items/:id
Availability endpoints: e.g., /items/:id/availability.
Customizations:
GET/POST/PATCH/DELETE /api/menu/:id/variants
/modifier-groups, /modifiers endpoints.
Orders:
GET /api/restaurants/:restaurantId/orders
GET /api/restaurants/:restaurantId/orders/active
GET /api/restaurants/:restaurantId/orders/history
POST /api/restaurants/:restaurantId/orders
POST /api/orders/:orderId/items
PATCH /api/orders/:orderId/status
PATCH /api/orders/:orderId/pay
PATCH /api/orders/:orderId/close
POST /api/orders/:orderId/cancel (with reason).
GET /api/orders/:orderId – detailed order view.
Tables & Floor Map:
GET /api/restaurants/:restaurantId/tables
POST /api/restaurants/:restaurantId/tables
PATCH /api/restaurants/:restaurantId/tables/:id
DELETE /api/restaurants/:restaurantId/tables/:id
Status updates:
/tables/:id/status (occupied/available/reserved/blocked).
/tables/:id/assign-waiter.
Queue:
Private:
GET /api/restaurants/:restaurantId/queue
GET /api/restaurants/:restaurantId/queue/active
GET /api/restaurants/:restaurantId/queue/stats
POST /api/restaurants/:restaurantId/queue – host/FOH registration.
POST /api/restaurants/:restaurantId/queue/:id/call
POST /api/restaurants/:restaurantId/queue/:id/seat
POST /api/restaurants/:restaurantId/queue/:id/cancel
Public:
POST /api/queue/register/:restaurantId
GET /api/queue/status/:restaurantId?phone=… – guest status lookup.
Staff:
GET /api/restaurants/:restaurantId/staff
POST /api/restaurants/:restaurantId/staff
PATCH /api/restaurants/:restaurantId/staff/:id – role, passcode updates.
DELETE /api/restaurants/:restaurantId/staff/:id
Inventory:
GET /api/restaurants/:restaurantId/inventory
POST /api/restaurants/:restaurantId/inventory
PATCH /api/restaurants/:restaurantId/inventory/:id
DELETE /api/restaurants/:restaurantId/inventory/:id
Transactions & payments:
GET /api/restaurants/:restaurantId/transactions
GET /api/restaurants/:restaurantId/transactions/:id
GET /api/restaurants/:restaurantId/transactions/export – CSV/Excel.
Analytics & dashboard:
GET /api/analytics/:restaurantId/summary
GET /api/analytics/:restaurantId/overview
GET /api/dashboard/:restaurantId/summary
GET /api/dashboard/:restaurantId/tables
GET /api/dashboard/:restaurantId/orders
GET /api/dashboard/:restaurantId/queue
GET /api/dashboard/:restaurantId/scan-activity
QR codes:
GET /api/qr/:restaurantId
POST /api/qr/:restaurantId/generate
POST /api/qr/:restaurantId/generate/all
GET /api/qr/:restaurantId/stats
Logos & branding:
GET /api/logos/predefined
GET /api/logos/restaurant/:restaurantId
POST /api/logos/restaurant/:restaurantId/upload-url
PATCH /api/logos/restaurant/:restaurantId
DELETE /api/logos/restaurant/:restaurantId
Menu card upload & AI extraction:
POST /api/menu/:restaurantId/menu-card/upload-url – returns presigned URL for card upload.
POST /api/menu/:restaurantId/menu-card/extract – triggers AI extraction to structured menu.
POST /api/menu/:restaurantId/menu-card/confirm – confirm and write extracted items into DB.
Meta lookup:
GET /api/meta/countries
GET /api/meta/states?country=…
GET /api/meta/cities?state=…
GET /api/meta/currencies
4.3 WebSocket design (useRestaurantWebSocket.ts)
Frontend obtains WS ticket via GET /api/auth/ws-ticket.
Connects to wss://<API_HOST>/ws?token=<ticket>.
After connection:
Subscribes to a restaurant:<id> room.
Receives strongly typed events like:
order.created, order.updated, order.status_changed
table.updated
queue.updated
menu.updated
Event handler:
Maps event type to a set of React Query keys to invalidate, e.g.:
["orders", restaurantId, "active"]
["tables", restaurantId]
["queue", restaurantId, "active"]
Guarantees near real-time dashboards, without high polling.
5. Data model and schemas (inferred)
> These are conceptual schemas based on types/index.ts and API usage; actual drizzle schema names/columns may vary.
5.1 Core entities
User / Staff
User- id (UUID)- email- password_hash- name- global_role: 'owner' | 'admin' | 'platform_admin' | 'WAITER' | 'KITCHEN'- created_at- updated_at
Staff- id (UUID)- restaurant_id (FK -> Restaurant.id)- name- phone- role: 'ADMIN' | 'WAITER' | 'KITCHEN'- passcode (hashed PIN)- is_active (boolean)- created_at- updated_at
Relations:
A User (owner/admin) can own one or more Restaurants.
Each Restaurant has many Staff.
Restaurant
Restaurant- id (UUID)- owner_user_id (FK -> User.id)- name- slug (unique)- address_line_1- address_line_2- city- state- country- pincode- phone- email- tax_number- currency- plan: 'STARTER' | 'PRO' | 'ENTERPRISE'- qr_design (JSON)               -- colors, template, logo refs- settings (JSON)                -- languages, open hours, tipping, service charge policy, printing options- is_active (boolean)- subscription_expires_at (timestamp)- created_at- updated_at
Menu
MenuCategory- id (UUID)- restaurant_id (FK)- name- description- sort_order (int)- is_active (boolean)- translations (JSONB) ?: { [locale]: { name, description } }- created_at- updated_at
MenuItem- id (UUID)- restaurant_id (FK)- category_id (FK -> MenuCategory.id)- name- description- base_price (numeric)- dietary_tags (text[])          -- 'VEG', 'NON_VEG', 'VEGAN', 'JAIN', etc.- is_available (boolean)- is_recommended (boolean)- image_url- sort_order (int)- translations (JSONB)- created_at- updated_at
Variant- id (UUID)- menu_item_id (FK -> MenuItem.id)- name- price (numeric)- is_default (boolean)- is_available (boolean)- sort_order (int)
ModifierGroup- id (UUID)- menu_item_id (FK -> MenuItem.id)- name- description- min_selections (int)- max_selections (int)- is_required (boolean)- sort_order (int)
Modifier- id (UUID)- modifier_group_id (FK -> ModifierGroup.id)- name- price (numeric)- is_default (boolean)- sort_order (int)
Tables
Table- id (UUID)- restaurant_id (FK)- table_number (string)- label (string)- capacity (int)- floor_section (string)- status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BLOCKED'- qr_slug (string)                -- maps to /r/:slug or /q/:slug- assigned_waiter_id (FK -> Staff.id) NULL- created_at- updated_at
Orders
Order- id (UUID)- restaurant_id (FK)- table_id (FK -> Table.id) NULL- order_number (int)- order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'- status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED'- payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED'- guest_name- guest_phone- subtotal_amount (numeric)- tax_amount (numeric)- service_charge_amount (numeric)- discount_amount (numeric)- total_amount (numeric)- paid_amount (numeric)- notes- placed_by_staff_id (FK -> Staff.id) NULL- is_closed (boolean)- closed_at (timestamp)- created_at- updated_at
OrderItem- id (UUID)- order_id (FK -> Order.id)- menu_item_id (FK -> MenuItem.id)- item_name_snapshot (string)     -- name at time of order- quantity (int)- unit_price (numeric)- total_price (numeric)- status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED'- notes- kot_number (int)- variant_snapshot (JSONB)- modifiers_snapshot (JSONB)
Queue
QueueEntry- id (UUID)- restaurant_id (FK)- guest_name- phone- party_size (int)- status: 'WAITING' | 'CALLED' | 'SEATED' | 'CANCELLED'- position (int)- quoted_wait_minutes (int)- actual_wait_minutes (int)- created_at- called_at- seated_at- cancelled_at- table_id (FK -> Table.id) NULL
Transactions
Transaction- id (UUID)- restaurant_id (FK)- order_id (FK -> Order.id)- amount (numeric)- payment_method: 'CASH' | 'CARD' | 'UPI' | etc.- reference_id (string)    -- Razorpay or other gateway ref- status: 'SUCCESS' | 'FAILED' | 'PENDING'- paid_at (timestamp)- created_at
Inventory
InventoryItem- id (UUID)- restaurant_id (FK)- name- category- unit ('kg' | 'g' | 'l' | 'pcs' | etc.)- stock_quantity (numeric)- reorder_level (numeric)- is_active (boolean)- created_at- updated_at
QR & logos
QRCode- id (UUID)- restaurant_id (FK)- table_id (FK -> Table.id) NULL- type: 'MENU' | 'QUEUE' | 'COMBINED'- slug (string)                 -- used in /r/:slug or /q/:slug- url (string)- scan_count (int)- last_scanned_at (timestamp)- created_at
Logo- id (UUID)- restaurant_id (FK)- type: 'PREDEFINED' | 'CUSTOM'- key (string)                  -- S3 key or similar- url (string)- created_at- updated_at
6. Major feature designs
6.1 Authentication & authorization
Flows:
Owner/admin login via email/password.
Staff login via restaurant code + passcode (waiter/kitchen roles).
Mechanics:
Local strategy via Passport for email/password and staff PIN.
On success:
Set HttpOnly refresh cookie (web).
Return access token and User object.
Frontend:
Stores token + user in AuthContext.
Guards routes with ProtectedRoute.
Authorization model:
Global roles (User): owner, admin, platform_admin etc.
Staff roles: ADMIN, WAITER, KITCHEN.
Backend enforces:
Only owner/admin can manage staff, menu, floor map, subscription.
Kitchen/Waiter limited to orders, table status, queue, KDS/Waiter app.
6.2 Menu management & AI extraction
Owner uses MenuPage to:
CRUD categories and items.
Configure variants and modifier groups.
Mark items as available, recommended, dietary tags, etc.
Upload a menu card image/PDF and trigger extraction.
AI extraction pipeline (inferred):
MenuCardUploader obtains a presigned URL from /menu-card/upload-url.
Uploads the file directly to object storage.
Calls /menu-card/extract with the storage key.
Backend uses an OCR/LLM pipeline to produce structured JSON (ExtractedMenu).
ExtractionPreview lets the user adjust categories/items in the UI.
On confirm, the frontend calls /menu-card/confirm with the curated structure.
Backend writes them into MenuCategory and MenuItem tables.
6.3 Orders, POS & billing
POS UIs (DesktopPOS, MobilePOS):
Combine:
Table or guest info.
Menu browsing and search.
Cart with variant/modifier selection.
Payment and bill preview.
Order lifecycle:
Create order:
For dine‑in, select or create a Table.
For queue/host, can be attached to queue entry.
Frontend calls createOrder hook → POST /orders.
Add items:
For each cart line, call addOrderItems to attach OrderItems.
Kitchen:
KDS receives order.* events via WebSocket.
Staff updates item statuses (locally or via API depending on design).
Payment:
POS uses useRazorpay for payment:
Calls backend to create an order with Razorpay or similar.
Razorpay returns transaction result.
Backend records Transaction and updates Order.payment_status.
Close:
closeOrder marks as closed, finalizes amounts, maybe prints final bill.
whatsapp-bill and receipt-text generate textual/graphic output for printers or WhatsApp.
6.4 Queue management
Host/admin dashboard and waiter app show queue:
useQueue / useQueueActive / useQueueStats hooks.
Waiter/host can:
Call next guest.
Seat them (maps to a table, may create an order).
Cancel entries with reasons.
Public guests:
On scanning queue QR (/q/:slug):
QueueRegistrationPage uses usePublicRegisterQueue and usePublicQueueStatus to register and poll status.
After seating, they may receive table assignment.
6.5 Kitchen KDS
Single-page screen focusing on:
Active orders with prominent statuses, timers, item-level view.
Local-only toggles for “marked ready/served” (plus API if supported).
Real-time updates via WebSocket events invalidating useKitchenOrders queries.
6.6 Waiter terminal
WaiterTerminalPage:
Combines:
Floor map (tables with color-coded status).
Queue sidebar.
Active orders list.
POS overlay (mobile/desktop).
Uses useOrders, useTables, useQueue, etc.
Waiter actions:
Change table status and assign themselves.
Open POS for a specific table.
Add items to running orders.
Mark items served.
7. Cross‑cutting concerns
7.1 Validation
Backend:
Likely uses drizzle-zod to derive Zod schemas from DB models and validate requests.
Frontend:
Light validation in forms (email format, fields required).
Server-side validation errors are surfaced via ApiError and shown through useToast.
7.2 Error handling & resiliency
Frontend:
ErrorBoundary catches React render errors.
ApiError and React Query error boundaries show friendly messages and toasts.
API client includes limited automatic retries with backoff for transient failures.
WebSocket:
Auto-reconnect logic; re-subscribes to restaurant room after reconnect.
When socket unavailable, periodic refetch ensures eventual consistency.
7.3 Logging & monitoring
Frontend logs:
Important network failures, refresh token failures, WS reconnection attempts.
Backend:
Not visible in this repo; typical stack would include request logging (morgan), structured app logs; could integrate APM later.
7.4 Configuration & secrets
Frontend:
Uses VITE_* env vars; non-secrets only (backend URL).
Secrets (e.g., payment keys) live server-side.
Backend:
DB credentials, JWT secrets, cookie secrets, payment gateway keys in environment or secret manager.
8. Non‑functional aspects
8.1 Performance
Client:
Lazy-loaded routes to keep initial bundle small.
WebSockets minimize polling.
React Query caching & stale‑while‑revalidate behavior.
Backend:
Postgres + drizzle for efficient querying.
WebSockets for hot-path events; pagination for heavy endpoints (transactions, history).
8.2 Scalability
Horizontally scalable backend:
Stateless HTTP layer with session store in Postgres or Redis.
WebSockets can be scaled with a shared pub/sub (e.g., Redis) for broadcasting events between instances.
DB-level multi-tenancy via restaurant_id scoped queries.
8.3 Security
HttpOnly refresh cookies on web to mitigate XSS token theft.
Access token short TTL.
CORS controlled at backend; frontend uses a fixed API origin via VITE_API_URL.
Role-based access control for admin vs staff vs guest.
Input validation and sanitization via Zod/drizzle-zod.
File uploads via presigned URLs (no direct server disk writes).