import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useListOrders, useUpdateOrder, getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { OrderStatusBadge } from "@/components/status-badges";
import { AssignDriverDialog } from "@/components/assign-driver-dialog";
import { NewOrderDialog } from "@/components/new-order-dialog";
import { Order, OrderStatus } from "@workspace/api-client-react";
import { Search, MoreVertical, MapPin, Phone, Loader2, Plus, Bell, Clock, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNewOrderAlert } from "@/hooks/use-new-order-alert";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: allOrders, isLoading } = useListOrders(undefined, {
    query: { refetchInterval: 5000 }
  });

  const { data: pendingOrders } = useListOrders(
    { status: "pending" },
    { query: { refetchInterval: 5000 } }
  );

  useNewOrderAlert(pendingOrders?.length);

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
    updateOrderMutation.mutate({ id, data: { status } });
  };

  const filteredOrders = (allOrders ?? []).filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = pendingOrders?.length ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">Commandes</h1>
            <p className="text-muted-foreground mt-2">Gérez toutes les commandes et leur statut.</p>
          </div>
          <Button
            onClick={() => setNewOrderOpen(true)}
            className="glow-pulse bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide h-11 px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle commande
          </Button>
        </div>

        {/* New orders alert banner */}
        {pendingCount > 0 && (
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border px-5 py-4 cursor-pointer transition-all",
              pendingCount > 2
                ? "border-red-500/40 bg-red-500/10 text-red-300 animate-pulse"
                : "border-amber-500/40 bg-amber-500/10 text-amber-300"
            )}
            onClick={() => setStatusFilter("pending")}
          >
            <div className="flex items-center gap-3">
              <Bell className={cn("w-5 h-5", pendingCount > 2 ? "text-red-400" : "text-amber-400")} />
              <div>
                <div className="font-semibold text-sm font-display">
                  {pendingCount === 1
                    ? "1 commande en attente d'un livreur"
                    : `${pendingCount} commandes en attente d'un livreur`}
                </div>
                <div className="text-xs opacity-70 mt-0.5">Cliquez pour filtrer et assigner</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn(
                "font-mono text-lg px-3 py-1",
                pendingCount > 2 ? "bg-red-500/30 text-red-300 border-red-500/40" : "bg-amber-500/30 text-amber-300 border-amber-500/40"
              )}>
                {pendingCount}
              </Badge>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </div>
          </div>
        )}

        {/* Pending orders quick strip — shown only when pending exists */}
        {pendingCount > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-sans mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              À assigner maintenant
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingOrders?.map((order) => (
                <div
                  key={order.id}
                  className="glass rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col gap-3 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display font-bold text-primary tracking-tight text-lg">#{order.orderNumber}</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: fr })}
                      </div>
                    </div>
                    <div className="font-display font-bold text-amber-400 text-lg">
                      {order.totalAmount.toFixed(2)} <span className="text-xs font-sans font-normal text-muted-foreground">MAD</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{order.customerName}</div>
                    <div className="text-xs font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {order.customerPhone}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{order.deliveryAddress}</span>
                    </div>
                  </div>
                  {order.items && (
                    <div className="text-xs text-muted-foreground/80 bg-black/20 border border-white/5 rounded-lg px-3 py-2 line-clamp-2">
                      {order.items}
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    className="w-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-all font-semibold"
                  >
                    Choisir un livreur
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full orders table */}
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px] bg-black/40 border-white/10 h-11 focus:ring-primary/50">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">⏳ En attente</SelectItem>
                  <SelectItem value="assigned">📦 Assignée</SelectItem>
                  <SelectItem value="in_delivery">🛵 En livraison</SelectItem>
                  <SelectItem value="delivered">✅ Livrée</SelectItem>
                  <SelectItem value="cancelled">❌ Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black/40 border-b border-white/5">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="w-[50px] font-sans text-xs tracking-wider text-muted-foreground/70 text-center">#</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Commande</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Client</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Adresse</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Articles</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Montant</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Statut</TableHead>
                    <TableHead className="font-sans text-xs tracking-wider uppercase text-muted-foreground">Livreur</TableHead>
                    <TableHead className="text-right font-sans text-xs tracking-wider uppercase text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center text-muted-foreground font-display text-lg">
                        Aucune commande trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order, index) => (
                      <TableRow
                        key={order.id}
                        className={cn(
                          "border-b border-white/5 hover:bg-white/[0.02] transition-colors group",
                          order.status === "pending" && "bg-amber-500/5"
                        )}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground/30 font-mono">
                          {(index + 1).toString().padStart(2, "0")}
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
                        <TableCell className="max-w-[160px]">
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="truncate" title={order.deliveryAddress}>{order.deliveryAddress}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <span className="text-xs text-muted-foreground/80 line-clamp-2">{order.items}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-display font-bold whitespace-nowrap">
                            {order.totalAmount.toFixed(2)}{" "}
                            <span className="text-xs font-sans text-muted-foreground font-normal">MAD</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          {order.driverName ? (
                            <span className="text-sm font-medium border border-white/10 bg-black/20 px-2 py-1 rounded-md whitespace-nowrap">
                              {order.driverName}
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground/50 border border-dashed border-white/10 px-2 py-1 rounded-md">
                              NON ASSIGNÉ
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.status === "pending" ? (
                            <Button
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                              className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-all font-medium text-xs whitespace-nowrap"
                            >
                              Assigner →
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-background/95 backdrop-blur-xl border-white/10">
                                {order.status === "assigned" && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "in_delivery" as OrderStatus)} className="cursor-pointer">
                                    🛵 Marquer en livraison
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "delivered" as OrderStatus)} className="cursor-pointer text-green-400 focus:text-green-400">
                                  ✅ Marquer comme livrée
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "cancelled" as OrderStatus)} className="text-red-500 focus:text-red-500 cursor-pointer">
                                  ❌ Annuler la commande
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

      <NewOrderDialog
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
      />
    </Layout>
  );
}
