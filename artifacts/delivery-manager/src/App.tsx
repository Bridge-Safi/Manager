import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import OrdersPage from "@/pages/orders";
import DriversPage from "@/pages/drivers";
import AnalyticsPage from "@/pages/analytics";
import SurveillancePage from "@/pages/surveillance";
import RestaurantsPage from "@/pages/restaurants";
import SafiRunnerPage from "@/pages/safi-runner";
import ClientsPage from "@/pages/clients";
import AnnouncementsPage from "@/pages/announcements";
import { PasscodeGate } from "@/components/PasscodeGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RealtimeSync() {
  useRealtimeSync();
  useOrderNotifications();
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/drivers" component={DriversPage} />
      <Route path="/surveillance" component={SurveillancePage} />
      <Route path="/restaurants" component={RestaurantsPage} />
      <Route path="/safi-runner" component={SafiRunnerPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/announcements" component={AnnouncementsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PasscodeGate>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <RealtimeSync />
            <Router />
          </WouterRouter>
        </PasscodeGate>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
