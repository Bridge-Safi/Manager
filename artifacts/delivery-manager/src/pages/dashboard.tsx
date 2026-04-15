import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetDashboardSummary, useListOrders, useListDrivers } from "@workspace/api-client-react";
import { OrderStatusBadge, DriverStatusBadge } from "@/components/status-badges";
import { AssignDriverDialog } from "@/components/assign-driver-dialog";
import { Order } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Activity, Clock, DollarSign, TrendingUp, Users, Bike, AlertCircle, MapPin, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { refetchInterval: 5000 }
  });

  const { data: pendingOrders, isLoading: loadingOrders } = useListOrders(
    { status: "pending" },
    { query: { refetchInterval: 5000 } }
  );

  const { data: inDeliveryOrders } = useListOrders(
    { status: "in_delivery" },
    { query: { refetchInterval: 5000 } }
  );

  const { data: drivers, isLoading: loadingDrivers } = useListDrivers({
    query: { refetchInterval: 5000 }
  });

  const activeDriversCount = drivers?.filter(d => d.status !== 'offline').length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">Vue en temps réel des opérations de livraison.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            LIVE
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="Revenu du jour" 
            value={loadingSummary ? null : `${summary?.todayRevenue.toFixed(2)} MAD`} 
            icon={DollarSign} 
            trend="+12%" 
          />
          <KpiCard 
            title="Commandes du jour" 
            value={loadingSummary ? null : summary?.todayOrders.toString()} 
            icon={TrendingUp} 
          />
          <KpiCard 
            title="En attente" 
            value={loadingSummary ? null : summary?.pendingOrders.toString()} 
            icon={Clock} 
            alert={summary && summary.pendingOrders > 0}
          />
          <KpiCard 
            title="Livreurs actifs" 
            value={loadingDrivers ? null : `${activeDriversCount} / ${drivers?.length || 0}`} 
            icon={Users} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Area - Pending Orders */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Commandes à assigner
                {pendingOrders && pendingOrders.length > 0 && (
                  <Badge variant="destructive" className="ml-2 font-mono">{pendingOrders.length}</Badge>
                )}
              </h2>
              <Link href="/orders" className="text-sm text-primary hover:underline font-medium">Voir tout</Link>
            </div>

            <div className="space-y-3">
              {loadingOrders ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full bg-card" />)
              ) : pendingOrders?.length === 0 ? (
                <Card className="border-dashed bg-card/50">
                  <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-50 text-green-500" />
                    <p>Aucune commande en attente.</p>
                  </CardContent>
                </Card>
              ) : (
                pendingOrders?.map((order) => (
                  <Card key={order.id} className="overflow-hidden border-l-4 border-l-yellow-500 hover:border-l-primary transition-colors group">
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-gradient-to-r from-card to-card/50">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-primary">#{order.orderNumber}</span>
                          <OrderStatusBadge status={order.status} />
                          <span className="text-xs text-muted-foreground ml-auto sm:hidden">{format(new Date(order.createdAt), "HH:mm")}</span>
                        </div>
                        <div className="font-medium text-foreground">{order.customerName} • {order.customerPhone}</div>
                        <div className="text-sm text-muted-foreground flex items-start gap-1.5">
                          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{order.deliveryAddress}</span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                        <div className="text-lg font-bold">{order.totalAmount.toFixed(2)} MAD</div>
                        <Button 
                          onClick={() => setSelectedOrder(order)}
                          className="w-full sm:w-auto shadow-[0_0_10px_rgba(234,88,12,0.2)] group-hover:shadow-[0_0_15px_rgba(234,88,12,0.4)] transition-all"
                        >
                          Assigner un livreur
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* In Delivery */}
            <div className="pt-4">
              <h3 className="text-lg font-semibold tracking-tight mb-3">En cours de livraison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inDeliveryOrders?.slice(0, 4).map(order => (
                  <Card key={order.id} className="bg-card/50 border-border/50">
                    <CardContent className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-mono text-xs font-bold text-primary mb-0.5">#{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{order.deliveryAddress}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium">{order.driverName}</div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/20 text-orange-500 mt-1">En route</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Drivers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Flotte</h2>
              <Link href="/drivers" className="text-sm text-primary hover:underline font-medium">Gérer</Link>
            </div>
            
            <Card className="bg-card/50 border-border/50 shadow-xl">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {loadingDrivers ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-12 w-full" /></div>)
                  ) : (
                    drivers?.map(driver => (
                      <div key={driver.id} className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                          <Bike className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate">{driver.name}</span>
                            <DriverStatusBadge status={driver.status} />
                          </div>
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>⭐ {driver.rating.toFixed(1)}</span>
                            <span>{driver.totalDeliveries} courses</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AssignDriverDialog 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </Layout>
  );
}

function KpiCard({ title, value, icon: Icon, trend, alert }: { title: string, value: string | null, icon: any, trend?: string, alert?: boolean }) {
  return (
    <Card className={cn("overflow-hidden relative group", alert && "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]")}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className={cn("p-2 rounded-md bg-secondary/50", alert && "bg-yellow-500/10 text-yellow-500")}>
            <Icon className={cn("w-4 h-4", alert ? "text-yellow-500" : "text-muted-foreground")} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          {value === null ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-3xl font-bold tracking-tighter">{value}</div>
          )}
          {trend && <span className="text-xs font-medium text-green-500">{trend}</span>}
        </div>
      </CardContent>
      {alert && (
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
      )}
    </Card>
  );
}
