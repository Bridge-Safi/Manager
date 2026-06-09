import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetDashboardSummary, useListOrders, useListDrivers, useListActivities } from "@workspace/api-client-react";
import { OrderStatusBadge, DriverStatusBadge } from "@/components/status-badges";
import { AssignDriverDialog } from "@/components/assign-driver-dialog";
import { NewOrderDialog } from "@/components/new-order-dialog";
import { Order } from "@workspace/api-client-react";
import { useNewOrderAlert } from "@/hooks/use-new-order-alert";
import { cn } from "@/lib/utils";
import { Activity, Clock, DollarSign, TrendingUp, Users, Bike, MapPin, CheckCircle2, Navigation, Package, X, Circle, WifiOff, AlertTriangle, Eye, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

function useSiteStats() {
  const [stats, setStats] = useState<{ visits: number; registrations: number } | null>(null);
  useEffect(() => {
    const load = () => fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);
  return stats;
}

function getActivityIcon(action: string) {
  switch (action) {
    case "order_delivered": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "order_assigned": return <Package className="w-4 h-4 text-blue-500" />;
    case "order_picked_up": return <Bike className="w-4 h-4 text-orange-500" />;
    case "order_cancelled": return <X className="w-4 h-4 text-red-500" />;
    case "status_online":
    case "status_available": return <Circle className="w-4 h-4 text-green-500" />;
    case "status_offline": return <WifiOff className="w-4 h-4 text-zinc-500" />;
    case "location_updated": return <Navigation className="w-4 h-4 text-primary" />;
    default: return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function Dashboard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const siteStats = useSiteStats();

  const { data: summary, isLoading: loadingSummary, isFetching: fetchingSummary } = useGetDashboardSummary({
    query: { refetchInterval: 5000 }
  });

  const { data: pendingOrders, isLoading: loadingOrders } = useListOrders(
    { status: "pending" },
    { query: { refetchInterval: 5000 } }
  );

  const { data: inDeliveryOrders } = useListOrders(
    { status: "in_delivery" },
    { query: { refetchInterval: 5000 } }
  );

  const { data: drivers, isLoading: loadingDrivers } = useListDrivers({
    query: { refetchInterval: 5000 }
  });

  const { data: activities } = useListActivities(
    { limit: 8 },
    { query: { refetchInterval: 5000 } }
  );

  useNewOrderAlert(pendingOrders?.length);

  useEffect(() => {
    if (!fetchingSummary) {
      setLastUpdated(new Date());
    }
  }, [fetchingSummary]);

  const activeDriversCount = drivers?.filter(d => d.status !== 'offline').length || 0;
  const hasUrgentOrders = pendingOrders && pendingOrders.length > 2;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">Vue Globale</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Centre de dispatch en temps réel.</span>
              <span className="text-xs font-mono text-muted-foreground/50 border border-white/10 rounded px-2 py-0.5 bg-black/20">
                Mis à jour à {format(lastUpdated, "HH:mm:ss")}
              </span>
            </div>
          </div>
          <Button
            onClick={() => setNewOrderOpen(true)}
            className="glow-pulse bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide h-11 px-6 shrink-0"
          >
            + Nouvelle commande
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <KpiCard 
            title="Revenu du jour" 
            value={loadingSummary ? null : `${summary?.todayRevenue.toFixed(2)}`} 
            unit="MAD"
            icon={DollarSign} 
            color="orange"
            trend="+12%" 
          />
          <KpiCard 
            title="Commandes" 
            value={loadingSummary ? null : (summary?.todayOrders.toString() ?? null)} 
            icon={TrendingUp} 
            color="blue"
          />
          <KpiCard 
            title="En attente" 
            value={loadingSummary ? null : (summary?.pendingOrders.toString() ?? null)} 
            icon={Clock} 
            color="yellow"
            alert={summary && summary.pendingOrders > 0}
          />
          <KpiCard 
            title="Flotte Active" 
            value={loadingDrivers ? null : `${activeDriversCount}`} 
            unit={`/ ${drivers?.length || 0}`}
            icon={Users} 
            color="green"
          />
          <KpiCard 
            title="Alertes" 
            value={loadingSummary ? null : (summary?.alertCount.toString() ?? null)} 
            icon={AlertTriangle} 
            color={summary && summary.alertCount > 0 ? "red" : "green"}
            alert={summary && summary.alertCount > 0}
          />
        </div>

        {/* Stats site Bridge Safi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card className="glass border-white/5 border-t-2 border-t-violet-500 shadow-[0_-2px_10px_-2px_rgba(139,92,246,0.2)]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Visiteurs · Bridge Eats</h3>
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
                  <Eye className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                {siteStats === null ? (
                  <Skeleton className="h-10 w-24 bg-white/5" />
                ) : (
                  <div className="font-display text-4xl font-bold tracking-tighter">
                    {siteStats.visits.toLocaleString('fr-FR')}
                    <span className="text-lg text-muted-foreground font-sans font-normal ml-2">visites</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Sessions uniques · 24h de déduplication</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5 border-t-2 border-t-emerald-500 shadow-[0_-2px_10px_-2px_rgba(16,185,129,0.2)]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Inscrits · Bridge Eats</h3>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                {siteStats === null ? (
                  <Skeleton className="h-10 w-24 bg-white/5" />
                ) : (
                  <div className="font-display text-4xl font-bold tracking-tighter">
                    {siteStats.registrations.toLocaleString('fr-FR')}
                    <span className="text-lg text-muted-foreground font-sans font-normal ml-2">comptes</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Inscriptions vérifiées · email ou téléphone</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Area - Pending Orders */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold tracking-tight flex items-center gap-3">
                À Assigner
                {pendingOrders && pendingOrders.length > 0 && (
                  <Badge variant="destructive" className="font-mono text-sm bg-red-500/20 text-red-500 border-red-500/30 px-2 py-0">
                    {pendingOrders.length}
                  </Badge>
                )}
              </h2>
              <Link href="/orders" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1">
                Toutes les commandes <Navigation className="w-3 h-3 rotate-90" />
              </Link>
            </div>

            <div className={cn("space-y-4 rounded-xl p-1 -mx-1", hasUrgentOrders && "bg-yellow-500/5 shadow-[inset_0_0_50px_rgba(234,179,8,0.05)]")}>
              {loadingOrders ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl bg-card/50" />)
              ) : pendingOrders?.length === 0 ? (
                <Card className="border-dashed border-white/10 bg-transparent shadow-none">
                  <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mb-3 opacity-30 text-green-500" />
                    <p className="font-display">Aucune commande en attente.</p>
                  </CardContent>
                </Card>
              ) : (
                pendingOrders?.map((order) => (
                  <Card key={order.id} className="glass hover-lift group overflow-hidden border-l-4 border-l-yellow-500/80 hover:border-l-primary relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <CardContent className="p-5 flex flex-col sm:flex-row gap-5 justify-between sm:items-center relative z-10">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-xl font-bold text-primary drop-shadow-[0_0_8px_rgba(255,90,31,0.5)]">#{order.orderNumber}</span>
                          <span className="text-xs font-mono text-muted-foreground bg-black/40 px-2 py-0.5 rounded">{format(new Date(order.createdAt), "HH:mm")}</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="font-medium text-foreground text-lg">{order.customerName} <span className="text-muted-foreground/50 mx-2">•</span> <span className="font-mono text-sm text-muted-foreground">{order.customerPhone}</span></div>
                        <div className="text-sm text-muted-foreground flex items-start gap-2 bg-black/20 p-2 rounded-lg border border-white/5 w-max pr-4">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{order.deliveryAddress}</span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-4 shrink-0">
                        <div className="font-display text-2xl font-bold tracking-tight">{order.totalAmount.toFixed(2)} <span className="text-sm text-muted-foreground font-sans font-normal">MAD</span></div>
                        <Button 
                          onClick={() => setSelectedOrder(order)}
                          className="w-full sm:w-auto bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_rgba(255,90,31,0.4)] transition-all duration-300"
                        >
                          Assigner
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* In Delivery */}
            {inDeliveryOrders && inDeliveryOrders.length > 0 && (
              <div className="pt-6">
                <h3 className="text-lg font-display font-semibold tracking-tight mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                  En route
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inDeliveryOrders.slice(0, 4).map(order => (
                    <Card key={order.id} className="glass border-white/5 hover:border-white/10 transition-colors">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <div className="font-display text-sm font-bold text-primary mb-1">#{order.orderNumber}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                             <MapPin className="w-3 h-3" /> {order.deliveryAddress}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="text-sm font-medium">{order.driverName}</div>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/20 text-orange-500 mt-1 bg-orange-500/10 font-mono">En cours</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Drivers */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold tracking-tight">Flotte</h2>
              <Link href="/drivers" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">Gérer</Link>
            </div>
            
            <Card className="glass border-white/5">
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {loadingDrivers ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-12 w-full bg-white/5" /></div>)
                  ) : (
                    drivers?.map(driver => (
                      <div key={driver.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0 border border-white/10 font-display font-bold text-lg text-white/80 group-hover:border-primary/50 transition-colors shadow-inner">
                            {driver.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card",
                            driver.status === 'available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                            driver.status === 'busy' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse' : 
                            'bg-gray-500'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate group-hover:text-primary transition-colors">{driver.name}</span>
                            <DriverStatusBadge status={driver.status} />
                          </div>
                          <div className="text-xs text-muted-foreground flex justify-between font-mono">
                            <span className="flex items-center gap-1"><span className="text-amber-500">★</span> {driver.rating.toFixed(1)}</span>
                            <span>{driver.totalDeliveries} <span className="opacity-50">courses</span></span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity Strip */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold tracking-tight">Activité Récente</h2>
            <Link href="/surveillance" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">Voir tout</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {activities?.map((activity) => (
              <Card key={activity.id} className="glass hover:bg-white/5 transition-colors border-white/5">
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-black/40 border border-white/5 shrink-0">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{activity.driverName || 'Système'}</span>
                      <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{activity.details}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <AssignDriverDialog 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
      <NewOrderDialog
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
      />
    </Layout>
  );
}

function KpiCard({ title, value, unit, icon: Icon, trend, alert, color }: { title: string, value: string | null, unit?: string, icon: any, trend?: string, alert?: boolean, color: 'orange' | 'blue' | 'yellow' | 'green' | 'red' }) {
  const colorStyles = {
    orange: "border-t-primary shadow-[0_-2px_10px_-2px_rgba(255,90,31,0.2)]",
    blue: "border-t-blue-500 shadow-[0_-2px_10px_-2px_rgba(59,130,246,0.2)]",
    yellow: "border-t-yellow-500 shadow-[0_-2px_10px_-2px_rgba(234,179,8,0.2)]",
    green: "border-t-green-500 shadow-[0_-2px_10px_-2px_rgba(34,197,94,0.2)]",
    red: "border-t-red-500 shadow-[0_-2px_10px_-2px_rgba(239,68,68,0.2)]"
  };

  const iconStyles = {
    orange: "text-primary bg-primary/10",
    blue: "text-blue-500 bg-blue-500/10",
    yellow: "text-yellow-500 bg-yellow-500/10",
    green: "text-green-500 bg-green-500/10",
    red: "text-red-500 bg-red-500/10"
  };

  return (
    <Card className={cn("glass overflow-hidden relative group border-t-2", colorStyles[color], alert && color === 'red' ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : alert ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)]" : "")}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-sans">{title}</h3>
          <div className={cn("p-2.5 rounded-xl", alert && color === 'red' ? "bg-red-500/20 text-red-500" : alert ? "bg-yellow-500/20 text-yellow-500" : iconStyles[color])}>
            <Icon className={cn("w-5 h-5", alert && "animate-pulse")} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          {value === null ? (
            <Skeleton className="h-10 w-24 bg-white/5" />
          ) : (
            <div className="font-display text-4xl font-bold tracking-tighter">
              {value}
              {unit && <span className="text-lg text-muted-foreground font-sans font-normal ml-1">{unit}</span>}
            </div>
          )}
          {trend && <span className="text-xs font-mono text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
