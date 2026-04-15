import { Link, useLocation } from "wouter";
import { LayoutDashboard, ListOrdered, Users, BarChart3, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/surveillance", label: "Surveillance", icon: Eye },
  { href: "/orders", label: "Commandes", icon: ListOrdered },
  { href: "/drivers", label: "Livreurs", icon: Users },
  { href: "/analytics", label: "Analyses", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-white/5 bg-gradient-to-b from-sidebar to-background flex-col hidden md:flex shrink-0 z-20 shadow-2xl relative">
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary/0 via-primary/20 to-primary/0"></div>
        
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_12px_rgba(255,90,31,0.5)]">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF5A1F" />
                  <stop offset="50%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#FF5A1F" />
                </linearGradient>
              </defs>
              <path d="M50 5 L88.97 27.5 L88.97 72.5 L50 95 L11.03 72.5 L11.03 27.5 Z" fill="url(#logo-grad)" fillOpacity="0.1" stroke="url(#logo-grad)" strokeWidth="4" strokeLinejoin="round"/>
              <path d="M60 30 L40 55 L55 55 L40 80 L65 45 L45 45 L60 30 Z" fill="url(#logo-grad)"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center flex-1">
            <h1 className="font-display font-bold text-xl leading-none tracking-tight">GradoEats</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-sans mt-1">Manager</p>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 relative group overflow-hidden",
                    isActive
                      ? "text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-amber-500 opacity-90 z-0"></div>
                      <div className="absolute inset-0 shadow-[0_0_20px_rgba(255,90,31,0.4)] z-0"></div>
                    </>
                  )}
                  <item.icon className={cn("w-5 h-5 relative z-10 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "")} />
                  <span className="relative z-10 text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary shadow-[0_0_8px_rgba(255,90,31,0.8)]"></span>
            </div>
            <span className="text-xs font-display font-bold tracking-widest text-primary animate-pulse">LIVE</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
        <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 md:hidden z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 relative">
               <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M50 5 L88.97 27.5 L88.97 72.5 L50 95 L11.03 72.5 L11.03 27.5 Z" fill="#FF5A1F" fillOpacity="0.2" stroke="#FF5A1F" strokeWidth="4"/>
                <path d="M60 30 L40 55 L55 55 L40 80 L65 45 L45 45 L60 30 Z" fill="#FF5A1F"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg">GradoEats</span>
          </div>
          <NotificationBell />
        </header>

        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
