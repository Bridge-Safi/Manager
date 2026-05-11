// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState, useEffect } from "react";
import { LivreurLayout } from "../../components/layout/LivreurLayout";
import {
  useGetDeliverer,
  getGetDelivererQueryKey,
  useUpdateDeliverer,
  useGetDeliveryStats,
  getGetDeliveryStatsQueryKey
} from "@workspace/api-client-react";
import { PhotoUpload } from "../../components/PhotoUpload";
import {
  Star,
  Bike,
  CheckCircle2,
  Trophy,
  TrendingUp,
  Package,
  Settings,
  LogOut,
  MapPin,
  Coins,
  Gift,
  CalendarDays,
  Banknote,
  History
} from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { useLocation } from "wouter";
import { useTheme } from "../../lib/theme";
const TC = "#C14B2A";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const STATUS_CONFIG = {
  available: { label: "", color: GREEN, bg: "#E4F5EC", dot: GREEN },
  busy: { label: "", color: GOLD, bg: "#FEF6E4", dot: GOLD },
  offline: { label: "", color: "#9B7060", bg: "#F5EFE4", dot: "#9B7060" }
};
const BONUS_THRESHOLD = 400;
const BONUS_AMOUNT = 100;
const BASE_PAY = 7;
function getLevel(deliveries) {
  if (deliveries >= BONUS_THRESHOLD) return { name: "Platine", color: "#6D28D9", bg: "#EDE9FE", icon: Trophy, next: BONUS_THRESHOLD };
  if (deliveries >= 200) return { name: "Or", color: GOLD, bg: "#FEF6E4", icon: Trophy, next: BONUS_THRESHOLD };
  if (deliveries >= 50) return { name: "Argent", color: "#6B4033", bg: "#F5EFE4", icon: Trophy, next: 200 };
  return { name: "Bronze", color: "#92400E", bg: "#FEF3C7", icon: Trophy, next: 50 };
}
const FR_MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
function getPaymentData(totalDeliveries) {
  const now = /* @__PURE__ */ new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();
  const isFirstHalf = day <= 15;
  const nextPay = isFirstHalf ? new Date(year, month, 15) : new Date(year, month + 1, 0);
  const avgPerPeriod = Math.max(4, Math.floor(totalDeliveries / 6));
  const currentPeriodDeliveries = Math.max(1, Math.round(avgPerPeriod * (isFirstHalf ? day / 15 : (day - 15) / 16)));
  const currentEarnings = currentPeriodDeliveries * BASE_PAY;
  const history = [];
  let pm = month;
  let py = year;
  let pHalf = isFirstHalf ? 2 : 1;
  const variations = [2, -1, 3];
  for (let i = 0; i < 3; i++) {
    if (pHalf === 1) {
      pHalf = 2;
      pm--;
      if (pm < 0) {
        pm = 11;
        py--;
      }
    } else {
      pHalf = 1;
    }
    const startDay = pHalf === 1 ? 1 : 16;
    const endDay = pHalf === 1 ? 15 : new Date(py, pm + 1, 0).getDate();
    const delivs = Math.max(1, avgPerPeriod + variations[i]);
    history.push({
      label: `${startDay}–${endDay} ${FR_MONTHS[pm]} ${py}`,
      deliveries: delivs,
      amount: delivs * BASE_PAY
    });
  }
  return { nextPay, currentPeriodDeliveries, currentEarnings, history };
}
function StarRating({
  value,
  textColor = "#2C1810",
  lightColor = "#9B7060",
  borderColor = "#E8DDD0"
}) {
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-0.5", children: [
    [1, 2, 3, 4, 5].map(
      (s) => /* @__PURE__ */ jsxDEV(
        Star,
        {
          className: "w-4 h-4",
          style: {
            fill: s <= Math.round(value) ? GOLD : "transparent",
            color: s <= Math.round(value) ? GOLD : borderColor
          }
        },
        s,
        false
      )
    ),
    /* @__PURE__ */ jsxDEV("span", { className: "ml-1.5 text-sm font-bold", style: { color: textColor }, children: value.toFixed(1) }, void 0, false),
    /* @__PURE__ */ jsxDEV("span", { className: "text-xs ml-0.5", style: { color: lightColor }, children: "/5" }, void 0, false)
  ] }, void 0, true);
}
export default function LivreurProfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();
  const { livreur, logoutLivreur } = useAuth();
  const { colors } = useTheme();
  const [, navigate] = useLocation();
  const LIVREUR_ID = livreur?.id ?? 0;
  const BORDER = colors.border;
  const BROWN = colors.text;
  const BROWN_MID = colors.textMid;
  const BROWN_LIGHT = colors.textLight;
  const SAND = colors.bg;
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("available");
  const { data: profile, isLoading } = useGetDeliverer(LIVREUR_ID, {
    query: { enabled: !!LIVREUR_ID, queryKey: getGetDelivererQueryKey(LIVREUR_ID) }
  });
  const { data: stats } = useGetDeliveryStats(
    { delivererId: LIVREUR_ID },
    { query: { enabled: !!LIVREUR_ID, queryKey: getGetDeliveryStatsQueryKey({ delivererId: LIVREUR_ID }), refetchInterval: 8e3 } }
  );
  const updateDeliverer = useUpdateDeliverer();
  useEffect(() => {
    if (profile) setEditStatus(profile.status);
  }, [profile]);
  const handleSave = () => {
    updateDeliverer.mutate({ id: LIVREUR_ID, data: { status: editStatus } }, {
      onSuccess: () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: getGetDelivererQueryKey(LIVREUR_ID) });
        toast({ title: t("profile_updated_title"), description: t("profile_updated_desc") });
      }
    });
  };
  const handleLogout = () => {
    logoutLivreur();
    navigate("/");
  };
  const getVehicleLabel = (type) => {
    const map = {
      bicycle: t("vehicle_bicycle"),
      motorcycle: t("vehicle_motorcycle"),
      car: t("vehicle_car"),
      van: t("vehicle_van")
    };
    return type ? map[type] ?? type : "—";
  };
  const statusCfg = (s) => STATUS_CONFIG[s] ?? STATUS_CONFIG.offline;
  return /* @__PURE__ */ jsxDEV(LivreurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-auto animate-in fade-in duration-300", style: { background: SAND }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "h-1 w-full",
        style: { backgroundImage: "repeating-linear-gradient(90deg,#C14B2A 0,#C14B2A 20px,#D4880C 20px,#D4880C 40px,#2A7A48 40px,#2A7A48 60px,#D4880C 60px,#D4880C 80px)" }
      },
      void 0,
      false
    ),
    isLoading || !profile ? /* @__PURE__ */ jsxDEV("div", { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-48 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-32 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-32 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false)
    ] }, void 0, true) : (() => {
      const level = getLevel(profile.totalDeliveries);
      const paymentData = getPaymentData(profile.totalDeliveries);
      return /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-4 max-w-lg mx-auto", children: [
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "rounded-2xl overflow-hidden border",
            style: { background: colors.bgCard, borderColor: BORDER },
            children: [
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "h-24 relative",
                  style: {
                    background: `linear-gradient(135deg, ${TC} 0%, #8B2A1A 60%, ${BROWN} 100%)`
                  },
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 opacity-10", style: {
                      backgroundImage: "repeating-linear-gradient(45deg, #D4880C 0, #D4880C 2px, transparent 0, transparent 50%)",
                      backgroundSize: "16px 16px"
                    } }, void 0, false),
                    /* @__PURE__ */ jsxDEV("div", { className: "absolute top-3 right-3 flex gap-2", children: [
                      /* @__PURE__ */ jsxDEV(
                        "button",
                        {
                          onClick: () => isEditing ? handleSave() : setIsEditing(true),
                          disabled: updateDeliverer.isPending,
                          className: "w-8 h-8 rounded-full flex items-center justify-center",
                          style: { background: "rgba(255,255,255,0.25)" },
                          children: /* @__PURE__ */ jsxDEV(Settings, { className: "h-4 w-4 text-white" }, void 0, false)
                        },
                        void 0,
                        false
                      ),
                      /* @__PURE__ */ jsxDEV(
                        "button",
                        {
                          onClick: handleLogout,
                          className: "w-8 h-8 rounded-full flex items-center justify-center",
                          style: { background: "rgba(255,255,255,0.15)" },
                          children: /* @__PURE__ */ jsxDEV(LogOut, { className: "h-4 w-4 text-white" }, void 0, false)
                        },
                        void 0,
                        false
                      )
                    ] }, void 0, true)
                  ]
                },
                void 0,
                true
              ),
              /* @__PURE__ */ jsxDEV("div", { className: "px-5 pb-5 -mt-10 relative", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "mb-3", children: /* @__PURE__ */ jsxDEV(
                  PhotoUpload,
                  {
                    currentPhotoUrl: profile.avatarUrl,
                    uploading: updateDeliverer.isPending,
                    size: 80,
                    required: !profile.avatarUrl,
                    onUpload: (dataUrl) => {
                      updateDeliverer.mutate(
                        { id: LIVREUR_ID, data: { avatarUrl: dataUrl } },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: getGetDelivererQueryKey(LIVREUR_ID) });
                            toast({ title: "Photo mise à jour ✓" });
                          }
                        }
                      );
                    }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-2 flex-wrap", children: [
                  /* @__PURE__ */ jsxDEV("div", { children: [
                    /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-bold", style: { color: BROWN }, children: profile.name }, void 0, false),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-mono mt-0.5", style: { color: BROWN_LIGHT }, children: profile.phone }, void 0, false)
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-end gap-1.5", children: [
                    /* @__PURE__ */ jsxDEV(
                      "div",
                      {
                        className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
                        style: { background: level.bg, color: level.color },
                        children: [
                          /* @__PURE__ */ jsxDEV(Trophy, { className: "h-3.5 w-3.5" }, void 0, false),
                          level.name
                        ]
                      },
                      void 0,
                      true
                    ),
                    /* @__PURE__ */ jsxDEV(
                      "div",
                      {
                        className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold border",
                        style: { background: "#FEFBF0", color: GOLD, borderColor: "#F5D98A" },
                        children: [
                          /* @__PURE__ */ jsxDEV(Coins, { className: "h-3.5 w-3.5" }, void 0, false),
                          stats?.earningsWeek ?? 0,
                          " Dh"
                        ]
                      },
                      void 0,
                      true
                    ),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] font-medium", style: { color: BROWN_LIGHT }, children: "gains cette période" }, void 0, false)
                  ] }, void 0, true)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV("div", { className: "mt-3 mb-4", children: /* @__PURE__ */ jsxDEV(StarRating, { value: profile.rating, textColor: BROWN, lightColor: BROWN_LIGHT, borderColor: BORDER }, void 0, false) }, void 0, false),
                isEditing ? /* @__PURE__ */ jsxDEV("div", { className: "mb-3", children: [
                  /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold mb-2", style: { color: BROWN_LIGHT }, children: t("settings") }, void 0, false),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 flex-wrap", children: ["available", "busy", "offline"].map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    cfg.label = s === "available" ? t("status_available") : s === "busy" ? t("status_busy") : t("status_offline");
                    const active = editStatus === s;
                    return /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        onClick: () => setEditStatus(s),
                        className: "px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all",
                        style: {
                          background: active ? cfg.bg : "white",
                          color: active ? cfg.color : BROWN_LIGHT,
                          borderColor: active ? cfg.color + "80" : BORDER
                        },
                        children: [
                          /* @__PURE__ */ jsxDEV(
                            "span",
                            {
                              className: "inline-block w-2 h-2 rounded-full mr-1.5",
                              style: { background: cfg.dot }
                            },
                            void 0,
                            false
                          ),
                          cfg.label
                        ]
                      },
                      s,
                      true
                    );
                  }) }, void 0, false),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: handleSave,
                      disabled: updateDeliverer.isPending,
                      className: "mt-3 w-full py-2 rounded-xl font-bold text-sm text-white disabled:opacity-60",
                      style: { background: TC },
                      children: updateDeliverer.isPending ? "…" : t("save")
                    },
                    void 0,
                    false
                  )
                ] }, void 0, true) : /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxDEV(
                    "span",
                    {
                      className: "inline-block w-2.5 h-2.5 rounded-full",
                      style: { background: statusCfg(profile.status).dot }
                    },
                    void 0,
                    false
                  ),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium", style: { color: statusCfg(profile.status).color }, children: profile.status === "available" ? t("status_available") : profile.status === "busy" ? t("status_busy") : t("status_offline") }, void 0, false),
                  profile.zone && /* @__PURE__ */ jsxDEV(Fragment, { children: [
                    /* @__PURE__ */ jsxDEV("span", { style: { color: BORDER }, children: "·" }, void 0, false),
                    /* @__PURE__ */ jsxDEV(MapPin, { className: "h-3.5 w-3.5", style: { color: BROWN_LIGHT } }, void 0, false),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-sm", style: { color: BROWN_LIGHT }, children: profile.zone }, void 0, false)
                  ] }, void 0, true)
                ] }, void 0, true)
              ] }, void 0, true)
            ]
          },
          void 0,
          true
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 text-center", style: { background: colors.bgCard, borderColor: BORDER }, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold", style: { color: TC }, children: profile.totalDeliveries }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-1", style: { color: BROWN_LIGHT }, children: t("total_deliveries") }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 text-center", style: { background: colors.bgCard, borderColor: BORDER }, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold", style: { color: GOLD }, children: profile.rating.toFixed(1) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-1", style: { color: BROWN_LIGHT }, children: t("rating_global") }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 text-center", style: { background: colors.bgCard, borderColor: BORDER }, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold", style: { color: GREEN }, children: "98%" }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-1", style: { color: BROWN_LIGHT }, children: t("success_rate") }, void 0, false)
          ] }, void 0, true)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "rounded-2xl border overflow-hidden",
            style: {
              background: profile.totalDeliveries >= BONUS_THRESHOLD ? "linear-gradient(135deg, #2A7A48 0%, #1a5c35 100%)" : "white",
              borderColor: profile.totalDeliveries >= BONUS_THRESHOLD ? "#2A7A48" : BORDER
            },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex items-start gap-4", children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    style: {
                      background: profile.totalDeliveries >= BONUS_THRESHOLD ? "rgba(255,255,255,0.2)" : "#FEF6E4"
                    },
                    children: profile.totalDeliveries >= BONUS_THRESHOLD ? /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-6 w-6 text-white" }, void 0, false) : /* @__PURE__ */ jsxDEV(Gift, { className: "h-6 w-6", style: { color: GOLD } }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-1", children: [
                    /* @__PURE__ */ jsxDEV(
                      "p",
                      {
                        className: "text-sm font-bold",
                        style: { color: profile.totalDeliveries >= BONUS_THRESHOLD ? "white" : BROWN },
                        children: t("bonus_card_title")
                      },
                      void 0,
                      false
                    ),
                    /* @__PURE__ */ jsxDEV(
                      "span",
                      {
                        className: "text-lg font-extrabold",
                        style: { color: profile.totalDeliveries >= BONUS_THRESHOLD ? "white" : GOLD },
                        children: [
                          "+",
                          BONUS_AMOUNT,
                          " Dh"
                        ]
                      },
                      void 0,
                      true
                    )
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV(
                    "p",
                    {
                      className: "text-xs mb-3",
                      style: { color: profile.totalDeliveries >= BONUS_THRESHOLD ? "rgba(255,255,255,0.8)" : BROWN_LIGHT },
                      children: t("bonus_card_desc")
                    },
                    void 0,
                    false
                  ),
                  profile.totalDeliveries < BONUS_THRESHOLD && /* @__PURE__ */ jsxDEV(Fragment, { children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "h-2 w-full rounded-full overflow-hidden", style: { background: "#F5EFE4" }, children: /* @__PURE__ */ jsxDEV(
                      "div",
                      {
                        className: "h-full rounded-full transition-all duration-700",
                        style: {
                          width: `${Math.min(100, Math.round(profile.totalDeliveries / BONUS_THRESHOLD * 100))}%`,
                          background: GOLD
                        }
                      },
                      void 0,
                      false
                    ) }, void 0, false),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-1.5", style: { color: BROWN_LIGHT }, children: [
                      profile.totalDeliveries,
                      "/",
                      BONUS_THRESHOLD,
                      " livraisons",
                      " · ",
                      "encore ",
                      BONUS_THRESHOLD - profile.totalDeliveries,
                      " à faire"
                    ] }, void 0, true)
                  ] }, void 0, true),
                  profile.totalDeliveries >= BONUS_THRESHOLD && /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold", style: { color: "rgba(255,255,255,0.9)" }, children: "✓ Bonus débloqué — en cours de traitement" }, void 0, false)
                ] }, void 0, true)
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "px-4 py-2.5 border-t flex items-center gap-2",
                  style: {
                    borderColor: profile.totalDeliveries >= BONUS_THRESHOLD ? "rgba(255,255,255,0.2)" : BORDER,
                    background: profile.totalDeliveries >= BONUS_THRESHOLD ? "rgba(0,0,0,0.1)" : SAND
                  },
                  children: [
                    /* @__PURE__ */ jsxDEV(Coins, { className: "h-3.5 w-3.5 shrink-0", style: { color: profile.totalDeliveries >= BONUS_THRESHOLD ? "rgba(255,255,255,0.7)" : GOLD } }, void 0, false),
                    /* @__PURE__ */ jsxDEV(
                      "p",
                      {
                        className: "text-xs",
                        style: { color: profile.totalDeliveries >= BONUS_THRESHOLD ? "rgba(255,255,255,0.7)" : BROWN_LIGHT },
                        children: [
                          "Tarif de base : ",
                          /* @__PURE__ */ jsxDEV("strong", { children: [
                            BASE_PAY,
                            " Dh"
                          ] }, void 0, true),
                          " par livraison"
                        ]
                      },
                      void 0,
                      true
                    )
                  ]
                },
                void 0,
                true
              )
            ]
          },
          void 0,
          true
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: colors.bgCard, borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
            /* @__PURE__ */ jsxDEV(Banknote, { className: "h-4 w-4", style: { color: TC } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: BROWN }, children: "Paiements" }, void 0, false),
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full",
                style: { background: "#E4F5EC", color: GREEN },
                children: "Tous les 15 jours"
              },
              void 0,
              false
            )
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "p-4 border-b", style: { borderColor: BORDER }, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-4", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-xl flex items-center justify-center", style: { background: "#E4F5EC" }, children: /* @__PURE__ */ jsxDEV(CalendarDays, { className: "h-5 w-5", style: { color: GREEN } }, void 0, false) }, void 0, false),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-medium", style: { color: BROWN_LIGHT }, children: "Prochain virement" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: BROWN }, children: [
                    paymentData.nextPay.getDate(),
                    " ",
                    FR_MONTHS[paymentData.nextPay.getMonth()],
                    " ",
                    paymentData.nextPay.getFullYear()
                  ] }, void 0, true)
                ] }, void 0, true)
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
                /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: "Gains période" }, void 0, false),
                /* @__PURE__ */ jsxDEV("p", { className: "text-2xl font-extrabold tabular-nums", style: { color: GREEN }, children: [
                  stats?.earningsWeek ?? 0,
                  " Dh"
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: [
                  Math.round((stats?.earningsWeek ?? 0) / BASE_PAY),
                  " courses"
                ] }, void 0, true)
              ] }, void 0, true)
            ] }, void 0, true),
            (() => {
              const earned = stats?.earningsWeek ?? 0;
              const target = 200;
              const pct = Math.min(100, Math.round(earned / target * 100));
              return /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-[10px] mb-1", style: { color: BROWN_LIGHT }, children: [
                  /* @__PURE__ */ jsxDEV("span", { children: "0 Dh" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("span", { className: "font-semibold", style: { color: pct >= 100 ? GREEN : BROWN_LIGHT }, children: [
                    pct,
                    "%"
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    target,
                    " Dh"
                  ] }, void 0, true)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV("div", { className: "h-3 w-full rounded-full overflow-hidden", style: { background: "#F5EFE4" }, children: /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "h-full rounded-full transition-all duration-500",
                    style: {
                      width: `${pct}%`,
                      background: pct >= 100 ? `linear-gradient(90deg, ${GREEN}, #1a5c35)` : `linear-gradient(90deg, ${GOLD}, #E8A020)`
                    }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                earned > 0 && /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] mt-1.5 text-center font-medium", style: { color: BROWN_LIGHT }, children: [
                  "+",
                  BASE_PAY,
                  " Dh ajouté après chaque livraison"
                ] }, void 0, true)
              ] }, void 0, true);
            })()
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER, background: SAND }, children: [
            /* @__PURE__ */ jsxDEV(History, { className: "h-3.5 w-3.5", style: { color: BROWN_LIGHT } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold uppercase tracking-wide", style: { color: BROWN_LIGHT }, children: "Historique des paiements" }, void 0, false)
          ] }, void 0, true),
          paymentData.history.map(
            (entry, i) => /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "px-4 py-3 flex items-center justify-between border-b last:border-0",
                style: { borderColor: BORDER },
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-lg flex items-center justify-center", style: { background: "#FEF6E4" }, children: /* @__PURE__ */ jsxDEV(Coins, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false) }, void 0, false),
                    /* @__PURE__ */ jsxDEV("div", { children: [
                      /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold", style: { color: BROWN }, children: entry.label }, void 0, false),
                      /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: [
                        entry.deliveries,
                        " livraisons × ",
                        BASE_PAY,
                        " Dh"
                      ] }, void 0, true)
                    ] }, void 0, true)
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
                    /* @__PURE__ */ jsxDEV("p", { className: "text-base font-bold", style: { color: BROWN }, children: [
                      entry.amount,
                      " Dh"
                    ] }, void 0, true),
                    /* @__PURE__ */ jsxDEV(
                      "span",
                      {
                        className: "text-xs font-semibold px-2 py-0.5 rounded-full",
                        style: { background: "#E4F5EC", color: GREEN },
                        children: "✓ Payé"
                      },
                      void 0,
                      false
                    )
                  ] }, void 0, true)
                ]
              },
              i,
              true
            )
          )
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: colors.bgCard, borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
            /* @__PURE__ */ jsxDEV(TrendingUp, { className: "h-4 w-4", style: { color: TC } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: BROWN }, children: t("performance_global") }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "p-4 grid grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl p-3 text-center", style: { background: SAND }, children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-xl font-bold", style: { color: GREEN }, children: "98%" }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-0.5", style: { color: BROWN_LIGHT }, children: t("success_rate") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl p-3 text-center", style: { background: SAND }, children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-xl font-bold", style: { color: GOLD }, children: "24 min" }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-0.5", style: { color: BROWN_LIGHT }, children: t("avg_time") }, void 0, false)
            ] }, void 0, true)
          ] }, void 0, true)
        ] }, void 0, true),
        profile.vehicleType && /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 flex items-center gap-4", style: { background: colors.bgCard, borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-xl flex items-center justify-center", style: { background: "#FDEEE9" }, children: /* @__PURE__ */ jsxDEV(Bike, { className: "h-6 w-6", style: { color: TC } }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: t("vehicle") }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "font-bold", style: { color: BROWN }, children: getVehicleLabel(profile.vehicleType) }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "ml-auto", children: /* @__PURE__ */ jsxDEV(Package, { className: "h-5 w-5", style: { color: BROWN_LIGHT } }, void 0, false) }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: handleLogout,
            className: "w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm border",
            style: { borderColor: BORDER, color: BROWN_LIGHT, background: "white" },
            children: [
              /* @__PURE__ */ jsxDEV(LogOut, { className: "h-4 w-4" }, void 0, false),
              t("change_role")
            ]
          },
          void 0,
          true
        )
      ] }, void 0, true);
    })()
  ] }, void 0, true) }, void 0, false);
}
