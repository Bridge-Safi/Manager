import { useState } from "react";
import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency, formatTimeAgo } from "@/lib/formatters";
import { dateFnsLocale } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, PackageSearch } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-orange-100 text-orange-700",
  accepted:  "bg-blue-100 text-blue-700",
  ready:     "bg-emerald-100 text-emerald-700",
  picked_up: "bg-gray-100 text-gray-600",
  rejected:  "bg-red-100 text-red-600",
};

const PLATFORM_STYLE: Record<string, string> = {
  "Bridge Eats": "bg-[#FF6B35] text-white",
  "Bridge":      "bg-[#FF6B35] text-white",
};

export default function Orders() {
  const { t, lang } = useLanguage();
  const locale = dateFnsLocale(lang);
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");

  const TABS = [
    { key: "",           label: t.tabAll },
    { key: "pending",   label: t.statusPending },
    { key: "accepted",  label: t.statusAccepted },
    { key: "ready",     label: t.statusReady },
    { key: "picked_up", label: t.tabDelivered },
    { key: "rejected",  label: t.tabRejected },
  ];

  const STATUS_LABEL: Record<string, string> = {
    pending:   t.statusPending,
    accepted:  t.statusAccepted,
    ready:     t.statusReady,
    picked_up: t.statusPickedUp,
    rejected:  t.statusRejected,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders = [], isLoading } = useListOrders(
    tab ? { status: tab } : {},
    { query: { refetchInterval: 2000, refetchIntervalInBackground: true } as any }
  );

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.platform.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 pt-4 pb-0 flex-shrink-0">
        <h1 className="font-bold text-gray-900 text-base md:text-lg mb-3">{t.ordersTitle}</h1>
        <div className="flex gap-0 overflow-x-auto scrollbar-none">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              data-testid={`tab-status-${tb.key || "all"}`}
              className={`px-3 md:px-4 py-2.5 text-xs md:text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                tab === tb.key
                  ? "border-[#FF6B35] text-[#FF6B35]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-16 md:pb-0 p-4 md:p-5">
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white text-sm"
            data-testid="input-search-orders"
          />
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="hidden md:grid grid-cols-[1fr_120px_90px_80px_24px] gap-4 px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            <span>{t.colOrder}</span>
            <span>{t.colPlatform}</span>
            <span>{t.colStatus}</span>
            <span className="text-right">{t.colTotal}</span>
            <span />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-gray-300">
            <PackageSearch size={44} className="mb-3" />
            <p className="text-sm font-medium text-gray-400">{t.noOrdersTitle}</p>
            <p className="text-xs text-gray-300 mt-1">{t.noOrdersHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div
                  data-testid={`order-row-${order.id}`}
                  className="md:hidden flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 active:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${PLATFORM_STYLE[order.platform] ?? "bg-gray-200 text-gray-700"}`}>
                        {order.platform}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {order.customerName} · {order.items.length} {t.itemWord(order.items.length)} · {formatTimeAgo(order.createdAt, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatCurrency(order.totalAmount)}</p>
                    <ChevronRight size={15} className="text-gray-300" />
                  </div>
                </div>

                <div className="hidden md:grid grid-cols-[1fr_120px_90px_80px_24px] gap-4 items-center bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.customerName} · {order.items.length} {t.itemWord(order.items.length)} · {formatTimeAgo(order.createdAt, locale)}
                    </p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${PLATFORM_STYLE[order.platform] ?? "bg-gray-200 text-gray-700"}`}>
                      {order.platform}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm text-right">{formatCurrency(order.totalAmount)}</p>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
