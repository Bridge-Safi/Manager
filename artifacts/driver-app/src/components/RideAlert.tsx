// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyPendingRide,
  getGetMyPendingRideQueryKey,
  useAcceptRide,
  useRefuseRide,
  useCounterOfferRide,
  getListTripsQueryKey,
  getGetTripStatsQueryKey
} from "@workspace/api-client-react";
import { Bell, Car, Clock, CheckCircle2, XCircle, Phone, TrendingDown, Coins, AlertCircle } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { startContinuousAlarm, stopContinuousAlarm, isAlarmRunning } from "../lib/alarm";
import { RouteMiniMap } from "../components/RouteMiniMap";
import { useLocation } from "wouter";
const GOLD = "#D4880C";
const GOLD_DARK = "#A86800";
const GREEN = "#2A7A48";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const SAND = "#FAF6EF";
const TC = "#C14B2A";
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
const LS_REFUSED = "bridge_refused_rides";
function getRefused() {
  try {
    return JSON.parse(localStorage.getItem(LS_REFUSED) || "[]");
  } catch {
    return [];
  }
}
function addRefused(id: number): void {
  const list = getRefused().filter((x: number) => x !== id);
  list.push(id);
  localStorage.setItem(LS_REFUSED, JSON.stringify(list.slice(-50)));
}
const QUICK_OFFERS = [5, 10, 15, 20, 25, 30, 40, 50];
export function RideAlert({ driverId }: { driverId: number }) {
  const queryClient = useQueryClient();
  const alarmStartedRef = useRef(false);
  const [alertState, setAlertState] = useState("idle");
  const [dismissed, setDismissed] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterValue, setCounterValue] = useState("");
  const [counterError, setCounterError] = useState("");
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const { data: pending } = useGetMyPendingRide(
    { driverId },
    {
      query: {
        queryKey: getGetMyPendingRideQueryKey({ driverId }),
        refetchInterval: alertState === "idle" ? 3e3 : false
      }
    }
  );
  const acceptMutation = useAcceptRide();
  const refuseMutation = useRefuseRide();
  const counterMutation = useCounterOfferRide();
  const secondsLeft = pending?.secondsLeft ?? 300;
  const trip = pending?.trip;
  const isRefused = trip ? getRefused().includes(trip.id) : false;
  const showAlert = pending?.hasPending && !dismissed && !isRefused && alertState === "idle";
  const suggestedFare = trip?.suggestedFare ?? trip?.fare ?? 0;
  const passengerOffer = trip?.passengerOffer ?? trip?.fare ?? 0;
  const km = trip?.distance;
  const pricePerKm = trip?.pricePerKm ?? 2.5;
  const baseFare = trip?.baseFare ?? 5;
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListTripsQueryKey({ driverId }) });
    queryClient.invalidateQueries({ queryKey: getGetTripStatsQueryKey({ driverId }) });
    queryClient.invalidateQueries({ queryKey: getGetMyPendingRideQueryKey({ driverId }) });
  }, [queryClient, driverId]);
  useEffect(() => {
    if (showAlert) {
      if (!alarmStartedRef.current || !isAlarmRunning()) {
        alarmStartedRef.current = true;
        startContinuousAlarm();
      }
    } else {
      if (alarmStartedRef.current) {
        alarmStartedRef.current = false;
        stopContinuousAlarm();
      }
    }
  }, [showAlert]);
  useEffect(() => {
    if (!showAlert) return;
    const id = setInterval(() => {
      if (alarmStartedRef.current && !isAlarmRunning()) {
        startContinuousAlarm();
      }
    }, 2e3);
    return () => clearInterval(id);
  }, [showAlert]);
  useEffect(() => () => stopContinuousAlarm(), []);
  useEffect(() => {
    if (showCounterModal && suggestedFare > 0) {
      setCounterValue(String(Math.round(suggestedFare)));
      setCounterError("");
    }
  }, [showCounterModal, suggestedFare]);
  const handleAccept = useCallback(() => {
    if (!trip) return;
    stopContinuousAlarm();
    alarmStartedRef.current = false;
    acceptMutation.mutate(
      { id: trip.id, data: { driverId } },
      {
        onSuccess: () => {
          setAlertState("accepted");
          invalidateAll();
          setTimeout(() => {
            setAlertState("idle");
            setDismissed(false);
            navigate("/chauffeur/trajets");
          }, 2e3);
        },
        onError: () => setAlertState("idle")
      }
    );
  }, [trip, driverId, acceptMutation, invalidateAll, navigate]);
  const handleRefuse = useCallback(() => {
    if (!trip) return;
    stopContinuousAlarm();
    alarmStartedRef.current = false;
    addRefused(trip.id);
    refuseMutation.mutate(
      { id: trip.id, data: { driverId } },
      {
        onSuccess: () => {
          setAlertState("refused");
          invalidateAll();
          setTimeout(() => {
            setAlertState("idle");
            setDismissed(false);
          }, 3e3);
        }
      }
    );
  }, [trip, driverId, refuseMutation, invalidateAll]);
  const handleCounterOffer = useCallback(() => {
    if (!trip) return;
    const val = parseFloat(counterValue);
    if (isNaN(val) || val < 5) {
      setCounterError("Minimum 5 DH");
      return;
    }
    if (val > 500) {
      setCounterError("Maximum 500 DH");
      return;
    }
    stopContinuousAlarm();
    alarmStartedRef.current = false;
    counterMutation.mutate(
      { id: trip.id, data: { driverId, offeredFare: val } },
      {
        onSuccess: () => {
          setShowCounterModal(false);
          setAlertState("countered");
          invalidateAll();
          setTimeout(() => {
            setAlertState("idle");
            setDismissed(false);
          }, 4e3);
        },
        onError: () => setCounterError("Erreur, réessayez")
      }
    );
  }, [trip, driverId, counterValue, counterMutation, invalidateAll]);
  if (alertState === "accepted") {
    return /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "fixed inset-0 z-[60] flex items-center justify-center", style: { background: "rgba(44,24,16,0.6)", backdropFilter: "blur(4px)" }, children: /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300 border", style: { background: "white", borderColor: "#A8DFC1" }, children: [
      /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center justify-center w-16 h-16 rounded-full border mx-auto mb-4", style: { background: "#E4F5EC", borderColor: "#A8DFC1" }, children: /* @__PURE__ */ jsxDEV(CheckCircle2, {"data-component-name": "CheckCircle2", className: "h-8 w-8", style: { color: GREEN } }, void 0, false) }, void 0, false),
      /* @__PURE__ */ jsxDEV("h2", {"data-component-name": "h2", className: "text-xl font-bold mb-1", style: { color: BROWN }, children: "Course acceptée !" }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-sm", style: { color: BROWN_MID }, children: "Bonne route 🚖" }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  if (alertState === "refused") {
    return /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "fixed inset-0 z-[60] flex items-center justify-center", style: { background: "rgba(44,24,16,0.6)", backdropFilter: "blur(4px)" }, children: /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300 border", style: { background: "white", borderColor: BORDER }, children: [
      /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center justify-center w-16 h-16 rounded-full border mx-auto mb-4", style: { background: "#FAF6EF", borderColor: BORDER }, children: /* @__PURE__ */ jsxDEV(XCircle, {"data-component-name": "XCircle", className: "h-8 w-8", style: { color: "#9B7060" } }, void 0, false) }, void 0, false),
      /* @__PURE__ */ jsxDEV("h2", {"data-component-name": "h2", className: "text-xl font-bold mb-1", style: { color: BROWN }, children: "Course refusée" }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-sm", style: { color: BROWN_MID }, children: "La course reste disponible pour les autres chauffeurs." }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  if (alertState === "countered") {
    return /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "fixed inset-0 z-[60] flex items-center justify-center", style: { background: "rgba(44,24,16,0.6)", backdropFilter: "blur(4px)" }, children: /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300 border", style: { background: "white", borderColor: GOLD + "60" }, children: [
      /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center justify-center w-16 h-16 rounded-full border mx-auto mb-4", style: { background: "#FEF6E4", borderColor: GOLD + "40" }, children: /* @__PURE__ */ jsxDEV(TrendingDown, {"data-component-name": "TrendingDown", className: "h-8 w-8", style: { color: GOLD } }, void 0, false) }, void 0, false),
      /* @__PURE__ */ jsxDEV("h2", {"data-component-name": "h2", className: "text-xl font-bold mb-1", style: { color: BROWN }, children: "Contre-offre envoyée !" }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-sm", style: { color: BROWN_MID }, children: "Le passager va répondre à votre proposition tarifaire." }, void 0, false)
    ] }, void 0, true) }, void 0, false);
  }
  if (!showAlert || !trip) return null;
  const isPending = acceptMutation.isPending || refuseMutation.isPending || counterMutation.isPending;
  const isLowTime = secondsLeft <= 60;
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
      className: "fixed inset-0 z-[60] flex items-end sm:items-center justify-center",
        style: { background: "rgba(44,24,16,0.55)", backdropFilter: "blur(4px)" },
        children: /* @__PURE__ */ jsxDEV(
          "div",
          {
          className: "rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border",
            style: { background: "white", borderColor: GOLD + "60", maxHeight: "90vh" },
            children: [
              /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "h-1 w-full flex-shrink-0", style: { backgroundImage: `repeating-linear-gradient(90deg,${GOLD} 0,${GOLD} 20px,${TC} 20px,${TC} 40px,${GREEN} 40px,${GREEN} 60px,${TC} 60px,${TC} 80px)` } }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "px-5 py-3.5 flex items-center gap-3 border-b flex-shrink-0", style: { background: "#FEF6E4", borderColor: GOLD + "30" }, children: [
                /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "relative flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0", style: { background: GOLD + "20" }, children: [
                  /* @__PURE__ */ jsxDEV(Bell, {"data-component-name": "Bell", className: "h-5 w-5 animate-bounce", style: { color: GOLD } }, void 0, false),
                  /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-white", style: { background: "#E53E3E" } }, void 0, false)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-xs font-bold uppercase tracking-wider", style: { color: GOLD_DARK }, children: "🚖 Nouvelle course" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-xs mt-0.5", style: { color: BROWN_MID }, children: "Acceptez, refusez, ou négociez le tarif" }, void 0, false)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold tabular-nums flex-shrink-0",
                    style: { background: isLowTime ? "#FDEEE9" : "#FAF6EF", color: isLowTime ? "#E53E3E" : GOLD_DARK, border: `1px solid ${GOLD}40` },
                    children: [
                      /* @__PURE__ */ jsxDEV(Clock, {"data-component-name": "Clock", className: "h-3.5 w-3.5" }, void 0, false),
                      formatTime(secondsLeft)
                    ]
                  },
                  void 0,
                  true
                )
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "overflow-y-auto flex-1 p-4 space-y-3.5", children: [
                /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", style: { background: "#FEF6E4", border: `1px solid ${GOLD}40` }, children: /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-lg font-bold", style: { color: GOLD_DARK }, children: trip.passengerName.charAt(0) }, void 0, false) }, void 0, false),
                  /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxDEV("h3", {"data-component-name": "h3", className: "text-base font-bold leading-tight", style: { color: BROWN }, children: trip.passengerName }, void 0, false),
                    trip.passengerPhone && /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center gap-1 mt-0.5", children: [
                      /* @__PURE__ */ jsxDEV(Phone, {"data-component-name": "Phone", className: "h-3 w-3", style: { color: BROWN_MID } }, void 0, false),
                      /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-xs", style: { color: BROWN_MID }, children: trip.passengerPhone }, void 0, false)
                    ] }, void 0, true)
                  ] }, void 0, true)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "rounded-2xl border overflow-hidden", style: { borderColor: GOLD + "50" }, children: [
                  /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "px-4 py-3 flex items-center justify-between", style: { background: "#FEF6E4" }, children: [
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV(Coins, {"data-component-name": "Coins", className: "h-4 w-4", style: { color: GOLD_DARK } }, void 0, false),
                      /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-xs font-bold uppercase tracking-wide", style: { color: GOLD_DARK }, children: "Tarif proposé" }, void 0, false)
                    ] }, void 0, true),
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "text-right", children: /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-2xl font-extrabold", style: { color: GOLD_DARK }, children: [
                      passengerOffer.toFixed(0),
                      " DH"
                    ] }, void 0, true) }, void 0, false)
                  ] }, void 0, true),
                  km && km > 0 ? /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "px-4 py-2.5 border-t flex items-center justify-between", style: { background: "white", borderColor: GOLD + "20" }, children: [
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxDEV(Car, {"data-component-name": "Car", className: "h-3.5 w-3.5", style: { color: BROWN_MID } }, void 0, false),
                      /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-xs", style: { color: BROWN_MID }, children: [
                        km.toFixed(1),
                        " km"
                      ] }, void 0, true),
                      /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-xs", style: { color: "#C8B8A8" }, children: "·" }, void 0, false),
                      /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-xs", style: { color: BROWN_MID }, children: [
                        baseFare,
                        " DH + ",
                        pricePerKm,
                        " DH/km"
                      ] }, void 0, true)
                    ] }, void 0, true),
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center gap-1", children: [
                      /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-xs", style: { color: BROWN_MID }, children: "Suggéré :" }, void 0, false),
                      /* @__PURE__ */ jsxDEV("span", {"data-component-name": "span", className: "text-xs font-bold", style: { color: suggestedFare > passengerOffer ? TC : GREEN }, children: [
                        suggestedFare.toFixed(0),
                        " DH"
                      ] }, void 0, true)
                    ] }, void 0, true)
                  ] }, void 0, true) : null,
                  passengerOffer < suggestedFare && suggestedFare > 0 && /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "px-4 py-2 flex items-center gap-2 border-t", style: { background: "#FFF5F0", borderColor: TC + "20" }, children: [
                    /* @__PURE__ */ jsxDEV(AlertCircle, {"data-component-name": "AlertCircle", className: "h-3.5 w-3.5 flex-shrink-0", style: { color: TC } }, void 0, false),
                    /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-xs", style: { color: TC }, children: [
                      "Le passager propose ",
                      (passengerOffer / suggestedFare * 100).toFixed(0),
                      "% du tarif conseillé. Vous pouvez négocier."
                    ] }, void 0, true)
                  ] }, void 0, true)
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV(
                  RouteMiniMap,
                  {
                  pickupAddress: trip.pickupAddress,
                    dropoffAddress: trip.dropoffAddress,
                    pickupColor: GOLD,
                    dropoffColor: GREEN,
                    height: 140
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "space-y-2.5 relative", children: [
                  /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "absolute left-[9px] top-0 bottom-0 w-0.5", style: { background: BORDER } }, void 0, false),
                  /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "relative flex items-start gap-3", children: [
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center z-10 shrink-0", style: { background: "#FEF6E4", borderColor: GOLD }, children: /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "h-1.5 w-1.5 rounded-full", style: { background: GOLD } }, void 0, false) }, void 0, false),
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", children: [
                      /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-xs uppercase tracking-wide font-semibold", style: { color: BROWN_MID }, children: "Prise en charge" }, void 0, false),
                      /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-sm font-medium", style: { color: BROWN }, children: trip.pickupAddress }, void 0, false)
                    ] }, void 0, true)
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "relative flex items-start gap-3", children: [
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center z-10 shrink-0", style: { background: "#E4F5EC", borderColor: GREEN }, children: /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "h-1.5 w-1.5 rounded-full", style: { background: GREEN } }, void 0, false) }, void 0, false),
                    /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", children: [
                      /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-xs uppercase tracking-wide font-semibold", style: { color: BROWN_MID }, children: "Destination" }, void 0, false),
                      /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-sm font-medium", style: { color: BROWN }, children: trip.dropoffAddress }, void 0, false)
                    ] }, void 0, true)
                  ] }, void 0, true)
                ] }, void 0, true)
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "px-4 py-3.5 flex-shrink-0 border-t space-y-2.5", style: { borderColor: BORDER, background: "white" }, children: [
                /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "grid grid-cols-2 gap-2.5", children: [
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                    onClick: handleRefuse,
                      disabled: isPending,
                      className: "flex items-center justify-center gap-2 font-semibold h-13 rounded-xl transition-all border disabled:opacity-50",
                      style: { borderColor: "#E53E3E50", color: "#E53E3E", background: "#FFF5F5", height: 52 },
                      children: [
                        /* @__PURE__ */ jsxDEV(XCircle, {"data-component-name": "XCircle", className: "h-4 w-4" }, void 0, false),
                        t("dispatch_refuse")
                      ]
                    },
                    void 0,
                    true
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                    onClick: handleAccept,
                      disabled: isPending,
                      className: "flex items-center justify-center gap-2 font-bold rounded-xl transition-all text-white disabled:opacity-50",
                      style: { background: GREEN, height: 52 },
                      children: isPending && !counterMutation.isPending ? "…" : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                        /* @__PURE__ */ jsxDEV(CheckCircle2, {"data-component-name": "CheckCircle2", className: "h-4 w-4" }, void 0, false),
                        "Accepter ",
                        passengerOffer.toFixed(0),
                        " DH"
                      ] }, void 0, true)
                    },
                    void 0,
                    false
                  )
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                  onClick: () => setShowCounterModal(true),
                    disabled: isPending,
                    className: "w-full flex items-center justify-center gap-2 font-semibold rounded-xl transition-all border disabled:opacity-50",
                    style: { borderColor: GOLD + "70", color: GOLD_DARK, background: "#FEF6E4", height: 44 },
                    children: [
                      /* @__PURE__ */ jsxDEV(TrendingDown, {"data-component-name": "TrendingDown", className: "h-4 w-4" }, void 0, false),
                      "Proposer un autre tarif"
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
        )
      },
      void 0,
      false
    ),
    showCounterModal && /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "fixed inset-0 z-[70] flex items-end sm:items-center justify-center", style: { background: "rgba(44,24,16,0.7)", backdropFilter: "blur(8px)" }, children: /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 duration-300", style: { background: "white", borderColor: GOLD + "60" }, children: [
      /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "h-1.5 w-full", style: { background: `linear-gradient(90deg, ${GOLD}, ${TC})` } }, void 0, false),
      /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "p-6", children: [
        /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "text-center mb-5", children: [
          /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3", style: { background: "#FEF6E4" }, children: /* @__PURE__ */ jsxDEV(TrendingDown, {"data-component-name": "TrendingDown", className: "h-7 w-7", style: { color: GOLD } }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV("h3", {"data-component-name": "h3", className: "text-xl font-bold", style: { color: BROWN }, children: "Votre contre-offre" }, void 0, false),
          /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-sm mt-1", style: { color: BROWN_MID }, children: [
            "Le passager propose ",
            /* @__PURE__ */ jsxDEV("strong", {"data-component-name": "strong", children: [
              passengerOffer.toFixed(0),
              " DH"
            ] }, void 0, true),
            ". Tarif conseillé : ",
            /* @__PURE__ */ jsxDEV("strong", {"data-component-name": "strong", children: [
              suggestedFare.toFixed(0),
              " DH"
            ] }, void 0, true),
            km ? ` (${km.toFixed(1)} km)` : "",
            "."
          ] }, void 0, true)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "mb-4", children: [
          /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex items-center rounded-2xl border-2 overflow-hidden", style: { borderColor: counterError ? TC : GOLD }, children: [
            /* @__PURE__ */ jsxDEV(
              "input",
              {
              type: "number",
                min: 5,
                max: 500,
                value: counterValue,
                onChange: (e) => {
                  setCounterValue(e.target.value);
                  setCounterError("");
                },
                placeholder: "0",
                className: "flex-1 text-4xl font-extrabold text-center py-4 px-2 outline-none bg-transparent",
                style: { color: GOLD_DARK }
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "px-4 text-xl font-bold", style: { color: BROWN_MID }, children: "DH" }, void 0, false)
          ] }, void 0, true),
          counterError && /* @__PURE__ */ jsxDEV("p", {"data-component-name": "p", className: "text-center text-sm mt-2", style: { color: TC }, children: counterError }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "flex flex-wrap gap-2 mb-5", children: QUICK_OFFERS.filter((v) => v >= passengerOffer - 5).map(
          (v) => /* @__PURE__ */ jsxDEV(
            "button",
            {
            onClick: () => {
                setCounterValue(String(v));
                setCounterError("");
              },
              className: "px-3 py-1.5 rounded-full text-sm font-bold border transition-all",
              style: {
                background: counterValue === String(v) ? GOLD : SAND,
                borderColor: counterValue === String(v) ? GOLD : BORDER,
                color: counterValue === String(v) ? "white" : BROWN_MID
              },
              children: [
                v,
                " DH"
              ]
            },
            v,
            true
          )
        ) }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", {"data-component-name": "div", className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
            onClick: () => {
                setShowCounterModal(false);
                setCounterError("");
              },
              className: "h-12 rounded-xl font-semibold border",
              style: { borderColor: BORDER, color: BROWN_MID, background: SAND },
              children: "Annuler"
            },
            void 0,
            false
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
            onClick: handleCounterOffer,
              disabled: counterMutation.isPending,
              className: "h-12 rounded-xl font-bold text-white disabled:opacity-60",
              style: { background: GOLD },
              children: counterMutation.isPending ? "…" : "Envoyer"
            },
            void 0,
            false
          )
        ] }, void 0, true)
      ] }, void 0, true)
    ] }, void 0, true) }, void 0, false)
  ] }, void 0, true);
}
