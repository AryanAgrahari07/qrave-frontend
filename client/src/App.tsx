
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import LiveOrdersPage from "@/pages/dashboard/LiveOrdersPage";
import KitchenKDSPage from "@/pages/dashboard/KitchenKDSPage";
import WaiterTerminalPage from "@/pages/dashboard/WaiterTerminalPage";
import StaffManagementPage from "@/pages/dashboard/StaffManagementPage";
import PublicMenuPage from "@/pages/public/PublicMenuPage";
import QueueRegistrationPage from "@/pages/public/QueueRegistrationPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={LoginPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      
      {/* Staff Direct Access Routes */}
      <Route path="/kitchen" component={KitchenKDSPage} />
      <Route path="/waiter" component={WaiterTerminalPage} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/dashboard/orders" component={LiveOrdersPage} />
      <Route path="/dashboard/kitchen" component={KitchenKDSPage} />
      <Route path="/dashboard/waiter" component={WaiterTerminalPage} />
      <Route path="/dashboard/staff" component={StaffManagementPage} />
      <Route path="/dashboard/menu" component={MenuPage} />
      <Route path="/dashboard/qr" component={QRCodesPage} />
      <Route path="/dashboard/analytics" component={AnalyticsPage} />
      <Route path="/dashboard/settings" component={SettingsPage} />
      
      {/* Public Routes */}
      <Route path="/r/:slug" component={PublicMenuPage} />
      <Route path="/q/:slug" component={QueueRegistrationPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
