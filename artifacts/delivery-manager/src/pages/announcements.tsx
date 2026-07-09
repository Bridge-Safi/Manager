import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Mail, Users, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, ChevronRight, Utensils, Bike, Store, Gamepad2, Globe,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

type Source = "driver" | "client" | "restaurant" | "player";
type Audience = "all" | "clients" | "drivers" | "restaurants" | "players" | "official";
type EmailEntry = { email: string; name: string; source: Source };
type EmailListResponse = { count: number; emails: EmailEntry[] };
type SendResult = { sent: number; failed: number; total: number; errors: string[] };

const AUDIENCES: { id: Audience; label: string; icon: React.ReactNode; color: string; border: string; bg: string; source?: Source }[] = [
  { id: "all",         label: "Tous",         icon: <Globe className="w-4 h-4" />,     color: "text-orange-400",  border: "border-orange-500/40", bg: "bg-orange-500/10" },
  { id: "clients",     label: "Clients",      icon: <Utensils className="w-4 h-4" />,  color: "text-amber-400",   border: "border-amber-500/40",  bg: "bg-amber-500/10",  source: "client" },
  { id: "drivers",     label: "Livreurs",     icon: <Bike className="w-4 h-4" />,      color: "text-rose-400",    border: "border-rose-500/40",   bg: "bg-rose-500/10",   source: "driver" },
  { id: "restaurants", label: "Restaurants",  icon: <Store className="w-4 h-4" />,     color: "text-emerald-400", border: "border-emerald-500/40",bg: "bg-emerald-500/10",source: "restaurant" },
  { id: "players",     label: "Joueurs",      icon: <Gamepad2 className="w-4 h-4" />,  color: "text-violet-400",  border: "border-violet-500/40", bg: "bg-violet-500/10", source: "player" },
  { id: "official",    label: "Site officiel",icon: <Globe className="w-4 h-4" />,     color: "text-sky-400",     border: "border-sky-500/40",    bg: "bg-sky-500/10" },
];

const SOURCE_CONFIG: Record<Source, { label: string; color: string; icon: string }> = {
  driver:     { label: "Livreur",    color: "text-rose-400 border-rose-500/30 bg-rose-500/10",       icon: "🛵" },
  client:     { label: "Client",     color: "text-amber-400 border-amber-500/30 bg-amber-500/10",    icon: "🍔" },
  restaurant: { label: "Restaurant", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: "🏪" },
  player:     { label: "Joueur",     color: "text-violet-400 border-violet-500/30 bg-violet-500/10", icon: "🎮" },
};

const DEFAULT_SUBJECTS: Record<Audience, string> = {
  all:         "🚀 Annonce importante — Bridge Safi",
  clients:     "🍔 Une nouveauté pour vous — GradoEats",
  drivers:     "🛵 Message de l'équipe Bridge Safi",
  restaurants: "🏪 Information partenaires — Bridge Safi",
  players:     "🎮 Nouveautés Safi Runner !",
  official:    "🚀 Annonce officielle — Bridge Safi",
};

// ── Email preview renderers ────────────────────────────────────────────────

function ClientPreview({ subject, message }: { subject: string; message: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-amber-500/20 text-sm">
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-8 text-center">
        <div className="text-4xl mb-2">🍔</div>
        <div className="text-lg font-bold text-white">GradoEats</div>
        <div className="text-[10px] text-white/70 uppercase tracking-widest mt-1">Livraison de repas · Safi</div>
      </div>
      <div className="bg-[#111] p-6 space-y-4">
        <div className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Pour nos clients</div>
        <h3 className="text-white font-bold text-base">{subject || "Objet de l'email"}</h3>
        <div className="bg-orange-500/5 border-l-2 border-orange-500 pl-4 py-2 rounded-r-lg">
          <p className="text-white/70 text-xs leading-relaxed">{message || "Votre message apparaîtra ici…"}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["🛵","Livraison rapide"],["🏪","Meilleurs restos"],["⚡","Suivi en direct"]].map(([icon, name]) => (
            <div key={name} className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-[10px] font-semibold text-white">{name}</div>
            </div>
          ))}
        </div>
        <div className="text-center pt-1">
          <span className="inline-block bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold px-6 py-2.5 rounded-full">Commander maintenant →</span>
        </div>
      </div>
    </div>
  );
}

