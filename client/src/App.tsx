import React, { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { PrinterProvider } from "@/context/PrinterContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthGate } from "@/components/AuthGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PlanGate } from "@/components/PlanGate";

// A wrapper around `lazy` that auto-refreshes if a chunk fails to load due to deployment updates.
const lazyImport = (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
  return lazy(async () => {
    try {
      const component = await importFunc();
      window.sessionStorage.removeItem('chunk_failed_reload');
      return component;
    } catch (error: any) {
      if (error?.message?.includes('Failed to fetch dynamically imported module')) {
        const hasReloaded = window.sessionStorage.getItem('chunk_failed_reload');
        if (!hasReloaded) {
          window.sessionStorage.setItem('chunk_failed_reload', 'true');
          window.location.reload();
          // Return a never-resolving promise to prevent React from showing an error while reloading.
          return new Promise<{ default: React.ComponentType<any> }>(() => {});
        }
      }
      throw error;
    }
  });
};

const LandingPage = lazyImport(() => import("@/pages/LandingPage"));
const LoginPage = lazyImport(() => import("@/pages/auth/LoginPage"));
const OnboardingPage = lazyImport(() => import("@/pages/onboarding/OnboardingPage"));
const DashboardPage = lazyImport(() => import("@/pages/dashboard/DashboardPage"));
const MenuPage = lazyImport(() => import("@/pages/dashboard/MenuPage"));
const QRCodesPage = lazyImport(() => import("@/pages/dashboard/QRCodesPage"));
const AnalyticsPage = lazyImport(() => import("@/pages/dashboard/AnalyticsPage"));
const SettingsPage = lazyImport(() => import("@/pages/dashboard/SettingsPage"));
const InventoryPage = lazyImport(() => import("@/pages/dashboard/InventoryPage"));
const FloorMapPage = lazyImport(() => import("@/pages/dashboard/FloorMapPage"));
const QueuePage = lazyImport(() => import("@/pages/dashboard/QueuePage"));
const LiveOrdersPage = lazyImport(() => import("@/pages/dashboard/LiveOrdersPage"));
const CancelledOrdersPage = lazyImport(() => import("@/pages/dashboard/CancelledOrdersPage"));
const TransactionsPage = lazyImport(() => import("@/pages/dashboard/TransactionsPage"));
const KitchenKDSPage = lazyImport(() => import("@/pages/dashboard/KitchenKDSPage"));
const WaiterTerminalPage = lazyImport(() => import("@/pages/dashboard/WaiterTerminalPage"));
const StaffManagementPage = lazyImport(() => import("@/pages/dashboard/StaffManagementPage"));
const PublicMenuPage = lazyImport(() => import("@/pages/public/PublicMenuPage"));
const QueueRegistrationPage = lazyImport(() => import("@/pages/public/QueueRegistrationPage"));
const SubscriptionExpiredPage = lazyImport(() => import("@/pages/admin/SubscriptionExpiredPage"));
const StaffSubscriptionExpiredPage = lazyImport(() => import("@/pages/public/StaffSubscriptionExpiredPage"));
const PrivacyPolicyPage = lazyImport(() => import("@/pages/public/PrivacyPolicyPage"));
const TermsOfServicePage = lazyImport(() => import("@/pages/public/TermsOfServicePage"));

// Global loading fallback
function PageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
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
              <PlanGate feature="kitchen">
                <KitchenKDSPage />
              </PlanGate>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/waiter">
          {() => (
            <ProtectedRoute requiredRole={["WAITER", "owner", "admin"]}>
              <PlanGate feature="waiter">
                <WaiterTerminalPage />
              </PlanGate>
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
              <PlanGate feature="inventory">
                <InventoryPage />
              </PlanGate>
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
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/terms-of-service" component={TermsOfServicePage} />

        <Route path="/admin/subscription-expired">
          {() => (
            <ProtectedRoute requiredRole={["owner", "admin", "ADMIN"]} requireSubscription={false}>
              <SubscriptionExpiredPage />
            </ProtectedRoute>
          )}
        </Route>

        <Route path="/staff/subscription-expired">
          {() => (
            <ProtectedRoute requiredRole={["WAITER", "KITCHEN"]} requireSubscription={false}>
              <StaffSubscriptionExpiredPage />
            </ProtectedRoute>
          )}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <PrinterProvider width={32}>
                  <TooltipProvider>
                    <OfflineBanner />
                    <Toaster />
                    <SonnerToaster position="top-center" richColors />
                    <Router />
                  </TooltipProvider>
                </PrinterProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
