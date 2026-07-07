import { useParams, Link, useLocation } from "wouter";
import { LivreurLayout } from "@/components/layout/LivreurLayout";
import {
  useGetDelivery, getGetDeliveryQueryKey,
  useUpdateDelivery, useConfirmDelivered,
  useGetDeliverer, getGetDelivererQueryKey,
  getListDeliveriesQueryKey, getGetDeliveryStatsQueryKey,
} from "@workspace/api-client-react";
import {
  ArrowLeft, MapPin, Phone, UtensilsCrossed, Navigation,
  CheckCircle2, Clock, Star, Bike, ShoppingBag, ChevronRight, Share2,
  Package, AlertCircle, Coins,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useManagerSync } from "@/lib/manager-sync";
import { GpsPickerModal } from "@/components/GpsPickerModal";
import { stopContinuousAlarm } from "@/lib/alarm";

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

interface ParsedOrder {
  items: string[];
  total: string | null;
  extra: string | null;
  mapsUrl: string | null;
  paymentMethod: "cash" | "card" | null;
  rawText: string | null;
}

function parseOrderNotes(notes: string | null): ParsedOrder {
  if (!notes) return { items: [], total: null, extra: null, mapsUrl: null, paymentMethod: null, rawText: null };

  // Extract Maps URL first (| Maps: URL)
  let mapsUrl: string | null = null;
  let cleaned = notes;
  const mapsMatch = notes.match(/\|\s*Maps:\s*(https?:\/\/\S+)/i);
  if (mapsMatch) {
    mapsUrl = mapsMatch[1];
    cleaned = notes.replace(mapsMatch[0], "").trim();
  }

  // Payment method detection
  let paymentMethod: "cash" | "card" | null = null;
  if (/espèces|cash|نقدا|ⵉⵙⴻⵎ/i.test(cleaned)) paymentMethod = "cash";
  else if (/carte|card|virement|💳/i.test(cleaned)) paymentMethod = "card";

  // Try structured format: Commande: X | Total: Y
  const parts = cleaned.split(" | ");
  let items: string[] = [];
  let total: string | null = null;
  let extra: string | null = null;
  let hasStructured = false;

  for (const part of parts) {
    if (part.startsWith("Commande: ")) {
      items = part.slice("Commande: ".length).split(", ").filter(Boolean);
      hasStructured = true;
    } else if (part.startsWith("Total: ")) {
      total = part.slice("Total: ".length);
      hasStructured = true;
    } else if (part.trim()) {
      extra = part.trim();
    }
  }

  // Try emoji/free format: "🛒 X 💰 Total client: 33.5 MAD 💳 Espèces..."
  if (!hasStructured) {
    // Extract total: "Total client: X MAD" or "Total: X MAD"
    const totalMatch = cleaned.match(/Total\s+(?:client\s*:?\s*)?([\d.,]+\s*MAD)/i);
    if (totalMatch) total = totalMatch[1];

    // Remove known meta phrases to get clean item text
    let itemText = cleaned
      .replace(/Total\s+(?:client\s*:?\s*)?[\d.,]+\s*MAD/gi, "")
      .replace(/💰|💳|🛒|🛵|📦|🍔|🥤|🍕/g, " ")
      .replace(/Espèces\s+à\s+la\s+livraison/gi, "")
      .replace(/Carte\s+(?:bancaire)?/gi, "")
      .replace(/\|\s*Maps:[^\|]*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Split by comma or newline for items
    if (itemText) {
      const rawItems = itemText.split(/,|\n/).map(s => s.trim()).filter(Boolean);
      // Filter out very short fragments (< 3 chars) and pure numbers
      items = rawItems.filter(s => s.length >= 3 && !/^\d+(\.\d+)?$/.test(s));
    }

    if (items.length === 0 && cleaned) {
      // Fallback: show raw (without Maps URL)
      return { items: [], total, extra: null, mapsUrl, paymentMethod, rawText: cleaned.replace(/\|\s*Maps:[^\|]*/gi, "").trim() };
    }
  }

  return { items, total, extra, mapsUrl, paymentMethod, rawText: null };
}

function StatusPill({ status }: { status?: string }) {
  const { t } = useI18n();
  const config: Record<string, { label: string; color: string; bg: string }> = {
    pending:     { label: t("status_pending"),     color: BROWN_MID, bg: "rgba(255,255,255,0.05)" },
    in_progress: { label: t("status_in_progress"), color: TC,        bg: "rgba(232,92,48,0.15)" },
    delivered:   { label: t("status_delivered"),   color: GREEN,     bg: "rgba(42,122,72,0.15)" },
    cancelled:   { label: t("status_cancelled"),   color: "#DC2626",  bg: "rgba(220,38,38,0.15)" },
  };
  const c = config[status ?? "pending"] ?? config.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}
    >
      {status === "in_progress" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {c.label}
    </span>
  );
}

