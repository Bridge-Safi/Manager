import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Home, Package, User, LogOut, Camera, Sun, Moon, Wifi, WifiOff } from "lucide-react";
import { useI18n, LANGUAGES } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { DispatchAlert } from "../../components/DispatchAlert";
import { useDispatchPoller } from "../../hooks/useDispatchPoller";
import { useGetDeliverer, getGetDelivererQueryKey, useUpdateDeliverer } from "@workspace/api-client-react";
import { useLocationReporter } from "../../hooks/useLocationReporter";
import { useQueryClient } from "@tanstack/react-query";
const TC = "#C14B2A";
const GREEN = "#2A7A48";
export function LivreurLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { livreur, logoutLivreur } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const livreurId = livreur?.id ?? 0;
  const queryClient = useQueryClient();
  const pendingDispatch = useDispatchPoller(livreurId);
  useLocationReporter(livreurId);
  const { data: profile } = useGetDeliverer(livreurId, {
    query: { enabled: !!livreurId, queryKey: getGetDelivererQueryKey(livreurId) }
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
    { href: "/livreur/profil", icon: User, label: t("nav_profile") }
  ];
  const langLabels: Record<string, string> = { fr: "FR", ar: "ع", en: "EN", tzm: "ⵣ" };
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen flex flex-col md:flex-row transition-colors duration-300", style: { backgroundColor: colors.bg }, children: [
    pendingDispatch && /* @__PURE__ */ jsxDEV(DispatchAlert, { delivererId: livreurId, deliveryId: pendingDispatch.deliveryId }, void 0, false),
    /* @__PURE__ */ jsxDEV(
      "aside",
      {
        className: "hidden md:flex w-64 flex-col border-r flex-shrink-0 transition-colors duration-300",
        style: { background: colors.sidebar, borderColor: colors.sidebarBorder },
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "p-5 border-b flex items-center gap-3", style: { borderColor: colors.sidebarBorder, background: TC }, children: [
            /* @__PURE__ */ jsxDEV("img", { src: "/bridge-logo.png", alt: "Bridge", className: "h-9 w-9 object-contain flex-shrink-0" }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-white text-base tracking-tight", children: t("livreur_title") }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "h-1 w-full flex-shrink-0",
              style: {
                backgroundImage: "repeating-linear-gradient(90deg,#C14B2A 0,#C14B2A 20px,#D4880C 20px,#D4880C 40px,#2A7A48 40px,#2A7A48 60px,#D4880C 60px,#D4880C 80px)",
                opacity: isDark ? 0.5 : 0.3
              }
            },
            void 0,
            false
          ),
          /* @__PURE__ */ jsxDEV("nav", { className: "flex-1 p-3 space-y-1 pt-4", children: navItems.map((item) => {
            const isActive = location === item.href;
            return /* @__PURE__ */ jsxDEV(Link, { href: item.href, className: "block", children: /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-sm font-medium",
                style: isActive ? { background: colors.navActive, color: TC } : { color: colors.textMid },
                children: [
                  /* @__PURE__ */ jsxDEV(item.icon, { className: "h-5 w-5 flex-shrink-0" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("span", { children: item.label }, void 0, false),
                  isActive && /* @__PURE__ */ jsxDEV("div", { className: "ms-auto w-1.5 h-1.5 rounded-full", style: { background: TC } }, void 0, false)
                ]
              },
              void 0,
              true
            ) }, item.href, false);
          }) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 pb-3 space-y-3", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: toggleAvailability,
                disabled: updateDeliverer.isPending || livreurStatus === "busy",
                className: "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-bold border disabled:opacity-60",
                style: isOnline ? { background: "#E4F5EC", color: GREEN, borderColor: "#A8DFC1" } : { background: colors.bgCard, color: colors.textLight, borderColor: colors.border },
                children: isOnline ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                  /* @__PURE__ */ jsxDEV(Wifi, { className: "h-4 w-4" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("span", { children: livreurStatus === "busy" ? "En livraison" : "En ligne" }, void 0, false)
                ] }, void 0, true) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                  /* @__PURE__ */ jsxDEV(WifiOff, { className: "h-4 w-4" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("span", { children: "Hors-ligne — Appuyer pour activer" }, void 0, false)
                ] }, void 0, true)
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] uppercase tracking-widest font-semibold mb-2", style: { color: colors.textLight }, children: "Langue" }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: LANGUAGES.map(
                (l) => /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => setLang(l.code as "fr" | "en" | "ar" | "tzm"),
                    className: "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    style: lang === l.code ? { background: TC, color: "white", borderColor: TC } : { background: "transparent", color: colors.textMid, borderColor: colors.border },
                    title: l.label,
                    children: langLabels[l.code]
                  },
                  l.code,
                  false
                )
              ) }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: toggleTheme,
                className: "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium border",
                style: { color: colors.textMid, borderColor: colors.border, background: colors.bgCard },
                children: [
                  isDark ? /* @__PURE__ */ jsxDEV(Sun, { className: "h-4 w-4 text-yellow-400" }, void 0, false) : /* @__PURE__ */ jsxDEV(Moon, { className: "h-4 w-4", style: { color: colors.textLight } }, void 0, false),
                  /* @__PURE__ */ jsxDEV("span", { children: isDark ? "Mode clair" : "Mode sombre" }, void 0, false)
                ]
              },
              void 0,
              true
            )
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "p-3 pb-5 border-t", style: { borderColor: colors.border }, children: /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                logoutLivreur();
              },
              className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
              style: { color: colors.textMid },
              children: [
                /* @__PURE__ */ jsxDEV(LogOut, { className: "h-5 w-5" }, void 0, false),
                /* @__PURE__ */ jsxDEV("span", { children: t("nav_switch") }, void 0, false)
              ]
            },
            void 0,
            true
          ) }, void 0, false)
        ]
      },
      void 0,
      true
    ),
    /* @__PURE__ */ jsxDEV("main", { className: "flex-1 flex flex-col min-h-screen max-w-full overflow-hidden pb-20 md:pb-0", children: [
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30 transition-colors duration-300",
          style: { background: colors.topBar, borderColor: colors.border },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxDEV("img", { src: "/bridge-logo.png", alt: "Bridge", className: "w-7 h-7 object-contain flex-shrink-0" }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-sm", style: { color: colors.text }, children: t("livreur_title") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: toggleAvailability,
                  disabled: updateDeliverer.isPending || livreurStatus === "busy",
                  className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-60",
                  style: isOnline ? { background: "#E4F5EC", color: GREEN, borderColor: "#A8DFC1" } : { background: colors.bgCard, color: colors.textLight, borderColor: colors.border },
                  children: isOnline ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                    /* @__PURE__ */ jsxDEV(Wifi, { className: "h-3.5 w-3.5" }, void 0, false),
                    livreurStatus === "busy" ? "En livraison" : "En ligne"
                  ] }, void 0, true) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                    /* @__PURE__ */ jsxDEV(WifiOff, { className: "h-3.5 w-3.5" }, void 0, false),
                    "Hors-ligne"
                  ] }, void 0, true)
                },
                void 0,
                false
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: toggleTheme,
                  className: "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                  style: { borderColor: colors.border, background: colors.bgCard },
                  children: isDark ? /* @__PURE__ */ jsxDEV(Sun, { className: "h-4 w-4 text-yellow-400" }, void 0, false) : /* @__PURE__ */ jsxDEV(Moon, { className: "h-4 w-4", style: { color: colors.textLight } }, void 0, false)
                },
                void 0,
                false
              ),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-0.5 rounded-full p-0.5 border", style: { borderColor: colors.border }, children: LANGUAGES.map(
                (l) => /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => setLang(l.code as "fr" | "en" | "ar" | "tzm"),
                    className: "w-7 h-7 rounded-full text-[10px] font-bold transition-all",
                    style: lang === l.code ? { background: TC, color: "white" } : { color: colors.textMid },
                    children: langLabels[l.code]
                  },
                  l.code,
                  false
                )
              ) }, void 0, false)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      profile && !hasPhoto && location !== "/livreur/profil" && /* @__PURE__ */ jsxDEV(Link, { href: "/livreur/profil", children: /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "flex items-center gap-3 px-4 py-3 border-b cursor-pointer",
          style: { background: isDark ? "#2A1A0A" : "#FFF3CD", borderColor: isDark ? "#4A3010" : "#F5D98A" },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", style: { background: "#E53E3E" }, children: /* @__PURE__ */ jsxDEV(Camera, { className: "h-4 w-4 text-white" }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: isDark ? "#FFD080" : "#7D4A00" }, children: "📷 Photo de profil obligatoire" }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: isDark ? "#C09040" : "#9B6600" }, children: "Les clients ne peuvent pas voir votre photo. Appuyez pour l'ajouter." }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold px-2 py-1 rounded-lg", style: { background: "#E53E3E", color: "white" }, children: "Ajouter" }, void 0, false)
          ]
        },
        void 0,
        true
      ) }, void 0, false),
      children
    ] }, void 0, true),
    /* @__PURE__ */ jsxDEV(
      "nav",
      {
        className: "md:hidden fixed bottom-0 left-0 right-0 border-t z-50 flex items-center justify-around px-2 py-2 transition-colors duration-300",
        style: { background: colors.topBar, borderColor: colors.border },
        children: navItems.map((item) => {
          const isActive = location === item.href;
          return /* @__PURE__ */ jsxDEV(Link, { href: item.href, className: "block flex-1", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center gap-1", children: [
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "flex items-center justify-center rounded-xl p-2 transition-all",
                style: isActive ? { background: colors.navActive } : {},
                children: /* @__PURE__ */ jsxDEV(item.icon, { className: "h-5 w-5", style: { color: isActive ? TC : colors.textLight } }, void 0, false)
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-semibold", style: { color: isActive ? TC : colors.textLight }, children: item.label }, void 0, false)
          ] }, void 0, true) }, item.href, false);
        })
      },
      void 0,
      false
    )
  ] }, void 0, true);
}
