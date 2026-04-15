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
import { Search, MoreVertical, MapPin, Phone, Loader2, ArrowUpDown } from "lucide-react";
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
          <p className="text-muted-foreground mt-1">Gérez toutes les commandes et leur statut.</p>
        </div>

        <Card className="border-border/50 bg-card/50 shadow-xl">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between bg-card rounded-t-lg">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher (N°, Client, Tél)..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
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
                <TableHeader className="bg-secondary/20">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[100px] font-mono text-xs tracking-wider uppercase text-muted-foreground">ID Commande</TableHead>
                    <TableHead className="font-mono text-xs tracking-wider uppercase text-muted-foreground">Client</TableHead>
                    <TableHead className="font-mono text-xs tracking-wider uppercase text-muted-foreground">Adresse</TableHead>
                    <TableHead className="font-mono text-xs tracking-wider uppercase text-muted-foreground">Montant</TableHead>
                    <TableHead className="font-mono text-xs tracking-wider uppercase text-muted-foreground">Statut</TableHead>
                    <TableHead className="font-mono text-xs tracking-wider uppercase text-muted-foreground">Livreur</TableHead>
                    <TableHead className="text-right font-mono text-xs tracking-wider uppercase text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        Aucune commande trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => (
                      <TableRow key={order.id} className="border-border/50 group">
                        <TableCell className="font-mono font-medium text-primary">
                          #{order.orderNumber}
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(order.createdAt), "HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {order.customerPhone}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="flex items-start gap-1.5 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="truncate" title={order.deliveryAddress}>{order.deliveryAddress}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.totalAmount.toFixed(2)} <span className="text-xs text-muted-foreground">MAD</span>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          {order.driverName ? (
                            <span className="text-sm font-medium">{order.driverName}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">- Non assigné -</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {order.status === "pending" && (
                                <DropdownMenuItem onClick={() => setSelectedOrder(order)} className="text-primary font-medium focus:text-primary">
                                  Assigner un livreur
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "delivered")}>
                                Marquer comme livrée
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "cancelled")} className="text-red-500 focus:text-red-500">
                                Annuler la commande
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