function StepTimeline({ status }: { status?: string }) {
  const { t } = useI18n();
  const steps = [
    { key: "pending",     label: t("timeline_accepted"),  icon: "✅" },
    { key: "in_progress", label: t("timeline_pickup"),    icon: "🛵" },
    { key: "delivered",   label: t("timeline_done"),      icon: "🏠" },
  ];
  const idx = status === "delivered" ? 2 : status === "in_progress" ? 1 : 0;
  return (
    <div className="flex items-center gap-0 mt-3 relative z-10">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm"
              style={{
                background: i <= idx ? TC : "rgba(255,255,255,0.08)",
                color: i <= idx ? "white" : BROWN_LIGHT,
                border: i <= idx ? "none" : `1px solid ${BORDER}`
              }}
            >
              {i < idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="text-[10px] mt-1 text-center w-16" style={{ color: i <= idx ? TC : BROWN_LIGHT }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-0.5 mb-4 mx-0.5" style={{ background: i < idx ? TC : BORDER }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function LivreurLivraisonDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { livreur } = useAuth();
  const LIVREUR_ID = livreur?.id ?? 0;

  const BASE_PAY = 7;
  const [pickupConfirmOpen, setPickupConfirmOpen] = useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [confirmCodeError, setConfirmCodeError] = useState("");
  const [gpsTarget, setGpsTarget] = useState<{ address: string; label: string } | null>(null);
  const [showGpsAfterPickup, setShowGpsAfterPickup] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);

  useEffect(() => {
    if (pickupConfirmOpen || deliveryConfirmOpen) {
      stopContinuousAlarm();
    }
  }, [pickupConfirmOpen, deliveryConfirmOpen]);

  const { data: delivery, isLoading } = useGetDelivery(id, {
    query: { enabled: !!id, queryKey: getGetDeliveryQueryKey(id) },
  });

  const { data: profile } = useGetDeliverer(LIVREUR_ID, {
    query: { enabled: !!LIVREUR_ID, queryKey: getGetDelivererQueryKey(LIVREUR_ID) },
  });

  useManagerSync({
    driverId: LIVREUR_ID,
    currentOrderId: delivery?.id ?? null,
    currentOrderStatus: delivery?.status ?? null,
    enabled: !!LIVREUR_ID && !!delivery && (delivery.status === "pending" || delivery.status === "in_progress"),
  });

  const updateDelivery = useUpdateDelivery();
  const confirmDelivered = useConfirmDelivered();
  const isPending = updateDelivery.isPending || confirmDelivered.isPending;

  const handlePickupConfirm = () => {
    updateDelivery.mutate({ id, data: { status: "in_progress" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID }) });
        setPickupConfirmOpen(false);
        setShowGpsAfterPickup(true);
      },
    });
  };

  const handleDelivered = () => {
    setConfirmCodeError("");
    confirmDelivered.mutate(
      {
        id,
        data: {
          delivererId: LIVREUR_ID,
          confirmCode: confirmCodeInput.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey({ delivererId: LIVREUR_ID }) });
          queryClient.invalidateQueries({ queryKey: getGetDeliveryStatsQueryKey({ delivererId: LIVREUR_ID }) });
          setDeliveryConfirmOpen(false);
          setConfirmCodeInput("");
          setShowEarnings(true);
          setTimeout(() => navigate("/livreur"), 2800);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            ?? "Code incorrect ou erreur serveur.";
          setConfirmCodeError(msg);
        },
      }
    );
  };

  const order = parseOrderNotes(delivery?.notes ?? null);

  if (showGpsAfterPickup && delivery) {
    return (
      <GpsPickerModal
        address={delivery.deliveryAddress}
        label={t("gps_delivery")}
        onClose={() => setShowGpsAfterPickup(false)}
      />
    );
  }

  if (gpsTarget) {
    return (
      <GpsPickerModal
        address={gpsTarget.address}
        label={gpsTarget.label}
        onClose={() => setGpsTarget(null)}
      />
    );
  }

  if (showEarnings) {
    return (
      <LivreurLayout>
        <div
          className="flex-1 flex flex-col items-center justify-center gap-6 p-8 animate-in fade-in zoom-in-95 duration-300"
          style={{ background: "transparent" }}
        >
          <div className="w-28 h-28 rounded-full flex items-center justify-center shadow-lg" style={{ background: GREEN }}>
            <CheckCircle2 className="h-14 w-14 text-white" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1" style={{ color: BROWN }}>
              {t("delivery_success_title")}
            </h2>
            <p className="text-sm" style={{ color: BROWN_LIGHT }}>
              {t("delivery_success_sub")}
            </p>
          </div>

          <div className="flex items-center gap-3 px-8 py-5 rounded-2xl" style={GLASS_STYLE}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,136,12,0.15)" }}>
              <Coins className="h-6 w-6" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: BROWN_LIGHT }}>
                {t("earned_this_delivery")}
              </p>
              <p className="text-3xl font-extrabold" style={{ color: GOLD }}>
                +{BASE_PAY} Dh
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: GREEN, animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: BROWN_LIGHT }}>{t("returning_dashboard")}</p>
        </div>
      </LivreurLayout>
    );
  }

  if (isLoading) {
    return (
      <LivreurLayout>
        <div className="p-5 space-y-4 min-h-full" style={{ background: "transparent" }}>
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </LivreurLayout>
    );
  }

  if (!delivery) {
    return (
      <LivreurLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-full" style={{ background: "transparent" }}>
          <UtensilsCrossed className="h-16 w-16 mb-4" style={{ color: BORDER }} />
          <h2 className="text-xl font-bold mb-2 relative z-10" style={{ color: BROWN }}>{t("not_found")}</h2>
          <Link href="/livreur/livraisons" className="relative z-10">
            <button className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-white" style={{ background: TC }}>
              {t("back_to_deliveries")}
            </button>
          </Link>
        </div>
      </LivreurLayout>
    );
  }

  const isActive = delivery.status === "pending" || delivery.status === "in_progress";

  return (
    <LivreurLayout>
      <div className="flex-1 overflow-auto relative" style={{ background: "transparent" }}>

        {/* ── Sticky header ── */}
        <div
          className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: BORDER, background: "rgba(26,10,6,0.85)", backdropFilter: "blur(12px)" }}
        >
          <Link href="/livreur/livraisons">
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <ArrowLeft className="h-4 w-4" style={{ color: BROWN }} />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono" style={{ color: BROWN_LIGHT }}>{delivery.trackingNumber}</p>
            <p className="text-sm font-bold truncate" style={{ color: BROWN }}>{delivery.customerName}</p>
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}${import.meta.env.BASE_URL}suivi/${delivery.trackingNumber}`;
              if (navigator.share) {
                navigator.share({ title: "Suivi Bridge", text: `Suivez votre livraison : ${delivery.trackingNumber}`, url });
              } else {
                navigator.clipboard?.writeText(url);
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center mr-1"
            style={{ background: "rgba(232,92,48,0.15)" }}
            title="Partager le lien de suivi"
          >
            <Share2 className="h-4 w-4" style={{ color: TC }} />
          </button>
          <StatusPill status={delivery.status} />
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto pb-32 relative z-10">

          {/* ── Timeline ── */}
          <StepTimeline status={delivery.status} />

          {/* ── Status banner ── */}
          {delivery.status === "pending" && (
            <div
              className="rounded-2xl border p-4 flex items-center gap-3"
              style={{ background: "rgba(212,136,12,0.1)", borderColor: "rgba(212,136,12,0.3)" }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,136,12,0.2)" }}>
                <Bike className="h-5 w-5" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: BROWN }}>{t("pickup_heading")}</p>
                <p className="text-xs mt-0.5" style={{ color: BROWN_MID }}>{delivery.pickupAddress}</p>
              </div>
            </div>
          )}
          {delivery.status === "in_progress" && (
            <div
              className="rounded-2xl border p-4 flex items-center gap-3"
              style={{ background: "rgba(232,92,48,0.1)", borderColor: "rgba(232,92,48,0.3)" }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(232,92,48,0.2)" }}>
                <Package className="h-5 w-5 animate-pulse" style={{ color: TC }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: BROWN }}>{t("delivering_heading")}</p>
                <p className="text-xs mt-0.5" style={{ color: BROWN_MID }}>{delivery.deliveryAddress}</p>
              </div>
            </div>
          )}

          {/* ── Livreur card ── */}
          {(delivery.status === "in_progress" || delivery.status === "delivered") && profile && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={GLASS_STYLE}
            >
              <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ background: "rgba(232,92,48,0.1)", borderColor: "rgba(232,92,48,0.2)" }}>
                <Bike className="h-3.5 w-3.5" style={{ color: TC }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TC }}>
                  {delivery.status === "in_progress" ? t("livreur_en_route") : t("livreur_delivered")}
                </span>
              </div>
              <div className="p-4 flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 shadow-sm"
                  style={{ background: TC }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base" style={{ color: BROWN }}>{profile.name}</p>
                  <p className="text-sm font-mono" style={{ color: BROWN_LIGHT }}>{profile.phone}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5"
                        style={{
                          fill: s <= Math.round(profile.rating) ? GOLD : "transparent",
                          color: s <= Math.round(profile.rating) ? GOLD : "rgba(255,255,255,0.15)",
                        }}
                      />
                    ))}
                    <span className="text-xs ml-1 font-medium" style={{ color: BROWN_MID }}>
                      {profile.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Order items ── */}
          {(order.items.length > 0 || order.total || order.rawText || order.mapsUrl) && (
            <div className="rounded-2xl border overflow-hidden" style={GLASS_STYLE}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: BORDER }}>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" style={{ color: TC }} />
                  <span className="text-sm font-bold" style={{ color: BROWN }}>{t("order_items")}</span>
                </div>
                {order.total && (
                  <span
                    className="px-3 py-1 rounded-full text-sm font-extrabold tabular-nums"
                    style={{ background: "rgba(232,92,48,0.18)", color: TC, border: `1px solid rgba(232,92,48,0.35)` }}
                  >
                    💰 {order.total}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Items list */}
                {order.items.length > 0 ? (
                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}
                      >
                        <span className="text-base flex-shrink-0">🛒</span>
                        <span className="text-sm font-semibold flex-1" style={{ color: BROWN }}>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : order.rawText ? (
                  <p className="text-sm px-1" style={{ color: BROWN }}>{order.rawText}</p>
                ) : null}

                {/* Payment method badge */}
                {order.paymentMethod && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: order.paymentMethod === "cash" ? "rgba(42,122,72,0.15)" : "rgba(59,130,246,0.15)", border: `1px solid ${order.paymentMethod === "cash" ? "rgba(42,122,72,0.4)" : "rgba(59,130,246,0.4)"}` }}>
                    <span className="text-lg">{order.paymentMethod === "cash" ? "💵" : "💳"}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: order.paymentMethod === "cash" ? GREEN : "#60A5FA" }}>
                        {order.paymentMethod === "cash" ? "Espèces à la livraison" : "Paiement par carte"}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: BROWN_MID }}>
                        {order.paymentMethod === "cash" ? "Préparez la monnaie" : "Terminal requis"}
                      </p>
                    </div>
                  </div>
                )}

                {order.extra && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                    <span className="text-base flex-shrink-0">📝</span>
                    <p className="text-xs italic" style={{ color: BROWN_MID }}>{order.extra}</p>
                  </div>
                )}

                {/* Maps button */}
              </div>
            </div>
          )}

          {/* ── Route ── */}
          <div className="rounded-2xl border overflow-hidden" style={GLASS_STYLE}>
            <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: BORDER }}>
              <MapPin className="h-4 w-4" style={{ color: TC }} />
              <span className="text-sm font-bold" style={{ color: BROWN }}>{t("route")}</span>
            </div>
            <div className="p-4 space-y-0">
              {/* Pickup */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                    style={{
                      borderColor: delivery.status === "pending" ? GOLD : BROWN_LIGHT,
                      background: delivery.status === "pending" ? "rgba(212,136,12,0.2)" : "rgba(42,122,72,0.2)",
                    }}
                  />
                  <div className="w-0.5 flex-1 my-1" style={{ background: delivery.status === "pending" ? "rgba(212,136,12,0.3)" : BORDER, minHeight: 24 }} />
                </div>
                <div className="flex-1 pb-4 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: delivery.status === "pending" ? GOLD : BROWN_LIGHT }}>
                    {t("pickup_point")}
                    {delivery.status === "pending" && <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(212,136,12,0.2)", color: GOLD }}>← Étape 1</span>}
                  </p>
                  <p className="text-sm font-medium" style={{ color: BROWN }}>{delivery.pickupAddress}</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setGpsTarget({ address: delivery.pickupAddress, label: t("gps_pickup") })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.06)", color: BROWN_MID, border: `1px solid ${BORDER}` }}
                    >
                      <Navigation className="h-3 w-3" />
                      {t("navigate_pickup")}
                    </button>
                  </div>
                </div>
              </div>

              {/* ─────── INTERMEDIATE STEP: Pickup confirmation ─────── */}
              {delivery.status === "pending" && (
                <div className="my-3 -mx-4 px-4 py-3 border-y" style={{ background: "rgba(232,92,48,0.10)", borderColor: "rgba(232,92,48,0.30)" }}>
                  <button
                    onClick={() => setPickupConfirmOpen(true)}
                    disabled={isPending}
                    className="w-full h-16 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-60 shadow-lg"
                    style={{ background: "linear-gradient(135deg, #E85C30 0%, #c04020 100%)", color: "white" }}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                    {t("start_delivery_btn")}
                  </button>
                  <p className="text-[11px] mt-2 text-center font-medium" style={{ color: BROWN_MID }}>
                    Appuyez une fois la commande récupérée au restaurant.
                  </p>
                </div>
              )}

              {/* Marker showing pickup is done — visible after in_progress */}
              {(delivery.status === "in_progress" || delivery.status === "delivered") && (
                <div className="my-3 -mx-4 px-4 py-2 flex items-center justify-center gap-2 border-y" style={{ background: "rgba(42,122,72,0.15)", borderColor: "rgba(42,122,72,0.3)" }}>
                  <CheckCircle2 className="h-4 w-4" style={{ color: "#2AE86C" }} />
                  <span className="text-xs font-bold" style={{ color: "#2AE86C" }}>
                    Commande récupérée — en route vers le client
                  </span>
                </div>
              )}

              {/* Delivery */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{
                    background: delivery.status === "in_progress" ? TC : delivery.status === "delivered" ? GREEN : "rgba(255,255,255,0.2)",
                  }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: delivery.status === "in_progress" ? TC : delivery.status === "delivered" ? GREEN : BROWN_LIGHT }}>
                    {t("destination")}
                    {delivery.status === "in_progress" && <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(232,92,48,0.2)", color: TC }}>← Étape 2</span>}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: BROWN }}>{delivery.deliveryAddress}</p>
                  {delivery.status !== "pending" && (
                    <button
                      onClick={() => setGpsTarget({ address: delivery.deliveryAddress, label: t("gps_delivery") })}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ background: delivery.status === "in_progress" ? TC : GREEN }}
                    >
                      <Navigation className="h-3 w-3" />
                      {t("navigate_delivery")}
                    </button>
                  )}
                  {/* ── Delivery CTA — visible only when in_progress ── */}
                  {delivery.status === "in_progress" && (
                    <button
                      onClick={() => setDeliveryConfirmOpen(true)}
                      disabled={isPending}
                      className="mt-2 w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-sm"
                      style={{ background: GREEN }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t("confirm_delivered_btn")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Contact ── */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`tel:${delivery.customerPhone}`}
              className="flex items-center justify-center gap-2 h-12 rounded-2xl font-bold transition-all active:scale-95"
              style={{ background: GREEN, color: "white" }}
            >
              <Phone className="h-4 w-4" />
              {t("call_customer")}
            </a>
            {/* WhatsApp button logic remains, just update style */}
            <a
              href={`https://wa.me/${delivery.customerPhone?.replace(/\s+/g, "") ?? ""}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 h-12 rounded-2xl font-bold border transition-all active:scale-95"
              style={{ borderColor: "#25D366", color: "#25D366", background: "rgba(37,211,102,0.1)" }}
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

        </div>

        {/* ── Floating action button ── */}
        {isActive && (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-30 pointer-events-none" style={{ maxWidth: 440, margin: "0 auto" }}>
            <div className="pointer-events-auto">
              {delivery.status === "pending" ? (
                <button
                  onClick={() => setPickupConfirmOpen(true)}
                  disabled={isPending}
                  className="w-full h-14 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #E85C30 0%, #c04020 100%)", color: "white" }}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {t("start_delivery_btn")}
                </button>
              ) : (
                <button
                  onClick={() => setDeliveryConfirmOpen(true)}
                  disabled={isPending}
                  className="w-full h-14 rounded-2xl font-extrabold text-base text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: GREEN }}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {t("confirm_delivered_btn")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── PICKUP confirmation modal ── */}
        {pickupConfirmOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
            style={{ background: "rgba(44,24,16,0.7)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 duration-300"
              style={{ background: "#1A0A06", borderColor: "rgba(255,255,255,0.15)" }}
            >
              <div className="h-1.5 w-full" style={{ background: GOLD_GRADIENT }} />
              <div className="p-6 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(212,136,12,0.15)" }}
                >
                  <Package className="h-8 w-8" style={{ color: GOLD }} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: BROWN }}>{t("pickup_confirm_title")}</h3>
                <p className="text-sm mb-2" style={{ color: BROWN_MID }}>{delivery.customerName}</p>
                <div
                  className="rounded-xl p-3 mb-5 border text-left"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5" style={{ borderColor: GOLD, background: "rgba(212,136,12,0.2)" }} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: BROWN_LIGHT }}>Restaurant</p>
                      <p className="text-sm font-medium" style={{ color: BROWN }}>{delivery.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="ml-2.5 w-0.5 h-4 my-1" style={{ background: BORDER }} />
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: TC }} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: BROWN_LIGHT }}>{t("destination")}</p>
                      <p className="text-sm font-medium" style={{ color: BROWN }}>{delivery.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs mb-5" style={{ color: BROWN_LIGHT }}>{t("pickup_confirm_sub")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPickupConfirmOpen(false)}
                    className="h-12 rounded-xl font-semibold border"
                    style={{ borderColor: BORDER, color: BROWN_MID, background: "rgba(255,255,255,0.05)" }}
                  >
                    {t("back")}
                  </button>
                  <button
                    onClick={handlePickupConfirm}
                    disabled={isPending}
                    className="h-12 rounded-xl font-bold text-[#1A0A06] disabled:opacity-60"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    {isPending ? "…" : t("pickup_confirm_btn")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DELIVERY confirmation modal ── */}
        {deliveryConfirmOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
            style={{ background: "rgba(44,24,16,0.7)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 duration-300"
              style={{ background: "#1A0A06", borderColor: "rgba(255,255,255,0.15)" }}
            >
              <div className="h-1.5 w-full" style={{ background: GREEN }} />
              <div className="p-6 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(42,122,72,0.15)" }}
                >
                  <CheckCircle2 className="h-8 w-8" style={{ color: GREEN }} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: BROWN }}>{t("confirm_delivered")}</h3>
                <p className="text-sm mb-5" style={{ color: BROWN_MID }}>{t("confirm_delivered_btn")}</p>

                {!!delivery.confirmCode && (
                  <div className="mb-5">
                    <p className="text-xs font-bold text-left mb-2 uppercase tracking-wide" style={{ color: BROWN_LIGHT }}>
                      Code de confirmation client
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmCodeInput}
                      onChange={(e) => setConfirmCodeInput(e.target.value)}
                      placeholder="· · · · · ·"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl text-center text-2xl font-black tracking-[0.5em] text-white focus:border-[#D4880C] focus:ring-0 transition-all"
                    />
                    {confirmCodeError && (
                      <p className="text-xs mt-2 font-bold" style={{ color: TC }}>{confirmCodeError}</p>
                    )}
                    <p className="text-[10px] mt-3 italic" style={{ color: BROWN_LIGHT }}>
                      Demandez ce code au client pour confirmer la livraison
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeliveryConfirmOpen(false)}
                    className="h-12 rounded-xl font-semibold border"
                    style={{ borderColor: BORDER, color: BROWN_MID, background: "rgba(255,255,255,0.05)" }}
                  >
                    {t("back")}
                  </button>
                  <button
                    onClick={handleDelivered}
                    disabled={isPending || (!!delivery.confirmCode && !confirmCodeInput.trim())}
                    className="h-12 rounded-xl font-bold text-white disabled:opacity-60"
                    style={{ background: GREEN }}
                  >
                    {isPending ? "…" : t("confirm_delivered_btn")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LivreurLayout>
  );
}
