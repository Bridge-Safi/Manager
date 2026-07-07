import { useState } from "react";
import { Link } from "wouter";
import { LivreurLayout } from "@/components/layout/LivreurLayout";
import { useListDeliveries, getListDeliveriesQueryKey, useUpdateDelivery } from "@workspace/api-client-react";
import { Package, Search, Filter, CheckCircle2, Clock, XCircle, ArrowRight, UtensilsCrossed, Cigarette, Pill, Flower2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const TC = "#E85C30";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";
const BORDER = "rgba(255,255,255,0.15)";

const CARD_STYLE = {
  background: "rgba(255,255,255,0.08)",
  border: `1px solid ${BORDER}`,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
};

export default function LivreurLivraisons() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { livreur } = useAuth();
  const LIVREUR_ID = livreur?.id ?? 0;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: deliveries, isLoading } = useListDeliveries({
    delivererId: LIVREUR_ID,
    ...(statusFilter !== "all" ? { status: statusFilter as any } : {})
  }, {
    query: { queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID, ...(statusFilter !== "all" ? { status: statusFilter as any } : {}) }) }
  });

  const updateDelivery = useUpdateDelivery();

  const handleUpdateStatus = (id: number, newStatus: string) => {
    updateDelivery.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID }) });
      }
    });
  };

  const filteredDeliveries = deliveries?.filter(d =>
    d.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      pending:     { label: t("status_pending"),     color: BROWN_MID,  bg: "#F1F5F9",  icon: Clock },
      in_progress: { label: t("status_in_progress"), color: TC,         bg: "#FDEEE9",  icon: Package },
      delivered:   { label: t("status_delivered"),   color: GREEN,      bg: "#ECFDF5",  icon: CheckCircle2 },
      cancelled:   { label: t("status_cancelled"),   color: "#E53E3E",  bg: "#FEE2E2",  icon: XCircle },
    };
    const s = map[status] ?? map.pending;
    const Icon = s.icon;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
        <Icon className="h-3 w-3" />
        {s.label}
      </span>
    );
  };

  const serviceBadge = (serviceType: string | null | undefined) => {
    const map: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      eats:          { label: "Bridge Eats",    color: TC,          bg: "#FDEEE9", icon: UtensilsCrossed },
      tabac:         { label: "Tabac",          color: BROWN_MID,   bg: "#F1F5F9", icon: Cigarette },
      pharmacie:     { label: "Pharmacie",      color: "#2A7A48",   bg: "#ECFDF5", icon: Pill },
      fleurs:        { label: "Fleurs",         color: "#9B3EAA",   bg: "#F5E8FA", icon: Flower2 },
      autre:         { label: "Autre",          color: BROWN_LIGHT, bg: "#F8F9FA", icon: Package },
      click_collect: { label: "Click & Collect",color: "#D4880C",   bg: "#FEF3C7", icon: Package },
    };
    const s = map[serviceType ?? "eats"] ?? map["eats"];
    const Icon = s.icon;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ background: s.bg, color: s.color, borderColor: s.color + "33" }}>
        <Icon className="h-3 w-3" />
        {s.label}
      </span>
    );
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      urgent: { label: t("priority_urgent"), color: "#FF4B4B", bg: "#FFF0F0" },
      normal: { label: t("priority_normal"), color: GOLD,      bg: "#FFFBEB" },
      low:    { label: t("priority_low"),    color: BROWN_LIGHT, bg: "#F8F9FA" },
    };
    const p = map[priority] ?? map.normal;
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.color }}>
        {p.label}
      </span>
    );
  };

  return (
    <LivreurLayout>
      <div className="flex-1 overflow-auto relative min-h-full" style={{ background: "rgba(255,255,255,0.06)" }}>

        {/* Gradient header */}
        <div
          className="relative px-5 pt-6 pb-10 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #C14B2A 0%, #D4880C 100%)", borderRadius: "0 0 32px 32px" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-1.5 h-6 bg-white/60 rounded-full inline-block" />
              <h1 className="text-2xl font-bold tracking-tight text-white">{t("nav_deliveries")}</h1>
            </div>
            <p className="mt-1 text-sm text-white/70">{t("deliveries_subtitle")}</p>
          </div>
        </div>

        <div className="px-4 -mt-5 relative z-10 space-y-4 pb-6">

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-center p-4 rounded-2xl" style={CARD_STYLE}>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: BROWN_LIGHT }} />
              <Input
                placeholder={t("search_deliveries")}
                className="pl-10"
                style={{ background: "rgba(255,255,255,0.06)", color: BROWN, border: `1px solid ${BORDER}` }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex w-full md:w-auto items-center gap-2 ms-auto">
              <Filter className="h-4 w-4 flex-shrink-0" style={{ color: BROWN_LIGHT }} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" style={{ background: "rgba(255,255,255,0.06)", color: BROWN, border: `1px solid ${BORDER}` }}>
                  <SelectValue placeholder={t("filter_all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter_all")}</SelectItem>
                  <SelectItem value="pending">{t("status_pending")}</SelectItem>
                  <SelectItem value="in_progress">{t("status_in_progress")}</SelectItem>
                  <SelectItem value="delivered">{t("status_delivered")}</SelectItem>
                  <SelectItem value="cancelled">{t("status_cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))
            ) : filteredDeliveries && filteredDeliveries.length > 0 ? (
              filteredDeliveries.map(delivery => (
                <div
                  key={delivery.id}
                  className="rounded-2xl overflow-hidden flex flex-col md:flex-row"
                  style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                >
                  <div
                    className="w-full md:w-1 h-1 md:h-auto flex-shrink-0"
                    style={{
                      background: delivery.priority === "urgent" ? "#FF4B4B" : delivery.priority === "normal" ? GOLD : BORDER
                    }}
                  />

                  <div className="flex-1 p-4">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: BROWN_LIGHT }}>{delivery.trackingNumber}</span>
                        {serviceBadge(delivery.serviceType)}
                        {priorityBadge(delivery.priority)}
                      </div>
                      {statusBadge(delivery.status)}
                    </div>

                    <h3 className="text-base font-bold mb-2" style={{ color: BROWN }}>{delivery.customerName}</h3>

                    <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: BROWN_MID }}>
                      <span className="truncate max-w-[180px] md:max-w-xs">{delivery.pickupAddress}</span>
                      <ArrowRight className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-[180px] md:max-w-xs font-medium" style={{ color: BROWN }}>{delivery.deliveryAddress}</span>
                    </div>

                    {delivery.estimatedDeliveryTime && (
                      <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: BROWN_LIGHT }}>
                        <Clock className="h-3 w-3" />
                        <span>{t("est_time")} : {delivery.estimatedDeliveryTime}</span>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex flex-row md:flex-col gap-2 p-4 border-t md:border-t-0 md:border-s justify-center items-center md:w-44"
                    style={{ borderColor: BORDER, background: "rgba(255,255,255,0.06)" }}
                  >
                    {delivery.status === "pending" && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, "in_progress")}
                        disabled={updateDelivery.isPending}
                        className="w-full py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 text-white"
                        style={{ background: "linear-gradient(135deg, #C14B2A 0%, #D4880C 100%)" }}
                      >
                        {t("start_delivery")}
                      </button>
                    )}
                    {delivery.status === "in_progress" && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, "delivered")}
                        disabled={updateDelivery.isPending}
                        className="w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50 text-white"
                        style={{ background: GREEN }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("mark_delivered")}
                      </button>
                    )}
                    <Link href={`/livreur/livraison/${delivery.id}`} className="w-full">
                      <button
                        className="w-full py-2 rounded-xl border text-sm font-medium transition-all"
                        style={{ borderColor: BORDER, color: BROWN_MID, background: "rgba(255,255,255,0.08)" }}
                      >
                        {t("details")}
                      </button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div
                className="text-center py-14 rounded-2xl border border-dashed"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
              >
                <Package className="mx-auto h-10 w-10 mb-3" style={{ color: BORDER }} />
                <h3 className="text-base font-semibold" style={{ color: BROWN_MID }}>{t("no_active")}</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </LivreurLayout>
  );
}
