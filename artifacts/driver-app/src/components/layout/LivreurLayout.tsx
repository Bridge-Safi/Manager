import { ReactNode, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Home, Package, User, LogOut, Camera, Wifi, WifiOff } from "lucide-react";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { DispatchAlert } from "@/components/DispatchAlert";
import { ManagerNotificationAlert } from "@/components/ManagerNotificationAlert";
import { useDispatchPoller } from "@/hooks/useDispatchPoller";
import { useGetDeliverer, getGetDelivererQueryKey, useUpdateDeliverer } from "@workspace/api-client-react";
import { useLocationReporter } from "@/hooks/useLocationReporter";
import { useOrderSSE } from "@/hooks/useOrderSSE";
import { useDriverNotificationPoller } from "@/hooks/useDriverNotificationPoller";
import { useQueryClient } from "@tanstack/react-query";

const TC = "#E85C30";
const GREEN = "#2A7A48";

export function LivreurLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { livreur, logoutLivreur } = useAuth();
  const { colors, isDark } = useTheme();
  const livreurId = livreur?.id ?? 0;
  const queryClient = useQueryClient();
  const pendingDispatch = useDispatchPoller(livreurId);
  useLocationReporter(livreurId);
  useOrderSSE(livreurId);
  const { notification: managerNotification, clear: clearManagerNotification } = useDriverNotificationPoller(livreurId);

  const { data: profile } = useGetDeliverer(livreurId, {
    query: { enabled: !!livreurId, queryKey: getGetDelivererQueryKey(livreurId) },
  });
  const hasPhoto = !!profile?.photoUrl;

  const updateDeliverer = useUpdateDeliverer();
  const livreurStatus = profile?.status ?? "available";
  const isOnline = livreurStatus === "available" || livreurStatus === "busy";

  const toggleAvailability = useCallback(() => {
    if (!livreurId) return;
    const next = livreurStatus === "offline" ? "available" : "offline";
    updateDeliverer.mutate(
      { id: livreurId, data: { status: next } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDelivererQueryKey(livreurId) }) }
    );
  }, [livreurId, livreurStatus, updateDeliverer, queryClient]);

  const navItems = [
    { href: "/livreur", icon: Home, label: t("nav_dashboard") },
    { href: "/livreur/livraisons", icon: Package, label: t("nav_deliveries") },
    { href: "/livreur/profil", icon: User, label: t("nav_profile") },
  ];

  const langLabels: Record<string, string> = { fr: "FR", ar: "ع", en: "EN", tzm: "ⵣ" };

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300" style={{ backgroundColor: colors.bg }}>

      {pendingDispatch && (
        <DispatchAlert delivererId={livreurId} deliveryId={pendingDispatch.deliveryId} />
      )}

      <ManagerNotificationAlert
        notification={managerNotification}
        onDismiss={clearManagerNotification}
      />

      {/* Sidebar — desktop */}
      <aside
        className="hidden md:flex w-64 flex-col border-r flex-shrink-0 transition-colors duration-300"
        style={{ background: colors.sidebar, borderColor: colors.sidebarBorder }}
      >
        {/* Brand header */}
        <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: colors.sidebarBorder, background: TC, textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
          <img src="/bridge-logo.png" alt="Bridge" className="h-9 w-9 object-contain flex-shrink-0" />
          <span className="font-bold text-white text-base tracking-tight">{t("livreur_title")}</span>
        </div>

        {/* Zellige stripe */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg,#C14B2A 0,#C14B2A 20px,#D4880C 20px,#D4880C 40px,#2A7A48 40px,#2A7A48 60px,#D4880C 60px,#D4880C 80px)",
            opacity: isDark ? 0.5 : 0.3,
          }}
        />

        <nav className="flex-1 p-3 space-y-1 pt-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-sm font-medium"
                  style={
                    isActive
                      ? { background: colors.navActive, color: TC }
                      : { color: colors.textMid }
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {isActive && <div className="ms-auto w-1.5 h-1.5 rounded-full" style={{ background: TC }} />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Language + Theme */}
        <div className="px-4 pb-3 space-y-3">

          {/* ── Availability toggle ── */}
          <button
            onClick={toggleAvailability}
            disabled={updateDeliverer.isPending || livreurStatus === "busy"}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-bold border disabled:opacity-60"
            style={
              isOnline
                ? { background: "rgba(42,122,72,0.2)", color: "#2AE86C", border: "1px solid rgba(42,122,72,0.5)", boxShadow: "0 0 12px rgba(42,234,108,0.25)" }
                : { background: colors.bgCard, color: colors.textLight, borderColor: colors.border }
            }
          >
            {isOnline
              ? <><Wifi className="h-4 w-4" /><span>{livreurStatus === "busy" ? "En livraison" : "En ligne"}</span></>
              : <><WifiOff className="h-4 w-4" /><span>Hors-ligne — Appuyer pour activer</span></>
            }
          </button>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: colors.textLight }}>
              Langue
            </p>
            <div className="flex items-center gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code as Lang)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border"
                  style={
                    lang === l.code
                      ? { background: TC, color: "white", borderColor: TC }
                      : { background: "transparent", color: colors.textMid, borderColor: colors.border }
                  }
                  title={l.label}
                >
                  {langLabels[l.code]}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="p-3 pb-5 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={() => { logoutLivreur(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium"
            style={{ color: colors.textMid }}
          >
            <LogOut className="h-5 w-5" />
            <span>{t("nav_switch")}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden pb-20 md:pb-0">

        {/* Mobile top bar */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30 transition-colors duration-300"
          style={{ background: colors.topBar, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2">
            <img src="/bridge-logo.png" alt="Bridge" className="w-7 h-7 object-contain flex-shrink-0" />
            <span className="font-bold text-sm" style={{ color: colors.text }}>{t("livreur_title")}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Availability toggle — most important */}
            <button
              onClick={toggleAvailability}
              disabled={updateDeliverer.isPending || livreurStatus === "busy"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-60"
              style={
                isOnline
                  ? { background: "rgba(42,122,72,0.2)", color: "#2AE86C", border: "1px solid rgba(42,122,72,0.5)", boxShadow: "0 0 12px rgba(42,234,108,0.25)" }
                  : { background: colors.bgCard, color: colors.textLight, borderColor: colors.border }
              }
            >
              {isOnline
                ? <><Wifi className="h-3.5 w-3.5" />{livreurStatus === "busy" ? "En livraison" : "En ligne"}</>
                : <><WifiOff className="h-3.5 w-3.5" />Hors-ligne</>
              }
            </button>

            <div className="flex items-center gap-0.5 rounded-full p-0.5 border" style={{ borderColor: colors.border }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code as Lang)}
                  className="w-7 h-7 rounded-full text-[10px] font-bold transition-all"
                  style={lang === l.code ? { background: TC, color: "white" } : { color: colors.textMid }}
                >
                  {langLabels[l.code]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Photo required banner */}
        {profile && !hasPhoto && location !== "/livreur/profil" && (
          <Link href="/livreur/profil">
            <div
              className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer"
              style={{ background: isDark ? "rgba(42,10,0,0.6)" : "#FFF3CD", borderColor: isDark ? "rgba(212,136,12,0.3)" : "#F5D98A" }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#E53E3E" }}>
                <Camera className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: isDark ? "#FFD080" : "#7D4A00" }}>
                  📷 Photo de profil obligatoire
                </p>
                <p className="text-xs" style={{ color: isDark ? "#C09040" : "#9B6600" }}>
                  Les clients ne peuvent pas voir votre photo. Appuyez pour l'ajouter.
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#E53E3E", color: "white" }}>
                Ajouter
              </span>
            </div>
          </Link>
        )}

        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t z-50 flex items-center justify-around px-2 py-2 transition-colors duration-300"
        style={{ background: colors.topBar, borderColor: colors.border }}
      >
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="block flex-1">
              <div className="flex flex-col items-center justify-center gap-1">
                <div
                  className="flex items-center justify-center rounded-xl p-2 transition-all"
                  style={isActive ? { background: colors.navActive } : {}}
                >
                  <item.icon className="h-5 w-5" style={{ color: isActive ? TC : colors.textLight }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: isActive ? TC : colors.textLight }}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
