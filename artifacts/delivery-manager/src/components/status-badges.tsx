import { Badge } from "@/components/ui/badge";
import { Order, OrderStatus } from "@workspace/api-client-react";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "pending":
      return <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-500 hover:from-amber-500/30 hover:to-yellow-500/30 border-transparent shadow-[0_0_10px_rgba(245,158,11,0.1)] font-mono tracking-wide px-3 rounded-full">En attente</Badge>;
    case "assigned":
      return <Badge className="bg-gradient-to-r from-blue-600/20 to-blue-400/20 text-blue-400 hover:from-blue-600/30 hover:to-blue-400/30 border-transparent shadow-[0_0_10px_rgba(59,130,246,0.1)] font-mono tracking-wide px-3 rounded-full">Assignée</Badge>;
    case "in_delivery":
      return (
        <Badge className="bg-gradient-to-r from-primary/20 to-amber-500/20 text-primary hover:from-primary/30 hover:to-amber-500/30 border-transparent shadow-[0_0_15px_rgba(255,90,31,0.2)] font-mono tracking-wide px-3 rounded-full relative overflow-hidden group">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></span>
          <span className="relative flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            En livraison
          </span>
        </Badge>
      );
    case "delivered":
      return <Badge className="bg-gradient-to-r from-emerald-600/20 to-green-400/20 text-green-400 hover:from-emerald-600/30 hover:to-green-400/30 border-transparent shadow-[0_0_10px_rgba(16,185,129,0.1)] font-mono tracking-wide px-3 rounded-full">Livrée</Badge>;
    case "cancelled":
      return <Badge className="bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800/80 border-transparent font-mono tracking-wide px-3 rounded-full">Annulée</Badge>;
    default:
      return <Badge variant="outline" className="rounded-full px-3 font-mono">{status}</Badge>;
  }
}

export function DriverStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "available":
      return <Badge className="bg-gradient-to-r from-emerald-600/20 to-green-400/20 text-green-400 hover:from-emerald-600/30 hover:to-green-400/30 border-transparent shadow-[0_0_10px_rgba(16,185,129,0.1)] font-mono tracking-wide px-3 rounded-full">Disponible</Badge>;
    case "busy":
      return (
        <Badge className="bg-gradient-to-r from-primary/20 to-amber-500/20 text-primary hover:from-primary/30 hover:to-amber-500/30 border-transparent shadow-[0_0_15px_rgba(255,90,31,0.2)] font-mono tracking-wide px-3 rounded-full">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Occupé
          </span>
        </Badge>
      );
    case "offline":
      return <Badge className="bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800/80 border-transparent font-mono tracking-wide px-3 rounded-full">Hors ligne</Badge>;
    default:
      return <Badge variant="outline" className="rounded-full px-3 font-mono">{status}</Badge>;
  }
}
