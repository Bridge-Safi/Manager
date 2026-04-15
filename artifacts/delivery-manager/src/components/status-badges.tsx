import { Badge } from "@/components/ui/badge";
import { Order, OrderStatus } from "@workspace/api-client-react";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20 font-mono">En attente</Badge>;
    case "assigned":
      return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 font-mono">Assignée</Badge>;
    case "in_delivery":
      return <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20 font-mono">En livraison</Badge>;
    case "delivered":
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 font-mono">Livrée</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="font-mono bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Annulée</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function DriverStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "available":
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 font-mono">Disponible</Badge>;
    case "busy":
      return <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20 font-mono">Occupé</Badge>;
    case "offline":
      return <Badge className="bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border-gray-500/20 font-mono">Hors ligne</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
