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
import { Loader2, AlertCircle, MapPin } from "lucide-react";
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
        toast.success("Livreur assigné avec succès");
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

  const availableDrivers = drivers?.filter(d => d.status === "available") || [];
  const busyDrivers = drivers?.filter(d => d.status === "busy") || [];

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Assigner un livreur</DialogTitle>
          <DialogDescription>
            Commande <span className="font-mono text-primary">#{order?.orderNumber}</span> • {order?.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingDrivers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : drivers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 opacity-50" />
              <p>Aucun livreur trouvé.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <RadioGroup value={selectedDriverId} onValueChange={setSelectedDriverId} className="space-y-3">
                {availableDrivers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-mono uppercase text-muted-foreground mb-2 tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                      Disponibles ({availableDrivers.length})
                    </h4>
                    <div className="space-y-2">
                      {availableDrivers.map((driver) => (
                        <div key={driver.id} className="relative">
                          <RadioGroupItem value={driver.id.toString()} id={`driver-${driver.id}`} className="peer sr-only" />
                          <Label
                            htmlFor={`driver-${driver.id}`}
                            className="flex items-center justify-between p-3 border border-border rounded-md cursor-pointer hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                          >
                            <div>
                              <div className="font-medium text-sm">{driver.name}</div>
                              <div className="text-xs text-muted-foreground">{driver.vehicleType} • ⭐ {driver.rating.toFixed(1)}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {driver.lat && driver.lng && <MapPin className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {busyDrivers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-mono uppercase text-muted-foreground mb-2 tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                      Occupés ({busyDrivers.length})
                    </h4>
                    <div className="space-y-2 opacity-70">
                      {busyDrivers.map((driver) => (
                        <div key={driver.id} className="relative">
                          <RadioGroupItem value={driver.id.toString()} id={`driver-${driver.id}`} className="peer sr-only" />
                          <Label
                            htmlFor={`driver-${driver.id}`}
                            className="flex items-center justify-between p-3 border border-border rounded-md cursor-pointer hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                          >
                            <div>
                              <div className="font-medium text-sm">{driver.name}</div>
                              <div className="text-xs text-muted-foreground">{driver.vehicleType}</div>
                            </div>
                            <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/10">Occupé</Badge>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateOrderMutation.isPending}>
            Annuler
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedDriverId || updateOrderMutation.isPending}
            className="gap-2"
          >
            {updateOrderMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
