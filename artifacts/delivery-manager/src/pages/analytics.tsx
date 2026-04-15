import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetRevenueStats, useGetDriverStats } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function AnalyticsPage() {
  const { data: revenueData, isLoading: loadingRevenue } = useGetRevenueStats();
  const { data: driverStats, isLoading: loadingStats } = useGetDriverStats();

  const formattedRevenueData = revenueData?.map(day => ({
    ...day,
    formattedDate: format(parseISO(day.date), 'EEE d', { locale: fr })
  })) || [];

  const orderStatusData = [
    { name: 'Livrées', value: 85, color: '#22c55e' },
    { name: 'Annulées', value: 15, color: '#ef4444' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyses & Rapports</h1>
          <p className="text-muted-foreground mt-1">Performances financières et métriques des livreurs.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card/50 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Revenus sur 7 jours</CardTitle>
              <CardDescription>Évolution du chiffre d'affaires et volume de commandes</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="formattedDate" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        yAxisId="left"
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? `${value.toFixed(2)} MAD` : value,
                          name === 'revenue' ? 'Revenu' : 'Commandes'
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Taux de complétion</CardTitle>
              <CardDescription>Répartition globale des statuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value}%`, 'Part']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                  <span className="text-3xl font-bold">85%</span>
                  <span className="text-xs text-muted-foreground font-mono">SUCCÈS</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50 border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-card/80">
            <CardTitle>Performances par livreur</CardTitle>
            <CardDescription>Statistiques globales depuis la création</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Livreur</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Courses</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Revenu généré</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Note Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStats ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    driverStats?.map((stat) => (
                      <TableRow key={stat.driverId} className="border-border/50">
                        <TableCell className="font-medium">{stat.driverName}</TableCell>
                        <TableCell className="text-right font-mono">{stat.deliveries}</TableCell>
                        <TableCell className="text-right font-medium text-primary">{stat.revenue.toFixed(2)} MAD</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {stat.rating.toFixed(1)} <span className="text-yellow-500">⭐</span>
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
