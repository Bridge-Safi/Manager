import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyPendingDispatch,
  getGetMyPendingDispatchQueryKey,
  useAcceptDelivery,
  useRefuseDelivery,
  useListDeliveries,
  getListDeliveriesQueryKey,
  getGetDeliveryStatsQueryKey,
} from "@workspace/api-client-react";
import { Bell, Package, Clock, CheckCircle2, XCircle, Layers, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { startContinuousAlarm, stopContinuousAlarm, isAlarmRunning } from "@/lib/alarm";
import { GpsPickerModal } from "./GpsPickerModal";
import { RouteMiniMap } from "./RouteMiniMap";
import { useLocation } from "wouter";

const TC = "#C14B2A";
const GREEN = "#2A7A48";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const SAND = "#FAF6EF";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const LS_REFUSED = "bridge_refused_deliveries";
function getRefused(): number[] {
  try { return JSON.parse(localStorage.getItem(LS_REFUSED) || "[]"); } catch { return []; }
}
function addRefused(id: number) {
  const list = getRefused().filter(x => x !== id);
  list.push(id);
  localStorage.setItem(LS_REFUSED, JSON.stringify(list.slice(-50)));
}

type AlertState = "idle" | "batch_confirm" | "gps_picker" | "accepted" | "refused";

interface DispatchAlertProps {
  delivererId: number;
  deliveryId: number;
}

export function DispatchAlert({ delivererId }: DispatchAlertProps) {
  const queryClient = useQueryClient();
  const alarmStartedRef = useRef(false);
  const [alertState, setAlertState] = useState<AlertState>("idle");
  const [dismissed, setDismissed] = useState(false);
  const [acceptedDeliveryId, setAcceptedDeliveryId] = useState<number | null>(null);
  const { t } = useI18n();
  const [, navigate] = useLocation();

  const { data: pending } = useGetMyPendingDispatch(
    { delivererId },
    {
      query: {
        queryKey: getGetMyPendingDispatchQueryKey({ delivererId }),
        refetchInterval: alertState === "idle" ? 3000 : false,
      },
    }
  );

  const { data: activeDeliveries } = useListDeliveries(
    { delivererId, status: "in_progress" },
    { query: { queryKey: getListDeliveriesQueryKey({ delivererId, status: "in_progress" }) } }
  );
  // Also count pending (accepted but not yet picked up) toward the 3-order cap
  const { data: pendingAccepted } = useListDeliveries(
    { delivererId, status: "pending" },
    { query: { queryKey: getListDeliveriesQueryKey({ delivererId, status: "pending" }) } }
  );
  const activeCount = (activeDeliveries?.length ?? 0) + (pendingAccepted?.length ?? 0);

  const acceptMutation = useAcceptDelivery();
  const refuseMutation = useRefuseDelivery();

  const secondsLeft = pending?.secondsLeft ?? 300;
  const delivery = pending?.delivery;
  const isRefused = delivery ? getRefused().includes(delivery.id) : false;
  const showAlert = pending?.hasPending && !dismissed && !isRefused && alertState === "idle";

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ delivererId }) });
    queryClient.invalidateQueries({ queryKey: getGetDeliveryStatsQueryKey({ delivererId }) });
    queryClient.invalidateQueries({ queryKey: getGetMyPendingDispatchQueryKey({ delivererId }) });
  }, [queryClient, delivererId]);

  useEffect(() => {
    if (showAlert) {
      // Start alarm — or restart if it was externally paused (e.g. during delivery confirmation)
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

  // Poll every 2s: if dispatch is active but alarm was externally stopped, restart it
  useEffect(() => {
    if (!showAlert) return;
    const id = setInterval(() => {
      if (alarmStartedRef.current && !isAlarmRunning()) {
        startContinuousAlarm();
      }
    }, 2000);
    return () => clearInterval(id);
  }, [showAlert]);

  useEffect(() => () => stopContinuousAlarm(), []);

  const doAccept = useCallback(() => {
    if (!delivery) return;
    stopContinuousAlarm();
    alarmStartedRef.current = false;
    acceptMutation.mutate(
      { id: delivery.id, data: { delivererId } },
      {
        onSuccess: () => {
          setAcceptedDeliveryId(delivery.id);
          setAlertState("gps_picker");
          invalidateAll();
        },
        onError: () => {
          setAlertState("idle");
        },
      }
    );
  }, [delivery, delivererId, acceptMutation, invalidateAll]);

  const handleAcceptClick = useCallback(() => {
    if (!delivery) return;
    stopContinuousAlarm();
    alarmStartedRef.current = false;
    if (activeCount > 0 && activeCount < 3) {
      setAlertState("batch_confirm");
    } else if (activeCount >= 3) {
      // max reached — auto-refuse
      addRefused(delivery.id);
      setAlertState("refused");
      setTimeout(() => { setAlertState("idle"); setDismissed(false); }, 3000);
    } else {
      doAccept();
    }
  }, [delivery, activeCount, doAccept]);

  const handleRefuse = useCallback(() => {
    if (!delivery) return;
    stopContinuousAlarm();
    alarmStartedRef.current = false;
    addRefused(delivery.id);
    refuseMutation.mutate(
      { id: delivery.id, data: { delivererId } },
      {
        onSuccess: () => {
          setAlertState("refused");
          invalidateAll();
          setTimeout(() => { setAlertState("idle"); setDismissed(false); }, 3000);
        },
      }
    );
  }, [delivery, delivererId, refuseMutation, invalidateAll]);

  const handleGpsDone = () => {
    setAlertState("accepted");
    setTimeout(() => {
      setAlertState("idle");
      if (acceptedDeliveryId) navigate(`/livreur/livraison/${acceptedDeliveryId}`);
    }, 2500);
  };

  /* ── GPS Picker (shown immediately after accept) ── */
  if (alertState === "gps_picker" && delivery) {
    return (
      <GpsPickerModal
        address={delivery.pickupAddress}
        label={t("gps_pickup")}
        onClose={handleGpsDone}
      />
    );
  }

  /* ── Accepté ── */
  if (alertState === "accepted") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(44,24,16,0.6)", backdropFilter: "blur(4px)" }}>
        <div className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300 border" style={{ background: "white", borderColor: "#A8DFC1" }}>
          <div className="flex items-center justify-center w-16 h-16 rounded-full border mx-auto mb-4" style={{ background: "#E4F5EC", borderColor: "#A8DFC1" }}>
            <CheckCircle2 className="h-8 w-8" style={{ color: GREEN }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: BROWN }}>{t("dispatch_accepted_title")}</h2>
          <p className="text-sm" style={{ color: BROWN_MID }}>{t("dispatch_accepted_sub")}</p>
        </div>
      </div>
    );
  }

  /* ── Refusé ── */
  if (alertState === "refused") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(44,24,16,0.6)", backdropFilter: "blur(4px)" }}>
        <div className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300 border" style={{ background: "white", borderColor: BORDER }}>
          <div className="flex items-center justify-center w-16 h-16 rounded-full border mx-auto mb-4" style={{ background: "#FAF6EF", borderColor: BORDER }}>
            <XCircle className="h-8 w-8" style={{ color: "#9B7060" }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: BROWN }}>{t("dispatch_refused_title")}</h2>
          <p className="text-sm" style={{ color: BROWN_MID }}>{t("dispatch_refused_sub")}</p>
        </div>
      </div>
    );
  }

  /* ── Batch confirmation (already has 1–2 active) ── */
  if (alertState === "batch_confirm" && delivery) {
    const isPending = acceptMutation.isPending;
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "rgba(44,24,16,0.6)", backdropFilter: "blur(4px)" }}>
        <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border" style={{ background: "white", borderColor: TC + "60" }}>
          <div className="h-1 w-full" style={{ backgroundImage: `repeating-linear-gradient(90deg,${TC} 0,${TC} 20px,#D4880C 20px,#D4880C 40px,#2A7A48 40px,#2A7A48 60px,#D4880C 60px,#D4880C 80px)` }} />
          <div className="p-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full border mx-auto mb-4" style={{ background: "#FEF6E4", borderColor: "#D4880C40" }}>
              <Layers className="h-7 w-7" style={{ color: "#D4880C" }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: BROWN }}>{t("batch_same_route")}</h2>
            <p className="text-sm mb-1" style={{ color: BROWN_MID }}>
              {t("batch_same_route_sub").replace("{n}", String(activeCount))}
            </p>
            <div className="rounded-xl p-3 mb-5 mt-3 border" style={{ background: SAND, borderColor: BORDER }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: TC }}>Nouvelle commande</p>
              <p className="text-sm font-semibold" style={{ color: BROWN }}>{delivery.customerName}</p>
              <p className="text-xs mt-1 truncate" style={{ color: BROWN_MID }}>📍 {delivery.deliveryAddress}</p>
            </div>
            <div className="flex items-center gap-2 mb-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-1 h-2 rounded-full" style={{ background: i < activeCount ? TC : BORDER }} />
              ))}
            </div>
            <p className="text-xs mb-5" style={{ color: BROWN_MID }}>{activeCount}/3 commande(s) en route</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRefuse}
                disabled={isPending}
                className="h-12 rounded-xl font-semibold border disabled:opacity-50"
                style={{ borderColor: TC + "50", color: TC, background: "#FDEEE9" }}
              >
                <XCircle className="h-4 w-4 inline mr-1" />
                {t("dispatch_refuse")}
              </button>
              <button
                onClick={doAccept}
                disabled={isPending}
                className="h-12 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ background: TC }}
              >
                {isPending ? "…" : (
                  <><Layers className="h-4 w-4 inline mr-1" />{t("batch_accept_extra")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showAlert) return null;

  const isPending = acceptMutation.isPending || refuseMutation.isPending;
  const isLowTime = secondsLeft <= 60;

  const priorityLabel =
    delivery?.priority === "urgent" ? t("priority_urgent")
    : delivery?.priority === "normal" ? t("priority_normal")
    : t("priority_low");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(44,24,16,0.55)", backdropFilter: "blur(4px)" }}
    >
      {/* Card — max 85vh so buttons are always reachable */}
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border"
        style={{ background: "white", borderColor: TC + "60", maxHeight: "85vh" }}
      >
        {/* Rainbow bar — fixed */}
        <div className="h-1 w-full flex-shrink-0" style={{ backgroundImage: `repeating-linear-gradient(90deg,${TC} 0,${TC} 20px,#D4880C 20px,#D4880C 40px,#2A7A48 40px,#2A7A48 60px,#D4880C 60px,#D4880C 80px)` }} />

        {/* ── Header — fixed at top ── */}
        <div className="px-5 py-4 flex items-center gap-3 border-b flex-shrink-0" style={{ background: "#FDEEE9", borderColor: TC + "30" }}>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0" style={{ background: TC + "20" }}>
            <Bell className="h-5 w-5 animate-bounce" style={{ color: TC }} />
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-white" style={{ background: "#E53E3E" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: TC }}>{t("dispatch_new_order")}</p>
            <p className="text-xs mt-0.5" style={{ color: BROWN_MID }}>{t("dispatch_new_order_sub")}</p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold tabular-nums flex-shrink-0"
            style={{ background: isLowTime ? "#FDEEE9" : "#FAF6EF", color: isLowTime ? "#E53E3E" : TC, border: `1px solid ${TC}40` }}
          >
            <Clock className="h-3.5 w-3.5" />
            {formatTime(secondsLeft)}
          </div>
        </div>

        {/* ── Active batch indicator — fixed ── */}
        {activeCount > 0 && (
          <div className="px-5 py-2 flex items-center gap-2 border-b flex-shrink-0" style={{ background: "#FEF6E4", borderColor: "#D4880C30" }}>
            <Layers className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#D4880C" }} />
            <span className="text-xs font-semibold" style={{ color: "#D4880C" }}>
              {activeCount}/3 commande(s) active(s) — Même tournée possible
            </span>
            <div className="ml-auto flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-3 h-1.5 rounded-full" style={{ background: i < activeCount ? "#D4880C" : BORDER }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Delivery details — SCROLLABLE ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {delivery && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" style={{ color: "#9B7060" }} />
                  <span className="font-mono text-xs" style={{ color: "#9B7060" }}>{delivery.trackingNumber}</span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-md"
                  style={
                    delivery.priority === "urgent" ? { background: "#FDEEE9", color: TC }
                    : delivery.priority === "normal" ? { background: "#FEF6E4", color: "#D4880C" }
                    : { background: "#F5EFE4", color: "#9B7060" }
                  }
                >
                  {priorityLabel}
                </span>
              </div>

              {/* ── Mini-carte aperçu trajet ── */}
              <RouteMiniMap
                pickupAddress={delivery.pickupAddress}
                dropoffAddress={delivery.deliveryAddress}
                pickupColor="#9B7060"
                dropoffColor={TC}
                height={150}
              />

              {/* ── Gain livreur ── */}
              <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#E4F5EC 0%,#D1ECDB 100%)", border: `1px solid ${GREEN}40` }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "white" }}>
                    <Wallet className="h-4 w-4" style={{ color: GREEN }} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: GREEN }}>Vous gagnez</span>
                </div>
                <span className="text-xl font-extrabold tabular-nums" style={{ color: GREEN }}>7 DH</span>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3" style={{ color: BROWN }}>{delivery.customerName}</h3>
                <div className="space-y-2.5 relative">
                  <div className="absolute left-[9px] top-0 bottom-0 w-0.5" style={{ background: BORDER }} />
                  <div className="relative flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center z-10 shrink-0" style={{ background: "#FAF6EF", borderColor: "#9B7060" }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#9B7060" }} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: "#9B7060" }}>{t("pickup")}</p>
                      <p className="text-sm" style={{ color: BROWN_MID }}>{delivery.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="relative flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center z-10 shrink-0" style={{ background: "#FDEEE9", borderColor: TC }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: TC }} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: "#9B7060" }}>{t("delivery_addr")}</p>
                      <p className="text-sm font-medium" style={{ color: TC }}>{delivery.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {delivery.notes && (() => {
                const match = delivery.notes.match(/Commande: ([^|]+)/);
                const totalMatch = delivery.notes.match(/Total: ([^|]+)/);
                if (!match && !totalMatch) return null;
                const items = match ? match[1].split(", ").filter(Boolean) : [];
                const total = totalMatch ? totalMatch[1].trim() : null;
                return (
                  <div className="rounded-xl p-3 space-y-1.5" style={{ background: SAND, border: `1px solid ${BORDER}` }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: BROWN_MID }}>🍽 {t("order_items")}</p>
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs" style={{ color: BROWN }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TC }} />
                        {item}
                      </div>
                    ))}
                    {total && (
                      <div className="flex items-center justify-between pt-1.5 mt-1 border-t" style={{ borderColor: BORDER }}>
                        <span className="text-xs font-semibold" style={{ color: BROWN_MID }}>{t("order_total")}</span>
                        <span className="text-sm font-bold" style={{ color: TC }}>{total}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* ── Actions — ALWAYS visible at bottom ── */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3 flex-shrink-0 border-t" style={{ borderColor: BORDER, background: "white" }}>
          <button
            onClick={handleRefuse}
            disabled={isPending}
            className="flex items-center justify-center gap-2 font-semibold h-14 rounded-xl transition-all border disabled:opacity-50"
            style={{ borderColor: TC + "50", color: TC, background: "#FDEEE9" }}
          >
            <XCircle className="h-4 w-4" />
            {t("dispatch_refuse")}
          </button>
          <button
            onClick={handleAcceptClick}
            disabled={isPending}
            className="flex items-center justify-center gap-2 font-bold h-14 rounded-xl transition-all disabled:opacity-50"
            style={{ background: TC, color: "white" }}
          >
            {isPending ? "…" : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {activeCount > 0 ? t("batch_accept_extra") : t("dispatch_accept")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
