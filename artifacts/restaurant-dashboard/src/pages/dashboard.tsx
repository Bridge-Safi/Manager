import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOrderStats,
  useGetRecentOrders,
  useCreateOrder,
  getGetOrderStatsQueryKey,
  getGetRecentOrdersQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useMarkOrderReady } from "@/hooks/use-mark-order-ready";
import type { Order } from "@workspace/api-client-react";
import { useAlarm } from "@/contexts/AlarmContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency, formatTimeAgo } from "@/lib/formatters";
import { dateFnsLocale } from "@/i18n";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingBag, DollarSign, Timer, CheckCircle, XCircle,
  ChefHat, Zap, MapPin, StickyNote, AlertCircle,
} from "lucide-react";

function Platform({ name }: { name: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    "Bridge Eats": { bg: "#FF6B35", text: "#fff" },
    "Bridge":      { bg: "#FF6B35", text: "#fff" },
  };
  const s = map[name] ?? { bg: "#6B7280", text: "#fff" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {name}
    </span>
  );
}

function Card({ order, onAccept, onReject, onReady }: {
  order: Order;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  onReady?: (id: number) => void;
}) {
  const { t, lang } = useLanguage();
  const locale = dateFnsLocale(lang);
  const isPending = order.status === "pending";
  return (
    <div
      data-testid={`order-card-${order.id}`}
      className={`rounded-xl border p-4 transition-shadow ${
        isPending ? "border-orange-200 bg-orange-50/40" : "border-gray-100 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
            <Platform name={order.platform} />
          </div>
          <p className="text-xs font-medium text-gray-600">{order.customerName}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900 text-sm">{formatCurrency(order.totalAmount)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatTimeAgo(order.createdAt, locale)}</p>
        </div>
      </div>

      {order.deliveryAddress && (
        <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-2">
          <MapPin size={10} className="flex-shrink-0" />
          {order.deliveryAddress}
        </p>
      )}

      <div className="text-[11px] text-gray-600 space-y-0.5 mb-3">
        {(order.items as Array<{ quantity: number; name: string }>).slice(0, 3).map((item, i) => (
          <div key={i} className="flex gap-1">
            <span className="font-bold text-gray-400 w-5 flex-shrink-0">{item.quantity}×</span>
            <span className="truncate">{item.name}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-gray-400 italic">{t.moreItems(order.items.length - 3)}</p>
        )}
      </div>

      {order.notes && (
        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-3">
          <StickyNote size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-snug">{order.notes}</p>
        </div>
      )}

      {order.estimatedPrepTime && order.status === "accepted" && (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 mb-3">
          <Timer size={11} />
          {t.readyIn(order.estimatedPrepTime)}
        </div>
      )}

      {isPending && onAccept && onReject && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onReject(order.id)}
            data-testid={`btn-reject-${order.id}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <XCircle size={13} /> {t.btnReject}
          </button>
          <button
            onClick={() => onAccept(order.id)}
            data-testid={`btn-accept-${order.id}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={13} /> {t.btnAccept}
          </button>
        </div>
      )}

      {order.status === "accepted" && onReady && (
        <button
          onClick={() => onReady(order.id)}
          data-testid={`btn-ready-${order.id}`}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors mt-1"
        >
          <ChefHat size={13} /> {t.btnMarkReady}
        </button>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent + "18" }}>
        <Icon size={17} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium leading-none mb-1 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, msg }: { icon: React.ElementType; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-300 gap-2">
      <Icon size={28} />
      <p className="text-xs text-gray-400">{msg}</p>
    </div>
  );
}

function Column({ label, accent, count, children }: {
  label: string; accent: string; count: number; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 flex-shrink-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex-1 truncate">{label}</span>
        <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accent + "22", color: accent }}>
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const { t, lang } = useLanguage();
  const { pendingOrders, acceptSingleOrder, rejectSingleOrder } = useAlarm();
  const { data: stats, isLoading: statsLoading } = useGetOrderStats();
  const { data: recentOrders = [], isLoading: ordersLoading } = useGetRecentOrders();
  const markReady = useMarkOrderReady();
  const createOrder = useCreateOrder();

  const [acceptId, setAcceptId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [prepTime, setPrepTime] = useState(20);
  const [mobileTab, setMobileTab] = useState<"pending" | "accepted" | "ready">("pending");

  // Dans Bridge Manager: pending → assigned → in_delivery → delivered
  const accepted = recentOrders.filter((o) => o.status === "assigned");
  const ready    = recentOrders.filter((o) => o.status === "in_delivery");
  // "Nouvelles" = commandes en attente + commandes acceptées (toujours en cours de préparation)
  const newOrders = recentOrders.filter((o) => o.status === "pending" || o.status === "assigned");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
  };

  const confirmAccept = async () => {
    if (acceptId == null) return;
    await acceptSingleOrder(acceptId);
    invalidate();
    setAcceptId(null);
    toast({ title: t.toastAccepted, description: t.prepSuffix(prepTime) });
  };

  const confirmReject = async () => {
    if (rejectId == null) return;
    await rejectSingleOrder(rejectId);
    invalidate();
    setRejectId(null);
    toast({ title: t.toastRejected, variant: "destructive" });
  };

  const handleReady = async (id: number) => {
    await markReady.mutateAsync({ id });
    invalidate();
    toast({ title: t.toastReady });
  };

  const handleSimulate = async () => {
    const n = Math.floor(Math.random() * 9000) + 1000;
    await createOrder.mutateAsync({
      data: {
        orderNumber: `TEST-${n}`,
        platform: "Bridge Eats",
        customerName: "Client Test",
        customerPhone: "+212 6 00 00 00 00",
        items: [
          { name: "Burger Bridge", quantity: 2, price: 45 },
          { name: "Frites maison", quantity: 2, price: 15 },
        ],
        totalAmount: 120,
        estimatedPrepTime: 20,
        deliveryAddress: "Safi, Maroc",
        notes: "Commande test",
      },
    });
    invalidate();
    toast({ title: t.toastSimulated, description: t.toastSimulatedDesc });
  };

  const PREP = [10, 15, 20, 25, 30];

  const mobileTabs = [
    { key: "pending"  as const, label: t.tabNew,     accent: "#FF6B35", count: newOrders.length },
    { key: "accepted" as const, label: t.tabKitchen, accent: "#3B82F6", count: accepted.length },
    { key: "ready"    as const, label: t.tabReady,   accent: "#10B981", count: ready.length },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="font-bold text-gray-900 text-base md:text-lg">{t.dashboardTitle}</h1>
        <button
          onClick={handleSimulate}
          disabled={createOrder.isPending}
          data-testid="btn-simulate-order"
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs md:text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <Zap size={13} className="text-[#FF6B35]" />
          <span className="hidden sm:inline">{t.simulateBtn}</span>
          <span className="sm:hidden">{t.simulateBtnShort}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="p-4 md:p-5 space-y-4 md:space-y-5">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : (
              <>
                <Stat label={t.statOrders}  value={stats?.totalToday ?? 0}                                                icon={ShoppingBag}   accent="#3B82F6" />
                <Stat label={t.statPending} value={pendingOrders.length}                                                  icon={AlertCircle}   accent="#FF6B35" />
                <Stat label={t.statRevenue} value={formatCurrency(stats?.totalRevenue ?? 0)}                              icon={DollarSign}    accent="#10B981" />
                <Stat label={t.statAvgDelay} value={stats?.avgPrepTime ? `${Math.round(stats.avgPrepTime)} min` : "—"}   icon={Timer}         accent="#8B5CF6" />
              </>
            )}
          </div>

          {/* Kanban desktop */}
          <div className="hidden md:grid md:grid-cols-3 gap-4" style={{ height: "calc(100vh - 255px)" }}>
            <Column label={t.colNew} accent="#FF6B35" count={newOrders.length}>
              {newOrders.length === 0
                ? <Empty icon={CheckCircle} msg={t.emptyPending} />
                : newOrders.map((o) => (
                    <Card
                      key={o.id}
                      order={o}
                      onAccept={o.status === "pending" ? setAcceptId : undefined}
                      onReject={o.status === "pending" ? setRejectId : undefined}
                      onReady={o.status === "accepted" ? handleReady : undefined}
                    />
                  ))}
            </Column>
            <Column label={t.colKitchen} accent="#3B82F6" count={ordersLoading ? 0 : accepted.length}>
              {ordersLoading ? <Skeleton className="h-28 rounded-xl" />
                : accepted.length === 0 ? <Empty icon={ChefHat} msg={t.emptyKitchen} />
                : accepted.map((o) => <Card key={o.id} order={o} onReady={handleReady} />)}
            </Column>
            <Column label={t.colReady} accent="#10B981" count={ordersLoading ? 0 : ready.length}>
              {ordersLoading ? <Skeleton className="h-24 rounded-xl" />
                : ready.length === 0 ? <Empty icon={ShoppingBag} msg={t.emptyReady} />
                : ready.map((o) => <Card key={o.id} order={o} />)}
            </Column>
          </div>

          {/* Kanban mobile */}
          <div className="md:hidden">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMobileTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    mobileTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ backgroundColor: tab.accent }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {mobileTab === "pending" && (
                newOrders.length === 0
                  ? <Empty icon={CheckCircle} msg={t.emptyPending} />
                  : newOrders.map((o) => (
                      <Card
                        key={o.id}
                        order={o}
                        onAccept={o.status === "pending" ? setAcceptId : undefined}
                        onReject={o.status === "pending" ? setRejectId : undefined}
                        onReady={o.status === "accepted" ? handleReady : undefined}
                      />
                    ))
              )}
              {mobileTab === "accepted" && (
                ordersLoading ? <Skeleton className="h-28 rounded-xl" />
                  : accepted.length === 0 ? <Empty icon={ChefHat} msg={t.emptyKitchen} />
                  : accepted.map((o) => <Card key={o.id} order={o} onReady={handleReady} />)
              )}
              {mobileTab === "ready" && (
                ordersLoading ? <Skeleton className="h-24 rounded-xl" />
                  : ready.length === 0 ? <Empty icon={ShoppingBag} msg={t.emptyReady} />
                  : ready.map((o) => <Card key={o.id} order={o} />)
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Accept dialog */}
      <Dialog open={acceptId !== null} onOpenChange={() => setAcceptId(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{t.acceptTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mb-4">{t.prepTimeLabel}</p>
          <div className="grid grid-cols-5 gap-2">
            {PREP.map((time) => (
              <button
                key={time}
                onClick={() => setPrepTime(time)}
                data-testid={`prep-time-${time}`}
                className={`py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                  prepTime === time
                    ? "border-[#FF6B35] bg-orange-50 text-orange-600"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                {time}m
              </button>
            ))}
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" onClick={() => setAcceptId(null)} className="flex-1">{t.cancelBtn}</Button>
            <Button onClick={confirmAccept} data-testid="btn-confirm-accept" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
              <CheckCircle size={15} className="mr-1.5" /> {t.confirmBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectId !== null} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{t.rejectTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">{t.rejectConfirmMsg}</p>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" onClick={() => setRejectId(null)} className="flex-1">{t.cancelBtn}</Button>
            <Button variant="destructive" onClick={confirmReject} data-testid="btn-confirm-reject" className="flex-1">
              <XCircle size={15} className="mr-1.5" /> {t.btnReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
