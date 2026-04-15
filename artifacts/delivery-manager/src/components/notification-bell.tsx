import { useState } from "react";
import { Bell, Key, Lock, CheckCircle2, Send, Copy, Phone, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useListResetRequests,
  useGetResetRequestsPendingCount,
  useMarkResetRequestSent,
  useMarkResetRequestComplete,
  getListResetRequestsQueryKey,
  getGetResetRequestsPendingCountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useGetResetRequestsPendingCount({
    query: { refetchInterval: 10000 },
  });

  const { data: requests, isLoading } = useListResetRequests(
    {},
    { query: { enabled: open, refetchInterval: open ? 5000 : false } }
  );

  const sendMutation = useMarkResetRequestSent({
    mutation: {
      onSuccess: () => {
        toast.success("Marqué comme envoyé");
        queryClient.invalidateQueries({ queryKey: getListResetRequestsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResetRequestsPendingCountQueryKey() });
      },
    },
  });

  const completeMutation = useMarkResetRequestComplete({
    mutation: {
      onSuccess: () => {
        toast.success("Réinitialisation terminée");
        queryClient.invalidateQueries({ queryKey: getListResetRequestsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResetRequestsPendingCountQueryKey() });
      },
    },
  });

  const pendingCount = countData?.count ?? 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const sent = requests?.filter((r) => r.status === "sent") ?? [];
  const completed = requests?.filter((r) => r.status === "completed") ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
          "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
          open && "bg-primary/10 border-primary/30"
        )}
      >
        <Bell className={cn("w-5 h-5 transition-colors", pendingCount > 0 ? "text-primary animate-pulse" : "text-muted-foreground")} />
        {pendingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-[420px] rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold text-base">Notifications</h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/20">
                    {pendingCount} en attente
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[520px] overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Chargement...</div>
              ) : requests?.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Aucune demande de réinitialisation</p>
                </div>
              ) : (
                <div>
                  {pending.length > 0 && (
                    <div>
                      <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/5 border-b border-red-500/10">
                        En attente d'envoi
                      </div>
                      {pending.map((req) => (
                        <RequestCard
                          key={req.id}
                          req={req}
                          onCopy={copyToClipboard}
                          onSend={() => sendMutation.mutate({ id: req.id })}
                          onComplete={() => completeMutation.mutate({ id: req.id })}
                          isSending={sendMutation.isPending}
                        />
                      ))}
                    </div>
                  )}

                  {sent.length > 0 && (
                    <div>
                      <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/5 border-b border-amber-500/10 border-t border-t-white/5">
                        Envoyé — en attente de confirmation
                      </div>
                      {sent.map((req) => (
                        <RequestCard
                          key={req.id}
                          req={req}
                          onCopy={copyToClipboard}
                          onSend={() => sendMutation.mutate({ id: req.id })}
                          onComplete={() => completeMutation.mutate({ id: req.id })}
                          isSending={completeMutation.isPending}
                        />
                      ))}
                    </div>
                  )}

                  {completed.length > 0 && (
                    <div>
                      <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-white/2 border-b border-white/5 border-t border-t-white/5">
                        Terminés
                      </div>
                      {completed.slice(0, 3).map((req) => (
                        <RequestCard
                          key={req.id}
                          req={req}
                          onCopy={copyToClipboard}
                          onSend={() => {}}
                          onComplete={() => {}}
                          isSending={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RequestCard({
  req,
  onCopy,
  onSend,
  onComplete,
  isSending,
}: {
  req: {
    id: number;
    driverName?: string | null;
    driverPhone?: string | null;
    type: string;
    status: string;
    resetCode: string;
    resetLink?: string | null;
    requestedAt: string;
    sentAt?: string | null;
  };
  onCopy: (text: string) => void;
  onSend: () => void;
  onComplete: () => void;
  isSending: boolean;
}) {
  const isPending = req.status === "pending";
  const isSent = req.status === "sent";
  const isCompleted = req.status === "completed";
  const typeLabel = req.type === "pin" ? "Code PIN" : "Mot de passe";
  const TypeIcon = req.type === "pin" ? Key : Lock;

  return (
    <div className={cn(
      "px-5 py-4 border-b border-white/5 hover:bg-white/3 transition-colors",
      isPending && "bg-red-500/3",
      isSent && "bg-amber-500/3",
      isCompleted && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
            isPending ? "bg-red-500/10 border-red-500/20 text-red-400" :
            isSent ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
            "bg-green-500/10 border-green-500/20 text-green-400"
          )}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-bold text-sm">{req.driverName ?? "Livreur"}</span>
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                isPending ? "bg-red-500/10 border-red-500/20 text-red-400" :
                isSent ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                "bg-green-500/10 border-green-500/20 text-green-400"
              )}>
                {isPending ? "EN ATTENTE" : isSent ? "ENVOYÉ" : "TERMINÉ"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground mb-2">
              Réinitialisation : <span className="text-foreground font-medium">{typeLabel}</span>
            </div>

            {req.driverPhone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Phone className="w-3 h-3" />
                <span className="font-mono">{req.driverPhone}</span>
                <button
                  onClick={() => onCopy(req.driverPhone!)}
                  className="ml-1 text-primary/60 hover:text-primary transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Code block */}
            {!isCompleted && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Code</span>
                  <button
                    onClick={() => onCopy(req.resetCode)}
                    className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copier
                  </button>
                </div>
                <div className="font-mono text-xl font-bold tracking-[0.3em] text-primary">
                  {req.resetCode}
                </div>

                {req.resetLink && (
                  <>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Lien</span>
                      <button
                        onClick={() => onCopy(req.resetLink!)}
                        className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Copier le lien
                      </button>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {req.resetLink}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true, locale: fr })}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex gap-2 mt-3 ml-12">
          {isPending && (
            <button
              onClick={onSend}
              disabled={isSending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Marquer envoyé
            </button>
          )}
          {isSent && (
            <button
              onClick={onComplete}
              disabled={isSending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terminé
            </button>
          )}
        </div>
      )}
    </div>
  );
}
