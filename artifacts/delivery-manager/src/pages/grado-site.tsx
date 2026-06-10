import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Users,
  Eye,
  UserCheck,
  Monitor,
  Smartphone,
  Bot,
  TrendingUp,
  Globe,
  ExternalLink,
  Calendar,
  Activity,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useGetOnlinePlayers, useGetPlayersStats } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

interface SiteStats { visits: number; registrations: number; updatedAt: string }
interface VisitByDay { day: string; count: number }
interface DeviceEntry { userAgent: string | null; device: string; browser: string; count: number }

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "text-primary",
  glowColor = "rgba(255,90,31,0.3)",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  glowColor?: string;
}) {
  return (
    <Card className="glass border-white/5 overflow-hidden relative">
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle at 30% 50%, ${glowColor}, transparent 70%)` }}
      />
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-black/40 border border-white/5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono truncate">{label}</p>
          <p className={`text-3xl font-display font-bold ${color} mt-0.5 leading-none`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur text-sm">
      <p className="font-mono text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-display font-bold text-violet-400">
        {payload[0].value} visite{payload[0].value !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

export default function GradoSitePage() {
  const { data: stats } = useQuery<SiteStats>({
    queryKey: ["site-stats"],
    queryFn: () => fetchJson("/api/stats"),
    refetchInterval: 30000,
  });

  const { data: visitsByDay } = useQuery<VisitByDay[]>({
    queryKey: ["site-visits-by-day"],
    queryFn: () => fetchJson("/api/stats/visits-by-day"),
    refetchInterval: 60000,
  });

  const { data: devices } = useQuery<DeviceEntry[]>({
    queryKey: ["site-devices"],
    queryFn: () => fetchJson("/api/stats/devices"),
    refetchInterval: 60000,
  });

  const { data: onlineData } = useGetOnlinePlayers({ query: { refetchInterval: 10000 } });
  const { data: playerStats } = useGetPlayersStats({ query: { refetchInterval: 60000 } });

  const chartData = visitsByDay
    ? [...visitsByDay]
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(-14)
        .map((r) => ({
          day: format(new Date(r.day), "dd/MM", { locale: fr }),
          visites: r.count,
        }))
    : [];

  const totalVisits = stats?.visits ?? 0;
  const totalRegistrations = stats?.registrations ?? 0;
  const onlineNow = (onlineData as any)?.count ?? 0;
  const totalPlayers = (playerStats as any)?.totalPlayers ?? 0;
  const subscribedPlayers = (playerStats as any)?.subscribedPlayers ?? 0;
  const totalRevenue = (playerStats as any)?.totalRevenue ?? 0;

  const deviceBreakdown = (() => {
    if (!devices) return { desktop: 0, mobile: 0, bots: 0 };
    let desktop = 0, mobile = 0, bots = 0;
    for (const d of devices) {
      if (d.browser === "Bot/Crawl") bots += d.count;
      else if (d.device === "Mobile") mobile += d.count;
      else desktop += d.count;
    }
    return { desktop, mobile, bots };
  })();

  const realVisits = Math.max(0, totalVisits - deviceBreakdown.bots);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.25)] shrink-0">
              <img src="/bridge-logo.jpg" alt="Grado" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-bold tracking-tight">Grado · Site</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Analytique de la plateforme <span className="text-violet-400">grado-safi.replit.app</span>
              </p>
            </div>
          </div>
          <a
            href="https://grado-safi.replit.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-500/40 bg-violet-600/20 hover:bg-violet-600/30 transition-all text-violet-300 text-sm font-medium shadow-[0_0_12px_rgba(139,92,246,0.2)] self-start sm:self-auto"
          >
            <Globe className="w-4 h-4" />
            Ouvrir le site
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Eye className="w-5 h-5 text-violet-400" />}
            label="Visites totales"
            value={totalVisits}
            sub={`~${realVisits} visites réelles`}
            color="text-violet-400"
            glowColor="rgba(139,92,246,0.5)"
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5 text-green-400" />}
            label="Inscriptions"
            value={totalRegistrations}
            sub="comptes créés"
            color="text-green-400"
            glowColor="rgba(34,197,94,0.5)"
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-400" />}
            label="Joueurs / Membres"
            value={totalPlayers}
            sub="profils enregistrés"
            color="text-blue-400"
            glowColor="rgba(59,130,246,0.5)"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-primary" />}
            label="En ligne maintenant"
            value={onlineNow}
            sub="actifs (5 min)"
            color="text-primary"
            glowColor="rgba(255,90,31,0.5)"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="glass border-white/5 xl:col-span-2">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-400" />
                Visites par jour
                <Badge variant="outline" className="ml-auto font-mono text-xs">
                  {chartData.length} jours
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
                    <Bar dataKey="visites" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Devices */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Monitor className="w-4 h-4 text-violet-400" />
                Appareils
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {[
                { label: "Desktop / PC", value: deviceBreakdown.desktop, icon: <Monitor className="w-4 h-4 text-blue-400" />, color: "bg-blue-500" },
                { label: "Mobile", value: deviceBreakdown.mobile, icon: <Smartphone className="w-4 h-4 text-green-400" />, color: "bg-green-500" },
                { label: "Bots / Crawlers", value: deviceBreakdown.bots, icon: <Bot className="w-4 h-4 text-zinc-400" />, color: "bg-zinc-600" },
              ].map((item) => {
                const pct = totalVisits > 0 ? Math.round((item.value / totalVisits) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {item.icon}
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="font-mono font-bold text-sm">
                        {item.value}{" "}
                        <span className="text-xs text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 border-t border-white/5 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Navigateurs</p>
                {devices
                  ?.filter((d) => d.browser !== "Bot/Crawl")
                  .slice(0, 4)
                  .map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{d.browser}</span>
                      <span className="font-mono font-bold">{d.count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Site info */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Globe className="w-4 h-4 text-violet-400" />
                À propos de Grado
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Grado est une plateforme collaborative type IA / communauté — similaire à ChatGPT ou Replit. Les utilisateurs s'inscrivent, jouent et interagissent via des fonctionnalités intelligentes.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Taux inscription",
                    value: totalVisits > 0 ? `${Math.round((totalRegistrations / totalVisits) * 100)}%` : "—",
                  },
                  { label: "Visites réelles", value: realVisits },
                  { label: "Bots filtrés", value: deviceBreakdown.bots },
                  {
                    label: "Dernière activité",
                    value: stats?.updatedAt
                      ? formatDistanceToNow(new Date(stats.updatedAt), { addSuffix: true, locale: fr })
                      : "—",
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                      {item.label}
                    </p>
                    <p className="font-display font-bold text-lg mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Player stats */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-blue-400" />
                Statistiques Joueurs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {[
                  { label: "Total joueurs", value: totalPlayers, color: "text-blue-400" },
                  { label: "Abonnés actifs", value: subscribedPlayers, color: "text-green-400" },
                  {
                    label: "Revenus totaux",
                    value: `${Number(totalRevenue).toLocaleString("fr-MA")} MAD`,
                    color: "text-primary",
                  },
                  { label: "En ligne maintenant", value: onlineNow, color: "text-violet-400" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/20 border border-white/5"
                  >
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`font-display font-bold text-lg ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {stats?.updatedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Calendar className="w-3 h-3" />
            Données collectées depuis le site Grado · Dernière activité{" "}
            {formatDistanceToNow(new Date(stats.updatedAt), { addSuffix: true, locale: fr })}
          </div>
        )}
      </div>
    </Layout>
  );
}
