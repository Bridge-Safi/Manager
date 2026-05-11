// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState } from "react";
import { Link } from "wouter";
import { LivreurLayout } from "../../components/layout/LivreurLayout";
import { useListDeliveries, getListDeliveriesQueryKey, useUpdateDelivery } from "@workspace/api-client-react";
import { Package, Search, Filter, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
const TC = "#C14B2A";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
export default function LivreurLivraisons() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { livreur } = useAuth();
  const LIVREUR_ID = livreur?.id ?? 0;
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: deliveries, isLoading } = useListDeliveries({
    delivererId: LIVREUR_ID,
    ...statusFilter !== "all" ? { status: statusFilter } : {}
  }, {
    query: { queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID, ...statusFilter !== "all" ? { status: statusFilter } : {} }) }
  });
  const updateDelivery = useUpdateDelivery();
  const handleUpdateStatus = (id, newStatus) => {
    updateDelivery.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID }) });
      }
    });
  };
  const filteredDeliveries = deliveries?.filter(
    (d) => d.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || d.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const statusBadge = (status) => {
    const map = {
      pending: { label: t("status_pending"), color: BROWN_MID, bg: "#F5EFE4", icon: Clock },
      in_progress: { label: t("status_in_progress"), color: TC, bg: "#FDEEE9", icon: Package },
      delivered: { label: t("status_delivered"), color: GREEN, bg: "#E4F5EC", icon: CheckCircle2 },
      cancelled: { label: t("status_cancelled"), color: "#E53E3E", bg: "#FEE2E2", icon: XCircle }
    };
    const s = map[status] ?? map.pending;
    const Icon = s.icon;
    return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", style: { background: s.bg, color: s.color }, children: [
      /* @__PURE__ */ jsxDEV(Icon, { className: "h-3 w-3" }, void 0, false),
      s.label
    ] }, void 0, true);
  };
  const priorityBadge = (priority) => {
    const map = {
      urgent: { label: t("priority_urgent"), color: TC, bg: "#FDEEE9" },
      normal: { label: t("priority_normal"), color: GOLD, bg: "#FEF6E4" },
      low: { label: t("priority_low"), color: BROWN_LIGHT, bg: "#F5EFE4" }
    };
    const p = map[priority] ?? map.normal;
    return /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full", style: { background: p.bg, color: p.color }, children: p.label }, void 0, false);
  };
  return /* @__PURE__ */ jsxDEV(LivreurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 p-5 md:p-8 space-y-5 animate-in fade-in duration-300", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl font-bold tracking-tight", style: { color: BROWN }, children: t("nav_deliveries") }, void 0, false),
      /* @__PURE__ */ jsxDEV("p", { className: "mt-1 text-sm", style: { color: BROWN_LIGHT }, children: t("deliveries_subtitle") }, void 0, false)
    ] }, void 0, true),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "flex flex-col md:flex-row gap-3 items-center p-4 rounded-2xl border",
        style: { background: "white", borderColor: BORDER },
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "relative w-full md:w-96", children: [
            /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", style: { color: BROWN_LIGHT } }, void 0, false),
            /* @__PURE__ */ jsxDEV(
              Input,
              {
                placeholder: t("search_deliveries"),
                className: "pl-10",
                style: { background: "#FAF6EF", border: `1px solid ${BORDER}`, color: BROWN },
                value: searchQuery,
                onChange: (e) => setSearchQuery(e.target.value)
              },
              void 0,
              false
            )
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "flex w-full md:w-auto items-center gap-2 ms-auto", children: [
            /* @__PURE__ */ jsxDEV(Filter, { className: "h-4 w-4 flex-shrink-0", style: { color: BROWN_LIGHT } }, void 0, false),
            /* @__PURE__ */ jsxDEV(Select, { value: statusFilter, onValueChange: setStatusFilter, children: [
              /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-[180px]", style: { background: "#FAF6EF", border: `1px solid ${BORDER}`, color: BROWN }, children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: t("filter_all") }, void 0, false) }, void 0, false),
              /* @__PURE__ */ jsxDEV(SelectContent, { children: [
                /* @__PURE__ */ jsxDEV(SelectItem, { value: "all", children: t("filter_all") }, void 0, false),
                /* @__PURE__ */ jsxDEV(SelectItem, { value: "pending", children: t("status_pending") }, void 0, false),
                /* @__PURE__ */ jsxDEV(SelectItem, { value: "in_progress", children: t("status_in_progress") }, void 0, false),
                /* @__PURE__ */ jsxDEV(SelectItem, { value: "delivered", children: t("status_delivered") }, void 0, false),
                /* @__PURE__ */ jsxDEV(SelectItem, { value: "cancelled", children: t("status_cancelled") }, void 0, false)
              ] }, void 0, true)
            ] }, void 0, true)
          ] }, void 0, true)
        ]
      },
      void 0,
      true
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: isLoading ? Array.from({ length: 4 }).map(
      (_, i) => /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-24 w-full rounded-xl", style: { background: "#F5EFE4" } }, i, false)
    ) : filteredDeliveries && filteredDeliveries.length > 0 ? filteredDeliveries.map(
      (delivery) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl border overflow-hidden flex flex-col md:flex-row",
          style: { background: "white", borderColor: BORDER, boxShadow: "0 1px 6px rgba(44,24,16,0.04)" },
          children: [
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "w-full md:w-1 h-1 md:h-auto flex-shrink-0",
                style: {
                  background: delivery.priority === "urgent" ? TC : delivery.priority === "normal" ? GOLD : BROWN_LIGHT
                }
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 p-4", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap justify-between items-start gap-2 mb-2", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "font-mono text-xs", style: { color: BROWN_LIGHT }, children: delivery.trackingNumber }, void 0, false),
                  priorityBadge(delivery.priority)
                ] }, void 0, true),
                statusBadge(delivery.status)
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("h3", { className: "text-base font-bold mb-2", style: { color: BROWN }, children: delivery.customerName }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-sm flex-wrap", style: { color: BROWN_MID }, children: [
                /* @__PURE__ */ jsxDEV("span", { className: "truncate max-w-[180px] md:max-w-xs", children: delivery.pickupAddress }, void 0, false),
                /* @__PURE__ */ jsxDEV(ArrowRight, { className: "h-3 w-3 flex-shrink-0" }, void 0, false),
                /* @__PURE__ */ jsxDEV("span", { className: "truncate max-w-[180px] md:max-w-xs font-medium", style: { color: BROWN }, children: delivery.deliveryAddress }, void 0, false)
              ] }, void 0, true),
              delivery.estimatedDeliveryTime && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 mt-2 text-xs", style: { color: BROWN_LIGHT }, children: [
                /* @__PURE__ */ jsxDEV(Clock, { className: "h-3 w-3" }, void 0, false),
                /* @__PURE__ */ jsxDEV("span", { children: [
                  t("est_time"),
                  " : ",
                  delivery.estimatedDeliveryTime
                ] }, void 0, true)
              ] }, void 0, true)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "flex flex-row md:flex-col gap-2 p-4 border-t md:border-t-0 md:border-s justify-center items-center md:w-44",
                style: { borderColor: BORDER, background: "#FAF6EF" },
                children: [
                  delivery.status === "pending" && /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => handleUpdateStatus(delivery.id, "in_progress"),
                      disabled: updateDelivery.isPending,
                      className: "w-full py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50",
                      style: { background: TC, color: "white" },
                      children: t("start_delivery")
                    },
                    void 0,
                    false
                  ),
                  delivery.status === "in_progress" && /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => handleUpdateStatus(delivery.id, "delivered"),
                      disabled: updateDelivery.isPending,
                      className: "w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50",
                      style: { background: GREEN, color: "white" },
                      children: [
                        /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-3.5 w-3.5" }, void 0, false),
                        t("mark_delivered")
                      ]
                    },
                    void 0,
                    true
                  ),
                  /* @__PURE__ */ jsxDEV(Link, { href: `/livreur/livraison/${delivery.id}`, className: "w-full", children: /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      className: "w-full py-2 rounded-xl border text-sm font-medium transition-all",
                      style: { borderColor: BORDER, color: BROWN_MID, background: "white" },
                      children: t("details")
                    },
                    void 0,
                    false
                  ) }, void 0, false)
                ]
              },
              void 0,
              true
            )
          ]
        },
        delivery.id,
        true
      )
    ) : /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "text-center py-14 rounded-2xl border border-dashed",
        style: { borderColor: BORDER, background: "#FAF6EF" },
        children: [
          /* @__PURE__ */ jsxDEV(Package, { className: "mx-auto h-10 w-10 mb-3", style: { color: "#D0BEB0" } }, void 0, false),
          /* @__PURE__ */ jsxDEV("h3", { className: "text-base font-semibold", style: { color: BROWN_MID }, children: t("no_active") }, void 0, false)
        ]
      },
      void 0,
      true
    ) }, void 0, false)
  ] }, void 0, true) }, void 0, false);
}
