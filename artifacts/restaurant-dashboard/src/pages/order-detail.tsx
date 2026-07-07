import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOrder,
  useAcceptOrder,
  useRejectOrder,
  getGetOrderQueryKey,
  getGetOrderStatsQueryKey,
  getGetRecentOrdersQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useMarkOrderReady } from "@/hooks/use-mark-order-ready";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency, formatDateTime, formatTimeAgo } from "@/lib/formatters";
import { dateFnsLocale } from "@/i18n";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, CheckCircle, XCircle, ChefHat,
  Phone, MapPin, Clock, StickyNote,
} from "lucide-react";

const STATUS_STEPS = ["pending", "accepted", "ready", "picked_up"];

const PLATFORM_STYLE: Record<string, string> = {
  "Bridge Eats": "bg-[#FF6B35] text-white",
  "Bridge":      "bg-[#FF6B35] text-white",
};

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-orange-100 text-orange-700",
  accepted:  "bg-blue-100 text-blue-700",
  ready:     "bg-emerald-100 text-emerald-700",
  picked_up: "bg-gray-100 text-gray-600",
  rejected:  "bg-red-100 text-red-600",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function OrderDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { t, lang } = useLanguage();
  const locale = dateFnsLocale(lang);
  const id = Number(params.id);

  const STATUS_LABEL: Record<string, string> = {
    pending:   t.statusPending,
    accepted:  t.statusAccepted,
    ready:     t.statusReady,
    picked_up: t.statusPickedUp,
    rejected:  t.statusRejected,
  };

  const STEP_LABEL: Record<string, string> = {
    pending:   t.stepReceived,
    accepted:  t.stepAccepted,
    ready:     t.stepReady,
    picked_up: t.stepDelivered,
  };

  const { data: order, isLoading } = useGetOrder(id, {
    query: { queryKey: getGetOrderQueryKey(id), refetchInterval: 5000, enabled: !isNaN(id) },
  });

  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const markReady   = useMarkOrderReady();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });
    qc.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
  };

  const handleAccept = async () => {
    await acceptOrder.mutateAsync({ id, data: { estimatedPrepTime: 20 } });
    invalidate();
    toast({ title: t.toastAccepted });
  };

  const handleReject = async () => {
    await rejectOrder.mutateAsync({ id, data: { reason: t.rejectedDefault } });
    invalidate();
    toast({ title: t.toastRejected, variant: "destructive" });
  };

  const handleReady = async () => {
    await markReady.mutateAsync({ id });
    invalidate();
    toast({ title: t.toastReady });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return <div className="p-6 text-center text-gray-400">{t.orderNotFound}</div>;
  }

  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const subtotal  = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-4">
        <button
          onClick={() => navigate("/orders")}
          data-testid="btn-back"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <span className="font-bold text-gray-900">#{order.orderNumber}</span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${PLATFORM_STYLE[order.platform] ?? "bg-gray-200 text-gray-700"}`}>
            {order.platform}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <span className="text-xs text-gray-400">{formatTimeAgo(order.createdAt, locale)}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {order.status === "pending" && (
            <>
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={rejectOrder.isPending} data-testid="btn-reject-detail">
                <XCircle size={14} className="mr-1.5" /> {t.btnReject}
              </Button>
              <Button size="sm" onClick={handleAccept} disabled={acceptOrder.isPending} data-testid="btn-accept-detail" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <CheckCircle size={14} className="mr-1.5" /> {t.btnAccept}
              </Button>
            </>
          )}
          {order.status === "accepted" && (
            <Button size="sm" onClick={handleReady} disabled={markReady.isPending} data-testid="btn-ready-detail" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <ChefHat size={14} className="mr-1.5" /> {t.btnMarkReadyShort}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-16 md:pb-0 p-4 md:p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {order.status !== "rejected" && (
            <Section title={t.trackingTitle}>
              <div className="flex items-center">
                {STATUS_STEPS.map((step, i) => {
                  const done   = i < stepIndex;
                  const active = i === stepIndex;
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          done   ? "bg-emerald-500 text-white"
                          : active ? "bg-[#FF6B35] text-white ring-4 ring-orange-100"
                          : "bg-gray-100 text-gray-400"
                        }`}>
                          {done ? <CheckCircle size={15} /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium mt-2 text-center ${
                          active ? "text-[#FF6B35]" : done ? "text-emerald-600" : "text-gray-400"
                        }`}>
                          {STEP_LABEL[step]}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`flex-1 h-px mx-2 mb-5 ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {order.status === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-red-700 mb-1">{t.rejectedBanner}</p>
              <p className="text-sm text-red-600">{order.rejectionReason ?? t.rejectedDefault}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Section title={t.articlesSectionTitle(order.items.length)}>
                <div className="space-y-3 mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF6B35] text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {item.quantity}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                          {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm flex-shrink-0">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{t.subtotalLabel}</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>{t.totalLabel}</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </Section>
            </div>

            <Section title={t.clientLabel}>
              <p className="font-semibold text-gray-900 mb-2">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-sm text-gray-600 flex items-center gap-2 mb-1.5">
                  <Phone size={13} className="text-gray-400" /> {order.customerPhone}
                </p>
              )}
              {order.deliveryAddress && (
                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  {order.deliveryAddress}
                </p>
              )}
            </Section>

            <Section title={t.timingLabel}>
              <div className="space-y-2">
                {[
                  { label: t.receivedAt, value: formatDateTime(order.createdAt, locale) },
                  order.acceptedAt ? { label: t.acceptedAt, value: formatDateTime(order.acceptedAt, locale) } : null,
                  order.readyAt    ? { label: t.readyAt,    value: formatDateTime(order.readyAt, locale) }    : null,
                  order.estimatedPrepTime ? { label: t.prepEstimated, value: `${order.estimatedPrepTime} min` } : null,
                ].filter(Boolean).map((row) => row && (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{row.label}</span>
                    <span className="font-medium text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {order.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <StickyNote size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">{t.clientNote}</p>
                <p className="text-sm text-amber-700">{order.notes}</p>
              </div>
            </div>
          )}

          {order.deliveryPersonName && (
            <Section title={t.deliveryMan}>
              <p className="font-semibold text-gray-900">{order.deliveryPersonName}</p>
              {order.deliveryPersonPhone && (
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Phone size={13} className="text-gray-400" /> {order.deliveryPersonPhone}
                </p>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
