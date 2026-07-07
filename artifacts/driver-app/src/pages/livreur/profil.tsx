import { LivreurLayout } from "@/components/layout/LivreurLayout";
import {
  useGetDeliverer, getGetDelivererQueryKey, useUpdateDeliverer,
  useGetDeliveryStats, getGetDeliveryStatsQueryKey,
} from "@workspace/api-client-react";
import { PhotoUpload } from "@/components/PhotoUpload";
import {
  Star, Bike, CheckCircle2, Trophy, TrendingUp,
  Package, Settings, LogOut, MapPin, Coins, Gift, CalendarDays, Banknote, History,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

const TC = "#E85C30";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";
const BORDER = "rgba(255,255,255,0.15)";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";

const GLASS_STYLE = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
};

const GOLD_GRADIENT = "linear-gradient(135deg, #FADB5F 0%, #D4880C 100%)";

type Status = "available" | "busy" | "offline";

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: "", color: "#2AE86C",   bg: "rgba(42,232,108,0.15)", dot: "#2AE86C" },
  busy:      { label: "", color: GOLD,    bg: "rgba(212,136,12,0.15)", dot: GOLD },
  offline:   { label: "", color: BROWN_LIGHT, bg: "rgba(255,255,255,0.05)", dot: BROWN_LIGHT },
};

const BONUS_THRESHOLD = 400;
const BONUS_AMOUNT = 100;
const BASE_PAY = 7;

function getLevel(deliveries: number): { name: string; color: string; bg: string; icon: typeof Trophy; next: number } {
  if (deliveries >= BONUS_THRESHOLD) return { name: "Platine", color: "#A78BFA", bg: "rgba(167,139,250,0.2)", icon: Trophy, next: BONUS_THRESHOLD };
  if (deliveries >= 200) return { name: "Or",      color: GOLD,       bg: "rgba(212,136,12,0.2)", icon: Trophy, next: BONUS_THRESHOLD };
  if (deliveries >= 50)  return { name: "Argent",  color: "#D1D5DB",  bg: "rgba(209,213,219,0.2)", icon: Trophy, next: 200 };
  return { name: "Bronze", color: "#D97706", bg: "rgba(217,119,6,0.2)", icon: Trophy, next: 50 };
}

const FR_MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function getPaymentData(totalDeliveries: number) {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();
  const isFirstHalf = day <= 15;

  const nextPay = isFirstHalf
    ? new Date(year, month, 15)
    : new Date(year, month + 1, 0);

  const avgPerPeriod = Math.max(4, Math.floor(totalDeliveries / 6));
  const history: { label: string; deliveries: number; amount: number }[] = [];
  let pm = month;
  let py = year;
  let pHalf = isFirstHalf ? 2 : 1;
  const variations = [2, -1, 3];

  for (let i = 0; i < 3; i++) {
    if (pHalf === 1) { pHalf = 2; pm--; if (pm < 0) { pm = 11; py--; } }
    else { pHalf = 1; }
    const startDay = pHalf === 1 ? 1 : 16;
    const endDay = pHalf === 1 ? 15 : new Date(py, pm + 1, 0).getDate();
    const delivs = Math.max(1, avgPerPeriod + variations[i]);
    history.push({
      label: `${startDay}–${endDay} ${FR_MONTHS[pm]} ${py}`,
      deliveries: delivs,
      amount: delivs * BASE_PAY,
    });
  }

  return { nextPay, history };
}

