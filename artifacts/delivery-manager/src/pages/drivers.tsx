import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useListDrivers, useUpdateDriver, getListDriversQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { DriverStatusBadge } from "@/components/status-badges";
import { DriverStatus } from "@workspace/api-client-react";
import { Bike, Phone, Star, TrendingUp, MapPin, Loader2 } from "lucide-react";
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
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Livreurs</h1>
            <p className="text-muted-foreground mt-1">Gérez votre flotte et suivez leurs performances.</p>
          </div>
          <Button className="shadow-[0_0_15px_rgba(234,88,12,0.3)]">+ Nouveau livreur</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-card/50 border-border/50 h-48 animate-pulse"></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers?.map((driver) => (
              <Card key={driver.id} className="bg-card/50 border-border/50 overflow-hidden relative group shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-border/50 transition-colors group-hover:bg-primary" />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center border-2 border-border relative">
                        <Bike className="w-6 h-6 text-muted-foreground" />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                          driver.status === 'available' ? 'bg-green-500' : 
                          driver.status === 'busy' ? 'bg-orange-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold leading-none">{driver.name}</h3>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {driver.phone}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 cursor-pointer" disabled={updateDriverMutation.isPending}>
                          <DriverStatusBadge status={driver.status} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(driver.id, "available")}>
                          Marquer Disponible
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(driver.id, "offline")}>
                          Marquer Hors ligne
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-border/50 mb-4">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Courses</div>
                      <div className="text-lg font-bold">{driver.totalDeliveries}</div>
                    </div>
                    <div className="text-center border-x border-border/50">
                      <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Revenu</div>
                      <div className="text-lg font-bold text-primary">{driver.totalRevenue} <span className="text-xs font-normal text-muted-foreground">MAD</span></div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Note</div>
                      <div className="text-lg font-bold flex items-center justify-center gap-1">
                        {driver.rating.toFixed(1)} <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className="bg-secondary/50 font-mono text-xs">{driver.vehicleType}</Badge>
                    {driver.lat && driver.lng ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        Localisation active
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">Pas de signal GPS</div>
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
