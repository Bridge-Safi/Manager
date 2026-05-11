import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ShoppingBag, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const links = [
    { href: "/", label: "Accueil" },
    { href: "/restaurants", label: "Restaurants" },
    { href: "/commander", label: "Commander" },
    { href: "/suivi", label: "Suivi de Commande" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30 group-hover:border-primary transition-colors">
                <img src="/bridge_logo.png" alt="Bridge Safi Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Bridge Safi</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">
              <Link href="/commander">Commander Maintenant</Link>
            </Button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background">
            <nav className="flex flex-col p-4 gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-base font-medium p-2 rounded-md ${
                    location === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="w-full rounded-full mt-2 font-bold shadow-lg shadow-primary/20">
                <Link href="/commander" onClick={() => setIsMenuOpen(false)}>
                  Commander Maintenant
                </Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 py-8 md:py-12 mt-auto">
        <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30">
                <img src="/bridge_logo.png" alt="Bridge Safi Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-lg text-white">Bridge Safi</span>
            </Link>
            <p className="text-muted-foreground max-w-sm">
              Votre plateforme premium multi-services à Safi. Nourriture, VTC, confort, tabac, et fleurs livrés rapidement et avec fierté.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Livraison de Nourriture</li>
              <li>Taxi & VTC Confort</li>
              <li>Livraison de Tabac</li>
              <li>Livraison de Fleurs</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>+212 6 00 00 00 00</li>
              <li>contact@safi-bridge.ma</li>
              <li>Safi, Maroc</li>
            </ul>
          </div>
        </div>
        <div className="container mt-8 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Bridge Safi. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
