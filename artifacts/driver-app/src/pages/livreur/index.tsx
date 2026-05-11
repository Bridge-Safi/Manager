// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { LivreurLayout } from "../../components/layout/LivreurLayout";
import {
  useGetDeliveryStats,
  getGetDeliveryStatsQueryKey,
  useListDeliveries,
  getListDeliveriesQueryKey,
  useGetDeliverer,
  getGetDelivererQueryKey
} from "@workspace/api-client-react";
import {
  Package,
  CheckCircle2,
  TrendingUp,
  Bike,
  MapPin,
  Phone,
  Star,
  ChevronRight,
  Trophy,
  Clock
} from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { Link } from "wouter";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
const TC = "#C14B2A";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
function getLevel(deliveries) {
  if (deliveries >= 400) return { name: "Platine", color: "#6D28D9", bg: "#EDE9FE" };
  if (deliveries >= 200) return { name: "Or", color: GOLD, bg: "#FEF6E4" };
  if (deliveries >= 50) return { name: "Argent", color: BROWN_MID, bg: "#F5EFE4" };
  return { name: "Bronze", color: "#92400E", bg: "#FEF3C7" };
}
function greetingKey(t) {
  const h = (/* @__PURE__ */ new Date()).getHours();
  if (h < 12) return t("greeting_morning");
  if (h < 18) return t("greeting_afternoon");
  return t("greeting_evening");
}
function parseOrderItems(notes) {
  if (!notes) return [];
  const match = notes.match(/Commande: ([^|]+)/);
  if (!match) return [];
  return match[1].split(", ").filter(Boolean).slice(0, 3);
}
export default function LivreurDashboard() {
  const { t } = useI18n();
  const { livreur } = useAuth();
  const LIVREUR_ID = livreur?.id ?? 0;
  const { data: stats, isLoading: statsLoading } = useGetDeliveryStats(
    { delivererId: LIVREUR_ID },
    { query: { queryKey: getGetDeliveryStatsQueryKey({ delivererId: LIVREUR_ID }) } }
  );
  const { data: deliveries, isLoading: deliveriesLoading } = useListDeliveries(
    { delivererId: LIVREUR_ID, status: "in_progress" },
    { query: { queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID, status: "in_progress" }) } }
  );
  const { data: profile } = useGetDeliverer(LIVREUR_ID, {
    query: { enabled: !!LIVREUR_ID, queryKey: getGetDelivererQueryKey(LIVREUR_ID) }
  });
  const level = profile ? getLevel(profile.totalDeliveries) : null;
  return /* @__PURE__ */ jsxDEV(LivreurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-auto", style: { background: SAND }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "relative px-5 pt-6 pb-8 overflow-hidden",
        style: { background: `linear-gradient(135deg, ${TC} 0%, #8B2A1A 60%, ${BROWN} 100%)` },
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 opacity-10 pointer-events-none", style: {
            backgroundImage: "repeating-linear-gradient(45deg, #D4880C 0, #D4880C 2px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px"
          } }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "relative z-10 flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm", children: [
                greetingKey(t),
                " 👋"
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("h1", { className: "text-white font-bold text-xl mt-0.5 truncate", children: profile?.name ?? t("nav_dashboard") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 flex-shrink-0 ml-3", children: [
              level && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold", style: { background: level.bg, color: level.color }, children: [
                /* @__PURE__ */ jsxDEV(Trophy, { className: "h-3 w-3" }, void 0, false),
                level.name
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV(Link, { href: "/livreur/profil", children: /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-bold text-white border-2 border-white/30 flex-shrink-0",
                  style: { background: "rgba(255,255,255,0.2)" },
                  children: profile?.photoUrl ? /* @__PURE__ */ jsxDEV("img", { src: profile.photoUrl, alt: "", className: "w-full h-full object-cover" }, void 0, false) : profile?.name?.charAt(0)?.toUpperCase() ?? "?"
                },
                void 0,
                false
              ) }, void 0, false)
            ] }, void 0, true)
          ] }, void 0, true),
          profile && /* @__PURE__ */ jsxDEV("div", { className: "relative z-10 flex items-center gap-2 mt-3", children: [
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "w-2 h-2 rounded-full",
                style: { background: profile.status === "available" ? "#4ADE80" : profile.status === "busy" ? GOLD : "#9B7060" }
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-xs", children: profile.status === "available" ? t("status_available") : profile.status === "busy" ? t("status_busy") : t("status_offline") }, void 0, false),
            profile.zone && /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV("span", { className: "text-white/30", children: "·" }, void 0, false),
              /* @__PURE__ */ jsxDEV(MapPin, { className: "h-3 w-3 text-white/50" }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-xs", children: profile.zone }, void 0, false)
            ] }, void 0, true)
          ] }, void 0, true)
        ]
      },
      void 0,
      true
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "px-4 -mt-5 relative z-10", children: /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "rounded-2xl border p-4 grid grid-cols-4 gap-1",
        style: { background: "white", borderColor: BORDER, boxShadow: "0 4px 20px rgba(44,24,16,0.12)" },
        children: [
          { icon: Package, label: t("total_today"), value: stats?.totalToday ?? 0, color: TC, bg: "#FDEEE9" },
          { icon: Bike, label: t("in_progress"), value: stats?.inProgress ?? 0, color: "#2563EB", bg: "#EFF6FF" },
          { icon: CheckCircle2, label: t("completed"), value: stats?.completedToday ?? 0, color: GREEN, bg: "#E4F5EC" },
          { icon: TrendingUp, label: "MAD", value: `${stats?.earningsToday ?? 0}`, color: GOLD, bg: "#FEF6E4" }
        ].map(
          (card, i) => /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-1 py-1", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl flex items-center justify-center", style: { background: card.bg }, children: /* @__PURE__ */ jsxDEV(card.icon, { className: "h-4 w-4", style: { color: card.color } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "text-lg font-bold leading-none", style: { color: BROWN }, children: statsLoading ? /* @__PURE__ */ jsxDEV("span", { className: "text-sm", children: "…" }, void 0, false) : card.value }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-center", style: { color: BROWN_LIGHT }, children: card.label }, void 0, false)
          ] }, i, true)
        )
      },
      void 0,
      false
    ) }, void 0, false),
    /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-5", children: [
      profile && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl border p-4 flex items-center gap-4",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold mb-1", style: { color: BROWN_LIGHT }, children: t("rating_global") }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
                [1, 2, 3, 4, 5].map(
                  (s) => /* @__PURE__ */ jsxDEV(
                    Star,
                    {
                      className: "w-5 h-5",
                      style: {
                        fill: s <= Math.round(profile.rating) ? GOLD : "transparent",
                        color: s <= Math.round(profile.rating) ? GOLD : BORDER
                      }
                    },
                    s,
                    false
                  )
                ),
                /* @__PURE__ */ jsxDEV("span", { className: "ml-1.5 text-lg font-bold", style: { color: BROWN }, children: profile.rating.toFixed(1) }, void 0, false)
              ] }, void 0, true)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "h-10 w-px", style: { background: BORDER } }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "text-center px-3", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-xl font-bold", style: { color: TC }, children: profile.totalDeliveries }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs", style: { color: BROWN_LIGHT }, children: t("total_deliveries") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "h-10 w-px", style: { background: BORDER } }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "text-center px-3", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-xl font-bold", style: { color: GREEN }, children: "98%" }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs", style: { color: BROWN_LIGHT }, children: t("success_rate") }, void 0, false)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxDEV("h2", { className: "text-base font-bold", style: { color: BROWN }, children: t("active_deliveries") }, void 0, false),
          /* @__PURE__ */ jsxDEV(Link, { href: "/livreur/livraisons", children: /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold flex items-center gap-0.5", style: { color: TC }, children: [
            t("see_all"),
            " ",
            /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-3.5 w-3.5" }, void 0, false)
          ] }, void 0, true) }, void 0, false)
        ] }, void 0, true),
        deliveriesLoading ? /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-28 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false),
          /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-28 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false)
        ] }, void 0, true) : deliveries && deliveries.length > 0 ? /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: deliveries.map((delivery) => {
          const items = parseOrderItems(delivery.notes ?? null);
          return /* @__PURE__ */ jsxDEV(Link, { href: `/livreur/livraison/${delivery.id}`, children: /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "rounded-2xl border overflow-hidden active:scale-[0.99] transition-transform cursor-pointer",
              style: { background: "white", borderColor: BORDER },
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "h-0.5 w-full", style: { background: TC } }, void 0, false),
                /* @__PURE__ */ jsxDEV("div", { className: "p-4", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-2 mb-2", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "min-w-0", children: [
                      /* @__PURE__ */ jsxDEV("p", { className: "font-mono text-xs", style: { color: BROWN_LIGHT }, children: delivery.trackingNumber }, void 0, false),
                      /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-base mt-0.5 truncate", style: { color: BROWN }, children: delivery.customerName }, void 0, false)
                    ] }, void 0, true),
                    /* @__PURE__ */ jsxDEV("span", { className: "flex-shrink-0 px-2 py-1 rounded-full text-xs font-bold", style: { background: "#FDEEE9", color: TC }, children: t("status_in_progress") }, void 0, false)
                  ] }, void 0, true),
                  items.length > 0 && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-1 mb-2", children: items.map(
                    (item, i) => /* @__PURE__ */ jsxDEV("span", { className: "px-2 py-0.5 rounded-full text-xs", style: { background: SAND, color: BROWN_MID }, children: item }, i, false)
                  ) }, void 0, false),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-xs", style: { color: BROWN_LIGHT }, children: [
                    /* @__PURE__ */ jsxDEV(MapPin, { className: "h-3 w-3 flex-shrink-0" }, void 0, false),
                    /* @__PURE__ */ jsxDEV("span", { className: "truncate", children: delivery.deliveryAddress }, void 0, false)
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mt-3", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                      delivery.customerPhone && /* @__PURE__ */ jsxDEV(
                        "a",
                        {
                          href: `tel:${delivery.customerPhone}`,
                          onClick: (e) => e.stopPropagation(),
                          className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold",
                          style: { background: "#E4F5EC", color: GREEN },
                          children: [
                            /* @__PURE__ */ jsxDEV(Phone, { className: "h-3 w-3" }, void 0, false),
                            t("call_customer")
                          ]
                        },
                        void 0,
                        true
                      ),
                      delivery.estimatedDeliveryTime && /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1 text-xs", style: { color: BROWN_LIGHT }, children: [
                        /* @__PURE__ */ jsxDEV(Clock, { className: "h-3 w-3" }, void 0, false),
                        delivery.estimatedDeliveryTime
                      ] }, void 0, true)
                    ] }, void 0, true),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold flex items-center gap-0.5", style: { color: TC }, children: [
                      t("details"),
                      " ",
                      /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-3 w-3" }, void 0, false)
                    ] }, void 0, true)
                  ] }, void 0, true)
                ] }, void 0, true)
              ]
            },
            void 0,
            true
          ) }, delivery.id, false);
        }) }, void 0, false) : /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "text-center py-12 rounded-2xl border border-dashed",
            style: { borderColor: BORDER, background: "white" },
            children: [
              /* @__PURE__ */ jsxDEV(Package, { className: "mx-auto h-10 w-10 mb-3", style: { color: "#D0BEB0" } }, void 0, false),
              /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-semibold", style: { color: BROWN_MID }, children: t("no_active") }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-1", style: { color: BROWN_LIGHT }, children: t("day_summary") }, void 0, false)
            ]
          },
          void 0,
          true
        )
      ] }, void 0, true)
    ] }, void 0, true)
  ] }, void 0, true) }, void 0, false);
}
