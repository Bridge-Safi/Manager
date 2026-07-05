import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useListDrivers,
  useUpdateDriver,
  useCreateDriver,
  useDeleteDriver,
  getListDriversQueryKey,
  getGetDashboardSummaryQueryKey,
  useGetDriverTodayStats,
  useGetDriverActivities,
  useCreateResetRequest,
  getGetResetRequestsPendingCountQueryKey,
  useRecordDriverRefusal,
  useWarnDriver,
  useToggleBlockDriver,
  useGetDriverReviews,
  useCreateDriverReview,
  Driver,
  DriverStatus,
} from "@workspace/api-client-react";
import { DriverStatusBadge } from "@/components/status-badges";
import {
  Phone, Star, MapPin, Loader2, Activity as ActivityIcon,
  CheckCircle2, Package, Bike, X, Circle, WifiOff, Clock,
  DollarSign, KeyRound, LockKeyhole, AlertTriangle, Ban,
  Unlock, ShieldAlert, ThumbsUp, ThumbsDown, Minus, MessageSquarePlus, Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const REFUSAL_WARN_THRESHOLD = 3;
const REFUSAL_BLOCK_THRESHOLD = 6;

function getActivityIcon(action: string) {
  switch (action) {
    case "order_delivered": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "order_assigned": return <Package className="w-4 h-4 text-blue-500" />;
    case "order_picked_up": return <Bike className="w-4 h-4 text-orange-500" />;
    case "order_cancelled": return <X className="w-4 h-4 text-red-500" />;
    case "status_online":
    case "status_available": return <Circle className="w-4 h-4 text-green-500" />;
    case "status_offline": return <WifiOff className="w-4 h-4 text-zinc-500" />;
    default: return <ActivityIcon className="w-4 h-4 text-muted-foreground" />;
  }
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "w-7 h-7 transition-colors",
              (hovered || value) >= star
                ? "fill-amber-500 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]"
                : "text-white/20"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3.5 h-3.5",
            star <= rating ? "fill-amber-500 text-amber-500" : "text-white/20"
          )}
        />
      ))}
    </div>
  );
}

