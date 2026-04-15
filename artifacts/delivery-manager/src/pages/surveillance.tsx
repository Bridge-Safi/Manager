import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListDrivers, useListActivities, useListAlerts } from "@workspace/api-client-react";
import { DriverStatusBadge } from "@/components/status-badges";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity as ActivityIcon, AlertTriangle, AlertCircle, CheckCircle2, Navigation, Package, Bike, X, Circle, WifiOff, Clock } from "lucide-react";
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

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setLastUpdated(new Date());
  }, [activities, alerts, drivers]);

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              Surveillance
            </h1>
            <p className="text-muted-foreground mt-2">Suivi GPS et activités de la flotte en temps réel.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="xl:col-span-2 space-y-6 flex flex-col h-full">
            {/* Map Container */}
            <Card className="glass border-white/5 shadow-2xl overflow-hidden flex-1 min-h-[450px] relative rounded-2xl flex flex-col">
              <div className="absolute top-4 left-4 z-[400] bg-background/90 backdrop-blur border border-white/10 px-3 py-2 rounded-xl shadow-lg flex items-center gap-3 pointer-events-none">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-sm font-mono font-medium">GPS Actif ({drivers?.filter(d => d.lat && d.lng).length || 0})</span>
                 </div>
              </div>
              <div style={{ height: '100%', width: '100%', flex: 1, zIndex: 0 }} className="relative z-0">
                <MapContainer center={[33.5731, -7.5898]} zoom={12} style={{ height: '100%', width: '100%', background: '#090d18' }}>
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
          </div>

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

            {/* Live Activity Feed */}
            <Card className="glass border-white/5 flex-1 flex flex-col min-h-0">
              <CardHeader className="p-4 pb-2 border-b border-white/5">
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <ActivityIcon className="w-5 h-5 text-primary" />
                  Flux d'Activité
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-[400px] w-full">
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
