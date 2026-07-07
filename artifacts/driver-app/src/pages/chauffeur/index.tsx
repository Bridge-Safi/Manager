import { ChauffeurLayout } from "@/components/layout/ChauffeurLayout";
import { useGetTripStats, getGetTripStatsQueryKey, useListTrips, getListTripsQueryKey, useUpdateTrip } from "@workspace/api-client-react";
import { MapPin, Navigation, CheckCircle2, DollarSign, Activity, Route } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const GOLD = "#D4880C";
const GREEN = "#2A7A48";
const TC = "#E85C30";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";
const BORDER = "rgba(255,255,255,0.15)";

export default function ChauffeurDashboard() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { chauffeur } = useAuth();
  const DRIVER_ID = chauffeur?.id ?? 0;
  const base = chauffeur?.vehicleType === "moto" ? "/moto" : "/chauffeur";

  const { data: stats, isLoading: statsLoading } = useGetTripStats({ driverId: DRIVER_ID }, {
    query: { queryKey: getGetTripStatsQueryKey({ driverId: DRIVER_ID }) }
  });

  const { data: trips, isLoading: tripsLoading } = useListTrips({ driverId: DRIVER_ID, status: "in_progress" }, {
    query: { queryKey: getListTripsQueryKey({ driverId: DRIVER_ID, status: "in_progress" }) }
  });

  const updateTrip = useUpdateTrip();

  const handleUpdateStatus = (id: number, newStatus: "completed" | "cancelled") => {
    updateTrip.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey({ driverId: DRIVER_ID }) });
        queryClient.invalidateQueries({ queryKey: getGetTripStatsQueryKey({ driverId: DRIVER_ID }) });
      }
    });
  };

  const statCards = [
    { icon: Route,       label: t("nav_trips"),  value: stats?.completedToday || 0,        color: "#F59E0B", bg: "#FFFBEB" },
    { icon: DollarSign,  label: t("earnings"),   value: `${stats?.earningsToday || 0} MAD`, color: "#10B981", bg: "#ECFDF5" },
    { icon: Navigation,  label: t("distance"),   value: `${parseFloat(Number(stats?.totalKmToday || 0).toFixed(1))} km`,  color: "#3B82F6", bg: "#EFF6FF" },
    { icon: Activity,    label: t("avg_time"),   value: `${stats?.averageFare || 0} MAD`,  color: "#FF4B4B", bg: "#FFF0F0" },
  ];

  return (
    <ChauffeurLayout>
      <div className="flex-1 overflow-auto relative" style={{ background: "rgba(255,255,255,0.06)" }}>

        {/* Gold→TC gradient header */}
        <div
          className="relative px-5 pt-6 pb-10 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #D4880C 0%, #C14B2A 100%)", borderRadius: "0 0 32px 32px" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold tracking-tight text-white">{t("nav_dashboard")}</h1>
            <p className="mt-1 text-sm text-white/70">{t("greeting")} · {t("day_activity")}</p>
          </div>
        </div>

        {/* Vivid Stats Grid */}
        <div className="px-4 -mt-5 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((card, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.08)", boxShadow: `0 4px 20px ${card.color}22`, border: `1px solid ${card.color}40` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.bg }}>
                  <card.icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: BROWN_LIGHT }}>{card.label}</span>
              </div>
              <div className="text-2xl font-black" style={{ color: card.color }}>
                {statsLoading ? <Skeleton className="h-7 w-16" /> : card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Active Trips */}
        <div className="space-y-4 px-4 mt-5 pb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: BROWN }}>{t("trip_active")}</h2>
            <Link href={`${base}/trajets`}>
              <span className="text-sm font-semibold flex items-center gap-0.5" style={{ color: GOLD }}>
                {t("history")} <span className="ml-1">→</span>
              </span>
            </Link>
          </div>

          {tripsLoading ? (
            <Skeleton className="h-48 w-full max-w-2xl rounded-2xl" />
          ) : trips && trips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 max-w-2xl">
              {trips.map(trip => (
                <div
                  key={trip.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                >
                  <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #D4880C, #C14B2A)" }} />

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border"
                          style={{ background: "rgba(212,136,12,0.15)", color: GOLD, borderColor: "#D4880C33" }}
                        >
                          {trip.passengerName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold" style={{ color: BROWN }}>{trip.passengerName}</h3>
                          <p className="text-xs font-mono" style={{ color: BROWN_LIGHT }}>{trip.passengerPhone}</p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: "rgba(59,130,246,0.2)", color: "#60A5FA" }}
                      >
                        {t("trip_in_progress_label")}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: BORDER }} />
                        <p className="text-sm" style={{ color: BROWN_MID }}>{trip.pickupAddress}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: GOLD, background: "rgba(212,136,12,0.15)" }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: BROWN }}>{trip.dropoffAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-4 flex gap-3">
                    <Link href={`${base}/trajet/${trip.id}`} className="flex-1">
                      <button
                        className="w-full py-2 rounded-xl border text-sm font-semibold"
                        style={{ borderColor: BORDER, color: BROWN, background: "rgba(255,255,255,0.06)" }}
                      >
                        {t("details")}
                      </button>
                    </Link>
                    <button
                      onClick={() => handleUpdateStatus(trip.id, "completed")}
                      disabled={updateTrip.isPending}
                      className="flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 text-white"
                      style={{ background: "linear-gradient(135deg, #D4880C 0%, #C14B2A 100%)" }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t("finish")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="text-center py-12 max-w-2xl rounded-2xl border border-dashed"
              style={{ borderColor: BORDER, background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(212,136,12,0.15)" }}
              >
                <Navigation className="h-7 w-7" style={{ color: GOLD }} />
              </div>
              <h3 className="text-base font-semibold" style={{ color: BROWN_MID }}>{t("no_active_trip")}</h3>
              <p className="text-sm mt-1" style={{ color: BROWN_LIGHT }}>{t("waiting_requests")}</p>
            </div>
          )}
        </div>
      </div>
    </ChauffeurLayout>
  );
}
