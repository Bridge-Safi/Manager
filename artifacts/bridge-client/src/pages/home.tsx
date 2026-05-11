import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, UtensilsCrossed, Car, Cigarette, Flower2, Clock, ShieldCheck, MapPin, ChefHat, Activity, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListRestaurants, useGetDashboardSummary } from "@workspace/api-client-react";

export default function Home() {
  const { data: restaurants = [] } = useListRestaurants();
  const { data: dashboard } = useGetDashboardSummary();
  
  const activeRestaurants = restaurants.filter(r => r.isActive).slice(0, 3);

  const services = [
    { id: "nourriture", title: "Nourriture", icon: <UtensilsCrossed size={32} />, desc: "Vos plats préférés, livrés chauds." },
    { id: "taxi", title: "Taxi", icon: <Car size={32} />, desc: "Déplacements rapides en ville." },
    { id: "confort", title: "Confort VTC", icon: <Car size={32} className="text-primary" />, desc: "Voyagez avec classe et élégance." },
    { id: "tabac", title: "Tabac", icon: <Cigarette size={32} />, desc: "Livraison rapide 24/7." },
    { id: "fleur", title: "Fleurs", icon: <Flower2 size={32} />, desc: "Pour les moments spéciaux." },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image / Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-background/90 z-10"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] z-0"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/40 rounded-full blur-[128px] z-0"></div>
        </div>

        <div className="container relative z-20 flex flex-col items-center text-center px-4 pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold uppercase tracking-wider mb-6 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Safi's Premium Service
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white max-w-4xl mb-6"
          >
            Le cœur battant de <span className="text-primary">Safi</span>.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
          >
            Vite fait, bien fait. De vos repas préférés aux courses en VTC confort. 
            Commandez tout ce dont vous avez besoin, directement depuis votre téléphone.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Button size="lg" className="rounded-full h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20" asChild>
              <Link href="/commander">Commander Maintenant <ArrowRight className="ml-2" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg font-bold bg-background/50 border-border hover:bg-white/5" asChild>
              <a href="https://wa.me/212600000000" target="_blank" rel="noopener noreferrer">
                Commander sur WhatsApp
              </a>
            </Button>
          </motion.div>
          
          {dashboard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Activity className="text-primary h-4 w-4" />
                <span><strong className="text-white">{dashboard.activeDrivers}</strong> chauffeurs actifs</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border"></div>
              <div className="flex items-center gap-2">
                <Package className="text-primary h-4 w-4" />
                <span><strong className="text-white">{dashboard.todayOrders}</strong> commandes aujourd'hui</span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-muted/10 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Nos Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Une application, une infinité de possibilités. Bridge Safi vous connecte à ce que vous aimez.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card border border-card-border p-6 rounded-2xl flex flex-col items-center text-center hover:border-primary/50 transition-colors group cursor-pointer hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  {service.icon}
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">{service.title}</h3>
                <p className="text-sm text-muted-foreground hidden sm:block">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Restaurants */}
      {activeRestaurants.length > 0 && (
        <section className="py-24">
          <div className="container">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Nos Partenaires</h2>
                <p className="text-muted-foreground max-w-xl">Commandez dans les meilleurs établissements de la ville.</p>
              </div>
              <Button variant="outline" asChild className="hidden md:flex rounded-full">
                <Link href="/restaurants">Voir tout <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {activeRestaurants.map((restaurant, i) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-card border border-card-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors group flex flex-col"
                >
                  <div className="h-32 bg-muted relative flex items-center justify-center overflow-hidden">
                    <ChefHat className="h-12 w-12 text-muted-foreground/30" />
                    <div className="absolute top-4 right-4">
                      {restaurant.status === 'open' ? (
                        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/30">Ouvert</Badge>
                      ) : restaurant.status === 'busy' ? (
                        <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/30">Occupé</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Fermé</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{restaurant.name}</h3>
                    {restaurant.cuisine && (
                      <p className="text-sm text-primary mb-4 font-medium">{restaurant.cuisine}</p>
                    )}
                    
                    <div className="mt-auto space-y-2 mb-6">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>~{restaurant.avgPrepTime} min</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline"
                      className="w-full rounded-xl" 
                      disabled={restaurant.status === 'closed'}
                      asChild={restaurant.status !== 'closed'}
                    >
                      {restaurant.status === 'closed' ? (
                        <span>Fermé actuellement</span>
                      ) : (
                        <Link href={`/commander?restaurant=${encodeURIComponent(restaurant.name)}`}>
                          Commander
                        </Link>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-8 text-center md:hidden">
              <Button variant="outline" asChild className="rounded-full w-full">
                <Link href="/restaurants">Voir tous les restaurants</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24 bg-muted/5 border-t border-border/40">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Confiance et vitesse. <br />
                <span className="text-muted-foreground">La promesse Bridge.</span>
              </h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="text-primary" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white">Livraison Éclair</h4>
                    <p className="text-muted-foreground">Nos livreurs connaissent Safi comme leur poche. Votre commande arrive toujours à temps.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-primary" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white">Service Premium</h4>
                    <p className="text-muted-foreground">Des chauffeurs courtois, des véhicules propres, un service client dédié.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="text-primary" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white">100% Local</h4>
                    <p className="text-muted-foreground">Une entreprise née à Safi, pour Safi. Nous soutenons l'économie locale.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-[3rem] overflow-hidden bg-card border border-border flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
                <div className="w-64 h-64 rounded-full border border-primary/20 flex items-center justify-center absolute">
                  <div className="w-48 h-48 rounded-full border border-primary/40 flex items-center justify-center absolute">
                    <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
                      <img src="/bridge_logo.png" alt="Bridge Medallion" className="w-24 h-24 object-contain brightness-0 invert" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="container relative z-10 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black mb-6"
          >
            Prêt à commander ?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl opacity-90 max-w-2xl mx-auto mb-10"
          >
            Rejoignez des milliers de Safiots qui font confiance à Bridge au quotidien.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button size="lg" className="rounded-full h-16 px-10 text-xl font-bold bg-background text-foreground hover:bg-background/90" asChild>
              <Link href="/commander">Commencer Maintenant</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
