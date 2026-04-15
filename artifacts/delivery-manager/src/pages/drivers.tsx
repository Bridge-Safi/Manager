import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useListDrivers, useUpdateDriver, getListDriversQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { DriverStatusBadge } from "@/components/status-badges";
import { DriverStatus } from "@workspace/api-client-react";
import { Phone, Star, MapPin, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function DriversPage() {
  const queryClient = useQueryClient();
  const { data: drivers, isLoading } = useListDrivers({
    query: { refetchInterval: 10000 }
  });

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

                  <div className="flex items-center justify-between mt-auto">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-xs font-mono tracking-wider">{driver.vehicleType}</Badge>
                    {driver.lat && driver.lng ? (
                      <div className="text-xs font-mono text-primary/80 flex items-center gap-1.5 border border-primary/20 bg-primary/5 px-2 py-1 rounded-md">
                        <MapPin className="w-3 h-3" />
                        Signal GPS Actif
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-muted-foreground/50 border border-dashed border-white/10 px-2 py-1 rounded-md">Hors réseau</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
