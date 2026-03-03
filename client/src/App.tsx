import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { PrinterProvider } from "@/context/PrinterContext";
import { LanguageProvider } from "@/context/LanguageContext";
import NotFound from "@/pages/not-found";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import MenuPage from "@/pages/dashboard/MenuPage";
import QRCodesPage from "@/pages/dashboard/QRCodesPage";
import AnalyticsPage from "@/pages/dashboard/AnalyticsPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import InventoryPage from "@/pages/dashboard/InventoryPage";
import FloorMapPage from "@/pages/dashboard/FloorMapPage";
import QueuePage from "@/pages/dashboard/QueuePage";
import LiveOrdersPage from "@/pages/dashboard/LiveOrdersPage";
import CancelledOrdersPage from "@/pages/dashboard/CancelledOrdersPage";
import TransactionsPage from "@/pages/dashboard/TransactionsPage";
import KitchenKDSPage from "@/pages/dashboard/KitchenKDSPage";
import WaiterTerminalPage from "@/pages/dashboard/WaiterTerminalPage";
import StaffManagementPage from "@/pages/dashboard/StaffManagementPage";
import PublicMenuPage from "@/pages/public/PublicMenuPage";
import QueueRegistrationPage from "@/pages/public/QueueRegistrationPage";
import SubscriptionExpiredPage from "@/pages/admin/SubscriptionExpiredPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthGate } from "@/components/AuthGate";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={LoginPage} />
      <Route path="/signup" component={OnboardingPage} />
      <Route path="/onboarding" component={OnboardingPage} />

      {/* Auto route to role-specific area */}
      <Route path="/app">
        {() => <AuthGate />}
      </Route>

      {/* Staff Direct Access Routes - Protected */}
      <Route path="/kitchen">
        {() => (
          <ProtectedRoute requiredRole={["KITCHEN", "owner", "admin"]}>
            <KitchenKDSPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/waiter">
        {() => (
          <ProtectedRoute requiredRole={["WAITER", "owner", "admin"]}>
            <WaiterTerminalPage />
          </ProtectedRoute>
        )}
      </Route>

      {/* Dashboard Routes (Protected) */}
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <DashboardPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/orders">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <LiveOrdersPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/orders/cancelled">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <CancelledOrdersPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/floor-map">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <FloorMapPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/queue">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <QueuePage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/transactions">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <TransactionsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/staff">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <StaffManagementPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/menu">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <MenuPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/inventory">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <InventoryPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/qr">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <QRCodesPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/analytics">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <AnalyticsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/settings">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]}>
            <SettingsPage />
          </ProtectedRoute>
        )}
      </Route>

      {/* Public Routes */}
      <Route path="/r/:slug" component={PublicMenuPage} />
      <Route path="/q/:slug" component={QueueRegistrationPage} />

      <Route path="/admin/subscription-expired">
        {() => (
          <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]} requireSubscription={false}>
            <SubscriptionExpiredPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <PrinterProvider width={32}>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </PrinterProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
