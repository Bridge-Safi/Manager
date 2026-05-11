import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { I18nProvider } from "./lib/i18n";
import { AuthProvider, useAuth } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import { registerServiceWorker } from "./lib/push";
import { playAlarm, unlockAudio } from "./lib/alarm";
import RoleSelection from "./pages/index";
import LivreurLogin from "./pages/livreur/login";
import LivreurDashboard from "./pages/livreur/index";
import LivreurLivraisons from "./pages/livreur/livraisons";
import LivreurLivraisonDetail from "./pages/livreur/livraison";
import LivreurProfil from "./pages/livreur/profil";
import ChauffeurLogin from "./pages/chauffeur/login";
import ChauffeurDashboard from "./pages/chauffeur/index";
import ChauffeurTrajets from "./pages/chauffeur/trajets";
import ChauffeurTrajetDetail from "./pages/chauffeur/trajet";
import ChauffeurProfil from "./pages/chauffeur/profil";
import SuiviPage from "./pages/suivi";
import CommandePage from "./pages/commande";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function LivreurGuard({ component: Component }: { component: React.ComponentType }) {
  const { livreur } = useAuth();
  if (!livreur) return <Redirect to="/livreur/login" />;
  return <Component />;
}

function ChauffeurGuard({ component: Component }: { component: React.ComponentType }) {
  const { chauffeur } = useAuth();
  if (!chauffeur) return <Redirect to="/chauffeur/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleSelection} />
      <Route path="/livreur/login" component={LivreurLogin} />
      <Route path="/livreur">{() => <LivreurGuard component={LivreurDashboard} />}</Route>
      <Route path="/livreur/livraisons">{() => <LivreurGuard component={LivreurLivraisons} />}</Route>
      <Route path="/livreur/livraison/:id">{() => <LivreurGuard component={LivreurLivraisonDetail} />}</Route>
      <Route path="/livreur/profil">{() => <LivreurGuard component={LivreurProfil} />}</Route>
      <Route path="/chauffeur/login" component={ChauffeurLogin} />
      <Route path="/chauffeur">{() => <ChauffeurGuard component={ChauffeurDashboard} />}</Route>
      <Route path="/chauffeur/trajets">{() => <ChauffeurGuard component={ChauffeurTrajets} />}</Route>
      <Route path="/chauffeur/trajet/:id">{() => <ChauffeurGuard component={ChauffeurTrajetDetail} />}</Route>
      <Route path="/chauffeur/profil">{() => <ChauffeurGuard component={ChauffeurProfil} />}</Route>
      <Route path="/commande" component={CommandePage} />
      <Route path="/suivi/:trackingNumber" component={SuiviPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AlarmListener() {
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "BRIDGE_ALARM") {
        playAlarm(event.data.urgent === true);
      }
      if (event.data?.type === "BRIDGE_NAVIGATE" && event.data.url) {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [navigate]);
  return null;
}

export default function App() {
  useEffect(() => {
    registerServiceWorker();
    const unlock = () => unlockAudio();
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("click", unlock, { once: true });
    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AlarmListener />
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
