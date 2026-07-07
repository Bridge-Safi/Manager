import { ChauffeurLayout } from "@/components/layout/ChauffeurLayout";
import { useGetDriver, getGetDriverQueryKey, useUpdateDriver } from "@workspace/api-client-react";
import { Car, Star, Navigation, Settings, CheckCircle2, LogOut, MapPin, ChevronRight, Coins } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

const GOLD = "#D4880C";
const TC = "#E85C30";
const GREEN = "#2A7A48";
const BORDER = "rgba(255,255,255,0.15)";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";

const GLASS_STYLE = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
};

const GOLD_GRADIENT = "linear-gradient(135deg, #D4880C 0%, #FADB5F 100%)";

type DriverStatus = "available" | "busy" | "offline";

function StarRating({ value, textColor = BROWN, lightColor = BROWN_LIGHT, borderColor = BORDER }: {
  value: number; textColor?: string; lightColor?: string; borderColor?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="w-4 h-4"
          style={{
            fill: s <= Math.round(value) ? GOLD : "transparent",
            color: s <= Math.round(value) ? GOLD : borderColor,
          }}
        />
      ))}
      <span className="ml-1.5 text-sm font-bold" style={{ color: textColor }}>{value.toFixed(1)}</span>
      <span className="text-xs ml-0.5" style={{ color: lightColor }}>/5</span>
    </div>
  );
}

