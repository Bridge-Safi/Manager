// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState } from "react";
import { Link } from "wouter";
import { ChauffeurLayout } from "../../components/layout/ChauffeurLayout";
import { useListTrips, getListTripsQueryKey, useUpdateTrip } from "@workspace/api-client-react";
import { MapPin, Search, Filter, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
export default function ChauffeurTrajets() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { chauffeur } = useAuth();
  const DRIVER_ID = chauffeur?.id ?? 0;
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: trips, isLoading } = useListTrips({
    driverId: DRIVER_ID,
    ...statusFilter !== "all" ? { status: statusFilter } : {}
  }, {
    query: { queryKey: getListTripsQueryKey({ driverId: DRIVER_ID, ...statusFilter !== "all" ? { status: statusFilter } : {} }) }
  });
  const updateTrip = useUpdateTrip();
  const handleUpdateStatus = (id, newStatus) => {
    updateTrip.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey({ driverId: DRIVER_ID }) });
      }
    });
  };
  const filteredTrips = trips?.filter(
    (trip) => trip.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) || trip.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) || trip.dropoffAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const getStatusBadge = (status) => {
    switch (status) {
      case "scheduled":
        return /* @__PURE__ */ jsxDEV(Badge, { variant: "outline", className: "bg-purple-500/10 text-purple-400 border-purple-500/20", children: [
          /* @__PURE__ */ jsxDEV(Clock, { className: "mr-1 h-3 w-3" }, void 0, false),
          " ",
          t("trip_scheduled")
        ] }, void 0, true);
      case "in_progress":
        return /* @__PURE__ */ jsxDEV(Badge, { variant: "outline", className: "bg-blue-500/10 text-blue-400 border-blue-500/20", children: [
          /* @__PURE__ */ jsxDEV(MapPin, { className: "mr-1 h-3 w-3" }, void 0, false),
          " ",
          t("trip_in_progress_label")
        ] }, void 0, true);
      case "completed":
        return /* @__PURE__ */ jsxDEV(Badge, { variant: "outline", className: "bg-green-500/10 text-green-400 border-green-500/20", children: [
          /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "mr-1 h-3 w-3" }, void 0, false),
          " ",
          t("trip_completed")
        ] }, void 0, true);
      case "cancelled":
        return /* @__PURE__ */ jsxDEV(Badge, { variant: "outline", className: "bg-red-500/10 text-red-400 border-red-500/20", children: [
          /* @__PURE__ */ jsxDEV(XCircle, { className: "mr-1 h-3 w-3" }, void 0, false),
          " ",
          t("trip_cancelled")
        ] }, void 0, true);
      default:
        return null;
    }
  };
  return /* @__PURE__ */ jsxDEV(ChauffeurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 p-6 md:p-8 space-y-6 animate-in fade-in duration-300", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col md:flex-row md:items-end justify-between gap-4", children: /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-bold tracking-tight text-zinc-100", children: t("nav_trips") }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", { className: "text-zinc-400 mt-1", children: t("trips_subtitle") }, void 0, false)
    ] }, void 0, true) }, void 0, false),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col md:flex-row gap-4 items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "relative w-full md:w-96", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" }, void 0, false),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            placeholder: t("search_trips"),
            className: "pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-orange-500",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value)
          },
          void 0,
          false
        )
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "flex w-full md:w-auto items-center gap-2 ml-auto", children: [
        /* @__PURE__ */ jsxDEV(Filter, { className: "h-4 w-4 text-zinc-500 shrink-0" }, void 0, false),
        /* @__PURE__ */ jsxDEV(Select, { value: statusFilter, onValueChange: setStatusFilter, children: [
          /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-[180px] bg-zinc-900 border-zinc-800 focus:ring-orange-500", children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: t("filter_all") }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV(SelectContent, { children: [
            /* @__PURE__ */ jsxDEV(SelectItem, { value: "all", children: t("filter_all") }, void 0, false),
            /* @__PURE__ */ jsxDEV(SelectItem, { value: "scheduled", children: t("trip_scheduled_plural") }, void 0, false),
            /* @__PURE__ */ jsxDEV(SelectItem, { value: "in_progress", children: t("trip_in_progress_label") }, void 0, false),
            /* @__PURE__ */ jsxDEV(SelectItem, { value: "completed", children: t("trip_completed_plural") }, void 0, false),
            /* @__PURE__ */ jsxDEV(SelectItem, { value: "cancelled", children: t("trip_cancelled_plural") }, void 0, false)
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true)
    ] }, void 0, true),
    /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: isLoading ? Array.from({ length: 4 }).map(
      (_, i) => /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-28 w-full bg-zinc-900 rounded-xl" }, i, false)
    ) : filteredTrips && filteredTrips.length > 0 ? filteredTrips.map(
      (trip) => /* @__PURE__ */ jsxDEV(Card, { className: "bg-zinc-950 border-zinc-800 hover:border-orange-500/30 transition-colors overflow-hidden group", children: /* @__PURE__ */ jsxDEV(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col md:flex-row", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "p-5 flex-1 flex flex-col justify-center", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-start mb-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxDEV("h3", { className: "text-lg font-semibold text-zinc-100", children: trip.passengerName }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800", children: [
                trip.fare,
                " €"
              ] }, void 0, true)
            ] }, void 0, true),
            getStatusBadge(trip.status)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col sm:flex-row sm:items-center text-sm text-zinc-400 gap-2 sm:gap-3 mt-1", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "h-2 w-2 rounded-full bg-zinc-600 shrink-0" }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "truncate max-w-[200px] md:max-w-xs", children: trip.pickupAddress }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV(ArrowRight, { className: "hidden sm:block h-3 w-3 shrink-0 text-zinc-700" }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "h-2 w-2 rounded-full bg-orange-500 shrink-0" }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "truncate max-w-[200px] md:max-w-xs text-zinc-200", children: trip.dropoffAddress }, void 0, false)
            ] }, void 0, true)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-4 mt-4 text-xs text-zinc-500", children: [
            trip.scheduledAt && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxDEV(Clock, { className: "h-3 w-3" }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { children: (() => {
                try {
                  const d = new Date(trip.scheduledAt);
                  return isNaN(d.getTime()) ? String(trip.scheduledAt) : format(d, "dd MMM à HH:mm", { locale: fr });
                } catch {
                  return String(trip.scheduledAt);
                }
              })() }, void 0, false)
            ] }, void 0, true),
            trip.distance && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxDEV(MapPin, { className: "h-3 w-3" }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { children: [
                trip.distance,
                " km"
              ] }, void 0, true)
            ] }, void 0, true)
          ] }, void 0, true)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "p-5 bg-zinc-900/30 border-t md:border-t-0 md:border-l border-zinc-800/50 flex flex-row md:flex-col gap-3 justify-center items-center md:w-48", children: [
          trip.status === "scheduled" && /* @__PURE__ */ jsxDEV(
            Button,
            {
              onClick: () => handleUpdateStatus(trip.id, "in_progress"),
              disabled: updateTrip.isPending,
              className: "w-full bg-blue-600 hover:bg-blue-500 text-white",
              children: t("start")
            },
            void 0,
            false
          ),
          trip.status === "in_progress" && /* @__PURE__ */ jsxDEV(
            Button,
            {
              onClick: () => handleUpdateStatus(trip.id, "completed"),
              disabled: updateTrip.isPending,
              className: "w-full bg-green-600 hover:bg-green-500 text-white",
              children: t("finish")
            },
            void 0,
            false
          ),
          /* @__PURE__ */ jsxDEV(Link, { href: `/chauffeur/trajet/${trip.id}`, className: "w-full", children: /* @__PURE__ */ jsxDEV(Button, { variant: "outline", className: "w-full bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300", children: t("details") }, void 0, false) }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true) }, void 0, false) }, trip.id, false)
    ) : /* @__PURE__ */ jsxDEV("div", { className: "text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-950/50 border-dashed", children: [
      /* @__PURE__ */ jsxDEV(MapPin, { className: "mx-auto h-12 w-12 text-zinc-700 mb-4" }, void 0, false),
      /* @__PURE__ */ jsxDEV("h3", { className: "text-lg font-medium text-zinc-300", children: t("no_trips") }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", { className: "text-zinc-500 text-sm mt-1", children: t("no_trips_sub") }, void 0, false)
    ] }, void 0, true) }, void 0, false)
  ] }, void 0, true) }, void 0, false);
}
