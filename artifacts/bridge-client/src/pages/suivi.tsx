import { useState } from "react";
import { Search, Package, MapPin, Phone, Car, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useListOrders } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, { label: string, color: string, icon: any }> = {
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Clock },
  assigned: { label: "Assignée", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Package },
  in_delivery: { label: "En route", color: "bg-primary/20 text-primary border-primary/30", icon: Car },
  delivered: { label: "Livrée", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "bg-destructive/20 text-destructive border-destructive/30", icon: AlertCircle },
};

export default function Suivi() {
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  
  const { data: orders = [], isLoading } = useListOrders();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length > 5) {
      setSearchedPhone(phone.trim());
    }
  };

  const filteredOrders = searchedPhone 
    ? orders.filter(o => o.customerPhone.includes(searchedPhone)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <div className="container max-w-4xl py-16 px-4 mx-auto">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
          <Package size={32} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Suivi de Commande</h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          Entrez votre numéro de téléphone pour voir l'état de vos commandes récentes.
        </p>
      </div>

      <form onSubmit={handleSearch} className="max-w-md mx-auto mb-16">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input 
              type="tel" 
              placeholder="Ex: 06 12 34 56 78" 
              className="pl-12 h-14 bg-card rounded-full text-lg border-primary/30 focus-visible:ring-primary"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-14 px-8 rounded-full shadow-lg shadow-primary/20">
            Rechercher
          </Button>
        </div>
      </form>

      {searchedPhone && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">Résultats pour "{searchedPhone}"</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-card border border-border rounded-2xl h-40 animate-pulse"></div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white mb-2">Aucune commande trouvée</h3>
              <p className="text-muted-foreground">Nous n'avons trouvé aucune commande récente pour ce numéro.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map(order => {
                const StatusIcon = statusMap[order.status]?.icon || Package;
                return (
                  <div key={order.id} className="bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-primary/30 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/50">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono font-bold text-lg text-white">{order.orderNumber}</span>
                          <Badge variant="outline" className="capitalize">{(order as any).serviceType ?? ""}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit'
                          })}
                        </p>
                      </div>
                      
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusMap[order.status]?.color || 'bg-muted text-muted-foreground border-border'}`}>
                        <StatusIcon size={18} />
                        <span className="font-bold">{statusMap[order.status]?.label || order.status}</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Détails de la commande</h4>
                        <p className="text-white whitespace-pre-wrap">{order.items}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                            <MapPin size={16} /> Destination
                          </h4>
                          <p className="text-white">{order.deliveryAddress}</p>
                        </div>
                        
                        {(order.driverName || order.status === 'in_delivery' || order.status === 'assigned') && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                              <Car size={16} /> Chauffeur/Livreur
                            </h4>
                            <p className="text-white">{order.driverName || "Assignation en cours..."}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
