import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail, Users, Loader2, CheckCircle2, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

type EmailEntry = { email: string; name: string; source: "driver" | "client" | "player" };
type EmailListResponse = { count: number; emails: EmailEntry[] };
type SendResult = { sent: number; failed: number; total: number; errors: string[] };

async function fetchEmailList(): Promise<EmailListResponse> {
  const r = await fetch("/api/notifications/emails");
  if (!r.ok) throw new Error("Erreur chargement emails");
  return r.json();
}

async function sendAnnouncement(subject: string): Promise<SendResult> {
  const r = await fetch("/api/notifications/send-announcement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Erreur envoi");
  return data;
}

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  driver: { label: "Livreur", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  client: { label: "Client", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  player: { label: "Joueur", color: "text-green-400 border-green-500/30 bg-green-500/10" },
};

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [subject, setSubject] = useState("🚀 Bridge Safi arrive bientôt !");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<EmailListResponse>({
    queryKey: ["/api/notifications/emails"],
    queryFn: fetchEmailList,
    staleTime: 60000,
  });

  const sendMutation = useMutation<SendResult, Error, string>({
    mutationFn: sendAnnouncement,
    onSuccess: (result) => {
      setSendResult(result);
      toast({
        title: `✅ ${result.sent} emails envoyés`,
        description: result.failed > 0 ? `${result.failed} échecs` : "Tous les emails ont été envoyés avec succès",
        duration: 6000,
      });
    },
    onError: (err) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const { data: notifStatus } = useQuery<{ gmailConfigured: boolean; gmailUser: string | null }>({
    queryKey: ["/api/notifications/status"],
    queryFn: () => fetch("/api/notifications/status").then(r => r.json()),
    staleTime: 60000,
  });
  const gmailConfigured = notifStatus?.gmailConfigured ?? false;

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl flex items-center gap-3">
              <Send className="w-7 h-7 text-primary" />
              Email & Annonces
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Envoyez des emails à tous vos contacts — livreurs, clients et joueurs</p>
          </div>
          <Button variant="outline" size="sm" className="border-white/10 gap-2" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste emails */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="glass border-white/5">
              <CardHeader className="p-4 pb-3 border-b border-white/5">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Destinataires
                  {data && <Badge variant="outline" className="ml-auto font-mono">{data.count}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : data && data.count > 0 ? (
                  <div>
                    {/* Stats par source */}
                    <div className="p-4 grid grid-cols-3 gap-2">
                      {(["driver", "client", "player"] as const).map(src => {
                        const count = data.emails.filter(e => e.source === src).length;
                        const { label, color } = SOURCE_LABEL[src];
                        return (
                          <div key={src} className="text-center">
                            <div className={`text-lg font-bold font-mono ${color.split(" ")[0]}`}>{count}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}s</div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Liste scrollable */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                      {data.emails.slice(0, 100).map((e, i) => {
                        const { label, color } = SOURCE_LABEL[e.source] ?? SOURCE_LABEL.client;
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {e.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white truncate">{e.name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground truncate">{e.email}</div>
                            </div>
                            <span className={`text-[9px] font-mono border rounded px-1.5 py-0.5 shrink-0 ${color}`}>{label}</span>
                          </div>
                        );
                      })}
                      {data.count > 100 && (
                        <div className="text-center py-3 text-xs text-muted-foreground">+ {data.count - 100} autres</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                    <Mail className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Aucun email trouvé</p>
                    <p className="text-[11px] text-center px-4">Ajoutez des emails aux livreurs et clients, ou configurez la clé Supabase pour les joueurs</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Config Gmail */}
            <Card className="glass border-white/5">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  Expéditeur Gmail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-white/10">
                  <span className="text-xs font-mono text-amber-400 flex-1">{notifStatus?.gmailUser ?? "—"}</span>
                  {gmailConfigured ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                {!gmailConfigured && (
                  <p className="text-[11px] text-amber-500/80">⚠️ Configurez GMAIL_APP_PASSWORD dans les secrets pour activer l'envoi.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Zone d'envoi */}
          <div className="lg:col-span-2 space-y-4">
            {/* Résultat précédent */}
            {sendResult && (
              <Card className="glass border-green-500/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-green-400">{sendResult.sent} emails envoyés avec succès</p>
                    {sendResult.failed > 0 && <p className="text-xs text-amber-400">{sendResult.failed} échecs</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSendResult(null)}>✕</Button>
                </CardContent>
              </Card>
            )}

            {/* Template email */}
            <Card className="glass border-white/5">
              <CardHeader className="p-5 pb-3 border-b border-white/5">
                <CardTitle className="font-display text-lg">📧 Annonce — Bridge Safi</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Objet */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Objet de l'email</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Aperçu du contenu */}
                <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/20 to-amber-500/20 border-b border-white/10 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">⚡</div>
                    <div>
                      <div className="font-bold text-white text-sm">Bridge Safi</div>
                      <div className="text-[11px] text-muted-foreground">VOTRE PLATEFORME LOCALE</div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <span className="inline-block bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-primary/30">Bientôt disponible</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">L'application Bridge Safi arrive à Safi ! 🎉</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Nous sommes ravis de vous annoncer que <strong className="text-white">Bridge Safi</strong> — votre plateforme de livraison locale — sera bientôt disponible.</p>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <p className="text-sm text-white/80">🛵 <strong>Livraison de repas</strong>, 🚖 <strong>VTC & taxi</strong>, 🎮 <strong>Safi Runner</strong> — tout dans une seule application pensée pour Safi.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ icon: "🍔", name: "GradoEats", desc: "Livraison" }, { icon: "🚖", name: "Bridge Taxi", desc: "VTC" }, { icon: "🎮", name: "Safi Runner", desc: "Jeu" }].map(s => (
                        <div key={s.name} className="text-center bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="text-2xl mb-1">{s.icon}</div>
                          <div className="text-xs font-bold text-white">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center pt-2">
                      <span className="inline-block bg-gradient-to-r from-primary to-amber-500 text-white font-bold text-sm px-8 py-3 rounded-full">Voir le site →</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="border-white/10 gap-2"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? "Masquer" : "Aperçu HTML"}
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-amber-500 text-white font-bold gap-2 hover:opacity-90"
                    onClick={() => sendMutation.mutate(subject)}
                    disabled={sendMutation.isPending || !data || data.count === 0}
                  >
                    {sendMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Envoyer à {data?.count ?? 0} contacts</>
                    )}
                  </Button>
                </div>

                {(!data || data.count === 0) && !isLoading && (
                  <p className="text-xs text-amber-500/80 text-center">
                    ⚠️ Aucun email trouvé. Ajoutez des emails aux livreurs/clients ou configurez la clé Supabase pour les joueurs.
                  </p>
                )}

                {showPreview && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                    <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">Aperçu de l'email — sujet : {subject}</span>
                    </div>
                    <iframe
                      srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{background:#0a0a0a;margin:0;padding:16px;font-family:Inter,Arial,sans-serif;color:#e5e5e5;}*{box-sizing:border-box;}</style></head><body><div style="max-width:600px;margin:0 auto;background:linear-gradient(145deg,#111,#1a1a1a);border:1px solid rgba(255,90,31,0.2);border-radius:24px;overflow:hidden;"><div style="background:linear-gradient(135deg,#ff5a1f,#ff8c00);padding:40px 32px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Bridge Safi</div><div style="font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:0.15em;text-transform:uppercase;margin-top:4px;">DELIVERY · SAFI · MAROC</div></div><div style="padding:40px 32px;"><h2 style="font-size:22px;font-weight:700;color:#fff;margin-bottom:16px;">${subject}</h2><p style="color:#a0a0a0;font-size:15px;line-height:1.7;">Bonjour,</p><p style="color:#a0a0a0;font-size:15px;line-height:1.7;">Nous avons une annonce importante à vous partager concernant Bridge Safi.</p><div style="text-align:center;margin:32px 0;"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#ff5a1f,#ff8c00);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:999px;">En savoir plus</a></div></div><div style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><p style="font-size:12px;color:#555;">© 2025 Bridge Safi · Safi, Maroc 🇲🇦</p></div></div></body></html>`}
                      className="w-full bg-[#0a0a0a]"
                      style={{ height: "480px", border: "none" }}
                      title="Aperçu email"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