export default function ChauffeurProfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();
  const { chauffeur, logoutChauffeur } = useAuth();
  const [, navigate] = useLocation();
  const DRIVER_ID = chauffeur?.id ?? 0;
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<DriverStatus>("available");

  const { data: profile, isLoading, isError } = useGetDriver(DRIVER_ID, {
    query: { enabled: !!DRIVER_ID, queryKey: getGetDriverQueryKey(DRIVER_ID) },
  });

  const updateDriver = useUpdateDriver();

  useEffect(() => {
    if (profile) setEditStatus(profile.status as DriverStatus);
  }, [profile]);

  // Session périmée : profil introuvable → déconnexion automatique
  useEffect(() => {
    if (!isLoading && (isError || (!profile && DRIVER_ID > 0))) {
      logoutChauffeur();
      navigate("/");
    }
  }, [isLoading, isError, profile, DRIVER_ID, logoutChauffeur, navigate]);

  const handleSave = () => {
    updateDriver.mutate(
      { id: DRIVER_ID, data: { status: editStatus } },
      {
        onSuccess: () => {
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: getGetDriverQueryKey(DRIVER_ID) });
          toast({ title: t("profile_updated_title"), description: t("profile_updated_desc") });
        },
      }
    );
  };

  const handleLogout = () => {
    logoutChauffeur();
    navigate("/");
  };

  const STATUS_DISPLAY: Record<DriverStatus, { label: string; color: string; bg: string; dot: string }> = {
    available: { label: t("status_online"),     color: "#10B981", bg: "#ECFDF5", dot: "#10B981" },
    busy:      { label: t("status_busy_trip"),  color: GOLD,      bg: "#FEF6E4", dot: GOLD },
    offline:   { label: t("status_offline"),    color: BROWN_LIGHT, bg: "#F1F5F9", dot: BROWN_LIGHT },
  };

  return (
    <ChauffeurLayout>
      <div className="flex-1 overflow-auto relative" style={{ background: "transparent" }}>

        {isLoading || !profile ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="p-4 space-y-4 max-w-lg mx-auto relative z-10">

            {/* ── Hero card ── */}
            <div className="rounded-2xl overflow-hidden" style={GLASS_STYLE}>

              {/* Header banner */}
              <div
                className="h-24 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #D4880C 0%, #C14B2A 100%)" }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />

                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={updateDriver.isPending}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}
                  >
                    <Settings className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}
                  >
                    <LogOut className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-5 -mt-8 relative">
                {/* Photo */}
                <div className="mb-3">
                  <PhotoUpload
                    currentPhotoUrl={profile.photoUrl}
                    uploading={updateDriver.isPending}
                    size={80}
                    required={!profile.photoUrl}
                    onUpload={(dataUrl) => {
                      updateDriver.mutate(
                        { id: DRIVER_ID, data: { photoUrl: dataUrl } },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: getGetDriverQueryKey(DRIVER_ID) });
                            toast({ title: "Photo mise à jour ✓" });
                          },
                        }
                      );
                    }}
                  />
                </div>

                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: BROWN }}>{profile.name}</h2>
                    <p className="text-sm font-mono mt-0.5" style={{ color: BROWN_LIGHT }}>{profile.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm" style={{ background: "rgba(212,136,12,0.1)", borderColor: "rgba(212,136,12,0.3)" }}>
                    <Star className="h-4 w-4" style={{ fill: GOLD, color: GOLD }} />
                    <span className="text-base font-extrabold" style={{ color: GOLD }}>{profile.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <StarRating value={profile.rating} />
                </div>

                {/* Status */}
                <div className="mt-4">
                  {isEditing ? (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: BROWN_LIGHT }}>{t("settings")}</p>
                      <div className="flex gap-2 flex-wrap">
                        {(["available", "busy", "offline"] as DriverStatus[]).map((s) => {
                          const cfg = STATUS_DISPLAY[s];
                          const active = editStatus === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setEditStatus(s)}
                              className="px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
                              style={{
                                background: active ? cfg.bg : "rgba(255,255,255,0.05)",
                                color: active ? cfg.color : BROWN_LIGHT,
                                borderColor: active ? cfg.color : BORDER,
                              }}
                            >
                              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: cfg.dot }} />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={updateDriver.isPending}
                        className="mt-3 w-full py-2 rounded-xl font-bold text-sm text-[#1A0A06] disabled:opacity-60"
                        style={{ background: GOLD_GRADIENT }}
                      >
                        {updateDriver.isPending ? "…" : t("save")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STATUS_DISPLAY[profile.status as DriverStatus]?.dot ?? BROWN_LIGHT }} />
                      <span className="text-sm font-medium" style={{ color: STATUS_DISPLAY[profile.status as DriverStatus]?.color ?? BROWN_LIGHT }}>
                        {STATUS_DISPLAY[profile.status as DriverStatus]?.label ?? profile.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(212,136,12,0.12)", border: "1px solid rgba(212,136,12,0.3)" }}>
                <div className="text-2xl font-bold" style={{ color: GOLD }}>{profile.totalTrips}</div>
                <div className="text-xs mt-1" style={{ color: BROWN_MID }}>{t("total_trips_label")}</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <div className="text-2xl font-bold" style={{ color: "#10B981" }}>{profile.rating.toFixed(1)}</div>
                <div className="text-xs mt-1" style={{ color: BROWN_MID }}>{t("rating_global")}</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,75,75,0.12)", border: "1px solid rgba(255,75,75,0.3)" }}>
                <div className="text-2xl font-bold" style={{ color: "#FF6B6B" }}>98%</div>
                <div className="text-xs mt-1" style={{ color: BROWN_MID }}>{t("success_rate")}</div>
              </div>
            </div>

            {/* ── Véhicule card ── */}
            <div className="rounded-2xl border overflow-hidden" style={GLASS_STYLE}>
              <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: BORDER }}>
                <Car className="h-4 w-4" style={{ color: TC }} />
                <span className="text-sm font-bold" style={{ color: BROWN }}>{t("vehicle_license")}</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: BROWN }}>{profile.vehicleModel}</h3>
                    <p className="text-sm mt-0.5" style={{ color: BROWN_LIGHT }}>{t("comfort_standard")}</p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-xl border font-mono text-sm font-bold tracking-widest"
                    style={{ background: "rgba(255,255,255,0.06)", borderColor: BORDER, color: BROWN_MID }}
                  >
                    {profile.vehiclePlate}
                  </div>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: BORDER }}>
                  <p className="text-xs mb-1" style={{ color: BROWN_LIGHT }}>{t("vtc_card")}</p>
                  <div
                    className="px-3 py-2 rounded-xl border font-mono text-sm font-semibold inline-block"
                    style={{ background: "rgba(255,255,255,0.06)", borderColor: BORDER, color: BROWN_MID }}
                  >
                    {profile.licenseNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Navigation card ── */}
            <div className="rounded-2xl border overflow-hidden" style={GLASS_STYLE}>
              <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: BORDER }}>
                <Navigation className="h-4 w-4" style={{ color: "#2AE86C" }} />
                <span className="text-sm font-bold" style={{ color: BROWN }}>{t("stats")}</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm" style={{ color: BROWN_LIGHT }}>{t("total_trips_label")}</span>
                  <span className="text-2xl font-bold" style={{ color: BROWN }}>{profile.totalTrips}</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: BORDER }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: GOLD_GRADIENT }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border text-center" style={{ background: "rgba(255,255,255,0.06)", borderColor: BORDER }}>
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-1" style={{ color: "#10B981" }} />
                    <p className="text-xs font-semibold" style={{ color: BROWN_MID }}>{t("level_gold")}</p>
                  </div>
                  <div className="p-3 rounded-xl border text-center" style={{ background: "rgba(255,255,255,0.06)", borderColor: BORDER }}>
                    <p className="text-xl font-bold" style={{ color: BROWN }}>{profile.rating.toFixed(1)}/5</p>
                    <p className="text-xs" style={{ color: BROWN_LIGHT }}>{t("last_30_days")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Help ── */}
            <div
              className="rounded-2xl border p-4 flex items-center gap-3"
              style={GLASS_STYLE}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5">
                <Settings className="h-5 w-5" style={{ color: BROWN_LIGHT }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: BROWN }}>Centre d'aide</p>
                <p className="text-xs" style={{ color: BROWN_LIGHT }}>Contacter le support ou voir la FAQ</p>
              </div>
              <ChevronRight className="h-5 w-5" style={{ color: BROWN_LIGHT }} />
            </div>

          </div>
        )}
      </div>
    </ChauffeurLayout>
  );
}
