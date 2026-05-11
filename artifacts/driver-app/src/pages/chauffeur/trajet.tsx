// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { ChauffeurLayout } from "../../components/layout/ChauffeurLayout";
import {
  useGetTrip,
  getGetTripQueryKey,
  usePickupPassenger,
  useUpdateTrip,
  getGetTripStatsQueryKey,
  getListTripsQueryKey
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Car,
  CheckCircle2,
  Navigation,
  Coins,
  ChevronRight,
  User,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { GpsPickerModal } from "../../components/GpsPickerModal";
import { stopContinuousAlarm } from "../../lib/alarm";
import { useTheme } from "../../lib/theme";
const GOLD = "#D4880C";
const GOLD_DARK = "#A86800";
const GREEN = "#2A7A48";
const TC = "#C14B2A";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
function StepTimeline({ status }) {
  const steps = [
    { label: "Accepté", icon: "✅" },
    { label: "Passager à bord", icon: "🚗" },
    { label: "Course terminée", icon: "🏁" }
  ];
  const idx = status === "completed" ? 2 : status === "in_progress" ? 1 : 0;
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-0", children: steps.map(
    (s, i) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center flex-1 last:flex-none", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center", children: [
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
            style: {
              background: i <= idx ? GOLD : "#E8DDD0",
              color: i <= idx ? "white" : BROWN_LIGHT
            },
            children: i < idx ? /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "w-4 h-4" }, void 0, false) : i + 1
          },
          void 0,
          false
        ),
        /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] mt-1 text-center w-16 leading-tight", style: { color: i <= idx ? GOLD_DARK : BROWN_LIGHT }, children: s.label }, void 0, false)
      ] }, void 0, true),
      i < steps.length - 1 && /* @__PURE__ */ jsxDEV("div", { className: "flex-1 h-0.5 mb-5 mx-1 transition-all", style: { background: i < idx ? GOLD : "#E8DDD0" } }, void 0, false)
    ] }, i, true)
  ) }, void 0, false);
}
export default function ChauffeurTrajetDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { chauffeur } = useAuth();
  const { colors, isDark } = useTheme();
  const driverId = chauffeur?.id ?? 0;
  const [gpsTarget, setGpsTarget] = useState<{ address: string; label: string } | null>(null);
  const [pickupConfirmOpen, setPickupConfirmOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  useEffect(() => {
    stopContinuousAlarm();
  }, []);
  const { data: trip, isLoading } = useGetTrip(id, {
    query: {
      enabled: !!id,
      queryKey: getGetTripQueryKey(id),
      refetchInterval: (query) => {
        const data = query.state.data;
        return data?.status !== "completed" ? 5e3 : false;
      }
    }
  });
  const pickupMutation = usePickupPassenger();
  const completeMutation = useUpdateTrip();
  const isPending = pickupMutation.isPending || completeMutation.isPending;
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListTripsQueryKey({ driverId }) });
    queryClient.invalidateQueries({ queryKey: getGetTripStatsQueryKey({ driverId }) });
  };
  const handlePickupPassenger = () => {
    pickupMutation.mutate(
      { id, data: { driverId } },
      {
        onSuccess: () => {
          invalidateAll();
          setPickupConfirmOpen(false);
        }
      }
    );
  };
  const handleCompleteTrip = () => {
    completeMutation.mutate(
      { id, data: { status: "completed" } },
      {
        onSuccess: () => {
          invalidateAll();
          setCompleteConfirmOpen(false);
          setShowEarnings(true);
          setTimeout(() => navigate("/chauffeur/trajets"), 3e3);
        }
      }
    );
  };
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
    return /* @__PURE__ */ jsxDEV(ChauffeurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 flex flex-col items-center justify-center gap-6 p-8 animate-in fade-in zoom-in-95 duration-300", style: { background: SAND }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-28 h-28 rounded-full flex items-center justify-center shadow-lg", style: { background: GOLD }, children: /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-14 w-14 text-white" }, void 0, false) }, void 0, false),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-bold mb-1", style: { color: BROWN }, children: "Course terminée !" }, void 0, false),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm", style: { color: BROWN_LIGHT }, children: "Excellente course, bonne continuation 🚖" }, void 0, false)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 px-8 py-5 rounded-2xl border shadow-sm", style: { background: "white", borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-xl flex items-center justify-center", style: { background: "#FEF6E4" }, children: /* @__PURE__ */ jsxDEV(Coins, { className: "h-6 w-6", style: { color: GOLD } }, void 0, false) }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-medium mb-0.5", style: { color: BROWN_LIGHT }, children: "Tarif encaissé" }, void 0, false),
          /* @__PURE__ */ jsxDEV("p", { className: "text-3xl font-extrabold", style: { color: GOLD }, children: [
            trip?.fare?.toFixed(0),
            " DH"
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1.5 mt-2", children: [0, 1, 2].map(
        (i) => /* @__PURE__ */ jsxDEV("span", { className: "w-2 h-2 rounded-full animate-bounce", style: { background: GOLD, animationDelay: `${i * 150}ms` } }, i, false)
      ) }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: "Retour au tableau de bord…" }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  if (isLoading) {
    return /* @__PURE__ */ jsxDEV(ChauffeurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-8 w-40 rounded-lg", style: { background: "#F5EFE4" } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-32 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-48 w-full rounded-2xl", style: { background: "#F5EFE4" } }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  if (!trip) {
    return /* @__PURE__ */ jsxDEV(ChauffeurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 flex flex-col items-center justify-center p-6 text-center", children: [
      /* @__PURE__ */ jsxDEV(Car, { className: "h-16 w-16 mb-4", style: { color: "#D0BEB0" } }, void 0, false),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-bold mb-2", style: { color: BROWN }, children: "Course introuvable" }, void 0, false),
      /* @__PURE__ */ jsxDEV(Link, { href: "/chauffeur/trajets", children: /* @__PURE__ */ jsxDEV("button", { className: "mt-4 px-6 py-2.5 rounded-xl font-semibold text-white", style: { background: GOLD }, children: "Retour aux trajets" }, void 0, false) }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  const isActive = trip.status === "scheduled" || trip.status === "in_progress";
  return /* @__PURE__ */ jsxDEV(ChauffeurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-auto", style: { background: colors.bg }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b",
        style: { background: colors.bgCard, borderColor: BORDER },
        children: [
          /* @__PURE__ */ jsxDEV(Link, { href: "/chauffeur/trajets", children: /* @__PURE__ */ jsxDEV("button", { className: "w-8 h-8 rounded-full flex items-center justify-center", style: { background: isDark ? "#2A2010" : SAND }, children: /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "h-4 w-4", style: { color: BROWN } }, void 0, false) }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-mono", style: { color: BROWN_LIGHT }, children: [
              "Course #",
              trip.id.toString().padStart(5, "0")
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold truncate", style: { color: colors.text }, children: trip.passengerName }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV(
            "span",
            {
              className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0",
              style: trip.status === "completed" ? { background: "#E4F5EC", color: GREEN } : trip.status === "in_progress" ? { background: "#FEF6E4", color: GOLD_DARK } : { background: SAND, color: BROWN_MID },
              children: [
                trip.status === "in_progress" && /* @__PURE__ */ jsxDEV("span", { className: "w-1.5 h-1.5 rounded-full bg-current animate-pulse" }, void 0, false),
                trip.status === "scheduled" ? "En attente" : trip.status === "in_progress" ? "En course" : trip.status === "completed" ? "Terminée" : "Annulée"
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
    /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-4 max-w-lg mx-auto pb-32", children: [
      /* @__PURE__ */ jsxDEV(StepTimeline, { status: trip.status }, void 0, false),
      trip.status === "scheduled" && /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 flex items-center gap-3", style: { background: isDark ? "#2A1A0A" : "#FEF6E4", borderColor: GOLD + "40" }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", style: { background: GOLD + "20" }, children: /* @__PURE__ */ jsxDEV(Car, { className: "h-5 w-5", style: { color: GOLD } }, void 0, false) }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: colors.text }, children: "Direction : prise en charge" }, void 0, false),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-0.5", style: { color: BROWN_MID }, children: trip.pickupAddress }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true),
      trip.status === "in_progress" && /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 flex items-center gap-3", style: { background: isDark ? "#0A2015" : "#E4F5EC", borderColor: GREEN + "40" }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", style: { background: GREEN + "20" }, children: /* @__PURE__ */ jsxDEV(Car, { className: "h-5 w-5 animate-pulse", style: { color: GREEN } }, void 0, false) }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: colors.text }, children: "Passager à bord — en route" }, void 0, false),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-0.5", style: { color: BROWN_MID }, children: trip.dropoffAddress }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true),
      trip.status === "completed" && /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-5 text-center", style: { background: "#E4F5EC", borderColor: "#A8DFC1" }, children: [
        /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-10 w-10 mx-auto mb-2", style: { color: GREEN } }, void 0, false),
        /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-lg", style: { color: GREEN }, children: "Course terminée" }, void 0, false),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm mt-1", style: { color: "#2A5C38" }, children: [
          "Tarif : ",
          trip.fare.toFixed(0),
          " DH"
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: colors.bgCard, borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false),
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: colors.text }, children: "Itinéraire" }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-0", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center pt-1", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-4 h-4 rounded-full border-2 flex-shrink-0", style: { borderColor: GOLD, background: isDark ? "#2A1A0A" : "#FEF6E4" } }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "w-0.5 flex-1 my-1", style: { background: BORDER, minHeight: 24 } }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 pb-4 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-wide mb-0.5", style: { color: BROWN_LIGHT }, children: "Prise en charge" }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: colors.text }, children: trip.pickupAddress }, void 0, false),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setGpsTarget({ address: trip.pickupAddress, label: "Prise en charge" }),
                  className: "mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
                  style: { background: isDark ? "#2A1A0A" : SAND, color: BROWN_MID, border: `1px solid ${BORDER}` },
                  children: [
                    /* @__PURE__ */ jsxDEV(Navigation, { className: "h-3 w-3" }, void 0, false),
                    "Naviguer"
                  ]
                },
                void 0,
                true
              )
            ] }, void 0, true)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center pt-1", children: /* @__PURE__ */ jsxDEV("div", { className: "w-4 h-4 rounded-full flex-shrink-0", style: { background: GREEN } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-wide mb-0.5", style: { color: GREEN }, children: "Destination" }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold", style: { color: colors.text }, children: trip.dropoffAddress }, void 0, false),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setGpsTarget({ address: trip.dropoffAddress, label: "Destination" }),
                  className: "mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white",
                  style: { background: GREEN },
                  children: [
                    /* @__PURE__ */ jsxDEV(Navigation, { className: "h-3 w-3" }, void 0, false),
                    "Naviguer vers la destination"
                  ]
                },
                void 0,
                true
              )
            ] }, void 0, true)
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: colors.bgCard, borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(User, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false),
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: colors.text }, children: "Passager" }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex items-center gap-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0", style: { background: GOLD }, children: trip.passengerName.charAt(0).toUpperCase() }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "font-bold", style: { color: colors.text }, children: trip.passengerName }, void 0, false),
            trip.passengerPhone && /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-mono", style: { color: BROWN_LIGHT }, children: trip.passengerPhone }, void 0, false)
          ] }, void 0, true),
          trip.passengerPhone && /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `tel:${trip.passengerPhone}`,
              className: "w-11 h-11 rounded-full flex items-center justify-center text-white flex-shrink-0",
              style: { background: GREEN },
              children: /* @__PURE__ */ jsxDEV(Phone, { className: "h-5 w-5" }, void 0, false)
            },
            void 0,
            false
          )
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: colors.bgCard, borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3.5 flex items-center justify-between border-b", style: { background: isDark ? "#2A1A0A" : "#FEF6E4", borderColor: GOLD + "30" }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-xl flex items-center justify-center", style: { background: GOLD + "20" }, children: /* @__PURE__ */ jsxDEV(Coins, { className: "h-5 w-5", style: { color: GOLD } }, void 0, false) }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-medium", style: { color: BROWN_LIGHT }, children: "Tarif final encaissé" }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-2xl font-extrabold", style: { color: GOLD }, children: [
                trip.fare.toFixed(0),
                " DH"
              ] }, void 0, true)
            ] }, void 0, true)
          ] }, void 0, true),
          trip.distance && trip.distance > 0 ? /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-medium", style: { color: BROWN_LIGHT }, children: "Distance" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-lg font-bold", style: { color: colors.text }, children: [
              trip.distance.toFixed(1),
              " km"
            ] }, void 0, true)
          ] }, void 0, true) : null
        ] }, void 0, true),
        trip.distance && trip.distance > 0 ? /* @__PURE__ */ jsxDEV("div", { className: "divide-y", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2.5 flex justify-between items-center", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs", style: { color: BROWN_LIGHT }, children: "Base forfaitaire" }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold", style: { color: colors.text }, children: [
              (trip.baseFare ?? 5).toFixed(0),
              " DH"
            ] }, void 0, true)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2.5 flex justify-between items-center", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs", style: { color: BROWN_LIGHT }, children: [
              trip.distance.toFixed(1),
              " km × ",
              (trip.pricePerKm ?? 2.5).toFixed(1),
              " DH/km"
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold", style: { color: colors.text }, children: [
              (trip.distance * (trip.pricePerKm ?? 2.5)).toFixed(1),
              " DH"
            ] }, void 0, true)
          ] }, void 0, true),
          trip.suggestedFare && trip.fare !== trip.suggestedFare ? /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2.5 flex justify-between items-center", style: { background: isDark ? "#1A0A00" : "#FFF5F0" }, children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs", style: { color: TC }, children: "Tarif conseillé" }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold", style: { color: TC }, children: [
              trip.suggestedFare.toFixed(0),
              " DH"
            ] }, void 0, true)
          ] }, void 0, true) : null,
          trip.negotiationStatus === "agreed" ? /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2 flex items-center gap-2", style: { background: isDark ? "#0A2015" : "#E4F5EC" }, children: [
            /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-3.5 w-3.5 flex-shrink-0", style: { color: GREEN } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-medium", style: { color: GREEN }, children: "Tarif négocié accepté par le passager" }, void 0, false)
          ] }, void 0, true) : trip.passengerOffer && trip.passengerOffer !== trip.fare ? /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs", style: { color: BROWN_LIGHT }, children: "Offre initiale passager" }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold", style: { color: BROWN_MID }, children: [
              trip.passengerOffer.toFixed(0),
              " DH"
            ] }, void 0, true)
          ] }, void 0, true) : null
        ] }, void 0, true) : null
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 rounded-2xl border p-3 flex items-center gap-2", style: { background: colors.bgCard, borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(Clock, { className: "h-4 w-4 flex-shrink-0", style: { color: GOLD } }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: "Créée" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: colors.text }, children: new Date(trip.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }, void 0, false)
          ] }, void 0, true)
        ] }, void 0, true),
        trip.passengerPickedUpAt && /* @__PURE__ */ jsxDEV("div", { className: "flex-1 rounded-2xl border p-3 flex items-center gap-2", style: { background: isDark ? "#0A2015" : "#E4F5EC", borderColor: GREEN + "40" }, children: [
          /* @__PURE__ */ jsxDEV(Car, { className: "h-4 w-4 flex-shrink-0", style: { color: GREEN } }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: GREEN }, children: "Pris en charge" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: GREEN }, children: new Date(trip.passengerPickedUpAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }, void 0, false)
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true)
    ] }, void 0, true),
    isActive && /* @__PURE__ */ jsxDEV("div", { className: "fixed bottom-20 left-0 right-0 px-4 z-30", style: { maxWidth: 440, margin: "0 auto" }, children: trip.status === "scheduled" ? /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: () => setPickupConfirmOpen(true),
        disabled: isPending,
        className: "w-full h-14 rounded-2xl font-bold text-base text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60",
        style: { background: GOLD },
        children: [
          /* @__PURE__ */ jsxDEV(User, { className: "h-5 w-5" }, void 0, false),
          "J'ai pris en charge le passager",
          /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-5 w-5" }, void 0, false)
        ]
      },
      void 0,
      true
    ) : trip.status === "in_progress" ? /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: () => setCompleteConfirmOpen(true),
        disabled: isPending,
        className: "w-full h-14 rounded-2xl font-bold text-base text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60",
        style: { background: GREEN },
        children: [
          /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-5 w-5" }, void 0, false),
          "Course terminée — Arrivé à destination"
        ]
      },
      void 0,
      true
    ) : null }, void 0, false),
    pickupConfirmOpen && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-[80] flex items-end sm:items-center justify-center", style: { background: "rgba(44,24,16,0.7)", backdropFilter: "blur(8px)" }, children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 duration-300", style: { background: "white", borderColor: GOLD + "60" }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "h-1.5 w-full", style: { background: `linear-gradient(90deg, ${GOLD}, ${TC})` } }, void 0, false),
      /* @__PURE__ */ jsxDEV("div", { className: "p-6 text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", style: { background: "#FEF6E4" }, children: /* @__PURE__ */ jsxDEV(User, { className: "h-8 w-8", style: { color: GOLD } }, void 0, false) }, void 0, false),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-xl font-bold mb-2", style: { color: BROWN }, children: "Passager à bord ?" }, void 0, false),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm mb-5", style: { color: BROWN_MID }, children: [
          "Confirmez que ",
          /* @__PURE__ */ jsxDEV("strong", { children: trip.passengerName }, void 0, false),
          " est bien installé dans votre véhicule."
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl p-3 mb-5 border", style: { background: SAND, borderColor: BORDER }, children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(AlertCircle, { className: "h-4 w-4 flex-shrink-0", style: { color: GOLD } }, void 0, false),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-left", style: { color: BROWN_MID }, children: "Anti-triche : cette action est horodatée et enregistrée." }, void 0, false)
        ] }, void 0, true) }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxDEV("button", { onClick: () => setPickupConfirmOpen(false), className: "h-12 rounded-xl font-semibold border", style: { borderColor: BORDER, color: BROWN_MID, background: SAND }, children: "Annuler" }, void 0, false),
          /* @__PURE__ */ jsxDEV("button", { onClick: handlePickupPassenger, disabled: isPending, className: "h-12 rounded-xl font-bold text-white disabled:opacity-60", style: { background: GOLD }, children: isPending ? "…" : "Confirmer" }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true)
    ] }, void 0, true) }, void 0, false),
    completeConfirmOpen && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-[80] flex items-end sm:items-center justify-center", style: { background: "rgba(44,24,16,0.7)", backdropFilter: "blur(8px)" }, children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 duration-300", style: { background: "white", borderColor: GREEN + "40" }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "h-1.5 w-full", style: { background: GREEN } }, void 0, false),
      /* @__PURE__ */ jsxDEV("div", { className: "p-6 text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", style: { background: "#E4F5EC" }, children: /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-8 w-8", style: { color: GREEN } }, void 0, false) }, void 0, false),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-xl font-bold mb-2", style: { color: BROWN }, children: "Terminer la course ?" }, void 0, false),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm mb-2", style: { color: BROWN_MID }, children: "Vous êtes bien arrivé à :" }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl p-3 mb-5 border", style: { background: SAND, borderColor: BORDER }, children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN }, children: trip.dropoffAddress }, void 0, false) }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl p-3 mb-5 border flex items-center gap-2", style: { background: isDark ? "#2A1A0A" : "#FEF6E4", borderColor: GOLD + "40" }, children: [
          /* @__PURE__ */ jsxDEV(Coins, { className: "h-5 w-5 flex-shrink-0", style: { color: GOLD } }, void 0, false),
          /* @__PURE__ */ jsxDEV("p", { className: "text-base font-bold", style: { color: GOLD_DARK }, children: [
            "Encaissez ",
            trip.fare.toFixed(0),
            " DH auprès du passager"
          ] }, void 0, true)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxDEV("button", { onClick: () => setCompleteConfirmOpen(false), className: "h-12 rounded-xl font-semibold border", style: { borderColor: BORDER, color: BROWN_MID, background: SAND }, children: "Annuler" }, void 0, false),
          /* @__PURE__ */ jsxDEV("button", { onClick: handleCompleteTrip, disabled: isPending, className: "h-12 rounded-xl font-bold text-white disabled:opacity-60", style: { background: GREEN }, children: isPending ? "…" : "Terminer" }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true)
    ] }, void 0, true) }, void 0, false)
  ] }, void 0, true) }, void 0, false);
}
