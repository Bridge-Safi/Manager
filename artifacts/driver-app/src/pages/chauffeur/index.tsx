// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { ChauffeurLayout } from "../../components/layout/ChauffeurLayout";
import { useGetTripStats, getGetTripStatsQueryKey, useListTrips, getListTripsQueryKey, useUpdateTrip } from "@workspace/api-client-react";
import { Navigation, CheckCircle2, DollarSign, Activity, Route } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
const GOLD = "#D4880C";
const GREEN = "#2A7A48";
const TC = "#C14B2A";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
export default function ChauffeurDashboard() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { chauffeur } = useAuth();
  const DRIVER_ID = chauffeur?.id ?? 0;
  const { data: stats, isLoading: statsLoading } = useGetTripStats({ driverId: DRIVER_ID }, {
    query: { queryKey: getGetTripStatsQueryKey({ driverId: DRIVER_ID }) }
  });
  const { data: trips, isLoading: tripsLoading } = useListTrips({ driverId: DRIVER_ID, status: "in_progress" }, {
    query: { queryKey: getListTripsQueryKey({ driverId: DRIVER_ID, status: "in_progress" }) }
  });
  const updateTrip = useUpdateTrip();
  const handleUpdateStatus = (id: number, newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
    updateTrip.mutate({ id, data: { status: newStatus as "pending" | "in_progress" | "completed" | "cancelled" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey({ driverId: DRIVER_ID }) });
        queryClient.invalidateQueries({ queryKey: getGetTripStatsQueryKey({ driverId: DRIVER_ID }) });
      }
    });
  };
  const statCards = [
    { icon: Route, label: t("nav_trips"), value: stats?.completedToday || 0, color: GOLD, bg: "#FEF6E4" },
    { icon: DollarSign, label: t("earnings"), value: `${stats?.earningsToday || 0} €`, color: GREEN, bg: "#E4F5EC" },
    { icon: Navigation, label: t("distance"), value: `${stats?.totalKmToday || 0} km`, color: "#2563EB", bg: "#EFF6FF" },
    { icon: Activity, label: t("avg_time"), value: `${stats?.averageFare || 0} €`, color: TC, bg: "#FDEEE9" }
  ];
  return /* @__PURE__ */ jsxDEV(ChauffeurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 p-5 md:p-8 space-y-7 animate-in fade-in duration-300", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl font-bold tracking-tight", style: { color: BROWN }, children: t("nav_dashboard") }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", { className: "mt-1 text-sm", style: { color: BROWN_LIGHT }, children: [
        t("greeting"),
        ", ",
        t("day_activity")
      ] }, void 0, true)
    ] }, void 0, true),
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: statCards.map(
      (card, i) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl border p-4",
          style: { background: "white", borderColor: BORDER, boxShadow: "0 1px 8px rgba(44,24,16,0.05)" },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-7 h-7 rounded-lg flex items-center justify-center", style: { background: card.bg }, children: /* @__PURE__ */ jsxDEV(card.icon, { className: "h-4 w-4", style: { color: card.color } }, void 0, false) }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-medium", style: { color: BROWN_LIGHT }, children: card.label }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold", style: { color: BROWN }, children: statsLoading ? /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-7 w-16", style: { background: "#F5EFE4" } }, void 0, false) : card.value }, void 0, false)
          ]
        },
        i,
        true
      )
    ) }, void 0, false),
    /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-lg font-bold", style: { color: BROWN }, children: t("trip_active") }, void 0, false),
        /* @__PURE__ */ jsxDEV(Link, { href: "/chauffeur/trajets", children: /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-semibold", style: { color: GOLD }, children: [
          t("history"),
          " →"
        ] }, void 0, true) }, void 0, false)
      ] }, void 0, true),
      tripsLoading ? /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-48 w-full max-w-2xl rounded-xl", style: { background: "#F5EFE4" } }, void 0, false) : trips && trips.length > 0 ? /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 gap-4 max-w-2xl", children: trips.map(
        (trip) => /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "rounded-2xl border overflow-hidden",
            style: { background: "white", borderColor: BORDER, boxShadow: "0 1px 8px rgba(44,24,16,0.05)" },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "h-0.5 w-full", style: { background: GOLD } }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "p-5", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-start mb-4", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxDEV(
                      "div",
                      {
                        className: "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm",
                        style: { background: "#FEF6E4", color: GOLD },
                        children: trip.passengerName.charAt(0)
                      },
                      void 0,
                      false
                    ),
                    /* @__PURE__ */ jsxDEV("div", { children: [
                      /* @__PURE__ */ jsxDEV("h3", { className: "text-base font-bold", style: { color: BROWN }, children: trip.passengerName }, void 0, false),
                      /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-mono", style: { color: BROWN_LIGHT }, children: trip.passengerPhone }, void 0, false)
                    ] }, void 0, true)
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV(
                    "span",
                    {
                      className: "text-xs font-bold px-2 py-1 rounded-full",
                      style: { background: "#EFF6FF", color: "#2563EB" },
                      children: t("trip_in_progress_label")
                    },
                    void 0,
                    false
                  )
                ] }, void 0, true),
                /* @__PURE__ */ jsxDEV("div", { className: "space-y-2.5", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "w-4 h-4 rounded-full border-2 flex-shrink-0", style: { borderColor: BROWN_LIGHT } }, void 0, false),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-sm", style: { color: BROWN_MID }, children: trip.pickupAddress }, void 0, false)
                  ] }, void 0, true),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "w-4 h-4 rounded-full border-2 flex-shrink-0", style: { borderColor: GOLD, background: "#FEF6E4" }, children: /* @__PURE__ */ jsxDEV("div", { className: "w-1.5 h-1.5 rounded-full mx-auto mt-0.5", style: { background: GOLD } }, void 0, false) }, void 0, false),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium", style: { color: BROWN }, children: trip.dropoffAddress }, void 0, false)
                  ] }, void 0, true)
                ] }, void 0, true)
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("div", { className: "px-5 pb-4 flex gap-3", children: [
                /* @__PURE__ */ jsxDEV(Link, { href: `/chauffeur/trajet/${trip.id}`, className: "flex-1", children: /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    className: "w-full py-2 rounded-xl border text-sm font-semibold",
                    style: { borderColor: BORDER, color: BROWN_MID, background: "#FAF6EF" },
                    children: t("details")
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => handleUpdateStatus(trip.id, "completed"),
                    disabled: updateTrip.isPending,
                    className: "flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50",
                    style: { background: GREEN, color: "white" },
                    children: [
                      /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-4 w-4" }, void 0, false),
                      t("finish")
                    ]
                  },
                  void 0,
                  true
                )
              ] }, void 0, true)
            ]
          },
          trip.id,
          true
        )
      ) }, void 0, false) : /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "text-center py-12 max-w-2xl rounded-2xl border border-dashed",
          style: { borderColor: BORDER, background: "#FAF6EF" },
          children: [
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3",
                style: { background: "#FEF6E4" },
                children: /* @__PURE__ */ jsxDEV(Navigation, { className: "h-7 w-7", style: { color: GOLD } }, void 0, false)
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-base font-semibold", style: { color: BROWN_MID }, children: t("no_active_trip") }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm mt-1", style: { color: BROWN_LIGHT }, children: t("waiting_requests") }, void 0, false)
          ]
        },
        void 0,
        true
      )
    ] }, void 0, true)
  ] }, void 0, true) }, void 0, false);
}
