import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Clock, CheckCircle, XCircle, ExternalLink, Plus,
  CreditCard, AlertCircle, TrendingUp, QrCode, Ban,
} from "lucide-react";
import { formatDistanceToNow, format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = async <T,>(path: string, opts?: RequestInit): Promise<T> => {
  const r = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

interface SubStats {
  pending: number; active: number; rejected: number; expired: number;
  total: number; totalRevenue: number;
}
interface Subscription {
  id: number; supabaseUserId: string | null; username: string;
  plan: string; amountMad: number; periodMonths: number;
  status: "pending" | "active" | "rejected" | "expired";
  paymentMethod: string; notes: string | null;
  requestedAt: string; validatedAt: string | null; expiresAt: string | null;
  planInfo: { label: string; amountMad: number; promoMad?: number; promoMonths?: number } | null;
}

const STATUS = {
  pending:  { label: "EN ATTENTE",  color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/30",  icon: Clock },
  active:   { label: "ACTIF",       color: "text-green-400",  bg: "bg-green-500/15 border-green-500/30",  icon: CheckCircle },
  rejected: { label: "REFUSÉ",      color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30",      icon: XCircle },
  expired:  { label: "EXPIRÉ",      color: "text-zinc-500",   bg: "bg-zinc-800/40 border-zinc-700/30",    icon: Ban },
};
const METHOD = {
  virement: "Virement bancaire",
  qr:       "QR Code",
};

function AddSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ username: "", plan: "elite", paymentMethod: "virement", periodMonths: "1", notes: "" });

  const mutation = useMutation({
    mutationFn: () => api("/api/grado/subscriptions", {
      method: "POST",
      body: JSON.stringify({ ...form, periodMonths: Number(form.periodMonths) }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grado-subs"] });
      qc.invalidateQueries({ queryKey: ["grado-sub-stats"] });
      qc.invalidateQueries({ queryKey: ["grado-sub-stats-badge"] });
      toast({ title: "Demande créée", description: `Abonnement EN ATTENTE pour ${form.username}` });
      onClose();
      setForm({ username: "", plan: "elite", paymentMethod: "virement", periodMonths: "1", notes: "" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const months = Number(form.periodMonths) || 1;
  const amount = months >= 3 ? 180 * months : 359 * months;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="glass border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-400" />
            Nouvelle demande d'abonnement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block font-mono">Nom d'utilisateur Grado</label>
            <Input
              placeholder="ex: poulo25"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="bg-black/30 border-white/10"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block font-mono">Plan</label>
            <select
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="elite">Sans limites · Élite — 359 MAD/mois</option>
              <option value="starter">Starter — 149 MAD/mois</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block font-mono">Durée</label>
            <select
              value={form.periodMonths}
              onChange={e => setForm(f => ({ ...f, periodMonths: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="1">1 mois</option>
              <option value="3">3 mois (+3 offerts = 6 mois) — 180 MAD/mois</option>
              <option value="6">6 mois — 180 MAD/mois</option>
              <option value="12">12 mois — 180 MAD/mois</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block font-mono">Méthode de paiement</label>
            <div className="flex gap-2">
              {(["virement", "qr"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, paymentMethod: m }))}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-sm transition-all",
                    form.paymentMethod === m
                      ? "border-violet-500/60 bg-violet-600/20 text-violet-300"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  )}
                >
                  {m === "virement" ? "🏦 Virement" : "📱 QR Code"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block font-mono">Notes (optionnel)</label>
            <Input
              placeholder="ex: Client régulier, virement reçu le..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-black/30 border-white/10"
            />
          </div>
          <div className="rounded-xl bg-violet-600/10 border border-violet-500/20 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Montant calculé</span>
            <span className="font-display font-bold text-xl text-violet-400">{amount} MAD</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.username || mutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {mutation.isPending ? "Création…" : "Créer la demande"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GradoSitePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "rejected">("all");
  const [search, setSearch] = useState("");

  const { data: stats } = useQuery<SubStats>({
    queryKey: ["grado-sub-stats"],
    queryFn: () => api("/api/grado/subscriptions/stats"),
    refetchInterval: 15000,
  });

  const { data: subs = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["grado-subs"],
    queryFn: () => api("/api/grado/subscriptions"),
    refetchInterval: 15000,
  });

  const validate = useMutation({
    mutationFn: (id: number) => api(`/api/grado/subscriptions/${id}/validate`, { method: "PATCH", body: "{}" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["grado-subs"] });
      qc.invalidateQueries({ queryKey: ["grado-sub-stats"] });
      qc.invalidateQueries({ queryKey: ["grado-sub-stats-badge"] });
      const sub = subs.find(s => s.id === id);
      toast({ title: "✅ Abonnement validé", description: `${sub?.username} est maintenant ACTIF` });
    },
  });

  const reject = useMutation({
    mutationFn: (id: number) => api(`/api/grado/subscriptions/${id}/reject`, { method: "PATCH", body: "{}" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["grado-subs"] });
      qc.invalidateQueries({ queryKey: ["grado-sub-stats"] });
      qc.invalidateQueries({ queryKey: ["grado-sub-stats-badge"] });
      const sub = subs.find(s => s.id === id);
      toast({ title: "Abonnement refusé", description: `${sub?.username}`, variant: "destructive" });
    },
  });

  const filtered = subs.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                  <path d="M50 5 L88.97 27.5 L88.97 72.5 L50 95 L11.03 72.5 L11.03 27.5 Z" fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="4" strokeLinejoin="round"/>
                  <path d="M60 30 L40 55 L55 55 L40 80 L65 45 L45 45 L60 30 Z" fill="#A78BFA"/>
                </svg>
              </div>
              <h1 className="text-4xl font-display font-bold tracking-tight">Grado · Manager</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-11">
              Gestion des abonnements —{" "}
              <a href="https://grado-safi.replit.app" target="_blank" rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1">
                grado-safi.replit.app <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Ajouter un abonnement
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              icon: <Clock className="w-5 h-5 text-amber-400" />,
              label: "En attente",
              value: stats?.pending ?? "—",
              sub: "validation requise",
              color: "text-amber-400",
              badge: stats?.pending ? stats.pending > 0 : false,
              f: "pending" as const,
            },
            {
              icon: <CheckCircle className="w-5 h-5 text-green-400" />,
              label: "Actifs",
              value: stats?.active ?? "—",
              sub: "abonnements valides",
              color: "text-green-400",
              f: "active" as const,
            },
            {
              icon: <Users className="w-5 h-5 text-violet-400" />,
              label: "Total",
              value: stats?.total ?? "—",
              sub: "demandes enregistrées",
              color: "text-violet-400",
              f: "all" as const,
            },
            {
              icon: <TrendingUp className="w-5 h-5 text-primary" />,
              label: "Revenus actifs",
              value: `${stats?.totalRevenue ?? 0} MAD`,
              sub: "abonnements payés",
              color: "text-primary",
              f: null,
            },
          ].map((k, i) => (
            <div
              key={i}
              onClick={() => k.f && setFilter(f => f === k.f ? "all" : k.f!)}
              className={cn(
                "glass border rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-200",
                k.f && "cursor-pointer hover:scale-[1.02]",
                k.f && filter === k.f ? "border-white/20 ring-1 ring-white/20 bg-white/5" : "border-white/5",
              )}
            >
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shrink-0 relative">
                {k.icon}
                {k.badge && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">{k.label}</p>
                <p className={cn("text-2xl font-display font-bold leading-none mt-0.5", k.color)}>{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Plan info + QR zone */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Plan Élite */}
          <Card className="glass border-white/5 lg:col-span-2">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-400" />
                Plans disponibles sur Grado
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid sm:grid-cols-2 gap-4">
              {/* Elite */}
              <div className="rounded-xl border border-violet-500/30 bg-violet-600/10 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-violet-300 uppercase tracking-widest">Sans limites</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">Populaire</span>
                </div>
                <p className="font-display font-bold text-xl">Élite</p>
                <div>
                  <span className="text-3xl font-bold text-violet-400">359</span>
                  <span className="text-sm text-muted-foreground"> Dh/mois</span>
                </div>
                <p className="text-xs text-green-400">→ 180 Dh/mois · 3 mois offerts</p>
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  {["Créations illimitées", "Vidéo + Musique illimités", "Modèles IA premium", "Support dédié 24/7", "Accès anticipé nouveautés"].map(f => (
                    <div key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</div>
                  ))}
                </div>
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground border-t border-white/5">
                  <QrCode className="w-3.5 h-3.5" /> QR code · Virement bancaire
                </div>
              </div>
              {/* Starter */}
              <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Essentiel</span>
                <p className="font-display font-bold text-xl">Starter</p>
                <div>
                  <span className="text-3xl font-bold text-foreground">149</span>
                  <span className="text-sm text-muted-foreground"> Dh/mois</span>
                </div>
                <p className="text-xs text-muted-foreground">Accès de base à la plateforme</p>
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  {["Créations limitées", "Modèles standard", "Support communauté"].map(f => (
                    <div key={f} className="flex items-center gap-2"><span className="text-zinc-500">✓</span>{f}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone validation / instructions */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Validation des paiements
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-1.5">
                <p className="font-medium text-amber-400 text-xs uppercase tracking-wide">Procédure manuelle</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Le client s'inscrit sur Grado</li>
                  <li>Il effectue un virement bancaire ou paie par QR</li>
                  <li>Tu reçois la confirmation du paiement</li>
                  <li>Tu cliques <strong className="text-foreground">Valider</strong> ici</li>
                  <li>L'abonnement devient <span className="text-green-400">ACTIF</span></li>
                </ol>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/5 p-3">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Compte bancaire</p>
                <p className="text-xs text-amber-400">⚠ Non configuré — ajoute ton RIB</p>
                <p className="text-[11px] text-muted-foreground mt-1">Dès que configuré, le QR de paiement sera généré automatiquement ici.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des abonnements */}
        <Card className="glass border-white/5">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <CardTitle className="font-display flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-violet-400" />
                Abonnements
                <Badge variant="outline" className="font-mono">{filtered.length}</Badge>
                {stats?.pending ? (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {stats.pending} en attente
                  </Badge>
                ) : null}
              </CardTitle>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <div className="relative">
                  <Input
                    placeholder="Rechercher…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-8 w-40 pl-3 text-sm bg-black/30 border-white/10"
                  />
                </div>
                {(["all", "pending", "active", "rejected"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(x => x === f ? "all" : f)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-medium border transition-all",
                      filter === f
                        ? "border-violet-500/60 bg-violet-600/30 text-violet-300"
                        : "border-white/10 text-muted-foreground hover:border-white/20"
                    )}
                  >
                    {f === "all" ? "Tous" : f === "pending" ? "En attente" : f === "active" ? "Actifs" : "Refusés"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">Aucun abonnement enregistré</p>
                <Button onClick={() => setShowAdd(true)} variant="outline" size="sm" className="border-violet-500/30 text-violet-400">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter le premier
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map(sub => {
                  const cfg = STATUS[sub.status] ?? STATUS.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={sub.id} className={cn(
                      "px-5 py-4 hover:bg-white/2 transition-colors",
                      sub.status === "pending" && "border-l-2 border-amber-500/60"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Left: user + plan */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border", cfg.bg)}>
                            {sub.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{sub.username}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {sub.planInfo?.label ?? sub.plan} · {sub.periodMonths} mois
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right sm:w-28 shrink-0">
                          <div className="font-display font-bold text-lg text-violet-400">{sub.amountMad} MAD</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {METHOD[sub.paymentMethod as keyof typeof METHOD] ?? sub.paymentMethod}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="sm:w-36 shrink-0">
                          <span className={cn("inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-bold tracking-wide", cfg.bg, cfg.color)}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          {sub.expiresAt && sub.status === "active" && (
                            <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                              expire {format(new Date(sub.expiresAt), "dd/MM/yyyy")}
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-[11px] text-muted-foreground font-mono sm:w-28 shrink-0">
                          {formatDistanceToNow(new Date(sub.requestedAt), { addSuffix: true, locale: fr })}
                        </div>

                        {/* Actions */}
                        {sub.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => validate.mutate(sub.id)}
                              disabled={validate.isPending}
                              className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 h-8 px-3 text-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reject.mutate(sub.id)}
                              disabled={reject.isPending}
                              className="text-red-400 hover:bg-red-500/10 border border-red-500/20 h-8 px-3 text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Refuser
                            </Button>
                          </div>
                        )}

                        {sub.notes && (
                          <div className="text-[11px] text-muted-foreground italic truncate max-w-xs">
                            {sub.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddSubscriptionModal open={showAdd} onClose={() => setShowAdd(false)} />
    </Layout>
  );
}
