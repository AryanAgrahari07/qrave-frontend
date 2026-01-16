
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
import KitchenPage from "@/pages/dashboard/KitchenPage";
import PublicMenuPage from "@/pages/public/PublicMenuPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={LoginPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/dashboard/orders" component={LiveOrdersPage} />
      <Route path="/dashboard/kitchen" component={KitchenPage} />
      <Route path="/dashboard/menu" component={MenuPage} />
      <Route path="/dashboard/qr" component={QRCodesPage} />
      <Route path="/dashboard/analytics" component={AnalyticsPage} />
      <Route path="/dashboard/settings" component={SettingsPage} />
      
      {/* Public Routes */}
      <Route path="/r/:slug" component={PublicMenuPage} />
      
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
