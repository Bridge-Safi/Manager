import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetRevenueStats, useGetDriverStats, useGetCustomerStats, useGetDashboardSummary } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, Users, Trophy, Phone, ShoppingBag, Crown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const RANK_COLORS = [
  "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]",
  "text-zinc-400",
  "text-orange-700",
  "text-muted-foreground",
  "text-muted-foreground",
];

const RANK_BG = [
  "bg-amber-500/10 border-amber-500/20",
  "bg-zinc-500/10 border-zinc-500/20",
  "bg-orange-700/10 border-orange-700/20",
  "bg-white/5 border-white/5",
  "bg-white/5 border-white/5",
];

export default function AnalyticsPage() {
  const { data: revenueData, isLoading: loadingRevenue } = useGetRevenueStats();
  const { data: driverStats, isLoading: loadingStats } = useGetDriverStats();
  const { data: customerStats, isLoading: loadingCustomers } = useGetCustomerStats();

  const formattedRevenueData = revenueData?.map(day => ({
    ...day,
    formattedDate: format(parseISO(day.date), 'EEE d', { locale: fr })
  })) || [];

  const { data: dashboardSummary } = useGetDashboardSummary({ query: { refetchInterval: 30000 } });
  const totalFinished = (dashboardSummary?.deliveredOrders ?? 0) + (dashboardSummary?.cancelledOrders ?? 0);
  const deliveredPct = totalFinished > 0 ? Math.round((dashboardSummary!.deliveredOrders / totalFinished) * 100) : 0;
  const cancelledPct = totalFinished > 0 ? 100 - deliveredPct : 0;
  const orderStatusData = [
    { name: 'Livrées', value: deliveredPct || 0, color: 'hsl(var(--primary))' },
    { name: 'Annulées', value: cancelledPct || 0, color: 'hsl(var(--muted-foreground))' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Analyses</h1>
          <p className="text-muted-foreground mt-2">Performances financières et métriques du système.</p>
        </div>

        {/* ── Clients KPIs ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre de clients connectés / ayant commandé */}
          <Card className="glass border-white/5 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
            <div className="absolute top-1/2 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -mr-10 -translate-y-1/2 pointer-events-none" />
            <CardContent className="p-6 flex items-center gap-5 relative z-10">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 shrink-0">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-sans mb-1">
                  Clients enregistrés
                </div>
                {loadingCustomers ? (
                  <div className="h-12 w-24 bg-white/5 animate-pulse rounded-lg" />
                ) : (
                  <div className="font-display text-5xl font-bold tracking-tighter text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.4)]">
                    {customerStats?.uniqueCustomers ?? 0}
                  </div>
                )}
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  numéros uniques ayant passé une commande
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top client */}
          {!loadingCustomers && customerStats && customerStats.topCustomers.length > 0 && (
            <Card className="glass border-white/5 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
              <div className="absolute top-1/2 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl -mr-10 -translate-y-1/2 pointer-events-none" />
              <CardContent className="p-6 flex items-center gap-5 relative z-10">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <Crown className="w-8 h-8 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-sans mb-1">
                    Meilleur client
                  </div>
                  <div className="font-display text-2xl font-bold tracking-tight text-amber-400 truncate">
                    {customerStats.topCustomers[0].customerName}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    {customerStats.topCustomers[0].orderCount} commande{customerStats.topCustomers[0].orderCount > 1 ? "s" : ""} &nbsp;·&nbsp;{" "}
                    {customerStats.topCustomers[0].totalSpent.toFixed(2)} MAD dépensés
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Top 5 clients ── */}
        <Card className="glass border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-xl">Top 5 Clients</CardTitle>
                <CardDescription>Classement par nombre de commandes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingCustomers ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : customerStats && customerStats.topCustomers.length > 0 ? (
              <div className="space-y-3">
                {customerStats.topCustomers.map((customer, index) => (
                  <div
                    key={customer.customerPhone}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all",
                      RANK_BG[index],
                      index === 0 && "shadow-[0_0_20px_rgba(251,191,36,0.05)]"
                    )}
                  >
                    <div className={cn("font-display text-2xl font-black w-8 text-center shrink-0", RANK_COLORS[index])}>
                      {index === 0 ? "👑" : `#${index + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base truncate">{customer.customerName}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-0.5">
                        <Phone className="w-3 h-3" />
                        {customer.customerPhone}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <ShoppingBag className="w-4 h-4 text-primary/60" />
                          <span className="font-display font-bold text-lg">{customer.orderCount}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">commandes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-lg text-primary">
                          {customer.totalSpent.toFixed(2)}
                          <span className="text-xs font-sans font-normal text-muted-foreground ml-1">MAD</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">dépensés</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10">
                Aucune donnée client disponible.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Revenus & Taux ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Revenus sur 7 jours</CardTitle>
              <CardDescription>Évolution du chiffre d'affaires en MAD</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                        dy={10}
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}
                        itemStyle={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px' }}
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? `${value.toFixed(2)} MAD` : value,
                          name === 'revenue' ? 'Revenu' : 'Commandes'
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-white/5 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-3xl z-0"></div>
            <CardHeader className="pb-0 relative z-10">
              <CardTitle className="font-display text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Taux de succès</CardTitle>
              <CardDescription>Performance de livraison</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="h-[250px] w-full flex items-center justify-center relative mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                      itemStyle={{ color: 'white', fontFamily: 'var(--font-mono)' }}
                      formatter={(value: number) => [`${value}%`, 'Part']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                  <span className="font-display text-5xl font-bold tracking-tighter text-primary drop-shadow-[0_0_10px_rgba(255,90,31,0.5)]">{deliveredPct}<span className="text-2xl text-primary/70">%</span></span>
                  <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-[0.2em] mt-1">Livrées</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Leaderboard Livreurs ── */}
        <Card className="glass border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-black/20">
            <CardTitle className="font-display text-xl">Leaderboard Livreurs</CardTitle>
            <CardDescription>Performances individuelles de la flotte</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Livreur</TableHead>
                    <TableHead className="text-right font-sans text-xs uppercase tracking-wider text-muted-foreground">Courses</TableHead>
                    <TableHead className="text-right font-sans text-xs uppercase tracking-wider text-muted-foreground">Revenu généré</TableHead>
                    <TableHead className="text-right font-sans text-xs uppercase tracking-wider text-muted-foreground">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStats ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    driverStats?.map((stat) => (
                      <TableRow key={stat.driverId} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-xs font-display text-white/70">
                              {stat.driverName.substring(0, 2).toUpperCase()}
                            </div>
                            {stat.driverName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{stat.deliveries}</TableCell>
                        <TableCell className="text-right font-display font-bold text-primary">
                          {stat.revenue.toFixed(2)} <span className="text-[10px] font-sans text-primary/50 font-normal">MAD</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 font-mono text-sm">
                            {stat.rating.toFixed(1)} <span className="text-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]">★</span>
                          </div>
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
    </Layout>
  );
}
