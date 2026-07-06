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
import { useListRestaurants, useCreateRestaurant, useUpdateRestaurant, useDeleteRestaurant, useGetRestaurantsOverview, getListRestaurantsQueryKey, getGetRestaurantsOverviewQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plus,
  Store,
  Phone,
  MapPin,
  Clock,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  ChefHat,
  Loader2,
  Euro,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function RestaurantStatusBadge({ status }: { status: string }) {
  const config = {
    open: { label: "Ouvert", className: "bg-green-500/15 text-green-400 border-green-500/20" },
    busy: { label: "Occupé", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    closed: { label: "Fermé", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  }[status] ?? { label: status, className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" };

  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

type FormData = {
  name: string;
  phone: string;
  address: string;
  cuisine: string;
  avgPrepTime: string;
  notes: string;
};

const defaultForm: FormData = {
  name: "",
  phone: "",
  address: "",
  cuisine: "",
  avgPrepTime: "20",
  notes: "",
};

export default function RestaurantsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [editStatus, setEditStatus] = useState<string>("open");

  const { data: restaurants, isLoading } = useListRestaurants({
    query: { refetchInterval: 10000 },
  });

  const { data: overview } = useGetRestaurantsOverview({
    query: { refetchInterval: 10000 },
  });

  const { mutate: createRestaurant, isPending: isCreating } = useCreateRestaurant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Restaurant créé avec succès" });
        setCreateOpen(false);
        setForm(defaultForm);
        queryClient.invalidateQueries({ queryKey: getListRestaurantsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRestaurantsOverviewQueryKey() });
      },
      onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
    },
  });

  const { mutate: updateRestaurant, isPending: isUpdating } = useUpdateRestaurant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Restaurant mis à jour" });
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
        toast({ title: "Restaurant désactivé" });
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
      },
    });
  }

  const overviewMap = new Map(overview?.map((o) => [o.id, o]));

  const totalRevenue = overview?.reduce((s, o) => s + o.todayRevenue, 0) ?? 0;
  const totalOrders = overview?.reduce((s, o) => s + o.todayOrders, 0) ?? 0;
  const openCount = restaurants?.filter((r) => r.status === "open").length ?? 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight flex items-center gap-3">
              <Store className="w-9 h-9 text-primary" />
              Restaurants
            </h1>
            <p className="text-muted-foreground mt-2">Gestion et surveillance de vos partenaires restaurateurs.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white shadow-lg shadow-primary/20 rounded-xl">
                <Plus className="w-4 h-4" />
                Ajouter un restaurant
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-white/10">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Nouveau Restaurant</DialogTitle>
              </DialogHeader>
              <RestaurantForm form={form} setForm={setForm} />
              <Button
                onClick={handleCreate}
                disabled={isCreating || !form.name || !form.phone || !form.address}
                className="w-full mt-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Créer le restaurant
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass border-white/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Store className="w-6 h-6 text-primary" />
              </div>
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
                <p className="text-3xl font-display font-bold">{totalRevenue.toFixed(0)} <span className="text-lg text-muted-foreground">MAD</span></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Restaurants List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !restaurants || restaurants.length === 0 ? (
          <Card className="glass border-white/5">
            <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Store className="w-8 h-8 text-primary/60" />
              </div>
              <div>
                <p className="font-display font-bold text-lg">Aucun restaurant</p>
                <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier partenaire restaurateur</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {restaurants.map((restaurant) => {
              const stats = overviewMap.get(restaurant.id);
              return (
                <Card key={restaurant.id} className="glass border-white/5 hover:border-white/10 transition-colors overflow-hidden">
                  {/* Edit inline */}
                  {editingId === restaurant.id ? (
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold">Modifier le restaurant</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                      </div>
                      <RestaurantForm form={form} setForm={setForm} />
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
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Enregistrer
                      </Button>
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader className="p-5 pb-3 border-b border-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                              <ChefHat className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="font-display text-lg leading-tight">{restaurant.name}</CardTitle>
                              {restaurant.cuisine && (
                                <p className="text-xs text-muted-foreground mt-0.5">{restaurant.cuisine}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <RestaurantStatusBadge status={restaurant.status} />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 text-muted-foreground hover:text-foreground"
                              onClick={() => startEdit(restaurant)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 text-muted-foreground hover:text-red-400"
                              onClick={() => {
                                if (confirm(`Désactiver ${restaurant.name} ?`)) {
                                  deleteRestaurant({ id: restaurant.id });
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
                            <span className="font-mono text-xs truncate">{restaurant.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs">{restaurant.avgPrepTime} min prépa</span>
                          </div>
                          <div className="flex items-start gap-2 text-muted-foreground col-span-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="text-xs leading-relaxed">{restaurant.address}</span>
                          </div>
                        </div>

                        {stats && (
                          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5">
                            <StatMini label="Aujourd'hui" value={stats.todayOrders} color="text-foreground" />
                            <StatMini label="En attente" value={stats.pendingCount} color="text-amber-400" />
                            <StatMini label="En cours" value={stats.activeCount} color="text-blue-400" />
                            <StatMini label="Livrées" value={stats.deliveredCount} color="text-green-400" />
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

                        {restaurant.lastOrderAt && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" />
                            Dernière commande {formatDistanceToNow(new Date(restaurant.lastOrderAt), { addSuffix: true, locale: fr })}
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

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-xl font-display font-bold", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function RestaurantForm({
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
      <div className="col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Nom *</Label>
        <Input placeholder="Pizza Palace" className="bg-black/30 border-white/10" {...field("name")} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Téléphone *</Label>
        <Input placeholder="+212 6XX..." className="bg-black/30 border-white/10" {...field("phone")} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-widest">Cuisine</Label>
        <Input placeholder="Pizza, Burger…" className="bg-black/30 border-white/10" {...field("cuisine")} />
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
