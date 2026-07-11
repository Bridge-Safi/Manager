import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useListDrivers, useUpdateOrder, getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Order, OrderStatus } from "@workspace/api-client-react";
import { Loader2, AlertCircle, MapPin, Star, Info, Store } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AssignDriverDialogProps {
  order: Order | null;
  onClose: () => void;
}

export function AssignDriverDialog({ order, onClose }: AssignDriverDialogProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: drivers, isLoading: loadingDrivers } = useListDrivers({
    query: {
      enabled: !!order,
      refetchInterval: 5000,
    }
  });

  const updateOrderMutation = useUpdateOrder({
    mutation: {
      onSuccess: () => {
        toast.success("Livreur assigné avec succès", {
          style: { background: 'rgba(255,90,31,0.1)', border: '1px solid rgba(255,90,31,0.2)', color: 'white' }
        });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        onClose();
        setSelectedDriverId("");
      },
      onError: () => {
        toast.error("Erreur lors de l'assignation du livreur");
      }
    }
  });

  const handleAssign = () => {
    if (!order || !selectedDriverId) return;
    
    updateOrderMutation.mutate({
      id: order.id,
      data: {
        driverId: parseInt(selectedDriverId, 10),
        status: OrderStatus.assigned
      }
    });
  };

  // Types de service livreur (livraison à pied/moto)
  const DELIVERY_SERVICE_TYPES = ["nourriture", "tabac", "fleur", "fleurs", "pharmacie", "souk", "boulangerie", "supermarche"];
  // Types de service chauffeur (taxi / VTC)
  const TAXI_SERVICE_TYPES = ["taxi", "confort"];

  const isDeliveryOrder = order ? DELIVERY_SERVICE_TYPES.includes(order.serviceType) : true;
  const isTaxiOrder = order ? TAXI_SERVICE_TYPES.includes(order.serviceType) : false;

  // Filtrer les livreurs selon le type de commande :
  // - commande livraison → exclure les chauffeurs taxi/confort
  // - commande taxi → exclure les livreurs de colis
  const eligibleDrivers = (drivers ?? []).filter(d => {
    const driverService = (d.services ?? "nourriture").toLowerCase();
    if (isDeliveryOrder) return !TAXI_SERVICE_TYPES.some(t => driverService.includes(t));
    if (isTaxiOrder) return TAXI_SERVICE_TYPES.some(t => driverService.includes(t));
    return true;
  });

  const availableDrivers = eligibleDrivers.filter(d => d.status === "available");
  const busyDrivers = eligibleDrivers.filter(d => d.status === "busy");

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] border-white/10 bg-background/80 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="pb-4 border-b border-white/5">
          <DialogTitle className="text-2xl font-display tracking-tight">Assigner un livreur</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className="text-sm">
                Commande <span className="font-display font-bold text-primary px-1">#{order?.orderNumber}</span>
                <span className="mx-2 opacity-50">•</span>
                <span className="text-foreground font-medium">{order?.customerName}</span>
              </span>
              {order?.platform ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-orange-500/20 text-orange-300 border-orange-500/30">
                  <Store className="w-3 h-3" />
                  {order.platform}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-white/5 text-muted-foreground/50 border-white/10">
                  Manuel
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* Bannière d'information sur le filtre actif */}
          {isDeliveryOrder && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary/80">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Commande <strong>livraison</strong> — seuls les livreurs compatibles (moto, vélo, scooter) sont affichés.
                Les chauffeurs taxi/confort sont exclus.
              </span>
            </div>
          )}
          {loadingDrivers ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : eligibleDrivers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 opacity-50" />
              </div>
              <p className="font-display text-lg">Aucun livreur disponible.</p>
              <p className="text-xs opacity-60">Aucun livreur de livraison n'est enregistré.</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-4 -mr-4">
              <RadioGroup value={selectedDriverId} onValueChange={setSelectedDriverId} className="space-y-6 pb-4 pt-2">
                {availableDrivers.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-sans font-bold uppercase text-muted-foreground mb-3 tracking-[0.2em] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                      Disponibles ({availableDrivers.length})
                    </h4>
                    <div className="space-y-3">
                      {availableDrivers.map((driver) => (
                        <div key={driver.id} className="relative group">
                          <RadioGroupItem value={driver.id.toString()} id={`driver-${driver.id}`} className="peer sr-only" />
                          <Label
                            htmlFor={`driver-${driver.id}`}
                            className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl cursor-pointer hover:border-white/20 hover:bg-white/5 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-[0_0_20px_rgba(255,90,31,0.15)] transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center font-display font-bold text-sm text-white/80 group-hover:border-primary/30 transition-colors">
                                {driver.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-display font-bold text-base tracking-tight">{driver.name}</div>
                                <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
                                  <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] uppercase">{driver.vehicleType}</span>
                                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {driver.rating.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="w-5 h-5 rounded-full border-2 border-white/10 flex items-center justify-center peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary transition-colors">
                                 {selectedDriverId === driver.id.toString() && <div className="w-2 h-2 rounded-full bg-white"></div>}
                              </div>
                              {driver.lat && driver.lng && <MapPin className="w-3 h-3 text-primary/50 mt-2" />}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {busyDrivers.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-sans font-bold uppercase text-muted-foreground mb-3 tracking-[0.2em] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      Occupés ({busyDrivers.length})
                    </h4>
                    <div className="space-y-3 opacity-60 grayscale-[50%]">
                      {busyDrivers.map((driver) => (
                        <div key={driver.id} className="relative">
                          <RadioGroupItem value={driver.id.toString()} id={`driver-${driver.id}`} className="peer sr-only" disabled />
                          <Label
                            htmlFor={`driver-${driver.id}`}
                            className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl cursor-not-allowed"
                          >
                             <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gray-900 border border-white/5 flex items-center justify-center font-display font-bold text-sm text-white/50">
                                {driver.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-display font-bold text-base tracking-tight text-muted-foreground">{driver.name}</div>
                                <div className="text-xs text-muted-foreground/50 font-mono mt-0.5">
                                  {driver.vehicleType}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-orange-500/70 border-orange-500/20 bg-orange-500/5 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">Occupé</Badge>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </RadioGroup>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-white/5 sm:justify-between items-center">
          <Button variant="ghost" onClick={onClose} disabled={updateOrderMutation.isPending} className="hover:bg-white/5 text-muted-foreground hover:text-foreground">
            Annuler
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedDriverId || updateOrderMutation.isPending}
            className={cn(
              "gap-2 px-8 font-medium transition-all duration-300", 
              selectedDriverId ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(255,90,31,0.4)]" : "bg-white/5 text-muted-foreground"
            )}
          >
            {updateOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer l'assignation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