function DriverPreview({ subject, message }: { subject: string; message: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 text-sm">
      <div className="bg-[#1a1a1a] border-b-2 border-rose-500 p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center text-2xl">🛵</div>
          <div>
            <div className="text-white font-bold">Bridge Safi</div>
            <div className="text-[10px] text-rose-400 uppercase tracking-widest font-semibold">Espace Livreurs</div>
          </div>
        </div>
      </div>
      <div className="bg-[#111] p-6 space-y-4">
        <div className="inline-block bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Message Livreurs</div>
        <h3 className="text-white font-bold text-base">{subject || "Objet de l'email"}</h3>
        <p className="text-white/60 text-xs leading-relaxed">{message || "Votre message apparaîtra ici…"}</p>
        <div className="bg-[#0d0d0d] border border-rose-500/15 rounded-xl p-4 space-y-2">
          {[["💰","Paiement rapide & fiable"],["📍","GPS intégré dans l'app"],["🏆","Primes & récompenses"]].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2 text-[11px]">
              <span className="text-base">{icon}</span><span className="text-white/70">{text}</span>
            </div>
          ))}
        </div>
        <div className="text-center pt-1">
          <span className="inline-block bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-bold px-6 py-2.5 rounded-full">Ouvrir l'app livreur →</span>
        </div>
      </div>
    </div>
  );
}

function RestaurantPreview({ subject, message }: { subject: string; message: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-emerald-500/20 text-sm">
      <div className="bg-gradient-to-r from-emerald-900 to-green-800 p-8 text-center">
        <div className="text-4xl mb-2">🏪</div>
        <div className="text-lg font-bold text-white">Espace Restaurateurs</div>
        <div className="text-[10px] text-white/70 uppercase tracking-widest mt-1">Bridge Safi · Partenaires</div>
      </div>
      <div className="bg-[#111] p-6 space-y-4">
        <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Partenaire Restaurant</div>
        <h3 className="text-white font-bold text-base">{subject || "Objet de l'email"}</h3>
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
          <p className="text-white/70 text-xs leading-relaxed">{message || "Votre message apparaîtra ici…"}</p>
        </div>
        <div className="space-y-2">
          {[["📈","Augmentez vos ventes"],["📊","Tableau de bord complet"],["🤝","Support dédié"]].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 bg-[#0d0d0d] border border-white/5 rounded-xl p-3">
              <span className="text-xl">{icon}</span><span className="text-white/70 text-xs">{text}</span>
            </div>
          ))}
        </div>
        <div className="text-center pt-1">
          <span className="inline-block bg-gradient-to-r from-emerald-600 to-green-500 text-white text-xs font-bold px-6 py-2.5 rounded-full">Accéder à mon espace →</span>
        </div>
      </div>
    </div>
  );
}

