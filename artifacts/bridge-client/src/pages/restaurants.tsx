import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Search, ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useListRestaurants } from "@workspace/api-client-react";

export default function Restaurants() {
  const { data: restaurants = [], isLoading, isError } = useListRestaurants();
  const [search, setSearch] = useState("");

  const filteredRestaurants = restaurants.filter(r => 
    r.isActive && (r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.cuisine && r.cuisine.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="container py-12 px-4 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Restaurants Partenaires</h1>
          <p className="text-muted-foreground">Découvrez les meilleurs plats de Safi, livrés chez vous.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Rechercher un restaurant, cuisine..." 
            className="pl-10 bg-card border-card-border rounded-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl h-48 animate-pulse"></div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <p className="text-muted-foreground">Impossible de charger les restaurants pour le moment.</p>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl flex flex-col items-center">
          <ChefHat className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">Aucun restaurant trouvé</h3>
          <p className="text-muted-foreground">Essayez une autre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant, i) => (
            <motion.div
              key={restaurant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
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
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="truncate">{restaurant.address}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>~{restaurant.avgPrepTime} min de préparation</span>
                  </div>
                </div>

                <Button 
                  className="w-full rounded-xl" 
                  disabled={restaurant.status === 'closed'}
                  asChild={restaurant.status !== 'closed'}
                >
                  {restaurant.status === 'closed' ? (
                    <span>Fermé actuellement</span>
                  ) : (
                    <Link href={`/commander?restaurant=${encodeURIComponent(restaurant.name)}`}>
                      Commander ici
                    </Link>
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
