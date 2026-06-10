import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListDrivers, useListActivities, useListAlerts, useGetRestaurantsOverview } from "@workspace/api-client-react";
import { DriverStatusBadge } from "@/components/status-badges";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Package,
  Bike,
  X,
  Circle,
  WifiOff,
  Clock,
  Store,
  ShoppingBag,
  ChefHat,
  TrendingUp,
  Users,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
    default: return <ActivityIcon className="w-4 h-4 text-muted-foreground" />;
  }
}

function RestaurantStatusDot({ status }: { status: string }) {
  const color = {
    open: "bg-green-500",
    busy: "bg-amber-500",
    closed: "bg-zinc-500",
  }[status] ?? "bg-zinc-500";
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", color)} />;
}

export default function SurveillancePage() {
  const { data: drivers } = useListDrivers({
    query: { refetchInterval: 5000 }
  });

  const { data: activities } = useListActivities(
    { limit: 20 },
    { query: { refetchInterval: 4000 } }
  );

  const { data: alerts } = useListAlerts({
    query: { refetchInterval: 5000 }
  });

  const { data: restaurants } = useGetRestaurantsOverview({
    query: { refetchInterval: 8000 }
  });

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setLastUpdated(new Date());
  }, [activities, alerts, drivers, restaurants]);

  const availableDrivers = drivers?.filter(d => d.status === "available").length ?? 0;
  const busyDrivers = drivers?.filter(d => d.status === "busy" || d.status === "delivering").length ?? 0;
  const openRestaurants = restaurants?.filter(r => r.status === "open").length ?? 0;
  const totalPendingOrders = restaurants?.reduce((s, r) => s + r.pendingCount, 0) ?? 0;

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              Surveillance
            </h1>
            <p className="text-muted-foreground mt-2">Suivi en temps réel — livreurs, restaurants et alertes.</p>
          </div>
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Mis à jour {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: fr })}
          </div>
        </div>

        {/* Live KPI bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiPill
            icon={<Users className="w-4 h-4 text-green-400" />}
            label="Livreurs dispo"
            value={availableDrivers}
            color="text-green-400"
          />
          <KpiPill
            icon={<Bike className="w-4 h-4 text-blue-400" />}
            label="En livraison"
            value={busyDrivers}
            color="text-blue-400"
          />
          <KpiPill
            icon={<Store className="w-4 h-4 text-primary" />}
            label="Restaurants ouverts"
            value={openRestaurants}
            color="text-primary"
          />
          <KpiPill
            icon={<ShoppingBag className="w-4 h-4 text-amber-400" />}
            label="Commandes en attente"
            value={totalPendingOrders}
            color={totalPendingOrders > 5 ? "text-red-400" : "text-amber-400"}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left — Map + Restaurants */}
          <div className="xl:col-span-2 space-y-6 flex flex-col h-full">
            {/* Map Container */}
            <Card className="glass border-white/5 shadow-2xl overflow-hidden flex-1 min-h-[400px] relative rounded-2xl flex flex-col">
              <div className="absolute top-4 left-4 z-[400] bg-background/90 backdrop-blur border border-white/10 px-3 py-2 rounded-xl shadow-lg flex items-center gap-3 pointer-events-none">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-sm font-mono font-medium">GPS Actif ({drivers?.filter(d => d.lat && d.lng).length || 0})</span>
                 </div>
              </div>
              <div style={{ height: '100%', width: '100%', flex: 1, zIndex: 0 }} className="relative z-0">
                <MapContainer center={[31.7917, -7.0926]} zoom={6} style={{ height: '100%', width: '100%', background: '#090d18' }}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  {drivers?.filter(d => d.lat && d.lng).map((driver) => (
                    <Marker key={driver.id} position={[driver.lat!, driver.lng!]}>
                      <Popup className="custom-popup">
                        <div className="p-1 space-y-2">
                          <div className="font-display font-bold text-base flex justify-between items-center gap-4">
                            {driver.name}
                            <DriverStatusBadge status={driver.status} />
                          </div>
                          {driver.lastActiveAt && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              Dernière activité: {formatDistanceToNow(new Date(driver.lastActiveAt), { addSuffix: true, locale: fr })}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </Card>

            {/* Restaurants Live Panel */}
            <Card className="glass border-white/5">
              <CardHeader className="p-4 pb-2 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <ChefHat className="w-5 h-5 text-primary" />
                  Restaurants — État en direct
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {restaurants?.length ?? 0} actifs
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {!restaurants || restaurants.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Aucun restaurant actif. Ajoutez-en depuis la page Restaurants.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {restaurants.map((r) => (
                      <div key={r.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
                        <RestaurantStatusDot status={r.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{r.name}</span>
                            {r.cuisine && <span className="text-[10px] text-muted-foreground border border-white/10 px-1.5 py-0.5 rounded-full">{r.cuisine}</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {r.avgPrepTime} min prépa
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StatChip label="Attente" value={r.pendingCount} alert={r.pendingCount > 3} />
                          <StatChip label="En cours" value={r.activeCount} />
                          <StatChip label="Livrées" value={r.deliveredCount} positive />
                          {r.todayRevenue > 0 && (
                            <div className="text-right hidden sm:block">
                              <div className="text-xs font-mono font-bold text-green-400">{r.todayRevenue.toFixed(0)} MAD</div>
                              <div className="text-[10px] text-muted-foreground">CA today</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — Alerts + Activity */}
          <div className="space-y-6 flex flex-col h-full">
            {/* Alerts Panel */}
            <Card className={cn(
              "glass border-white/5 shrink-0 transition-colors duration-500",
              alerts && alerts.length > 0 ? "border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : ""
            )}>
              <CardHeader className="p-4 pb-2 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <AlertTriangle className={cn("w-5 h-5", alerts && alerts.length > 0 ? "text-red-500 animate-pulse" : "text-green-500")} />
                  Alertes Critiques
                </CardTitle>
                <Badge variant={alerts && alerts.length > 0 ? "destructive" : "outline"} className="font-mono">
                  {alerts?.length || 0}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[200px] w-full">
                  {!alerts || alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </div>
                      <span className="text-sm font-medium text-green-500">Tout est normal</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {alerts.map((alert) => (
                        <div key={alert.id} className={cn(
                          "p-4 flex gap-3",
                          alert.severity === 'critical' ? "bg-red-500/10" : "bg-amber-500/10"
                        )}>
                          <AlertCircle className={cn(
                            "w-5 h-5 shrink-0 mt-0.5",
                            alert.severity === 'critical' ? "text-red-500" : "text-amber-500"
                          )} />
                          <div className="space-y-1">
                            <div className="font-medium text-sm leading-tight text-white">{alert.message}</div>
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                              <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: fr })}</span>
                              {alert.driverName && <span>• {alert.driverName}</span>}
                              {alert.minutesElapsed && <span className="text-red-400 font-bold px-1.5 py-0.5 bg-red-500/20 rounded">+{alert.minutesElapsed} min</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Drivers Live List */}
            <Card className="glass border-white/5 shrink-0">
              <CardHeader className="p-4 pb-2 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-400" />
                  Livreurs
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">GPS: {drivers?.filter(d => d.lat && d.lng).length ?? 0}/{drivers?.length ?? 0}</span>
                  <Badge variant="outline" className="font-mono">{drivers?.length ?? 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[220px]">
                  {!drivers || drivers.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Aucun livreur</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {drivers.map((driver) => {
                        const hasGps = !!(driver.lat && driver.lng);
                        const isBusy = driver.status === "busy" || driver.status === "delivering";
                        return (
                          <div key={driver.id} className={cn(
                            "flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors",
                            isBusy && "bg-blue-500/5 border-l-2 border-blue-500/40"
                          )}>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border",
                              isBusy ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-primary/10 border-primary/20 text-primary"
                            )}>
                              {driver.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{driver.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {driver.lastActiveAt ? (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {formatDistanceToNow(new Date(driver.lastActiveAt), { addSuffix: true, locale: fr })}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Jamais actif</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <DriverStatusBadge status={driver.status} />
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                                hasGps
                                  ? "text-green-400 border-green-500/30 bg-green-500/10"
                                  : "text-zinc-500 border-zinc-700/50 bg-zinc-800/30"
                              )}>
                                {hasGps ? "📍 GPS" : "⊘ Hors GPS"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                {drivers && drivers.every(d => !d.lat && !d.lng) && (
                  <div className="px-4 py-3 border-t border-white/5 bg-amber-500/5">
                    <p className="text-[11px] text-amber-400/80 leading-relaxed">
                      ⚠️ Aucun GPS actif. L'app livreur doit envoyer la localisation via <code className="bg-black/30 px-1 rounded">PATCH /api/drivers/:id/location</code>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Activity Feed */}
            <Card className="glass border-white/5 flex-1 flex flex-col min-h-0">
              <CardHeader className="p-4 pb-2 border-b border-white/5">
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <ActivityIcon className="w-5 h-5 text-primary" />
                  Flux d'Activité
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-[300px] w-full">
                  <div className="divide-y divide-white/5">
                    {!activities || activities.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        Aucune activité récente
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="p-4 flex gap-3 hover:bg-white/5 transition-colors group">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-black/40 border border-white/5 group-hover:border-primary/30 transition-colors shrink-0">
                            {getActivityIcon(activity.action)}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-medium text-sm text-foreground truncate">{activity.driverName || 'Système'}</span>
                              <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap bg-black/30 px-1.5 py-0.5 rounded">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: fr })}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {activity.details}
                            </div>
                            {activity.orderNumber && (
                              <span className="inline-block mt-1 text-[10px] font-mono text-primary/80 border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded">
                                #{activity.orderNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function KpiPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="glass border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
      {icon}
      <div className="min-w-0">
        <p className={cn("text-2xl font-display font-bold leading-none", color)}>{value}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  alert,
  positive,
}: {
  label: string;
  value: number;
  alert?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="text-center min-w-[40px]">
      <div className={cn(
        "text-sm font-display font-bold",
        alert && value > 0 ? "text-red-400" : positive ? "text-green-400" : "text-foreground"
      )}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