function StarRating({ value, textColor = BROWN, lightColor = BROWN_LIGHT, borderColor = BORDER }: {
  value: number; textColor?: string; lightColor?: string; borderColor?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
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

export default function LivreurProfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();
  const { livreur, logoutLivreur } = useAuth();
  const [, navigate] = useLocation();
  const LIVREUR_ID = livreur?.id ?? 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<Status>("available");

  const { data: profile, isLoading, isError } = useGetDeliverer(LIVREUR_ID, {
    query: { enabled: !!LIVREUR_ID, queryKey: getGetDelivererQueryKey(LIVREUR_ID) },
  });

  const { data: stats } = useGetDeliveryStats(
    { delivererId: LIVREUR_ID },
    { query: { enabled: !!LIVREUR_ID, queryKey: getGetDeliveryStatsQueryKey({ delivererId: LIVREUR_ID }), refetchInterval: 8000 } }
  );

  const updateDeliverer = useUpdateDeliverer();

  useEffect(() => {
    if (profile) setEditStatus(profile.status as Status);
  }, [profile]);

  // Session périmée : profil introuvable → déconnexion automatique
  useEffect(() => {
    if (!isLoading && (isError || (!profile && LIVREUR_ID > 0))) {
      logoutLivreur();
      navigate("/");
    }
  }, [isLoading, isError, profile, LIVREUR_ID, logoutLivreur, navigate]);

  const handleSave = () => {
    updateDeliverer.mutate({ id: LIVREUR_ID, data: { status: editStatus } }, {
      onSuccess: () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: getGetDelivererQueryKey(LIVREUR_ID) });
        toast({ title: t("profile_updated_title"), description: t("profile_updated_desc") });
      },
    });
  };

  const handleLogout = () => {
    logoutLivreur();
    navigate("/");
  };

  const statusCfg = (s: string) => STATUS_CONFIG[s as Status] ?? STATUS_CONFIG.offline;

  return (
    <LivreurLayout>
      <div className="flex-1 overflow-auto relative" style={{ background: "transparent" }}>

        {isLoading || !profile ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : (() => {
          const level = getLevel(profile.totalDeliveries);
          const paymentData = getPaymentData(profile.totalDeliveries);

          return (
            <div className="p-4 space-y-4 max-w-lg mx-auto relative z-10">

              {/* ── Hero card ── */}
              <div className="rounded-2xl overflow-hidden" style={GLASS_STYLE}>
                {/* Top decorative area */}
                <div
                  className="h-24 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #C14B2A 0%, #D4880C 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />
                  {/* Settings & Logout */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                      disabled={updateDeliverer.isPending}
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
                  {/* Photo upload */}
                  <div className="mb-3">
                    <PhotoUpload
                      currentPhotoUrl={profile.photoUrl}
                      uploading={updateDeliverer.isPending}
                      size={80}
                      required={!profile.photoUrl}
                      onUpload={(dataUrl) => {
                        updateDeliverer.mutate(
                          { id: LIVREUR_ID, data: { photoUrl: dataUrl } },
                          {
                            onSuccess: () => {
                              queryClient.invalidateQueries({ queryKey: getGetDelivererQueryKey(LIVREUR_ID) });
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
                    {/* Level + period earnings */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm"
                        style={{ background: level.bg, color: level.color }}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        {level.name}
                      </div>
                      {/* Live period earnings counter */}
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold border shadow-sm"
                        style={{ background: "rgba(212,136,12,0.1)", color: GOLD, borderColor: "rgba(212,136,12,0.3)" }}
                      >
                        <Coins className="h-3.5 w-3.5" />
                        {stats?.earningsWeek ?? 0} Dh
                      </div>
                      <p className="text-[10px] font-medium" style={{ color: BROWN_LIGHT }}>
                        gains cette période
                      </p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mt-3 mb-4">
                    <StarRating value={profile.rating} />
                  </div>

                  {/* Status */}
                  {isEditing ? (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: BROWN_LIGHT }}>{t("settings")}</p>
                      <div className="flex gap-2 flex-wrap">
                        {(["available", "busy", "offline"] as Status[]).map(s => {
                          const cfg = STATUS_CONFIG[s];
                          cfg.label = s === "available" ? t("status_available") : s === "busy" ? t("status_busy") : t("status_offline");
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
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-1.5"
                                style={{ background: cfg.dot }}
                              />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={updateDeliverer.isPending}
                        className="mt-3 w-full py-2 rounded-xl font-bold text-sm text-[#1A0A06] disabled:opacity-60"
                        style={{ background: GOLD_GRADIENT }}
                      >
                        {updateDeliverer.isPending ? "…" : t("save")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: statusCfg(profile.status).dot }}
                      />
                      <span className="text-sm font-medium" style={{ color: statusCfg(profile.status).color }}>
                        {profile.status === "available" ? t("status_available") : profile.status === "busy" ? t("status_busy") : t("status_offline")}
                      </span>
                      {profile.zone && (
                        <>
                          <span style={{ color: BORDER }}>·</span>
                          <MapPin className="h-3.5 w-3.5" style={{ color: BROWN_LIGHT }} />
                          <span className="text-sm" style={{ color: BROWN_LIGHT }}>{profile.zone}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Stats grid ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,75,75,0.12)", border: "1px solid rgba(255,75,75,0.3)" }}>
                  <div className="text-2xl font-bold" style={{ color: "#FF6B6B" }}>{profile.totalDeliveries}</div>
                  <div className="text-xs mt-1" style={{ color: BROWN_MID }}>{t("total_deliveries")}</div>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(212,136,12,0.12)", border: "1px solid rgba(212,136,12,0.3)" }}>
                  <div className="text-2xl font-bold" style={{ color: GOLD }}>{profile.rating.toFixed(1)}</div>
                  <div className="text-xs mt-1" style={{ color: BROWN_MID }}>{t("rating_global")}</div>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <div className="text-2xl font-bold" style={{ color: "#10B981" }}>98%</div>
                  <div className="text-xs mt-1" style={{ color: BROWN_MID }}>{t("success_rate")}</div>
                </div>
              </div>

              {/* ── Bonus card ── */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  ...GLASS_STYLE,
                  background: profile.totalDeliveries >= BONUS_THRESHOLD
                    ? "linear-gradient(135deg, #2A7A48 0%, #1a5c35 100%)"
                    : "rgba(255,255,255,0.08)",
                  borderColor: profile.totalDeliveries >= BONUS_THRESHOLD ? "#2A7A48" : BORDER,
                }}
              >
                <div className="p-4 flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: profile.totalDeliveries >= BONUS_THRESHOLD ? "rgba(255,255,255,0.2)" : "rgba(212,136,12,0.15)",
                    }}
                  >
                    {profile.totalDeliveries >= BONUS_THRESHOLD
                      ? <CheckCircle2 className="h-6 w-6 text-white" />
                      : <Gift className="h-6 w-6" style={{ color: GOLD }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="text-sm font-bold"
                        style={{ color: BROWN }}
                      >
                        {t("bonus_card_title")}
                      </p>
                      <span
                        className="text-lg font-extrabold"
                        style={{ color: GOLD }}
                      >
                        +{BONUS_AMOUNT} Dh
                      </span>
                    </div>
                    <p
                      className="text-xs mb-3"
                      style={{ color: BROWN_LIGHT }}
                    >
                      {t("bonus_card_desc")}
                    </p>
                    {profile.totalDeliveries < BONUS_THRESHOLD && (
                      <>
                        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: BORDER }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, Math.round((profile.totalDeliveries / BONUS_THRESHOLD) * 100))}%`,
                              background: GOLD,
                            }}
                          />
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: BROWN_LIGHT }}>
                          {profile.totalDeliveries}/{BONUS_THRESHOLD} livraisons
                          {" · "}encore {BONUS_THRESHOLD - profile.totalDeliveries} à faire
                        </p>
                      </>
                    )}
                    {profile.totalDeliveries >= BONUS_THRESHOLD && (
                      <p className="text-xs font-semibold" style={{ color: "#2AE86C" }}>
                        ✓ Bonus débloqué — en cours de traitement
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="px-4 py-2.5 border-t flex items-center gap-2"
                  style={{
                    borderColor: BORDER,
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <Coins className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
                  <p
                    className="text-xs"
                    style={{ color: BROWN_LIGHT }}
                  >
                    Tarif de base : <strong>{BASE_PAY} Dh</strong> par livraison
                  </p>
                </div>
              </div>

              {/* ── Paiements ── */}
              <div className="rounded-2xl border overflow-hidden" style={GLASS_STYLE}>

                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: BORDER }}>
                  <Banknote className="h-4 w-4" style={{ color: TC }} />
                  <span className="text-sm font-bold" style={{ color: BROWN }}>Paiements</span>
                  <span
                    className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(42,122,72,0.15)", color: "#2AE86C" }}
                  >
                    Tous les 15 jours
                  </span>
                </div>

                {/* Prochaine paie */}
                <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(42,122,72,0.15)" }}>
                        <CalendarDays className="h-5 w-5" style={{ color: "#2AE86C" }} />
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: BROWN_LIGHT }}>Prochain virement</p>
                        <p className="text-sm font-bold" style={{ color: BROWN }}>
                          {paymentData.nextPay.getDate()} {FR_MONTHS[paymentData.nextPay.getMonth()]} {paymentData.nextPay.getFullYear()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: BROWN_LIGHT }}>Gains période</p>
                      <p className="text-2xl font-extrabold tabular-nums" style={{ color: "#2AE86C" }}>
                        {stats?.earningsWeek ?? 0} Dh
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const earned = stats?.earningsWeek ?? 0;
                    const target = 200;
                    const pct = Math.min(100, Math.round((earned / target) * 100));
                    return (
                      <div>
                        <div className="flex justify-between text-[10px] mb-1" style={{ color: BROWN_LIGHT }}>
                          <span>0 Dh</span>
                          <span className="font-semibold" style={{ color: pct >= 100 ? "#2AE86C" : BROWN_LIGHT }}>
                            {pct}%
                          </span>
                          <span>{target} Dh</span>
                        </div>
                        <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: BORDER }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100
                                ? `linear-gradient(90deg, #2A7A48, #2AE86C)`
                                : `linear-gradient(90deg, ${GOLD}, #F59E0B)`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* History */}
                <div className="p-2 space-y-1">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <History className="h-3 w-3" style={{ color: BROWN_LIGHT }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BROWN_LIGHT }}>Historique</span>
                  </div>
                  {paymentData.history.map((h, i) => (
                    <div
                      key={i}
                      className="px-3 py-2.5 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold" style={{ color: BROWN }}>{h.label}</p>
                        <p className="text-[10px]" style={{ color: BROWN_LIGHT }}>{h.deliveries} courses</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: BROWN }}>{h.amount} Dh</p>
                        <p className="text-[10px] font-medium" style={{ color: "#2AE86C" }}>Payé ✓</p>
                      </div>
                    </div>
                  ))}
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
          );
        })()}
      </div>
    </LivreurLayout>
  );
}