function PlayerPreview({ subject, message }: { subject: string; message: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-violet-500/25 text-sm">
      <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-900 p-8 text-center">
        <div className="text-4xl mb-2">🎮</div>
        <div className="text-lg font-bold text-white">Safi Runner</div>
        <div className="text-[10px] text-violet-300/80 uppercase tracking-widest mt-1">Le jeu de la ville · Bridge Safi</div>
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {["🏆 Classement","💎 Diamants","⚡ Nouveautés"].map(t => (
            <span key={t} className="bg-violet-500/25 border border-violet-500/40 text-violet-300 text-[9px] font-bold px-2.5 py-1 rounded-full">{t}</span>
          ))}
        </div>
      </div>
      <div className="bg-[#0f0f1a] p-6 space-y-4">
        <div className="inline-block bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Message Joueurs</div>
        <h3 className="text-white font-bold text-base">{subject || "Objet de l'email"}</h3>
        <div className="bg-gradient-to-r from-violet-500/8 to-blue-500/8 border border-violet-500/20 rounded-xl p-4">
          <p className="text-white/70 text-xs leading-relaxed">{message || "Votre message apparaîtra ici…"}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["🏃","Runner 3D","Infini"],["💎","Collectez","Diamants"],["🥇","Top Scores","Mondial"]].map(([icon, name, desc]) => (
            <div key={name} className="bg-[#0d0d18] border border-violet-500/15 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-[10px] font-semibold text-white">{name}</div>
              <div className="text-[9px] text-white/40 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
        <div className="text-center pt-1">
          <span className="inline-block bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-6 py-2.5 rounded-full">Jouer maintenant →</span>
        </div>
      </div>
    </div>
  );
}

function OfficialPreview({ subject, message }: { subject: string; message: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-orange-500/20 text-sm">
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="3"/>
            <polygon points="60,28 38,55 55,55 40,82 67,44 47,44" fill="#ffffff"/>
          </svg>
        </div>
        <div className="text-xl font-bold text-white">Bridge Safi</div>
        <div className="text-[10px] text-white/75 uppercase tracking-widest mt-1">Votre plateforme locale · Safi, Maroc</div>
      </div>
      <div className="bg-[#111] p-6 space-y-4">
        <div className="inline-block bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Annonce officielle</div>
        <h3 className="text-white font-bold text-base">{subject || "Objet de l'email"}</h3>
        <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-4">
          <p className="text-white/70 text-xs leading-relaxed">{message || "Votre message apparaîtra ici…"}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["🍔","GradoEats","Livraison"],["🚖","Bridge Taxi","VTC"],["🎮","Safi Runner","Jeu"]].map(([icon, name, desc]) => (
            <div key={name} className="bg-white/4 border border-white/7 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-[10px] font-semibold text-white">{name}</div>
              <div className="text-[9px] text-white/40 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
        <div className="text-center pt-1">
          <span className="inline-block bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold px-6 py-2.5 rounded-full">Découvrir Bridge Safi →</span>
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ audience, subject, message }: { audience: Audience; subject: string; message: string }) {
  switch (audience) {
    case "clients":     return <ClientPreview subject={subject} message={message} />;
    case "drivers":     return <DriverPreview subject={subject} message={message} />;
    case "restaurants": return <RestaurantPreview subject={subject} message={message} />;
    case "players":     return <PlayerPreview subject={subject} message={message} />;
    default:            return <OfficialPreview subject={subject} message={message} />;
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const [audience, setAudience] = useState<Audience>("official");
  const [subject, setSubject] = useState(DEFAULT_SUBJECTS.official);
  const [message, setMessage] = useState("");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<EmailListResponse>({
    queryKey: ["/api/notifications/emails"],
    queryFn: () => fetch("/api/notifications/emails").then(r => { if (!r.ok) throw new Error("Erreur"); return r.json(); }),
    staleTime: 60000,
  });

  const { data: notifStatus } = useQuery<{ gmailConfigured: boolean; gmailUser: string | null }>({
    queryKey: ["/api/notifications/status"],
    queryFn: () => fetch("/api/notifications/status").then(r => r.json()),
    staleTime: 60000,
  });
  const gmailOk = notifStatus?.gmailConfigured ?? false;

  const sendMutation = useMutation<SendResult, Error, void>({
    mutationFn: () =>
      fetch("/api/notifications/send-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message: message || undefined,
          audience,
        }),
      }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Erreur envoi");
        return d;
      }),
    onSuccess: (result) => {
      setSendResult(result);
      toast({
        title: `✅ ${result.sent} email${result.sent > 1 ? "s" : ""} envoyé${result.sent > 1 ? "s" : ""}`,
        description: result.failed > 0 ? `${result.failed} échec(s)` : "Tous les emails ont été envoyés",
        duration: 6000,
      });
    },
    onError: (err) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  function handleAudienceChange(a: Audience) {
    setAudience(a);
    setSubject(DEFAULT_SUBJECTS[a]);
  }

  const audienceCfg = AUDIENCES.find(a => a.id === audience)!;

  const recipientCount = data
    ? audience === "all" || audience === "official"
      ? data.count
      : data.emails.filter(e =>
          audience === "clients"     ? e.source === "client" :
          audience === "drivers"     ? e.source === "driver" :
          audience === "restaurants" ? e.source === "restaurant" :
          audience === "players"     ? e.source === "player" : true
        ).length
    : 0;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl flex items-center gap-3">
              <Mail className="w-7 h-7 text-primary" />
              Email & Annonces
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Envoyez des emails personnalisés à chaque audience depuis Bridge Safi</p>
          </div>
          <Button variant="outline" size="sm" className="border-white/10 gap-2 shrink-0" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Audience selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Choisir l'audience</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map(a => {
              const count = data
                ? a.id === "all" || a.id === "official" ? data.count
                  : data.emails.filter(e => e.source === a.source).length
                : null;
              const active = audience === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => handleAudienceChange(a.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    active
                      ? `${a.bg} ${a.border} ${a.color}`
                      : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  {a.icon}
                  {a.label}
                  {count !== null && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${active ? `${a.bg} ${a.color}` : "bg-white/5 text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: form + contact list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Gmail status */}
            <Card className="glass border-white/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${gmailOk ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  {gmailOk ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{gmailOk ? "Gmail connecté" : "Gmail non configuré"}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">{notifStatus?.gmailUser ?? "—"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Email form */}
            <Card className="glass border-white/5">
              <CardHeader className="p-4 pb-3 border-b border-white/5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${audienceCfg.bg}`}>
                    <span className={audienceCfg.color}>{audienceCfg.icon}</span>
                  </div>
                  Composer le message
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Objet de l'email</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="Objet de l'email…"
                  />
                </div>
                {/* Body */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    placeholder="Rédigez votre message ici — il apparaîtra dans le corps de l'email…"
                  />
                </div>

                {/* Send button */}
                {sendResult && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/8 border border-green-500/20">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-green-400">{sendResult.sent} envoyés</p>
                      {sendResult.failed > 0 && <p className="text-[10px] text-amber-400">{sendResult.failed} échecs</p>}
                    </div>
                    <button className="text-muted-foreground hover:text-white text-xs" onClick={() => setSendResult(null)}>✕</button>
                  </div>
                )}

                <Button
                  className={`w-full font-bold gap-2 text-white ${
                    audience === "clients"     ? "bg-gradient-to-r from-orange-600 to-amber-500 hover:opacity-90" :
                    audience === "drivers"     ? "bg-gradient-to-r from-rose-600 to-orange-500 hover:opacity-90" :
                    audience === "restaurants" ? "bg-gradient-to-r from-emerald-600 to-green-500 hover:opacity-90" :
                    audience === "players"     ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90" :
                    "bg-gradient-to-r from-primary to-amber-500 hover:opacity-90"
                  }`}
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || !gmailOk || recipientCount === 0}
                >
                  {sendMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Envoyer à {recipientCount} {audienceCfg.label.toLowerCase()}</>
                  )}
                </Button>

                {!gmailOk && (
                  <p className="text-[10px] text-amber-500/80 text-center">⚠️ Configurez GMAIL_APP_PASSWORD dans les secrets Replit.</p>
                )}
              </CardContent>
            </Card>

            {/* Contact list */}
            <Card className="glass border-white/5">
              <CardHeader className="p-4 pb-3 border-b border-white/5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Contacts enregistrés
                  {data && <Badge variant="outline" className="ml-auto font-mono text-[10px]">{data.count}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : data && data.count > 0 ? (
                  <>
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-px bg-white/5 border-b border-white/5">
                      {(["driver","client","restaurant","player"] as Source[]).map(src => {
                        const cfg = SOURCE_CONFIG[src];
                        const count = data.emails.filter(e => e.source === src).length;
                        return (
                          <div key={src} className="text-center py-3 bg-[#111]">
                            <div className="text-base">{cfg.icon}</div>
                            <div className={`text-sm font-bold font-mono mt-0.5 ${cfg.color.split(" ")[0]}`}>{count}</div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{cfg.label}s</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-white/5">
                      {data.emails.slice(0, 80).map((e, i) => {
                        const cfg = SOURCE_CONFIG[e.source] ?? SOURCE_CONFIG.client;
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-2">
                            <div className="text-base shrink-0">{cfg.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white truncate">{e.name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground truncate">{e.email}</div>
                            </div>
                            <span className={`text-[9px] font-mono border rounded px-1.5 py-0.5 shrink-0 ${cfg.color}`}>{cfg.label}</span>
                          </div>
                        );
                      })}
                      {data.count > 80 && (
                        <div className="text-center py-3 text-xs text-muted-foreground">+ {data.count - 80} autres</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                    <Mail className="w-7 h-7 opacity-20" />
                    <p className="text-xs">Aucun email enregistré</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: live preview */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="glass border-white/5">
              <CardHeader className="p-4 pb-3 border-b border-white/5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-primary" />
                  Aperçu de l'email
                  <Badge variant="outline" className={`ml-auto text-[10px] ${audienceCfg.color} ${audienceCfg.border} ${audienceCfg.bg}`}>
                    {audienceCfg.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <EmailPreview audience={audience} subject={subject} message={message} />
                <p className="text-center text-[10px] text-muted-foreground mt-3">Aperçu en temps réel · L'email réel est envoyé en HTML complet</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
