import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useListDrivers, useUpdateDriver, getListDriversQueryKey, getGetDashboardSummaryQueryKey, useGetDriverTodayStats, useGetDriverActivities, Driver } from "@workspace/api-client-react";
import { DriverStatusBadge } from "@/components/status-badges";
import { DriverStatus } from "@workspace/api-client-react";
import { Phone, Star, MapPin, Loader2, Activity as ActivityIcon, CheckCircle2, Package, Bike, X, Circle, WifiOff, Clock, DollarSign, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

function getActivityIcon(action: string) {
  switch (action) {
    case "order_delivered": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "order_assigned": return <Package className="w-4 h-4 text-blue-500" />;
    case "order_picked_up": return <Bike className="w-4 h-4 text-orange-500" />;
    case "order_cancelled": return <X className="w-4 h-4 text-red-500" />;
    case "status_online":
    case "status_available": return <Circle className="w-4 h-4 text-green-500" />;
    case "status_offline": return <WifiOff className="w-4 h-4 text-zinc-500" />;
    default: return <ActivityIcon className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const { data: drivers, isLoading } = useListDrivers({
    query: { refetchInterval: 10000 }
  });

  const { data: todayStats, isLoading: loadingStats } = useGetDriverTodayStats(
    selectedDriver?.id as number,
    { query: { enabled: !!selectedDriver?.id } }
  );

  const { data: activities, isLoading: loadingActivities } = useGetDriverActivities(
    selectedDriver?.id as number,
    {},
    { query: { enabled: !!selectedDriver?.id } }
  );

  const updateDriverMutation = useUpdateDriver({
    mutation: {
      onSuccess: () => {
        toast.success("Statut du livreur mis à jour");
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  const handleUpdateStatus = (id: number, status: DriverStatus) => {
    updateDriverMutation.mutate({
      id,
      data: { status }
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">Livreurs</h1>
            <p className="text-muted-foreground mt-2">Gérez votre flotte et suivez leurs performances.</p>
          </div>
          <Button className="glow-pulse bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide">
            + Nouveau livreur
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="glass h-64 animate-pulse border-white/5"></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {drivers?.map((driver) => (
              <Card key={driver.id} className="glass hover-lift overflow-hidden relative group border-white/5">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 transition-colors group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-amber-500" />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-black to-gray-900 flex items-center justify-center border border-white/10 relative shadow-xl font-display text-xl font-bold text-white group-hover:border-primary/50 transition-colors">
                        {driver.name.substring(0, 2).toUpperCase()}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                          driver.status === 'available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                          driver.status === 'busy' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold leading-none tracking-tight mb-1.5 group-hover:text-primary transition-colors">{driver.name}</h3>
                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded border border-white/5 w-max">
                          <Phone className="w-3 h-3" /> {driver.phone}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="focus:outline-none outline-none cursor-pointer" disabled={updateDriverMutation.isPending}>
                          <DriverStatusBadge status={driver.status} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(driver.id, "available")} className="cursor-pointer font-medium text-green-500 focus:text-green-400">
                          Marquer Disponible
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(driver.id, "offline")} className="cursor-pointer font-medium text-muted-foreground focus:text-white">
                          Marquer Hors ligne
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 mb-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="grid grid-cols-3 gap-2 relative z-10">
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase font-sans tracking-widest mb-1">Courses</div>
                        <div className="text-xl font-display font-bold">{driver.totalDeliveries}</div>
                      </div>
                      <div className="text-center border-x border-white/5">
                        <div className="text-[10px] text-muted-foreground uppercase font-sans tracking-widest mb-1">Revenu</div>
                        <div className="font-display font-bold text-primary flex items-baseline justify-center gap-1">
                          <span className="text-xl">{driver.totalRevenue}</span>
                          <span className="text-[10px] font-sans font-normal text-muted-foreground">MAD</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase font-sans tracking-widest mb-1">Note</div>
                        <div className="text-xl font-display font-bold flex items-center justify-center gap-1">
                          {driver.rating.toFixed(1)} <Star className="w-4 h-4 fill-amber-500 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-xs font-mono tracking-wider">{driver.vehicleType}</Badge>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-white/10 bg-white/5 hover:bg-white/10" onClick={() => setSelectedDriver(driver)}>
                        <ActivityIcon className="w-3.5 h-3.5 mr-1.5" />
                        Voir activité
                      </Button>
                      {driver.lat && driver.lng ? (
                        <div className="text-xs font-mono text-primary/80 flex items-center gap-1.5 border border-primary/20 bg-primary/5 px-2 py-1 rounded-md">
                          <MapPin className="w-3 h-3" />
                          GPS
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-muted-foreground/50 border border-dashed border-white/10 px-2 py-1 rounded-md">Hors réseau</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] bg-background border-l border-white/10 p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-white/5 shrink-0 bg-background/80 backdrop-blur-xl z-10">
            <SheetTitle className="font-display text-2xl flex items-center gap-3">
              Activité du Livreur
            </SheetTitle>
            {selectedDriver && (
              <div className="flex items-center gap-3 mt-2">
                <div className="font-medium text-lg">{selectedDriver.name}</div>
                <DriverStatusBadge status={selectedDriver.status} />
              </div>
            )}
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* Today's Stats */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-sans mb-4">Statistiques d'aujourd'hui</h3>
                {loadingStats ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : todayStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg mb-2">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-display font-bold">{todayStats.todayDeliveries}</div>
                      <div className="text-xs text-muted-foreground">Courses livrées</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                      <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg mb-2">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-display font-bold text-primary">{todayStats.todayRevenue.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Revenu (MAD)</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center col-span-2">
                      <div className="p-2 bg-green-500/10 text-green-500 rounded-lg mb-2">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-display font-bold">{Math.floor(todayStats.todayOnlineMinutes / 60)}h {todayStats.todayOnlineMinutes % 60}m</div>
                      <div className="text-xs text-muted-foreground">Temps en ligne</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 bg-white/5 rounded-xl">Aucune donnée pour aujourd'hui.</div>
                )}
              </div>

              {/* Activity Timeline */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-sans mb-4">Chronologie</h3>
                {loadingActivities ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : activities && activities.length > 0 ? (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-0 md:ml-0">
                          {getActivityIcon(activity.action)}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-white/5 shadow">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-sm text-foreground truncate">{activity.details}</div>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: fr })}
                          </div>
                          {activity.orderNumber && (
                            <div className="mt-2 text-[10px] font-mono text-primary/80 border border-primary/20 bg-primary/5 px-2 py-1 rounded inline-block">
                              Commande #{activity.orderNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                    Aucune activité enregistrée.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
