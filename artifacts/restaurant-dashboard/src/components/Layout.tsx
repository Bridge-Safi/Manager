import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, History, LogOut, Bell, Settings } from "lucide-react";
import { useAlarm } from "@/contexts/AlarmContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGS, type Lang } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LayoutProps {
  children: React.ReactNode;
}

function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code as Lang)}
          className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
            lang === l.code
              ? "bg-[#FF6B35] text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
          title={l.code === "fr" ? "Français" : l.code === "ar" ? "العربية" : "Tamazight"}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { t, dir } = useLanguage();
  const { pendingOrders, testAlarm } = useAlarm();
  const [time, setTime] = useState(new Date());
  const { user, logout } = useAuth();

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const timeStr = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const navItems = [
    { href: "/",         label: t.navDashboard, icon: LayoutGrid, testid: "dashboard" },
    { href: "/orders",   label: t.navHistory,   icon: History,    testid: "orders"    },
    { href: "/settings", label: t.navSettings,  icon: Settings,   testid: "settings"  },
  ];

  const initials = (user?.name?.[0] ?? "?").toUpperCase();

  return (
    <div dir={dir} className="flex h-[100dvh] w-full bg-[#F7F8FA] overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-gray-900 border-r border-white/5">

        {/* Brand */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
            <BridgeIcon />
          </div>
          <span className="font-bold text-white text-base tracking-tight">Bridge Eats</span>
        </div>

        {/* Clock */}
        <div className="px-5 pb-5 border-b border-white/5">
          <p className="text-white font-bold text-2xl tabular-nums">{timeStr}</p>
          <p className="text-gray-500 text-xs mt-0.5 capitalize">
            {time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.testid}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    isActive ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.href === "/" && pendingOrders.length > 0 && (
                    <span className="ml-auto bg-[#FF6B35] text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                      {pendingOrders.length}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Test alarm */}
        <div className="px-3 pb-2">
          <button
            onClick={testAlarm}
            data-testid="btn-test-alarm"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all text-sm"
          >
            <Bell size={15} />
            {t.testAlarm}
          </button>
        </div>

        {/* Lang switcher desktop */}
        <div className="px-4 pb-3">
          <LangSwitcher />
        </div>

        {/* User */}
        <div className="px-3 pb-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-[#FF6B35]/20 flex items-center justify-center text-xs font-bold text-[#FF6B35] flex-shrink-0 overflow-hidden">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs font-semibold truncate">
                {user?.name ?? "Restaurant"}
              </p>
              <p className="text-gray-600 text-xs truncate">
                {user?.phone ?? ""}
              </p>
            </div>
            <button
              onClick={() => logout()}
              data-testid="btn-sign-out"
              title="Se déconnecter"
              className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded flex-shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-6 h-14 flex items-center justify-between flex-shrink-0 shadow-sm">
          {/* Mobile: brand */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-[#FF6B35] flex items-center justify-center">
              <BridgeIcon size={16} />
            </div>
            <span className="font-bold text-gray-900 text-sm">Bridge Eats</span>
          </div>
          {/* Desktop: live indicator */}
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.liveLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            {pendingOrders.length > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping flex-shrink-0" />
                <span className="text-xs font-bold text-orange-600 whitespace-nowrap">
                  {t.pendingCountLabel(pendingOrders.length)}
                </span>
              </div>
            )}

            {/* Lang switcher mobile */}
            <div className="md:hidden">
              <LangSwitcher />
            </div>

            {/* Mobile: sign out */}
            <button
              onClick={() => logout()}
              data-testid="btn-sign-out-mobile"
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-white/10 flex">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                data-testid={`nav-mobile-${item.testid}`}
                className={`flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${
                  isActive ? "text-white" : "text-gray-500"
                }`}
              >
                <div className="relative">
                  <Icon size={22} />
                  {item.href === "/" && pendingOrders.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B35] text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {pendingOrders.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold">{item.label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#FF6B35]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function BridgeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M3 12 C3 7 15 7 15 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <line x1="3" y1="12" x2="3" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="15" y1="12" x2="15" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="2" y1="15" x2="16" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="7.5" y1="3.5" x2="7.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="9" y1="3.5" x2="9" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="10.5" y1="3.5" x2="10.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="9" y1="8" x2="9" y2="11" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
