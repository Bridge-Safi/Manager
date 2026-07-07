import { LivreurLayout } from "@/components/layout/LivreurLayout";
import {
  useGetDeliveryStats, getGetDeliveryStatsQueryKey,
  useListDeliveries, getListDeliveriesQueryKey,
  useGetDeliverer, getGetDelivererQueryKey,
} from "@workspace/api-client-react";
import {
  Package, CheckCircle2, TrendingUp, Bike,
  MapPin, Phone, Star, ChevronRight, Trophy, Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useManagerSync } from "@/lib/manager-sync";

const TC = "#E85C30";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";
const BORDER = "rgba(255,255,255,0.15)";

function getLevel(deliveries: number): { name: string; color: string; bg: string } {
  if (deliveries >= 400) return { name: "Platine", color: "#6D28D9", bg: "#EDE9FE" };
  if (deliveries >= 200) return { name: "Or",      color: GOLD,      bg: "#FEF6E4" };
  if (deliveries >= 50)  return { name: "Argent",  color: "#475569", bg: "#F1F5F9" };
  return { name: "Bronze", color: "#92400E", bg: "#FEF3C7" };
}

function greetingKey(t: (k: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t("greeting_morning");
  if (h < 18) return t("greeting_afternoon");
  return t("greeting_evening");
}

function parseOrderItems(notes: string | null): string[] {
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

  const { data: inProgressDeliveries, isLoading: deliveriesLoading } = useListDeliveries(
    { delivererId: LIVREUR_ID, status: "in_progress" },
    { query: { queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID, status: "in_progress" }), refetchInterval: 8000 } }
  );
  // Pending = accepted by livreur but not yet picked up at restaurant
  const { data: pendingDeliveries } = useListDeliveries(
    { delivererId: LIVREUR_ID, status: "pending" },
    { query: { queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID, status: "pending" }), refetchInterval: 8000 } }
  );
  const deliveries = [...(pendingDeliveries ?? []), ...(inProgressDeliveries ?? [])];

  const { data: profile } = useGetDeliverer(LIVREUR_ID, {
    query: { enabled: !!LIVREUR_ID, queryKey: getGetDelivererQueryKey(LIVREUR_ID) },
  });

  const level = profile ? getLevel(profile.totalDeliveries) : null;

  const activeDelivery = deliveries[0] ?? null;
  useManagerSync({
    driverId: LIVREUR_ID,
    currentOrderId: activeDelivery?.id ?? null,
    currentOrderStatus: activeDelivery?.status ?? null,
    enabled: !!LIVREUR_ID,
  });

  return (
    <LivreurLayout>
      <div className="flex-1 overflow-auto relative" style={{ background: "rgba(255,255,255,0.06)" }}>

        {/* ── TC→Gold gradient header ── */}
        <div
          className="relative px-5 pt-6 pb-10 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #C14B2A 0%, #D4880C 100%)", borderRadius: "0 0 32px 32px" }}
        >
          {/* Subtle white star pattern */}
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-sm">{greetingKey(t)} 👋</p>
              <h1 className="text-white font-bold text-xl mt-0.5 truncate">
                {profile?.name ?? t("nav_dashboard")}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              {level && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: level.bg, color: level.color }}>
                  <Trophy className="h-3 w-3" />
                  {level.name}
                </div>
              )}
              <Link href="/livreur/profil">
                <div
                  className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-bold text-white border-2 border-white/30 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                >
                  {profile?.photoUrl
                    ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                    : profile?.name?.charAt(0)?.toUpperCase() ?? "?"
                  }
                </div>
              </Link>
            </div>
          </div>

          {/* Status dot */}
          {profile && (
            <div className="relative z-10 flex items-center gap-2 mt-3">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: profile.status === "available" ? "#4ADE80" : profile.status === "busy" ? GOLD : "#94A3B8" }}
              />
              <span className="text-white/70 text-xs">
                {profile.status === "available" ? t("status_available") : profile.status === "busy" ? t("status_busy") : t("status_offline")}
              </span>
              {profile.zone && (
                <>
                  <span className="text-white/30">·</span>
                  <MapPin className="h-3 w-3 text-white/50" />
                  <span className="text-white/70 text-xs">{profile.zone}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Vivid stat cards ── */}
        <div className="px-4 -mt-5 relative z-10">
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Package,     label: t("total_today"),  value: stats?.totalToday ?? 0,      color: "#FF4B4B", bg: "#FFF0F0" },
              { icon: Bike,        label: t("in_progress"),  value: stats?.inProgress ?? 0,      color: "#3B82F6", bg: "#EFF6FF" },
              { icon: CheckCircle2,label: t("completed"),    value: stats?.completedToday ?? 0,  color: "#10B981", bg: "#ECFDF5" },
              { icon: TrendingUp,  label: "MAD",             value: stats?.earningsToday ?? 0,   color: "#F59E0B", bg: "#FFFBEB" },
            ].map((card, i) => (
              <div key={i} className="rounded-xl flex flex-col items-center gap-1 py-3 px-1" style={{ background: "rgba(255,255,255,0.08)", boxShadow: `0 4px 16px ${card.color}22`, border: `1px solid ${card.color}40` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.bg }}>
                  <card.icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <div className="text-lg font-black leading-none" style={{ color: card.color }}>
                  {statsLoading ? <span className="text-sm">…</span> : card.value}
                </div>
                <div className="text-[10px] text-center font-medium" style={{ color: BROWN_LIGHT }}>{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-5 mt-1">

          {/* ── Rating card ── */}
          {profile && (
            <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <div className="flex-1">
                <p className="text-xs font-semibold mb-1" style={{ color: BROWN_LIGHT }}>{t("rating_global")}</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className="w-5 h-5"
                      style={{
                        fill: s <= Math.round(profile.rating) ? GOLD : "transparent",
                        color: s <= Math.round(profile.rating) ? GOLD : BORDER,
                      }}
                    />
                  ))}
                  <span className="ml-1.5 text-lg font-bold" style={{ color: BROWN }}>{profile.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="h-10 w-px" style={{ background: BORDER }} />
              <div className="text-center px-3">
                <div className="text-xl font-bold" style={{ color: TC }}>{profile.totalDeliveries}</div>
                <div className="text-xs" style={{ color: BROWN_LIGHT }}>{t("total_deliveries")}</div>
              </div>
              <div className="h-10 w-px" style={{ background: BORDER }} />
              <div className="text-center px-3">
                <div className="text-xl font-bold" style={{ color: "#10B981" }}>98%</div>
                <div className="text-xs" style={{ color: BROWN_LIGHT }}>{t("success_rate")}</div>
              </div>
            </div>
          )}

          {/* ── Active deliveries ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color: BROWN }}>{t("active_deliveries")}</h2>
              <Link href="/livreur/livraisons">
                <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: TC }}>
                  {t("see_all")} <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>

            {deliveriesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            ) : deliveries && deliveries.length > 0 ? (
              <div className="space-y-3">
                {deliveries.map(delivery => {
                  const items = parseOrderItems(delivery.notes ?? null);
                  return (
                    <Link key={delivery.id} href={`/livreur/livraison/${delivery.id}`}>
                      <div
                        className="rounded-2xl overflow-hidden active:scale-[0.99] transition-transform cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", border: `1px solid ${BORDER}` }}
                      >
                        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #C14B2A, #D4880C)" }} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <p className="font-mono text-xs" style={{ color: BROWN_LIGHT }}>{delivery.trackingNumber}</p>
                              <h3 className="font-bold text-base mt-0.5 truncate" style={{ color: BROWN }}>{delivery.customerName}</h3>
                            </div>
                            <span className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(232,92,48,0.2)", color: TC }}>
                              {t("status_in_progress")}
                            </span>
                          </div>

                          {items.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {items.map((item, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(255,255,255,0.06)", color: BROWN_MID, border: `1px solid ${BORDER}` }}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs" style={{ color: BROWN_LIGHT }}>
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{delivery.deliveryAddress}</span>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              {delivery.customerPhone && (
                                <a
                                  href={`tel:${delivery.customerPhone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}
                                >
                                  <Phone className="h-3 w-3" />
                                  {t("call_customer")}
                                </a>
                              )}
                              {delivery.estimatedDeliveryTime && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: BROWN_LIGHT }}>
                                  <Clock className="h-3 w-3" />
                                  {delivery.estimatedDeliveryTime}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: TC }}>
                              {t("details")} <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div
                className="text-center py-12 rounded-2xl border border-dashed"
                style={{ borderColor: BORDER, background: "rgba(255,255,255,0.05)" }}
              >
                <Package className="mx-auto h-10 w-10 mb-3" style={{ color: BORDER }} />
                <h3 className="text-sm font-semibold" style={{ color: BROWN_MID }}>{t("no_active")}</h3>
                <p className="text-xs mt-1" style={{ color: BROWN_LIGHT }}>{t("day_summary")}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </LivreurLayout>
  );
}
