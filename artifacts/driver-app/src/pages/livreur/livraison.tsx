// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { LivreurLayout } from "../../components/layout/LivreurLayout";
import {
  useGetDelivery,
  getGetDeliveryQueryKey,
  useUpdateDelivery,
  useConfirmDelivered,
  useGetDeliverer,
  getGetDelivererQueryKey,
  getListDeliveriesQueryKey,
  getGetDeliveryStatsQueryKey
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  MapPin,
  Phone,
  UtensilsCrossed,
  Navigation,
  CheckCircle2,
  Clock,
  Star,
  Bike,
  ShoppingBag,
  ChevronRight,
  Share2,
  Package,
  Coins
} from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { GpsPickerModal } from "../../components/GpsPickerModal";
import { stopContinuousAlarm } from "../../lib/alarm";
const TC = "#C14B2A";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
function parseOrderNotes(notes) {
  if (!notes) return { items: [], total: null, extra: null };
  const parts = notes.split(" | ");
  let items = [];
  let total = null;
  let extra = null;
  for (const part of parts) {
    if (part.startsWith("Commande: ")) {
      items = part.slice("Commande: ".length).split(", ").filter(Boolean);
    } else if (part.startsWith("Total: ")) {
      total = part.slice("Total: ".length);
    } else if (part.trim()) {
      extra = part.trim();
    }
  }
  return { items, total, extra };
}
function StatusPill({ status }) {
  const { t } = useI18n();
  const config = {
    pending: { label: t("status_pending"), color: BROWN_MID, bg: "#F5EFE4" },
    in_progress: { label: t("status_in_progress"), color: TC, bg: "#FDEEE9" },
    delivered: { label: t("status_delivered"), color: GREEN, bg: "#E4F5EC" },
    cancelled: { label: t("status_cancelled"), color: "#DC2626", bg: "#FEE2E2" }
  };
  const c = config[status ?? "pending"] ?? config.pending;
  return /* @__PURE__ */ jsxDEV(
    "span",
    {
      className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
      style: { background: c.bg, color: c.color },
      children: [
        status === "in_progress" && /* @__PURE__ */ jsxDEV("span", { className: "w-1.5 h-1.5 rounded-full bg-current animate-pulse" }, void 0, false),
        c.label
      ]
    },
    void 0,
    true
  );
}
function StepTimeline({ status }) {
  const { t } = useI18n();
  const steps = [
    { key: "pending", label: t("timeline_accepted"), icon: "✅" },
    { key: "in_progress", label: t("timeline_pickup"), icon: "🛵" },
    { key: "delivered", label: t("timeline_done"), icon: "🏠" }
  ];
  const idx = status === "delivered" ? 2 : status === "in_progress" ? 1 : 0;
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-0 mt-3", children: steps.map(
    (s, i) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center flex-1 last:flex-none", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center", children: [
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
            style: {
              background: i <= idx ? TC : "#E8DDD0",
              color: i <= idx ? "white" : "#9B7060"
            },
            children: i < idx ? /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "w-3.5 h-3.5" }, void 0, false) : i + 1
          },
          void 0,
          false
        ),
        /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] mt-1 text-center w-16", style: { color: i <= idx ? TC : BROWN_LIGHT }, children: s.label }, void 0, false)
      ] }, void 0, true),
      i < steps.length - 1 && /* @__PURE__ */ jsxDEV("div", { className: "flex-1 h-0.5 mb-4 mx-0.5", style: { background: i < idx ? TC : "#E8DDD0" } }, void 0, false)
    ] }, s.key, true)
  ) }, void 0, false);
}
export default function LivreurLivraisonDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { livreur } = useAuth();
  const LIVREUR_ID = livreur?.id ?? 0;
  const BASE_PAY = 7;
  const [pickupConfirmOpen, setPickupConfirmOpen] = useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [confirmCodeError, setConfirmCodeError] = useState("");
  const [gpsTarget, setGpsTarget] = useState<{ address: string; label: string } | null>(null);
  const [showGpsAfterPickup, setShowGpsAfterPickup] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  useEffect(() => {
    if (pickupConfirmOpen || deliveryConfirmOpen) {
      stopContinuousAlarm();
    }
  }, [pickupConfirmOpen, deliveryConfirmOpen]);
  const { data: delivery, isLoading } = useGetDelivery(id, {
    query: { enabled: !!id, queryKey: getGetDeliveryQueryKey(id) }
  });
  const { data: profile } = useGetDeliverer(LIVREUR_ID, {
    query: { enabled: !!LIVREUR_ID, queryKey: getGetDelivererQueryKey(LIVREUR_ID) }
  });
  const updateDelivery = useUpdateDelivery();
  const confirmDelivered = useConfirmDelivered();
  const isPending = updateDelivery.isPending || confirmDelivered.isPending;
  const handlePickupConfirm = () => {
    updateDelivery.mutate({ id, data: { status: "in_progress" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID }) });
        setPickupConfirmOpen(false);
        setShowGpsAfterPickup(true);
      }
    });
  };
  const handleDelivered = () => {
    setConfirmCodeError("");
    confirmDelivered.mutate(
      {
        id,
        data: {
          delivererId: LIVREUR_ID,
          confirmCode: confirmCodeInput.trim() || void 0
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID }) });
          queryClient.invalidateQueries({ queryKey: getGetDeliveryStatsQueryKey({ delivererId: LIVREUR_ID }) });
          setDeliveryConfirmOpen(false);
          setConfirmCodeInput("");
          setShowEarnings(true);
          setTimeout(() => navigate("/livreur"), 2800);
        },
        onError: (err) => {
          const msg = err?.response?.data?.error ?? "Code incorrect ou erreur serveur.";
          setConfirmCodeError(msg);
        }
      }
    );
  };
  const order = parseOrderNotes(delivery?.notes ?? null);
  if (showGpsAfterPickup && delivery) {
    return /* @__PURE__ */ jsxDEV(
      GpsPickerModal,
      {
        address: delivery.deliveryAddress,
        label: t("gps_delivery"),
        onClose: () => setShowGpsAfterPickup(false)
      },
      void 0,
      false
    );
  }
  if (gpsTarget) {
    return /* @__PURE__ */ jsxDEV(
      GpsPickerModal,
      {
        address: gpsTarget.address,
        label: gpsTarget.label,
        onClose: () => setGpsTarget(null)
      },
      void 0,
      false
    );
  }
  if (showEarnings) {
    return /* @__PURE__ */ jsxDEV(LivreurLayout, { children: /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "flex-1 flex flex-col items-center justify-center gap-6 p-8 animate-in fade-in zoom-in-95 duration-300",
        style: { background: SAND },
        children: [
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "w-28 h-28 rounded-full flex items-center justify-center shadow-lg",
              style: { background: GREEN },
              children: /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-14 w-14 text-white" }, void 0, false)
            },
            void 0,
            false
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
            /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-bold mb-1", style: { color: BROWN }, children: t("delivery_success_title") }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm", style: { color: BROWN_LIGHT }, children: t("delivery_success_sub") }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "flex items-center gap-3 px-8 py-5 rounded-2xl border shadow-sm",
              style: { background: "white", borderColor: BORDER },
              children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-12 h-12 rounded-xl flex items-center justify-center",
                    style: { background: "#FEF6E4" },
                    children: /* @__PURE__ */ jsxDEV(Coins, { className: "h-6 w-6", style: { color: GOLD } }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-medium mb-0.5", style: { color: BROWN_LIGHT }, children: t("earned_this_delivery") }, void 0, false),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-3xl font-extrabold", style: { color: GOLD }, children: [
                    "+",
                    BASE_PAY,
                    " Dh"
                  ] }, void 0, true)
                ] }, void 0, true)
              ]
            },
            void 0,
            true
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1.5 mt-2", children: [0, 1, 2].map(
            (i) => /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "w-2 h-2 rounded-full animate-bounce",
                style: { background: GREEN, animationDelay: `${i * 150}ms` }
              },
              i,
              false
            )
          ) }, void 0, false),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: t("returning_dashboard") }, void 0, false)
        ]
      },
      void 0,
      true
    ) }, void 0, false);
  }
  if (isLoading) {
    return /* @__PURE__ */ jsxDEV(LivreurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-8 w-40 rounded-lg", style: { background: "#F5EFE4" } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-32 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-48 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  if (!delivery) {
    return /* @__PURE__ */ jsxDEV(LivreurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 flex flex-col items-center justify-center p-6 text-center", children: [
      /* @__PURE__ */ jsxDEV(UtensilsCrossed, { className: "h-16 w-16 mb-4", style: { color: "#D0BEB0" } }, void 0, false),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-bold mb-2", style: { color: BROWN }, children: t("not_found") }, void 0, false),
      /* @__PURE__ */ jsxDEV(Link, { href: "/livreur/livraisons", children: /* @__PURE__ */ jsxDEV("button", { className: "mt-4 px-6 py-2.5 rounded-xl font-semibold text-white", style: { background: TC }, children: t("back_to_deliveries") }, void 0, false) }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  const isActive = delivery.status === "pending" || delivery.status === "in_progress";
  return /* @__PURE__ */ jsxDEV(LivreurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-auto", style: { background: SAND }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b",
        style: { background: "white", borderColor: BORDER },
        children: [
          /* @__PURE__ */ jsxDEV(Link, { href: "/livreur/livraisons", children: /* @__PURE__ */ jsxDEV("button", { className: "w-8 h-8 rounded-full flex items-center justify-center", style: { background: SAND }, children: /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "h-4 w-4", style: { color: BROWN } }, void 0, false) }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-mono", style: { color: BROWN_LIGHT }, children: delivery.trackingNumber }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold truncate", style: { color: BROWN }, children: delivery.customerName }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                const url = `${window.location.origin}${import.meta.env.BASE_URL}suivi/${delivery.trackingNumber}`;
                if (navigator.share) {
                  navigator.share({ title: "Suivi Bridge", text: `Suivez votre livraison : ${delivery.trackingNumber}`, url });
                } else {
                  navigator.clipboard?.writeText(url);
                }
              },
              className: "w-8 h-8 rounded-full flex items-center justify-center mr-1",
              style: { background: "#FDEEE9" },
              title: "Partager le lien de suivi",
              children: /* @__PURE__ */ jsxDEV(Share2, { className: "h-4 w-4", style: { color: TC } }, void 0, false)
            },
            void 0,
            false
          ),
          /* @__PURE__ */ jsxDEV(StatusPill, { status: delivery.status }, void 0, false)
        ]
      },
      void 0,
      true
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-4 max-w-lg mx-auto pb-32", children: [
      /* @__PURE__ */ jsxDEV(StepTimeline, { status: delivery.status }, void 0, false),
      delivery.status === "pending" && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl border p-4 flex items-center gap-3",
          style: { background: "#FEF6E4", borderColor: "#D4880C40" },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", style: { background: "#D4880C20" }, children: /* @__PURE__ */ jsxDEV(Bike, { className: "h-5 w-5", style: { color: GOLD } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: BROWN }, children: t("pickup_heading") }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-0.5", style: { color: BROWN_MID }, children: delivery.pickupAddress }, void 0, false)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      delivery.status === "in_progress" && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl border p-4 flex items-center gap-3",
          style: { background: "#FDEEE9", borderColor: TC + "40" },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", style: { background: TC + "20" }, children: /* @__PURE__ */ jsxDEV(Package, { className: "h-5 w-5 animate-pulse", style: { color: TC } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: BROWN }, children: t("delivering_heading") }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-0.5", style: { color: BROWN_MID }, children: delivery.deliveryAddress }, void 0, false)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      (delivery.status === "in_progress" || delivery.status === "delivered") && profile && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl border overflow-hidden",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2 flex items-center gap-2 border-b", style: { background: "#FDEEE9", borderColor: TC + "30" }, children: [
              /* @__PURE__ */ jsxDEV(Bike, { className: "h-3.5 w-3.5", style: { color: TC } }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold uppercase tracking-wide", style: { color: TC }, children: delivery.status === "in_progress" ? t("livreur_en_route") : t("livreur_delivered") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex items-center gap-4", children: [
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 shadow-sm",
                  style: { background: TC },
                  children: profile.name.charAt(0).toUpperCase()
                },
                void 0,
                false
              ),
              /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxDEV("p", { className: "font-bold text-base", style: { color: BROWN }, children: profile.name }, void 0, false),
                /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-mono", style: { color: BROWN_LIGHT }, children: profile.phone }, void 0, false),
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 mt-1", children: [
                  [1, 2, 3, 4, 5].map(
                    (s) => /* @__PURE__ */ jsxDEV(
                      Star,
                      {
                        className: "w-3.5 h-3.5",
                        style: {
                          fill: s <= Math.round(profile.rating) ? GOLD : "transparent",
                          color: s <= Math.round(profile.rating) ? GOLD : BORDER
                        }
                      },
                      s,
                      false
                    )
                  ),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-xs ml-1 font-medium", style: { color: BROWN_MID }, children: profile.rating.toFixed(1) }, void 0, false)
                ] }, void 0, true)
              ] }, void 0, true)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      (order.items.length > 0 || order.total) && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl border overflow-hidden",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
              /* @__PURE__ */ jsxDEV(ShoppingBag, { className: "h-4 w-4", style: { color: TC } }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: BROWN }, children: t("order_items") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-2", children: [
              order.items.length > 0 ? order.items.map(
                (item, i) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between py-1.5 border-b last:border-0", style: { borderColor: BORDER }, children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "w-1.5 h-1.5 rounded-full flex-shrink-0", style: { background: TC } }, void 0, false),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium", style: { color: BROWN }, children: item }, void 0, false)
                ] }, void 0, true) }, i, false)
              ) : /* @__PURE__ */ jsxDEV("p", { className: "text-sm italic", style: { color: BROWN_LIGHT }, children: t("no_instructions") }, void 0, false),
              order.total && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between pt-2 mt-1 border-t", style: { borderColor: BORDER }, children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-semibold", style: { color: BROWN_MID }, children: t("order_total") }, void 0, false),
                /* @__PURE__ */ jsxDEV("span", { className: "text-base font-bold", style: { color: TC }, children: order.total }, void 0, false)
              ] }, void 0, true),
              order.extra && /* @__PURE__ */ jsxDEV("p", { className: "text-xs italic px-1 pt-1", style: { color: BROWN_LIGHT }, children: [
                "📝 ",
                order.extra
              ] }, void 0, true)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      order.items.length === 0 && delivery.notes && !order.total && /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4", style: { background: "white", borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold mb-1", style: { color: BROWN_MID }, children: t("delivery_notes") }, void 0, false),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm", style: { color: BROWN }, children: delivery.notes }, void 0, false)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: "white", borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4", style: { color: TC } }, void 0, false),
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: BROWN }, children: t("route") }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-0", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center pt-1", children: [
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "w-4 h-4 rounded-full border-2 flex-shrink-0",
                  style: {
                    borderColor: delivery.status === "pending" ? GOLD : BROWN_LIGHT,
                    background: delivery.status === "pending" ? "#FEF6E4" : "#E4F5EC"
                  }
                },
                void 0,
                false
              ),
              /* @__PURE__ */ jsxDEV("div", { className: "w-0.5 flex-1 my-1", style: { background: delivery.status === "pending" ? GOLD + "50" : BORDER, minHeight: 24 } }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 pb-4 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-wide mb-0.5", style: { color: delivery.status === "pending" ? GOLD : BROWN_LIGHT }, children: [
                t("pickup_point"),
                delivery.status === "pending" && /* @__PURE__ */ jsxDEV("span", { className: "ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold", style: { background: GOLD + "20", color: GOLD }, children: "← Étape 1" }, void 0, false)
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN }, children: delivery.pickupAddress }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "mt-2 flex gap-2 flex-wrap", children: /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setGpsTarget({ address: delivery.pickupAddress, label: t("gps_pickup") }),
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
                  style: { background: SAND, color: BROWN_MID, border: `1px solid ${BORDER}` },
                  children: [
                    /* @__PURE__ */ jsxDEV(Navigation, { className: "h-3 w-3" }, void 0, false),
                    t("navigate_pickup")
                  ]
                },
                void 0,
                true
              ) }, void 0, false)
            ] }, void 0, true)
          ] }, void 0, true),
          delivery.status === "pending" && /* @__PURE__ */ jsxDEV("div", { className: "my-3 -mx-4 px-4 py-3 border-y", style: { background: "#FFF8E8", borderColor: GOLD + "40" }, children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] font-extrabold uppercase tracking-wider mb-2 text-center", style: { color: GOLD }, children: "✋ Étape intermédiaire" }, void 0, false),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setPickupConfirmOpen(true),
                disabled: isPending,
                className: "w-full h-14 rounded-2xl font-extrabold text-base text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-md",
                style: { background: `linear-gradient(135deg, ${GOLD} 0%, #B8740A 100%)` },
                children: [
                  /* @__PURE__ */ jsxDEV(Package, { className: "h-5 w-5" }, void 0, false),
                  "J'ai pris la commande",
                  /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-5 w-5" }, void 0, false)
                ]
              },
              void 0,
              true
            ),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] mt-2 text-center font-medium", style: { color: BROWN_MID }, children: "Appuyez après avoir récupéré la commande au restaurant. Le client sera notifié et verra votre position en temps réel." }, void 0, false)
          ] }, void 0, true),
          (delivery.status === "in_progress" || delivery.status === "delivered") && /* @__PURE__ */ jsxDEV("div", { className: "my-3 -mx-4 px-4 py-2 flex items-center justify-center gap-2 border-y", style: { background: "#E4F5EC", borderColor: GREEN + "40" }, children: [
            /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold", style: { color: GREEN }, children: "Commande récupérée — en route vers le client" }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center pt-1", children: /* @__PURE__ */ jsxDEV("div", { className: "w-4 h-4 rounded-full flex-shrink-0", style: {
              background: delivery.status === "in_progress" ? TC : delivery.status === "delivered" ? GREEN : "#D0BEB0"
            } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-wide mb-0.5", style: { color: delivery.status === "in_progress" ? TC : delivery.status === "delivered" ? GREEN : BROWN_LIGHT }, children: [
                t("destination"),
                delivery.status === "in_progress" && /* @__PURE__ */ jsxDEV("span", { className: "ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold", style: { background: TC + "20", color: TC }, children: "← Étape 2" }, void 0, false)
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold", style: { color: BROWN }, children: delivery.deliveryAddress }, void 0, false),
              delivery.status !== "pending" && /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setGpsTarget({ address: delivery.deliveryAddress, label: t("gps_delivery") }),
                  className: "mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white",
                  style: { background: delivery.status === "in_progress" ? TC : GREEN },
                  children: [
                    /* @__PURE__ */ jsxDEV(Navigation, { className: "h-3 w-3" }, void 0, false),
                    t("navigate_delivery")
                  ]
                },
                void 0,
                true
              ),
              delivery.status === "in_progress" && /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setDeliveryConfirmOpen(true),
                  disabled: isPending,
                  className: "mt-2 w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-sm",
                  style: { background: GREEN },
                  children: [
                    /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-4 w-4" }, void 0, false),
                    t("confirm_delivered_btn")
                  ]
                },
                void 0,
                true
              )
            ] }, void 0, true)
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: "white", borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(UtensilsCrossed, { className: "h-4 w-4", style: { color: TC } }, void 0, false),
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: BROWN }, children: t("customer") }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex items-center gap-4", children: [
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0",
              style: { background: GOLD },
              children: delivery.customerName.charAt(0).toUpperCase()
            },
            void 0,
            false
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "font-bold", style: { color: BROWN }, children: delivery.customerName }, void 0, false),
            delivery.customerPhone && /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-mono", style: { color: BROWN_LIGHT }, children: delivery.customerPhone }, void 0, false)
          ] }, void 0, true),
          delivery.customerPhone && /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `tel:${delivery.customerPhone}`,
              className: "w-11 h-11 rounded-full flex items-center justify-center text-white flex-shrink-0",
              style: { background: GREEN },
              children: /* @__PURE__ */ jsxDEV(Phone, { className: "h-5 w-5" }, void 0, false)
            },
            void 0,
            false
          )
        ] }, void 0, true)
      ] }, void 0, true),
      (delivery.estimatedDeliveryTime || delivery.weight) && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3", children: [
        delivery.estimatedDeliveryTime && /* @__PURE__ */ jsxDEV("div", { className: "flex-1 rounded-2xl border p-3 flex items-center gap-2", style: { background: "white", borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(Clock, { className: "h-4 w-4 flex-shrink-0", style: { color: GOLD } }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: t("est_time") }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: BROWN }, children: delivery.estimatedDeliveryTime }, void 0, false)
          ] }, void 0, true)
        ] }, void 0, true),
        delivery.weight && /* @__PURE__ */ jsxDEV("div", { className: "flex-1 rounded-2xl border p-3 flex items-center gap-2", style: { background: "white", borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(ShoppingBag, { className: "h-4 w-4 flex-shrink-0", style: { color: TC } }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: t("weight") }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: BROWN }, children: [
              delivery.weight,
              " ",
              t("kg")
            ] }, void 0, true)
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true),
      delivery.status === "delivered" && /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-5 text-center", style: { background: "#E4F5EC", borderColor: "#A8DFC1" }, children: [
        /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-10 w-10 mx-auto mb-2", style: { color: GREEN } }, void 0, false),
        /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-lg", style: { color: GREEN }, children: t("status_delivered") }, void 0, false),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm mt-1", style: { color: "#2A5C38" }, children: t("delivery_done_msg") }, void 0, false)
      ] }, void 0, true)
    ] }, void 0, true),
    isActive && /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "fixed bottom-20 left-0 right-0 px-4 z-30",
        style: { maxWidth: 440, margin: "0 auto" },
        children: delivery.status === "pending" ? /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setPickupConfirmOpen(true),
            disabled: isPending,
            className: "w-full h-14 rounded-2xl font-bold text-base text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60",
            style: { background: GOLD },
            children: [
              /* @__PURE__ */ jsxDEV(Package, { className: "h-5 w-5" }, void 0, false),
              t("start_delivery_btn"),
              /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-5 w-5" }, void 0, false)
            ]
          },
          void 0,
          true
        ) : delivery.status === "in_progress" ? /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setDeliveryConfirmOpen(true),
            disabled: isPending,
            className: "w-full h-14 rounded-2xl font-bold text-base text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60",
            style: { background: GREEN },
            children: [
              /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-5 w-5" }, void 0, false),
              t("confirm_delivered_btn")
            ]
          },
          void 0,
          true
        ) : null
      },
      void 0,
      false
    ),
    pickupConfirmOpen && /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "fixed inset-0 z-[80] flex items-end sm:items-center justify-center",
        style: { background: "rgba(44,24,16,0.7)", backdropFilter: "blur(8px)" },
        children: /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 duration-300",
            style: { background: "white", borderColor: GOLD + "60" },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "h-1.5 w-full", style: { background: `linear-gradient(90deg, ${GOLD}, ${TC})` } }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "p-6 text-center", children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                    style: { background: "#FEF6E4" },
                    children: /* @__PURE__ */ jsxDEV(Package, { className: "h-8 w-8", style: { color: GOLD } }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("h3", { className: "text-xl font-bold mb-2", style: { color: BROWN }, children: t("pickup_confirm_title") }, void 0, false),
                /* @__PURE__ */ jsxDEV("p", { className: "text-sm mb-2", style: { color: BROWN_MID }, children: delivery.customerName }, void 0, false),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "rounded-xl p-3 mb-5 border text-left",
                    style: { background: SAND, borderColor: BORDER },
                    children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-2", children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5", style: { borderColor: GOLD, background: "#FEF6E4" } }, void 0, false),
                        /* @__PURE__ */ jsxDEV("div", { children: [
                          /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] font-bold uppercase tracking-wide", style: { color: BROWN_LIGHT }, children: "Restaurant" }, void 0, false),
                          /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN }, children: delivery.pickupAddress }, void 0, false)
                        ] }, void 0, true)
                      ] }, void 0, true),
                      /* @__PURE__ */ jsxDEV("div", { className: "ml-2.5 w-0.5 h-4 my-1", style: { background: BORDER } }, void 0, false),
                      /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-2", children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "w-5 h-5 rounded-full flex-shrink-0 mt-0.5", style: { background: TC } }, void 0, false),
                        /* @__PURE__ */ jsxDEV("div", { children: [
                          /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] font-bold uppercase tracking-wide", style: { color: BROWN_LIGHT }, children: t("destination") }, void 0, false),
                          /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN }, children: delivery.deliveryAddress }, void 0, false)
                        ] }, void 0, true)
                      ] }, void 0, true)
                    ]
                  },
                  void 0,
                  true
                ),
                /* @__PURE__ */ jsxDEV("p", { className: "text-xs mb-5", style: { color: BROWN_LIGHT }, children: t("pickup_confirm_sub") }, void 0, false),
                /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => setPickupConfirmOpen(false),
                      className: "h-12 rounded-xl font-semibold border",
                      style: { borderColor: BORDER, color: BROWN_MID, background: SAND },
                      children: t("back")
                    },
                    void 0,
                    false
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: handlePickupConfirm,
                      disabled: isPending,
                      className: "h-12 rounded-xl font-bold text-white disabled:opacity-60",
                      style: { background: GOLD },
                      children: isPending ? "…" : t("pickup_confirm_btn")
                    },
                    void 0,
                    false
                  )
                ] }, void 0, true)
              ] }, void 0, true)
            ]
          },
          void 0,
          true
        )
      },
      void 0,
      false
    ),
    deliveryConfirmOpen && /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "fixed inset-0 z-[80] flex items-end sm:items-center justify-center",
        style: { background: "rgba(44,24,16,0.7)", backdropFilter: "blur(8px)" },
        children: /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 duration-300",
            style: { background: "white", borderColor: GREEN + "40" },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "h-1.5 w-full", style: { background: `linear-gradient(90deg, ${GREEN}, ${GOLD})` } }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "p-6", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-4", children: [
                  /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      className: "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3",
                      style: { background: "#E4F5EC" },
                      children: /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-7 w-7", style: { color: GREEN } }, void 0, false)
                    },
                    void 0,
                    false
                  ),
                  /* @__PURE__ */ jsxDEV("h3", { className: "text-xl font-bold", style: { color: BROWN }, children: t("confirm_delivery_title") }, void 0, false),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-sm mt-1", style: { color: BROWN_MID }, children: [
                    delivery.customerName,
                    " · ",
                    delivery.deliveryAddress
                  ] }, void 0, true)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "rounded-2xl border overflow-hidden mb-4",
                    style: { borderColor: GREEN + "60", background: "#E4F5EC" },
                    children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2.5 border-b", style: { borderColor: GREEN + "30" }, children: /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest", style: { color: GREEN }, children: "🔐 Code du client (anti-triche)" }, void 0, false) }, void 0, false),
                      /* @__PURE__ */ jsxDEV("div", { className: "p-4", children: [
                        /* @__PURE__ */ jsxDEV("p", { className: "text-xs mb-3", style: { color: "#2A5C38" }, children: "Demandez le code à 4 chiffres au client et saisissez-le ci-dessous :" }, void 0, false),
                        /* @__PURE__ */ jsxDEV(
                          "input",
                          {
                            type: "number",
                            inputMode: "numeric",
                            pattern: "[0-9]{4}",
                            maxLength: 4,
                            value: confirmCodeInput,
                            onChange: (e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                              setConfirmCodeInput(val);
                              setConfirmCodeError("");
                            },
                            placeholder: "_ _ _ _",
                            className: "w-full h-14 rounded-xl border text-center text-3xl font-mono font-bold tracking-[0.5em] outline-none transition-all",
                            style: {
                              borderColor: confirmCodeError ? "#DC2626" : confirmCodeInput.length === 4 ? GREEN : BORDER,
                              background: "white",
                              color: BROWN
                            }
                          },
                          void 0,
                          false
                        ),
                        confirmCodeError && /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-2 text-center font-medium", style: { color: "#DC2626" }, children: [
                          "⚠️ ",
                          confirmCodeError
                        ] }, void 0, true)
                      ] }, void 0, true)
                    ]
                  },
                  void 0,
                  true
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        setDeliveryConfirmOpen(false);
                        setConfirmCodeInput("");
                        setConfirmCodeError("");
                      },
                      className: "h-12 rounded-xl font-semibold border",
                      style: { borderColor: BORDER, color: BROWN_MID, background: SAND },
                      children: t("back")
                    },
                    void 0,
                    false
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: handleDelivered,
                      disabled: isPending || confirmCodeInput.length !== 4,
                      className: "h-12 rounded-xl font-bold text-white disabled:opacity-50",
                      style: { background: GREEN },
                      children: isPending ? "…" : t("confirm_delivered_btn")
                    },
                    void 0,
                    false
                  )
                ] }, void 0, true)
              ] }, void 0, true)
            ]
          },
          void 0,
          true
        )
      },
      void 0,
      false
    )
  ] }, void 0, true) }, void 0, false);
}
