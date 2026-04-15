import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useListOrders, useUpdateOrder, getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { OrderStatusBadge } from "@/components/status-badges";
import { AssignDriverDialog } from "@/components/assign-driver-dialog";
import { Order, OrderStatus } from "@workspace/api-client-react";
import { Search, MoreVertical, MapPin, Phone, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListOrders(
    statusFilter !== "all" ? { status: statusFilter as any } : undefined,
    { query: { refetchInterval: 10000 } }
  );

  const updateOrderMutation = useUpdateOrder({
    mutation: {
      onSuccess: () => {
        toast.success("Statut mis à jour");
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  const handleUpdateStatus = (id: number, status: OrderStatus) => {
    updateOrderMutation.mutate({
      id,
      data: { status }
    });
  };

  const filteredOrders = orders?.filter(order => 
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerPhone.includes(searchTerm)
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Commandes</h1>
          <p className="text-muted-foreground mt-2">Gérez toutes les commandes et leur statut.</p>
        </div>

        <Card className="glass border-white/5 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between bg-black/20">
              <div className="relative w-full sm:max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Rechercher (N°, Client, Tél)..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-black/40 border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm h-11"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-black/40 border-white/10 h-11 focus:ring-primary/50">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="assigned">Assignée</SelectItem>
                    <SelectItem value="in_delivery">En livraison</SelectItem>
                    <SelectItem value="delivered">Livrée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black/40 border-b border-white/5">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="w-[60px] font-sans text-xs tracking-wider text-muted-foreground/70 text-center">#</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Commande</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Client</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Adresse</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Montant</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Statut</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Livreur</TableHead>
                    <TableHead className="text-right font-sans text-xs tracking-wider uppercase text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center text-muted-foreground font-display text-lg">
                        Aucune commande trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order, index) => (
                      <TableRow key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <TableCell className="text-center text-xs text-muted-foreground/30 font-mono">
                          {(index + 1).toString().padStart(2, '0')}
                        </TableCell>
                        <TableCell>
                          <div className="font-display font-bold text-primary tracking-tight">#{order.orderNumber}</div>
                          <div className="text-[11px] font-mono text-muted-foreground/70 mt-1">
                            {format(new Date(order.createdAt), "HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{order.customerName}</div>
                          <div className="text-xs font-mono text-muted-foreground/70 flex items-center gap-1.5 mt-1">
                            <Phone className="w-3 h-3" />
                            {order.customerPhone}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="truncate" title={order.deliveryAddress}>{order.deliveryAddress}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-display font-bold">{order.totalAmount.toFixed(2)} <span className="text-xs font-sans text-muted-foreground font-normal">MAD</span></div>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          {order.driverName ? (
                            <span className="text-sm font-medium border border-white/10 bg-black/20 px-2 py-1 rounded-md">{order.driverName}</span>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground/50 border border-dashed border-white/10 px-2 py-1 rounded-md">NON ASSIGNÉ</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.status === "pending" ? (
                             <Button 
                               size="sm" 
                               onClick={() => setSelectedOrder(order)}
                               className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-all font-medium text-xs"
                             >
                               Assigner
                             </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-white/10">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "delivered")} className="cursor-pointer">
                                  Marquer comme livrée
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "cancelled")} className="text-red-500 focus:text-red-500 cursor-pointer">
                                  Annuler la commande
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AssignDriverDialog 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </Layout>
  );
}
