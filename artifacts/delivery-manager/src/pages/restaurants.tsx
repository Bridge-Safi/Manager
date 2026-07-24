import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListRestaurants,
  useCreateRestaurant,
  useUpdateRestaurant,
  useDeleteRestaurant,
  useGetRestaurantsOverview,
  getListRestaurantsQueryKey,
  getGetRestaurantsOverviewQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plus,
  Phone,
  MapPin,
  Clock,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Loader2,
  Euro,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Platform definitions ────────────────────────────────────────────────────

export const PLATFORMS = [
  { id: "eats",        label: "Eats",        emoji: "🍔", color: "bg-orange-500/15 text-orange-300 border-orange-500/25",  tab: "bg-orange-500/20 text-orange-300" },
  { id: "tabac",       label: "Tabac",       emoji: "🚬", color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",        tab: "bg-zinc-500/20 text-zinc-300" },
  { id: "pharmacie",   label: "Pharmacie",   emoji: "💊", color: "bg-green-500/15 text-green-300 border-green-500/25",     tab: "bg-green-500/20 text-green-300" },
  { id: "boulangerie", label: "Boulangerie", emoji: "🥐", color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",  tab: "bg-yellow-500/20 text-yellow-300" },
  { id: "souk",        label: "Souk",        emoji: "🛍️", color: "bg-purple-500/15 text-purple-300 border-purple-500/25",  tab: "bg-purple-500/20 text-purple-300" },
  { id: "supermarche", label: "Supermarché", emoji: "🛒", color: "bg-blue-500/15 text-blue-300 border-blue-500/25",        tab: "bg-blue-500/20 text-blue-300" },
  { id: "fleurs",      label: "Fleurs",      emoji: "🌸", color: "bg-pink-500/15 text-pink-300 border-pink-500/25",        tab: "bg-pink-500/20 text-pink-300" },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export function getPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id) ?? {
    id,
    label: id,
    emoji: "🏪",
    color: "bg-white/10 text-muted-foreground border-white/10",
    tab: "bg-white/10 text-muted-foreground",
  };
}

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    open:   { label: "Ouvert",  cls: "bg-green-500/15 text-green-400 border-green-500/20" },
    busy:   { label: "Occupé",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    closed: { label: "Fermé",   cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  }[status] ?? { label: status, cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" };
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

// ── Form types ──────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  phone: string;
  address: string;
  cuisine: string;
  avgPrepTime: string;
  notes: string;
  platform: string;
};

const defaultForm = (platform = "eats"): FormData => ({
  name: "",
  phone: "",
  address: "",
  cuisine: "",
  avgPrepTime: "20",
  notes: "",
  platform,
});

// ── Stat mini ───────────────────────────────────────────────────────────────

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-xl font-display font-bold", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// ── Vendor form ─────────────────────────────────────────────────────────────

function VendorForm({
  form,
  setForm,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const field = (key: keyof FormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Platform selector */}
      <div className="col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Plateforme *</Label>
        <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
          <SelectTrigger className="bg-black/30 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.emoji} {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Nom *</Label>
        <Input
          placeholder={
            form.platform === "eats" ? "Snack Chez Omar…" :
            form.platform === "pharmacie" ? "Pharmacie Al Amal…" :
            form.platform === "boulangerie" ? "Boulangerie du Centre…" :
            form.platform === "supermarche" ? "Marjane, Aswak…" :
            form.platform === "souk" ? "Artisanat Safi…" :
            form.platform === "fleurs" ? "Fleuriste…" :
            "Nom du commerce…"
          }
          className="bg-black/30 border-white/10"
          {...field("name")}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Téléphone *</Label>
        <Input placeholder="+212 6XX…" className="bg-black/30 border-white/10" {...field("phone")} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">
          {form.platform === "eats" ? "Cuisine" : "Type"}
        </Label>
        <Input
          placeholder={
            form.platform === "eats" ? "Pizza, Burger…" :
            form.platform === "pharmacie" ? "Générale, spécialisée…" :
            "Optionnel"
          }
          className="bg-black/30 border-white/10"
          {...field("cuisine")}
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Adresse *</Label>
        <Input placeholder="Rue, Ville" className="bg-black/30 border-white/10" {...field("address")} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Temps prépa (min)</Label>
        <Input type="number" min={1} className="bg-black/30 border-white/10" {...field("avgPrepTime")} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Notes</Label>
        <Input placeholder="Notes internes…" className="bg-black/30 border-white/10" {...field("notes")} />
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function RestaurantsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm());
  const [editStatus, setEditStatus] = useState<string>("open");
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: restaurants, isLoading } = useListRestaurants({
    query: { refetchInterval: 10000 },
  });

  const { data: overview } = useGetRestaurantsOverview({
    query: { refetchInterval: 10000 },
  });

  const { mutate: createRestaurant, isPending: isCreating } = useCreateRestaurant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Vendeur créé avec succès" });
        setCreateOpen(false);
        setForm(defaultForm(activeTab !== "all" ? activeTab : "eats"));
        queryClient.invalidateQueries({ queryKey: getListRestaurantsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRestaurantsOverviewQueryKey() });
      },
      onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
    },
  });

  const { mutate: updateRestaurant, isPending: isUpdating } = useUpdateRestaurant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Vendeur mis à jour" });
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListRestaurantsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRestaurantsOverviewQueryKey() });
      },
      onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
    },
  });

  const { mutate: deleteRestaurant } = useDeleteRestaurant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Vendeur désactivé" });
        queryClient.invalidateQueries({ queryKey: getListRestaurantsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRestaurantsOverviewQueryKey() });
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    },
  });

  function handleCreate() {
    createRestaurant({
      data: {
        name: form.name,
        phone: form.phone,
        address: form.address,
        cuisine: form.cuisine || undefined,
        avgPrepTime: form.avgPrepTime ? Number(form.avgPrepTime) : undefined,
        notes: form.notes || undefined,
        platform: form.platform,
      },
    });
  }

  function startEdit(r: NonNullable<typeof restaurants>[0]) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      phone: r.phone,
      address: r.address,
      cuisine: r.cuisine ?? "",
      avgPrepTime: String(r.avgPrepTime),
      notes: r.notes ?? "",
      platform: r.platform ?? "eats",
    });
    setEditStatus(r.status);
  }

  function handleUpdate() {
    if (editingId == null) return;
    updateRestaurant({
      id: editingId,
      data: {
        name: form.name,
        phone: form.phone,
        address: form.address,
        cuisine: form.cuisine || undefined,
        avgPrepTime: form.avgPrepTime ? Number(form.avgPrepTime) : undefined,
        notes: form.notes || undefined,
        status: editStatus as "open" | "closed" | "busy",
        platform: form.platform,
      },
    });
  }

  const overviewMap = new Map(overview?.map((o) => [o.id, o]));
  const totalRevenue = overview?.reduce((s, o) => s + o.todayRevenue, 0) ?? 0;
  const totalOrders  = overview?.reduce((s, o) => s + o.todayOrders, 0) ?? 0;
  const openCount    = restaurants?.filter((r) => r.status === "open").length ?? 0;

  // Filter by active tab
  const filtered = restaurants?.filter(
    (r) => activeTab === "all" || r.platform === activeTab
  ) ?? [];

  // Count per platform for tab badges
  const countByPlatform = (restaurants ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.platform] = (acc[r.platform] ?? 0) + 1;
    return acc;
  }, {});

  // Platform for the active tab (used for "add" button label)
  const activePlatform = PLATFORMS.find((p) => p.id === activeTab);

  return (
    <Layout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight flex items-center gap-3">
              🏪 Vendeurs
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestion des partenaires Bridge — 7 plateformes
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setForm(defaultForm(activeTab !== "all" ? activeTab : "eats"))}
                className="gap-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white shadow-lg shadow-primary/20 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                {activePlatform ? `Ajouter ${activePlatform.emoji} ${activePlatform.label}` : "Ajouter un vendeur"}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-white/10">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Nouveau vendeur</DialogTitle>
              </DialogHeader>
              <VendorForm form={form} setForm={setForm} />
              <Button
                onClick={handleCreate}
                disabled={isCreating || !form.name || !form.phone || !form.address}
                className="w-full mt-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Créer le vendeur
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass border-white/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-2xl">🏪</div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Ouverts</p>
                <p className="text-3xl font-display font-bold">{openCount}</p>
                <p className="text-xs text-muted-foreground">/ {restaurants?.length ?? 0} total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <ShoppingBag className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Commandes today</p>
                <p className="text-3xl font-display font-bold">{totalOrders}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">CA aujourd'hui</p>
                <p className="text-3xl font-display font-bold">
                  {totalRevenue.toFixed(0)}{" "}
                  <span className="text-lg text-muted-foreground">MAD</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
              activeTab === "all"
                ? "bg-white/15 text-white border-white/20"
                : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
            )}
          >
            Tous{" "}
            <span className="ml-1 text-xs opacity-60">{restaurants?.length ?? 0}</span>
          </button>
          {PLATFORMS.map((p) => {
            const count = countByPlatform[p.id] ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                  activeTab === p.id
                    ? `${p.tab} border-current/30`
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                )}
              >
                {p.emoji} {p.label}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Vendor Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass border-white/5">
            <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
              <div className="text-5xl">
                {activePlatform ? activePlatform.emoji : "🏪"}
              </div>
              <div>
                <p className="font-display font-bold text-lg">
                  Aucun vendeur{activePlatform ? ` ${activePlatform.label}` : ""}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez votre premier partenaire
                  {activePlatform ? ` ${activePlatform.label}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((vendor) => {
              const stats = overviewMap.get(vendor.id);
              const plat = getPlatform(vendor.platform ?? "eats");
              return (
                <Card
                  key={vendor.id}
                  className="glass border-white/5 hover:border-white/10 transition-colors overflow-hidden"
                >
                  {editingId === vendor.id ? (
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold">Modifier le vendeur</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Annuler
                        </Button>
                      </div>
                      <VendorForm form={form} setForm={setForm} />
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Statut</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="bg-black/30 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Ouvert</SelectItem>
                            <SelectItem value="busy">Occupé</SelectItem>
                            <SelectItem value="closed">Fermé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="w-full bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Enregistrer
                      </Button>
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader className="p-5 pb-3 border-b border-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Platform emoji avatar */}
                            <div
                              className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border",
                                plat.color
                              )}
                            >
                              {plat.emoji}
                            </div>
                            <div>
                              <CardTitle className="font-display text-base leading-tight">
                                {vendor.name}
                              </CardTitle>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
                                    plat.color
                                  )}
                                >
                                  {plat.label}
                                </span>
                                {vendor.cuisine && (
                                  <span className="text-xs text-muted-foreground">
                                    · {vendor.cuisine}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={vendor.status} />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 text-muted-foreground hover:text-foreground"
                              onClick={() => startEdit(vendor)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 text-muted-foreground hover:text-red-400"
                              onClick={() => {
                                if (confirm(`Désactiver ${vendor.name} ?`)) {
                                  deleteRestaurant({ id: vendor.id });
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-mono text-xs truncate">{vendor.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs">{vendor.avgPrepTime} min prépa</span>
                          </div>
                          <div className="flex items-start gap-2 text-muted-foreground col-span-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="text-xs leading-relaxed">{vendor.address}</span>
                          </div>
                        </div>

                        {stats && (
                          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5">
                            <StatMini label="Aujourd'hui" value={stats.todayOrders} color="text-foreground" />
                            <StatMini label="En attente"  value={stats.pendingCount}   color="text-amber-400" />
                            <StatMini label="En cours"    value={stats.activeCount}    color="text-blue-400" />
                            <StatMini label="Livrées"     value={stats.deliveredCount} color="text-green-400" />
                          </div>
                        )}

                        {stats && stats.todayRevenue > 0 && (
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Euro className="w-3.5 h-3.5 text-green-500" />
                              CA aujourd'hui
                            </span>
                            <span className="font-mono font-bold text-green-400 text-sm">
                              {stats.todayRevenue.toFixed(0)} MAD
                            </span>
                          </div>
                        )}

                        {vendor.lastOrderAt && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" />
                            Dernière commande{" "}
                            {formatDistanceToNow(new Date(vendor.lastOrderAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
