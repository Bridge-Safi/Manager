// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import {
  MapPin,
  Phone,
  Star,
  Bike,
  CheckCircle2,
  Clock,
  Package,
  Loader2,
  AlertCircle,
  Navigation,
  Timer
} from "lucide-react";
import { TrackingMap, geocodeAddress } from "../components/TrackingMap";
const TC = "#C14B2A";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
const STATUS_STEPS = [
  { key: "pending", label: "En attente", icon: Clock },
  { key: "in_progress", label: "En route", icon: Bike },
  { key: "delivered", label: "Livré ✓", icon: CheckCircle2 }
];
function statusIndex(status) {
  if (status === "delivered" || status === "cancelled") return 2;
  if (status === "in_progress") return 1;
  return 0;
}
function formatElapsed(sinceIso) {
  if (!sinceIso) return "0:00";
  const ms = Date.now() - new Date(sinceIso).getTime();
  if (ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1e3);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export default function SuiviPage() {
  const params = useParams();
  const trackingNumber = params.trackingNumber;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [destCoords, setDestCoords] = useState(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!trackingNumber) return;
    let cancelled = false;
    async function fetchTracking() {
      try {
        const res = await fetch(`${BASE}/api/tracking/${trackingNumber}`);
        if (!res.ok) throw new Error("Commande introuvable");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message ?? "Erreur réseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTracking();
    const interval = setInterval(fetchTracking, 1e4);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trackingNumber]);
  useEffect(() => {
    if (data?.status !== "in_progress" || !data?.pickedUpAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1e3);
    return () => clearInterval(id);
  }, [data?.status, data?.pickedUpAt]);
  useEffect(() => {
    if (!data?.deliveryAddress || destCoords) return;
    let cancelled = false;
    geocodeAddress(data.deliveryAddress).then((coords) => {
      if (!cancelled && coords) setDestCoords(coords);
    });
    return () => {
      cancelled = true;
    };
  }, [data?.deliveryAddress, destCoords]);
  if (loading) {
    return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen flex flex-col items-center justify-center gap-3", style: { background: SAND }, children: [
      /* @__PURE__ */ jsxDEV(Loader2, { className: "h-10 w-10 animate-spin", style: { color: TC } }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN_MID }, children: "Chargement du suivi…" }, void 0, false)
    ] }, void 0, true);
  }
  if (error || !data) {
    return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen flex flex-col items-center justify-center gap-4 p-6", style: { background: SAND }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-20 h-20 rounded-3xl flex items-center justify-center", style: { background: "#FDECEA" }, children: /* @__PURE__ */ jsxDEV(AlertCircle, { className: "h-10 w-10", style: { color: TC } }, void 0, false) }, void 0, false),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-xl font-bold text-center", style: { color: BROWN }, children: "Commande introuvable" }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-center", style: { color: BROWN_LIGHT }, children: [
        "Le numéro de suivi ",
        /* @__PURE__ */ jsxDEV("strong", { children: trackingNumber }, void 0, false),
        " ne correspond à aucune commande."
      ] }, void 0, true)
    ] }, void 0, true);
  }
  const stepIdx = statusIndex(data.status);
  const isCancelled = data.status === "cancelled";
  const isDelivered = data.status === "delivered";
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen", style: { background: SAND }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "relative overflow-hidden px-5 pt-12 pb-8",
        style: { background: `linear-gradient(160deg, ${TC} 0%, #A03820 100%)` },
        children: [
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "absolute inset-0 opacity-10 pointer-events-none select-none",
              style: {
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5l4.5 13.8H48L37 27.4l4.5 13.8L30 32.6l-11.5 8.6L23 27.4 12 19.8h13.5z' fill='white' fill-opacity='1'/%3E%3C/svg%3E")`,
                backgroundSize: "60px 60px"
              }
            },
            void 0,
            false
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-4", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl flex items-center justify-center", style: { background: "rgba(255,255,255,0.15)" }, children: /* @__PURE__ */ jsxDEV(Package, { className: "h-6 w-6 text-white" }, void 0, false) }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-xs font-medium", children: "Suivi de livraison" }, void 0, false),
                /* @__PURE__ */ jsxDEV("h1", { className: "text-white font-bold text-base", children: data.trackingNumber }, void 0, false)
              ] }, void 0, true)
            ] }, void 0, true),
            isCancelled ? /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl px-4 py-2 text-center", style: { background: "rgba(255,255,255,0.15)" }, children: /* @__PURE__ */ jsxDEV("p", { className: "text-white font-bold", children: "Commande annulée" }, void 0, false) }, void 0, false) : /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: STATUS_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === stepIdx;
              const isDone = i < stepIdx;
              return /* @__PURE__ */ jsxDEV("div", { className: "flex-1 flex flex-col items-center gap-1 relative", children: [
                i < STATUS_STEPS.length - 1 && /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "absolute top-4 left-1/2 w-full h-0.5 -z-0",
                    style: { background: isDone || isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all",
                    style: {
                      background: isActive || isDone ? "white" : "rgba(255,255,255,0.2)"
                    },
                    children: /* @__PURE__ */ jsxDEV(
                      Icon,
                      {
                        className: "h-4 w-4",
                        style: { color: isActive || isDone ? TC : "rgba(255,255,255,0.5)" }
                      },
                      void 0,
                      false
                    )
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV(
                  "p",
                  {
                    className: "text-xs font-medium text-center leading-tight",
                    style: { color: isActive || isDone ? "white" : "rgba(255,255,255,0.5)" },
                    children: step.label
                  },
                  void 0,
                  false
                )
              ] }, step.key, true);
            }) }, void 0, false)
          ] }, void 0, true)
        ]
      },
      void 0,
      true
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-5 flex flex-col gap-4", style: { maxWidth: 480, margin: "0 auto" }, children: [
      data.status === "in_progress" && data.deliverer?.lastLat != null && data.deliverer?.lastLng != null && /* @__PURE__ */ jsxDEV("div", { className: "rounded-3xl border overflow-hidden shadow-sm", style: { background: "white", borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center justify-between border-b", style: { borderColor: BORDER, background: "#FDEEE9" }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "relative flex h-2.5 w-2.5", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", style: { background: TC } }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "relative inline-flex rounded-full h-2.5 w-2.5", style: { background: TC } }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: TC }, children: "Livreur en route — direct" }, void 0, false)
          ] }, void 0, true),
          data.pickedUpAt && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 px-2.5 py-1 rounded-full", style: { background: "white", border: `1px solid ${TC}30` }, children: [
            /* @__PURE__ */ jsxDEV(Timer, { className: "h-3.5 w-3.5", style: { color: TC } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold tabular-nums", style: { color: TC }, children: formatElapsed(data.pickedUpAt) }, void 0, false)
          ] }, void 0, true)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV(
          TrackingMap,
          {
            delivererLat: data.deliverer.lastLat,
            delivererLng: data.deliverer.lastLng,
            delivererName: data.deliverer.name,
            delivererPhotoUrl: data.deliverer.photoUrl,
            destinationLat: destCoords?.lat ?? null,
            destinationLng: destCoords?.lng ?? null
          },
          void 0,
          false
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2.5 text-[11px] flex items-center justify-center gap-1.5", style: { color: BROWN_LIGHT }, children: [
          /* @__PURE__ */ jsxDEV(Navigation, { className: "h-3 w-3" }, void 0, false),
          /* @__PURE__ */ jsxDEV("span", { children: "Position rafraîchie automatiquement toutes les 10 secondes" }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true),
      data.deliverer ? /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-3xl border overflow-hidden shadow-sm",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "h-1", style: { background: isDelivered ? GREEN : TC } }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "p-4", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold mb-3", style: { color: BROWN_LIGHT }, children: "VOTRE LIVREUR" }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden border-2",
                    style: { borderColor: isDelivered ? GREEN : TC },
                    children: data.deliverer.photoUrl ? /* @__PURE__ */ jsxDEV(
                      "img",
                      {
                        src: data.deliverer.photoUrl,
                        alt: data.deliverer.name,
                        className: "w-full h-full object-cover"
                      },
                      void 0,
                      false
                    ) : /* @__PURE__ */ jsxDEV(
                      "div",
                      {
                        className: "w-full h-full flex items-center justify-center text-2xl font-bold text-white",
                        style: { background: TC },
                        children: data.deliverer.name.charAt(0).toUpperCase()
                      },
                      void 0,
                      false
                    )
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxDEV("h2", { className: "text-lg font-bold leading-tight", style: { color: BROWN }, children: data.deliverer.name }, void 0, false),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 mt-0.5", children: [
                    [1, 2, 3, 4, 5].map(
                      (s) => /* @__PURE__ */ jsxDEV(
                        Star,
                        {
                          className: "h-3.5 w-3.5",
                          style: {
                            fill: s <= Math.round(data.deliverer.rating) ? GOLD : "transparent",
                            color: s <= Math.round(data.deliverer.rating) ? GOLD : BORDER
                          }
                        },
                        s,
                        false
                      )
                    ),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-xs ml-1 font-semibold", style: { color: GOLD }, children: data.deliverer.rating.toFixed(1) }, void 0, false)
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 mt-1", children: [
                    /* @__PURE__ */ jsxDEV(Bike, { className: "h-3.5 w-3.5", style: { color: BROWN_LIGHT } }, void 0, false),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-xs capitalize", style: { color: BROWN_LIGHT }, children: data.deliverer.vehicleType === "motorcycle" ? "Moto" : data.deliverer.vehicleType === "bicycle" ? "Vélo" : data.deliverer.vehicleType === "car" ? "Voiture" : data.deliverer.vehicleType }, void 0, false)
                  ] }, void 0, true)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV(
                  "a",
                  {
                    href: `tel:${data.deliverer.phone}`,
                    className: "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95",
                    style: { background: "#E4F5EC" },
                    children: /* @__PURE__ */ jsxDEV(Phone, { className: "h-5 w-5", style: { color: GREEN } }, void 0, false)
                  },
                  void 0,
                  false
                )
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "mt-3 rounded-xl px-3 py-2 flex items-center gap-2",
                  style: { background: SAND, border: `1px solid ${BORDER}` },
                  children: [
                    /* @__PURE__ */ jsxDEV(Phone, { className: "h-4 w-4 flex-shrink-0", style: { color: TC } }, void 0, false),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-semibold", style: { color: BROWN }, children: data.deliverer.phone }, void 0, false),
                    /* @__PURE__ */ jsxDEV(
                      "a",
                      {
                        href: `tel:${data.deliverer.phone}`,
                        className: "ml-auto text-xs font-bold px-3 py-1 rounded-lg text-white",
                        style: { background: TC },
                        children: "Appeler"
                      },
                      void 0,
                      false
                    )
                  ]
                },
                void 0,
                true
              )
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ) : /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-3xl border p-5 flex items-center gap-4",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl flex items-center justify-center", style: { background: SAND }, children: /* @__PURE__ */ jsxDEV(Bike, { className: "h-6 w-6", style: { color: BROWN_LIGHT } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { className: "font-semibold", style: { color: BROWN }, children: "En attente d'un livreur" }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm", style: { color: BROWN_LIGHT }, children: "Un livreur sera assigné dans quelques instants" }, void 0, false)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-3xl border overflow-hidden",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex items-start gap-3 border-b", style: { borderColor: BORDER }, children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", style: { background: "#FEF3C7" }, children: /* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false) }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold mb-0.5", style: { color: BROWN_LIGHT }, children: "POINT DE RETRAIT" }, void 0, false),
                /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN }, children: data.pickupAddress }, void 0, false)
              ] }, void 0, true)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex items-start gap-3", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", style: { background: "#E4F5EC" }, children: /* @__PURE__ */ jsxDEV(Navigation, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false) }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold mb-0.5", style: { color: BROWN_LIGHT }, children: "ADRESSE DE LIVRAISON" }, void 0, false),
                /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN }, children: data.deliveryAddress }, void 0, false)
              ] }, void 0, true)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      data.notes && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-3xl border p-4",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold mb-2", style: { color: BROWN_LIGHT }, children: "DÉTAIL DE LA COMMANDE" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm", style: { color: BROWN_MID }, children: data.notes }, void 0, false)
          ]
        },
        void 0,
        true
      ),
      isDelivered && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-3xl border p-5 text-center",
          style: { background: "#E4F5EC", borderColor: "#A8DFC1" },
          children: [
            /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-10 w-10 mx-auto mb-2", style: { color: GREEN } }, void 0, false),
            /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-lg", style: { color: GREEN }, children: "Commande livrée !" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm mt-1", style: { color: "#2A5C38" }, children: [
              "Votre commande a bien été livrée à ",
              data.deliveryAddress,
              "."
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      data.estimatedDeliveryTime && !isDelivered && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-3xl border p-4 flex items-center gap-3",
          style: { background: "white", borderColor: BORDER },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center", style: { background: "#FEF3C7" }, children: /* @__PURE__ */ jsxDEV(Clock, { className: "h-5 w-5", style: { color: GOLD } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold", style: { color: BROWN_LIGHT }, children: "TEMPS ESTIMÉ" }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: BROWN }, children: data.estimatedDeliveryTime }, void 0, false)
            ] }, void 0, true)
          ]
        },
        void 0,
        true
      ),
      /* @__PURE__ */ jsxDEV("p", { className: "text-center text-xs pb-6", style: { color: BROWN_LIGHT }, children: "Cette page se rafraîchit automatiquement toutes les 15 secondes" }, void 0, false)
    ] }, void 0, true)
  ] }, void 0, true);
}
