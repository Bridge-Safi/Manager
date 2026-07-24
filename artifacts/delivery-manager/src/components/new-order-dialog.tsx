import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Phone, MapPin, ShoppingBag, FileText, Hash, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateOrder, getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";

const PLATFORMS = [
  "Bridge Eats",
  "Bridge Tabac",
  "Bridge Pharmacie",
  "Bridge Boulangerie",
  "Bridge Souk",
  "Bridge Supermarché",
  "Bridge Fleurs",
  "Autre",
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `GE-${y}-${n}`;
}

export function NewOrderDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    orderNumber: generateOrderNumber(),
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    items: "",
    totalAmount: "",
    notes: "",
    platform: "",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        toast.success(`Commande #${order.orderNumber} créée — prête à assigner !`, { duration: 6000 });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        onClose();
        setForm({
          orderNumber: generateOrderNumber(),
          customerName: "",
          customerPhone: "",
          deliveryAddress: "",
          items: "",
          totalAmount: "",
          notes: "",
          platform: "",
        });
      },
      onError: () => toast.error("Erreur lors de la création de la commande"),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.totalAmount);
    if (!form.customerName || !form.customerPhone || !form.deliveryAddress || !form.items || isNaN(amount)) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createOrder.mutate({
      data: {
        orderNumber: form.orderNumber,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        deliveryAddress: form.deliveryAddress,
        items: form.items,
        totalAmount: amount,
        notes: form.notes || undefined,
        platform: form.platform || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Nouvelle Commande
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Order number */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans flex items-center gap-1.5">
              <Hash className="w-3 h-3" /> Numéro de commande
            </Label>
            <Input
              value={form.orderNumber}
              onChange={set("orderNumber")}
              className="bg-black/40 border-white/10 font-mono focus:border-primary"
            />
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Plateforme
            </Label>
            <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
              <SelectTrigger className="bg-black/40 border-white/10 focus:border-primary">
                <SelectValue placeholder="Sélectionner une plateforme…" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Customer name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans">
                Nom du client *
              </Label>
              <Input
                placeholder="Mohammed El Amrani"
                value={form.customerName}
                onChange={set("customerName")}
                required
                className="bg-black/40 border-white/10 focus:border-primary"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Téléphone *
              </Label>
              <Input
                placeholder="+212 6 XX XX XX XX"
                value={form.customerPhone}
                onChange={set("customerPhone")}
                required
                className="bg-black/40 border-white/10 font-mono focus:border-primary"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Adresse de livraison *
            </Label>
            <Input
              placeholder="123 Rue Mohammed V, Casablanca"
              value={form.deliveryAddress}
              onChange={set("deliveryAddress")}
              required
              className="bg-black/40 border-white/10 focus:border-primary"
            />
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans flex items-center gap-1.5">
              <ShoppingBag className="w-3 h-3" /> Articles commandés *
            </Label>
            <Textarea
              placeholder="Ex: 2x Burger Royal, 1x Coca 50cl..."
              value={form.items}
              onChange={set("items")}
              required
              className="bg-black/40 border-white/10 focus:border-primary h-20 resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans">
                Montant total (MAD) *
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.totalAmount}
                onChange={set("totalAmount")}
                required
                className="bg-black/40 border-white/10 font-mono focus:border-primary"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-sans flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Notes (optionnel)
              </Label>
              <Input
                placeholder="Instructions spéciales..."
                value={form.notes}
                onChange={set("notes")}
                className="bg-black/40 border-white/10 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={createOrder.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 font-semibold tracking-wide glow-pulse"
            >
              {createOrder.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Créer la commande
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createOrder.isPending}
              className="border-white/10 bg-white/5 hover:bg-white/10"
            >
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
