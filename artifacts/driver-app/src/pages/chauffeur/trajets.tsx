import { useState } from "react";
import { Link } from "wouter";
import { ChauffeurLayout } from "@/components/layout/ChauffeurLayout";
import { useListTrips, getListTripsQueryKey, useUpdateTrip } from "@workspace/api-client-react";
import { MapPin, Search, Filter, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const TC = "#E85C30";
const GOLD = "#D4880C";
const GREEN = "#2A7A48";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";
const BORDER = "rgba(255,255,255,0.15)";

export default function ChauffeurTrajets() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { chauffeur } = useAuth();
  const DRIVER_ID = chauffeur?.id ?? 0;
  const base = chauffeur?.vehicleType === "moto" ? "/moto" : "/chauffeur";
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: trips, isLoading } = useListTrips({
    driverId: DRIVER_ID,
    ...(statusFilter !== "all" ? { status: statusFilter as any } : {})
  }, {
    query: { queryKey: getListTripsQueryKey({ driverId: DRIVER_ID, ...(statusFilter !== "all" ? { status: statusFilter as any } : {}) }) }
  });

  const updateTrip = useUpdateTrip();

  const handleUpdateStatus = (id: number, newStatus: string) => {
    updateTrip.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey({ driverId: DRIVER_ID }) });
      }
    });
  };

  const filteredTrips = trips?.filter(trip =>
    trip.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.dropoffAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "scheduled":   return <Badge variant="outline" style={{ background: "rgba(212,136,12,0.15)", color: GOLD, borderColor: "rgba(212,136,12,0.4)" }}><Clock className="mr-1 h-3 w-3" /> {t("trip_scheduled")}</Badge>;
      case "in_progress": return <Badge variant="outline" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.4)" }}><MapPin className="mr-1 h-3 w-3" /> {t("trip_in_progress_label")}</Badge>;
      case "completed":   return <Badge variant="outline" style={{ background: "rgba(42,122,72,0.15)", color: "#4ade80", borderColor: "rgba(42,122,72,0.4)" }}><CheckCircle2 className="mr-1 h-3 w-3" /> {t("trip_completed")}</Badge>;
      case "cancelled":   return <Badge variant="outline" style={{ background: "rgba(232,92,48,0.15)", color: TC, borderColor: "rgba(232,92,48,0.4)" }}><XCircle className="mr-1 h-3 w-3" /> {t("trip_cancelled")}</Badge>;
      default: return null;
    }
  };

  return (
    <ChauffeurLayout>
      <div className="flex-1 overflow-auto relative min-h-full" style={{ background: "rgba(255,255,255,0.06)" }}>

        {/* Gold gradient header */}
        <div
          className="relative px-5 pt-6 pb-10 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #D4880C 0%, #C14B2A 100%)", borderRadius: "0 0 32px 32px" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-1.5 h-6 bg-white/60 rounded-full inline-block" />
              <h1 className="text-2xl font-bold tracking-tight text-white">{t("nav_trips")}</h1>
            </div>
            <p className="mt-1 text-sm text-white/70">{t("trips_subtitle")}</p>
          </div>
        </div>

        <div className="px-4 -mt-5 relative z-10 space-y-4 pb-6">

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-center p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: BROWN_LIGHT }} />
              <Input
                placeholder={t("search_trips")}
                className="pl-10"
                style={{ background: "rgba(255,255,255,0.06)", color: BROWN, border: `1px solid ${BORDER}` }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex w-full md:w-auto items-center gap-2 ml-auto">
              <Filter className="h-4 w-4 shrink-0" style={{ color: BROWN_LIGHT }} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" style={{ background: "rgba(255,255,255,0.06)", color: BROWN, border: `1px solid ${BORDER}` }}>
                  <SelectValue placeholder={t("filter_all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter_all")}</SelectItem>
                  <SelectItem value="scheduled">{t("trip_scheduled_plural")}</SelectItem>
                  <SelectItem value="in_progress">{t("trip_in_progress_label")}</SelectItem>
                  <SelectItem value="completed">{t("trip_completed_plural")}</SelectItem>
                  <SelectItem value="cancelled">{t("trip_cancelled_plural")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trip list */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))
            ) : filteredTrips && filteredTrips.length > 0 ? (
              filteredTrips.map(trip => (
                <Card key={trip.id} className="overflow-hidden border-0" style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-5 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold" style={{ color: BROWN }}>{trip.passengerName}</h3>
                            <span className="text-sm font-medium px-2 py-0.5 rounded border" style={{ background: "rgba(255,255,255,0.06)", borderColor: BORDER, color: BROWN_MID }}>
                              {trip.fare} Dh
                            </span>
                          </div>
                          {getStatusBadge(trip.status)}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center text-sm gap-2 sm:gap-3 mt-1" style={{ color: BROWN_MID }}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: GOLD }} />
                            <span className="truncate max-w-[200px] md:max-w-xs">{trip.pickupAddress}</span>
                          </div>
                          <ArrowRight className="hidden sm:block h-3 w-3 shrink-0" style={{ color: BROWN_LIGHT }} />
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: GOLD }} />
                            <span className="truncate max-w-[200px] md:max-w-xs font-medium" style={{ color: BROWN }}>{trip.dropoffAddress}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: BROWN_LIGHT }}>
                          {trip.scheduledAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{(() => { try { const d = new Date(trip.scheduledAt!); return isNaN(d.getTime()) ? String(trip.scheduledAt) : format(d, "dd MMM à HH:mm", { locale: fr }); } catch { return String(trip.scheduledAt); } })()}</span>
                            </div>
                          )}
                          {trip.distance && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{trip.distance} km</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="p-5 border-t md:border-t-0 md:border-l flex flex-row md:flex-col gap-3 justify-center items-center md:w-48"
                        style={{ borderColor: BORDER, background: "rgba(255,255,255,0.06)" }}
                      >
                        {trip.status === "scheduled" && (
                          <Button
                            onClick={() => handleUpdateStatus(trip.id, "in_progress")}
                            disabled={updateTrip.isPending}
                            className="w-full text-white"
                            style={{ background: "#3B82F6" }}
                          >
                            {t("start")}
                          </Button>
                        )}

                        {trip.status === "in_progress" && (
                          <Button
                            onClick={() => handleUpdateStatus(trip.id, "completed")}
                            disabled={updateTrip.isPending}
                            className="w-full text-white"
                            style={{ background: GREEN }}
                          >
                            {t("finish")}
                          </Button>
                        )}

                        <Link href={`${base}/trajet/${trip.id}`} className="w-full">
                          <Button variant="outline" className="w-full" style={{ borderColor: BORDER, color: BROWN_MID, background: "rgba(255,255,255,0.08)" }}>
                            {t("details")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div
                className="text-center py-16 rounded-2xl border border-dashed"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
              >
                <MapPin className="mx-auto h-12 w-12 mb-4" style={{ color: BORDER }} />
                <h3 className="text-lg font-medium" style={{ color: BROWN_MID }}>{t("no_trips")}</h3>
                <p className="text-sm mt-1" style={{ color: BROWN_LIGHT }}>{t("no_trips_sub")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChauffeurLayout>
  );
}
