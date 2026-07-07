import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AlarmProvider } from "@/contexts/AlarmContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Landing from "@/pages/landing";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-9 h-9 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spinner />;

  return (
    <Switch>
      <Route path="/" component={() =>
        user
          ? <AlarmProvider><ProtectedRoute component={Dashboard} /></AlarmProvider>
          : <Landing />
      } />
      <Route path="/login" component={() => user ? <Redirect to="/" /> : <Login />} />
      <Route path="/sign-in" component={() => user ? <Redirect to="/" /> : <Login />} />
      <Route path="/sign-up" component={() => user ? <Redirect to="/" /> : <Login />} />
      <Route path="/dashboard" component={() =>
        <AlarmProvider><ProtectedRoute component={Dashboard} /></AlarmProvider>
      } />
      <Route path="/orders" component={() =>
        <AlarmProvider><ProtectedRoute component={Orders} /></AlarmProvider>
      } />
      <Route path="/orders/:id" component={() =>
        <AlarmProvider><ProtectedRoute component={OrderDetail} /></AlarmProvider>
      } />
      <Route path="/settings" component={() =>
        <AlarmProvider><ProtectedRoute component={SettingsPage} /></AlarmProvider>
      } />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <WouterRouter base={basePath}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
