import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UtensilsCrossed, Car, Cigarette, Flower2, CheckCircle2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

import { useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const SERVICE_TYPES = ["nourriture", "taxi", "confort", "tabac", "fleur"] as const;
type ServiceType = typeof SERVICE_TYPES[number];

const formSchema = z.object({
  customerName: z.string().min(2, "Nom trop court"),
  customerPhone: z.string().min(10, "Numéro invalide"),
  deliveryAddress: z.string().min(5, "Adresse trop courte"),
  serviceType: z.enum(SERVICE_TYPES, { required_error: "Veuillez choisir un service" }),
  items: z.string().min(2, "Veuillez décrire votre commande"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const services: { id: ServiceType; title: string; icon: React.ReactNode }[] = [
  { id: "nourriture", title: "Nourriture", icon: <UtensilsCrossed /> },
  { id: "taxi", title: "Taxi", icon: <Car /> },
  { id: "confort", title: "Confort", icon: <Car /> },
  { id: "tabac", title: "Tabac", icon: <Cigarette /> },
  { id: "fleur", title: "Fleurs", icon: <Flower2 /> },
];

export default function Commander() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const initialRestaurant = urlParams.get("restaurant");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      serviceType: initialRestaurant ? "nourriture" : undefined,
      items: initialRestaurant ? `Commande depuis ${initialRestaurant}:\n` : "",
      notes: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    const orderNumber = "BR-" + Date.now();

    createOrder.mutate({
      data: {
        orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: data.deliveryAddress,
        items: data.items,
        serviceType: data.serviceType,
        notes: data.notes,
        totalAmount: 0,
        sourceUrl: window.location.href,
      }
    }, {
      onSuccess: () => {
        setSuccess({ orderNumber });
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la création de votre commande.",
          variant: "destructive",
        });
      }
    });
  };

  if (success) {
    return (
      <div className="container max-w-lg py-24 px-4 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring" }}
          className="w-24 h-24 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-8"
        >
          <CheckCircle2 size={48} />
        </motion.div>

        <h1 className="text-4xl font-bold text-white mb-4">Commande Confirmée !</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Votre commande a été envoyée avec succès. Notre équipe va la traiter immédiatement.
        </p>

        <div className="bg-card border border-border rounded-2xl p-6 w-full mb-8">
          <p className="text-sm text-muted-foreground mb-1">Numéro de commande</p>
          <p className="text-2xl font-mono font-bold text-primary">{success.orderNumber}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Button
            className="w-full rounded-full h-14 text-lg"
            onClick={() => setLocation("/suivi")}
          >
            Suivre ma commande
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full h-14 text-lg"
            onClick={() => {
              setSuccess(null);
              form.reset();
            }}
          >
            Nouvelle commande
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-12 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Passer une commande</h1>
        <p className="text-muted-foreground">Remplissez le formulaire ci-dessous et nous nous occupons du reste.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-border/50 pb-2">1. Choisissez un service</h3>
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {services.map((service) => {
                        const isSelected = field.value === service.id;
                        return (
                          <button
                            type="button"
                            key={service.id}
                            onClick={() => field.onChange(service.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                              isSelected
                                ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(201,168,76,0.15)]"
                                : "bg-card border-card-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                              isSelected ? "bg-primary/20" : "bg-muted"
                            }`}>
                              {service.icon}
                            </div>
                            <span className="font-semibold text-sm">{service.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-border/50 pb-2">2. Vos informations</h3>
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Youssef..." className="bg-card rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 06..." type="tel" className="bg-card rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de livraison / Point de départ</FormLabel>
                    <FormControl>
                      <Input placeholder="Votre adresse exacte à Safi" className="bg-card rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-border/50 pb-2">3. Détails de la commande</h3>
              <FormField
                control={form.control}
                name="items"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Que souhaitez-vous ?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez votre commande (plats, destination VTC, type de fleurs...)"
                        className="bg-card rounded-xl min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions spéciales (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Code d'entrée, sans oignons..." className="bg-card rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-muted-foreground flex-1">
              En commandant, vous acceptez que le prix final soit communiqué par notre opérateur lors de la confirmation.
            </p>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto rounded-full h-14 px-10 text-lg font-bold shadow-xl shadow-primary/20"
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? "Envoi en cours..." : "Confirmer la commande"}
              {!createOrder.isPending && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