function ReviewsTab({ driverId }: { driverId: number }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "negative" | "neutral">("neutral");
  const [showForm, setShowForm] = useState(false);

  const { data: reviews, isLoading } = useGetDriverReviews(driverId, {});
  const createReview = useCreateDriverReview({
    mutation: {
      onSuccess: () => {
        toast.success("Avis ajouté avec succès");
        setRating(0);
        setComment("");
        setSentiment("neutral");
        setShowForm(false);
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
      },
      onError: () => toast.error("Erreur lors de l'ajout de l'avis"),
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }
    createReview.mutate({
      id: driverId,
      data: { rating, comment: comment || null, sentiment },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-sans">
          Avis & Évaluations
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(!showForm)}
          className="h-7 text-xs border-white/10 bg-white/5 hover:bg-white/10"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />
          Nouvel avis
        </Button>
      </div>

      {showForm && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-sans">Note</div>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2 font-sans">Sentiment</div>
            <div className="flex gap-2">
              {(["positive", "neutral", "negative"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSentiment(s)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    sentiment === s
                      ? s === "positive"
                        ? "border-green-500/50 bg-green-500/10 text-green-400"
                        : s === "negative"
                          ? "border-red-500/50 bg-red-500/10 text-red-400"
                          : "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                  )}
                >
                  {s === "positive" ? <ThumbsUp className="w-3.5 h-3.5" /> : s === "negative" ? <ThumbsDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {s === "positive" ? "Positif" : s === "negative" ? "Négatif" : "Neutre"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2 font-sans">Commentaire (optionnel)</div>
            <Textarea
              placeholder="Saisir un commentaire..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-black/30 border-white/10 text-sm resize-none h-20 focus:border-primary/50"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createReview.isPending || rating === 0}
              className="flex-1 bg-primary hover:bg-primary/90 text-sm"
            >
              {createReview.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Soumettre
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="border-white/10 bg-white/5 hover:bg-white/10"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white/5 rounded-xl border border-white/5 p-4">
              <div className="flex items-start justify-between mb-2">
                <StarDisplay rating={review.rating} />
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    review.sentiment === "positive"
                      ? "text-green-400 border-green-500/30 bg-green-500/10"
                      : review.sentiment === "negative"
                        ? "text-red-400 border-red-500/30 bg-red-500/10"
                        : "text-zinc-400 border-white/10 bg-white/5"
                  )}
                >
                  {review.sentiment === "positive" ? "👍 Positif" : review.sentiment === "negative" ? "👎 Négatif" : "😐 Neutre"}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{review.comment}</p>
              )}
              <p className="text-[10px] text-muted-foreground font-mono mt-2">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: fr })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
          Aucun avis pour ce livreur.
        </div>
      )}
    </div>
  );
}

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [activeTab, setActiveTab] = useState<"livreurs" | "chauffeurs" | "moto_taxi">("livreurs");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);

  const { data: allDrivers, isLoading } = useListDrivers({
    query: { refetchInterval: 10000 }
  });

  const drivers = allDrivers?.filter(d =>
    activeTab === "livreurs"
      ? (d.services === "nourriture" && d.vehicleType !== "moto_taxi")
      : activeTab === "chauffeurs"
      ? (d.services === "taxi" || d.vehicleType === "car")
      : (d.services === "moto_taxi" || d.vehicleType === "moto_taxi")
  );

  const { data: todayStats, isLoading: loadingStats } = useGetDriverTodayStats(
    selectedDriver?.id as number,
    { query: { enabled: !!selectedDriver?.id } }
  );

  const { data: activities, isLoading: loadingActivities } = useGetDriverActivities(
    selectedDriver?.id as number,
    {},
    { query: { enabled: !!selectedDriver?.id } }
  );

  const createDriverMutation = useCreateDriver({
    mutation: {
      onSuccess: (data) => {
        const driver = data as typeof data & { plainPassword?: string };
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setShowCreate(false);
        setCreateForm({ name: "", phone: "", email: "", password: "" });
        if (driver.email && driver.plainPassword) {
          setCreatedCredentials({ email: driver.email, password: driver.plainPassword, name: driver.name });
        } else {
          toast.success(`${driver.name} ajouté avec succès`);
        }
      },
      onError: () => toast.error("Erreur lors de la création du driver"),
    },
  });

  const deleteMutation = useDeleteDriver({
    mutation: {
      onSuccess: () => {
        toast.success("Livreur supprimé définitivement");
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setDriverToDelete(null);
        setSelectedDriver(null);
      },
      onError: () => toast.error("Erreur lors de la suppression"),
    },
  });

  const handleCreate = () => {
    if (!createForm.name.trim() || !createForm.phone.trim()) {
      toast.error("Nom et téléphone obligatoires");
      return;
    }
    if (!createForm.email.trim()) {
      toast.error("L'email est obligatoire pour créer un compte");
      return;
    }
    const vehicleType = activeTab === "chauffeurs" ? "car" : activeTab === "moto_taxi" ? "moto_taxi" : "moto";
    const services = activeTab === "chauffeurs" ? "taxi" : activeTab === "moto_taxi" ? "moto_taxi" : "nourriture";
    createDriverMutation.mutate({
      data: {
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim(),
        password: createForm.password.trim() || undefined,
        vehicleType,
        services,
      },
    });
  };

  const updateDriverMutation = useUpdateDriver({
    mutation: {
      onSuccess: () => {
        toast.success("Statut du livreur mis à jour");
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  const resetMutation = useCreateResetRequest({
    mutation: {
      onSuccess: (data) => {
        toast.success(
          `Code généré : ${data.resetCode} — Copiez-le et envoyez-le à ${data.driverName ?? "le livreur"}`,
          { duration: 8000 }
        );
        queryClient.invalidateQueries({ queryKey: getGetResetRequestsPendingCountQueryKey() });
      },
      onError: () => toast.error("Erreur lors de la création de la demande"),
    },
  });

  const refusalMutation = useRecordDriverRefusal({
    mutation: {
      onSuccess: (driver) => {
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        const count = driver.totalRefusals;
        if (count >= REFUSAL_BLOCK_THRESHOLD) {
          toast.error(`${driver.name} a ${count} refus — blocage recommandé !`, { duration: 6000 });
        } else if (count >= REFUSAL_WARN_THRESHOLD) {
          toast.warning(`${driver.name} a ${count} refus — avertissement conseillé`, { duration: 5000 });
        } else {
          toast.success(`Refus enregistré pour ${driver.name} (total: ${count})`);
        }
      },
      onError: () => toast.error("Erreur lors de l'enregistrement du refus"),
    },
  });

  const warnMutation = useWarnDriver({
    mutation: {
      onSuccess: (driver) => {
        toast.success(`Avertissement envoyé à ${driver.name}`);
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
      },
      onError: () => toast.error("Erreur lors de l'envoi de l'avertissement"),
    },
  });

  const blockMutation = useToggleBlockDriver({
    mutation: {
      onSuccess: (driver) => {
        toast.success(driver.isBlocked ? `${driver.name} a été bloqué` : `${driver.name} a été débloqué`);
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        if (selectedDriver?.id === driver.id) setSelectedDriver(driver);
      },
      onError: () => toast.error("Erreur lors du blocage/déblocage"),
    },
  });

  const handleUpdateStatus = (id: number, status: DriverStatus) => {
    updateDriverMutation.mutate({ id, data: { status } });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">
              {activeTab === "livreurs" ? "🛵 Livreurs" : activeTab === "chauffeurs" ? "🚖 Chauffeurs" : "🏍️ Moto-Taxi"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {activeTab === "livreurs"
                ? "Livreurs de repas et commandes — flotte moto/vélo."
                : activeTab === "chauffeurs"
                ? "Chauffeurs taxi confort — flotte voiture."
                : "Chauffeurs moto-taxi — courses rapides en moto."}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="glow-pulse bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide">
            + {activeTab === "livreurs" ? "Nouveau livreur" : activeTab === "chauffeurs" ? "Nouveau chauffeur" : "Nouveau moto-taxi"}
          </Button>
        </div>

        {/* Onglets Livreurs / Chauffeurs / Moto-Taxi */}
        <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-2xl w-fit">
          <button
            onClick={() => { setActiveTab("livreurs"); setSelectedDriver(null); }}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === "livreurs"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            🛵 Livreurs <span className="ml-1.5 text-xs opacity-70">({allDrivers?.filter(d => d.services === "nourriture" && d.vehicleType !== "moto_taxi").length ?? 0})</span>
          </button>
          <button
            onClick={() => { setActiveTab("chauffeurs"); setSelectedDriver(null); }}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === "chauffeurs"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            🚖 Chauffeurs <span className="ml-1.5 text-xs opacity-70">({allDrivers?.filter(d => d.services === "taxi" || d.vehicleType === "car").length ?? 0})</span>
          </button>
          <button
            onClick={() => { setActiveTab("moto_taxi"); setSelectedDriver(null); }}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === "moto_taxi"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            🏍️ Moto-Taxi <span className="ml-1.5 text-xs opacity-70">({allDrivers?.filter(d => d.services === "moto_taxi" || d.vehicleType === "moto_taxi").length ?? 0})</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="glass h-64 animate-pulse border-white/5"></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {drivers?.map((driver) => {
              const isWarned = driver.totalRefusals >= REFUSAL_WARN_THRESHOLD && driver.totalRefusals < REFUSAL_BLOCK_THRESHOLD;
              const isDangerous = driver.totalRefusals >= REFUSAL_BLOCK_THRESHOLD;
              const hasRefusals = driver.totalRefusals > 0;

              return (
                <Card
                  key={driver.id}
                  className={cn(
                    "glass hover-lift overflow-hidden relative group border-white/5",
                    driver.isBlocked && "opacity-70 border-red-500/20",
                    isDangerous && !driver.isBlocked && "border-red-500/20"
                  )}
                >
                  <div className={cn(
                    "absolute top-0 left-0 w-full h-1.5 bg-white/5 transition-colors group-hover:bg-gradient-to-r",
                    driver.isBlocked
                      ? "bg-gradient-to-r from-red-700 to-red-500"
                      : isDangerous
                        ? "group-hover:from-red-600 group-hover:to-red-400"
                        : isWarned
                          ? "group-hover:from-amber-600 group-hover:to-amber-400"
                          : "group-hover:from-primary group-hover:to-amber-500"
                  )} />

                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center border relative shadow-xl font-display text-xl font-bold text-white transition-colors",
                            driver.isBlocked
                              ? "bg-red-950 border-red-500/30"
                              : "bg-gradient-to-br from-black to-gray-900 border-white/10 group-hover:border-primary/50"
                          )}>
                            {driver.isBlocked ? (
                              <Ban className="w-6 h-6 text-red-500" />
                            ) : (
                              driver.name.substring(0, 2).toUpperCase()
                            )}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card",
                              driver.isBlocked ? "bg-red-600" :
                              driver.status === 'available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                              driver.status === 'busy' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse' : 'bg-gray-500'
                            )} />
                          </div>
                          {driver.isBlocked && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 border border-red-400 flex items-center justify-center">
                              <Ban className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "text-xl font-display font-bold leading-none tracking-tight mb-1.5 transition-colors",
                              driver.isBlocked ? "text-red-400" : "group-hover:text-primary"
                            )}>{driver.name}</h3>
                            {driver.isBlocked && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30 mb-1.5">BLOQUÉ</Badge>
                            )}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded border border-white/5 w-max">
                            <Phone className="w-3 h-3" /> {driver.phone}
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="focus:outline-none outline-none cursor-pointer" disabled={updateDriverMutation.isPending}>
                            <DriverStatusBadge status={driver.status} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                          <DropdownMenuItem onClick={() => handleUpdateStatus(driver.id, "available")} className="cursor-pointer font-medium text-green-500 focus:text-green-400">
                            Marquer Disponible
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(driver.id, "offline")} className="cursor-pointer font-medium text-muted-foreground focus:text-white">
                            Marquer Hors ligne
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 mb-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                      <div className="grid grid-cols-3 gap-2 relative z-10">
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground uppercase font-sans tracking-widest mb-1">Courses</div>
                          <div className="text-xl font-display font-bold">{driver.totalDeliveries}</div>
                        </div>
                        <div className="text-center border-x border-white/5">
                          <div className="text-[10px] text-muted-foreground uppercase font-sans tracking-widest mb-1">Revenu</div>
                          <div className="font-display font-bold text-primary flex items-baseline justify-center gap-1">
                            <span className="text-xl">{driver.totalRevenue}</span>
                            <span className="text-[10px] font-sans font-normal text-muted-foreground">MAD</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground uppercase font-sans tracking-widest mb-1">Note</div>
                          <div className="text-xl font-display font-bold flex items-center justify-center gap-1">
                            {driver.rating.toFixed(1)} <Star className="w-4 h-4 fill-amber-500 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Refusals warning row */}
                    {hasRefusals && (
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 text-xs font-medium",
                        isDangerous
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      )}>
                        {isDangerous ? (
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        )}
                        <span>
                          {driver.totalRefusals} refus
                          {isDangerous ? " — Blocage recommandé !" : isWarned ? " — Avertissement conseillé" : ""}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-xs font-mono tracking-wider">{driver.vehicleType}</Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-white/10 bg-white/5 hover:bg-white/10" onClick={() => setSelectedDriver(driver)}>
                          <ActivityIcon className="w-3.5 h-3.5 mr-1.5" />
                          Détails
                        </Button>
                        {driver.lat && driver.lng ? (
                          <div className="text-xs font-mono text-primary/80 flex items-center gap-1.5 border border-primary/20 bg-primary/5 px-2 py-1 rounded-md">
                            <MapPin className="w-3 h-3" />
                            GPS
                          </div>
                        ) : (
                          <div className="text-xs font-mono text-muted-foreground/50 border border-dashed border-white/10 px-2 py-1 rounded-md">Hors réseau</div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                      {/* Refusal */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={refusalMutation.isPending || driver.isBlocked}
                        onClick={() => refusalMutation.mutate({ id: driver.id, data: {} })}
                        className="h-8 text-xs font-medium border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/40 transition-all"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Refus
                      </Button>

                      {/* Warn */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={warnMutation.isPending || driver.isBlocked}
                        onClick={() => warnMutation.mutate({ id: driver.id, data: { reason: "Trop de refus de commandes" } })}
                        className="h-8 text-xs font-medium border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Avertir
                      </Button>

                      {/* Block/Unblock */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={blockMutation.isPending}
                        onClick={() => blockMutation.mutate({ id: driver.id, data: { blocked: !driver.isBlocked } })}
                        className={cn(
                          "h-8 text-xs font-medium transition-all",
                          driver.isBlocked
                            ? "border-green-500/20 bg-green-500/5 text-green-400 hover:bg-green-500/10 hover:border-green-500/40"
                            : "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
                        )}
                      >
                        {driver.isBlocked ? (
                          <><Unlock className="w-3.5 h-3.5 mr-1" />Débloquer</>
                        ) : (
                          <><Ban className="w-3.5 h-3.5 mr-1" />Bloquer</>
                        )}
                      </Button>
                    </div>

                    {/* Reset buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resetMutation.isPending}
                            className="flex-1 h-8 text-xs font-medium border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all"
                          >
                            {resetMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Réinitialisation
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                          <DropdownMenuItem
                            onClick={() => resetMutation.mutate({ data: { driverId: driver.id, type: "password" } })}
                            className="cursor-pointer font-medium flex items-center gap-2"
                          >
                            <LockKeyhole className="w-4 h-4 text-amber-400" />
                            <div>
                              <div className="text-sm">Mot de passe oublié</div>
                              <div className="text-xs text-muted-foreground">Générer un lien de réinitialisation</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => resetMutation.mutate({ data: { driverId: driver.id, type: "pin" } })}
                            className="cursor-pointer font-medium flex items-center gap-2"
                          >
                            <KeyRound className="w-4 h-4 text-primary" />
                            <div>
                              <div className="text-sm">Code PIN oublié</div>
                              <div className="text-xs text-muted-foreground">Générer un nouveau code PIN</div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDriverToDelete(driver)}
                        className="w-full h-8 text-xs font-medium border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Supprimer ce livreur
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
        <SheetContent className="w-[400px] sm:w-[580px] bg-background border-l border-white/10 p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-white/5 shrink-0 bg-background/80 backdrop-blur-xl z-10">
            <SheetTitle className="font-display text-2xl flex items-center gap-3">
              Fiche Livreur
            </SheetTitle>
            {selectedDriver && (
              <div className="flex items-center gap-3 mt-2">
                <div className="font-medium text-lg">{selectedDriver.name}</div>
                <DriverStatusBadge status={selectedDriver.status} />
                {selectedDriver.isBlocked && (
                  <Badge className="text-[9px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30">BLOQUÉ</Badge>
                )}
                {selectedDriver.totalRefusals >= REFUSAL_WARN_THRESHOLD && (
                  <Badge className={cn(
                    "text-[9px] px-1.5 py-0",
                    selectedDriver.totalRefusals >= REFUSAL_BLOCK_THRESHOLD
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}>
                    {selectedDriver.totalRefusals} REFUS
                  </Badge>
                )}
              </div>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <Tabs defaultValue="activite">
                <TabsList className="w-full mb-6 bg-white/5 border border-white/10">
                  <TabsTrigger value="activite" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                    Activité
                  </TabsTrigger>
                  <TabsTrigger value="avis" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                    Avis & Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activite" className="space-y-8 mt-0">
                  {/* Today's Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-sans mb-4">Statistiques du jour</h3>
                    {loadingStats ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : todayStats ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg mb-2"><Package className="w-5 h-5" /></div>
                          <div className="text-2xl font-display font-bold">{todayStats.todayDeliveries}</div>
                          <div className="text-xs text-muted-foreground">Livraisons</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                          <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg mb-2"><DollarSign className="w-5 h-5" /></div>
                          <div className="text-2xl font-display font-bold text-primary">{todayStats.todayRevenue.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">Revenu (MAD)</div>
                        </div>
                        {selectedDriver && (
                          <div className={cn(
                            "rounded-xl p-4 border flex flex-col items-center justify-center text-center col-span-2",
                            selectedDriver.totalRefusals >= REFUSAL_BLOCK_THRESHOLD
                              ? "bg-red-500/10 border-red-500/20"
                              : selectedDriver.totalRefusals >= REFUSAL_WARN_THRESHOLD
                                ? "bg-amber-500/10 border-amber-500/20"
                                : "bg-white/5 border-white/5"
                          )}>
                            <div className={cn(
                              "p-2 rounded-lg mb-2",
                              selectedDriver.totalRefusals >= REFUSAL_BLOCK_THRESHOLD
                                ? "bg-red-500/20 text-red-400"
                                : selectedDriver.totalRefusals >= REFUSAL_WARN_THRESHOLD
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-green-500/10 text-green-500"
                            )}>
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div className="text-2xl font-display font-bold">{selectedDriver.totalRefusals}</div>
                            <div className="text-xs text-muted-foreground">Total refus de commandes</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4 bg-white/5 rounded-xl">Aucune donnée disponible.</div>
                    )}
                  </div>

                  {/* Activity Timeline */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-sans mb-4">Chronologie</h3>
                    {loadingActivities ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : activities && activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded-full border border-white/10 bg-background shadow shrink-0 flex items-center justify-center mt-0.5">
                              {getActivityIcon(activity.action)}
                            </div>
                            <div className="flex-1 p-3 rounded-xl border border-white/5 bg-white/5">
                              <div className="text-sm text-foreground leading-snug">{activity.details}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-1">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: fr })}
                              </div>
                              {activity.orderNumber && (
                                <div className="mt-1.5 text-[10px] font-mono text-primary/80 border border-primary/20 bg-primary/5 px-2 py-0.5 rounded inline-block">
                                  #{activity.orderNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                        Aucune activité enregistrée.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="avis" className="mt-0">
                  {selectedDriver && <ReviewsTab driverId={selectedDriver.id} />}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Modal Nouveau Driver ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {activeTab === "livreurs" ? "🛵 Nouveau livreur" : activeTab === "chauffeurs" ? "🚖 Nouveau chauffeur" : "🏍️ Nouveau moto-taxi"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom complet *</label>
              <Input
                placeholder="Ex: Youssef Amrani"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                className="bg-black/30 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Téléphone *</label>
              <Input
                placeholder="+212 6XX XXX XXX"
                value={createForm.phone}
                onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-black/30 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email *</label>
              <Input
                placeholder="prenom.nom@bridge-safi.ma"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                className="bg-black/30 border-white/10"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mot de passe</label>
              <Input
                placeholder="Laisser vide = auto-généré"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                className="bg-black/30 border-white/10"
                type="text"
              />
              <p className="text-[10px] text-muted-foreground">Si vide, un mot de passe sera généré automatiquement</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-white/10"
                onClick={() => { setShowCreate(false); setCreateForm({ name: "", phone: "", email: "", password: "" }); }}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={handleCreate}
                disabled={createDriverMutation.isPending}
              >
                {createDriverMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
        <DialogContent className="bg-[#0f0f0f] border border-green-500/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <span>✅</span> Compte créé avec succès
            </DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Communiquez ces identifiants à <span className="text-white font-semibold">{createdCredentials.name}</span> pour qu'il puisse se connecter à l'app livreur.
              </p>
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <code className="text-amber-400 text-sm font-mono flex-1">{createdCredentials.email}</code>
                    <button
                      className="text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded border border-white/10"
                      onClick={() => { navigator.clipboard.writeText(createdCredentials.email); toast.success("Email copié"); }}
                    >Copier</button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Mot de passe</p>
                  <div className="flex items-center gap-2">
                    <code className="text-green-400 text-sm font-mono flex-1">{createdCredentials.password}</code>
                    <button
                      className="text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded border border-white/10"
                      onClick={() => { navigator.clipboard.writeText(createdCredentials.password); toast.success("Mot de passe copié"); }}
                    >Copier</button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-amber-500/80">⚠️ Ce mot de passe ne sera plus affiché. Notez-le ou envoyez-le au livreur maintenant.</p>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const text = `Identifiants app livreur:\nEmail: ${createdCredentials.email}\nMot de passe: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  toast.success("Identifiants copiés !");
                  setCreatedCredentials(null);
                }}
              >
                📋 Copier les deux et fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!driverToDelete} onOpenChange={(open) => !open && setDriverToDelete(null)}>
        <DialogContent className="bg-[#0f0f0f] border border-red-500/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <span>⚠️</span> Supprimer ce livreur ?
            </DialogTitle>
          </DialogHeader>
          {driverToDelete && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Cette action supprimera définitivement <span className="text-white font-semibold">{driverToDelete.name}</span> et toutes ses données (avis, activités, historique). Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10"
                  onClick={() => setDriverToDelete(null)}
                  disabled={deleteMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deleteMutation.mutate({ id: driverToDelete.id })}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Supprimer définitivement"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
