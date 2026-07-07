import { Link } from "wouter";
import { Bell, BarChart3, Layers, ArrowRight, Check } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col overflow-auto">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 12 C3 7 15 7 15 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                <line x1="3" y1="12" x2="3" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="15" y1="12" x2="15" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="2" y1="15" x2="16" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="7.5" y1="3.5" x2="7.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="9" y1="3.5" x2="9" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="10.5" y1="3.5" x2="10.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="9" y1="8" x2="9" y2="11" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Bridge Eats</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">
                Se connecter
              </button>
            </Link>
            <Link href="/sign-up">
              <button className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                Commencer gratuitement
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 max-w-6xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 border border-orange-200 bg-orange-50 text-orange-700 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          Commandes en temps réel
        </div>

        <h1 className="text-6xl font-black text-gray-900 leading-[1.05] max-w-3xl mb-6 tracking-tight">
          Gérez toutes vos<br />
          <span className="text-[#FF6B35]">commandes</span> en un seul endroit
        </h1>

        <p className="text-xl text-gray-500 max-w-xl mb-10 leading-relaxed font-light">
          Recevez et gérez toutes vos commandes Bridge depuis un seul tableau de bord.
          Alarme sonore, kanban temps réel, statistiques du jour.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <Link href="/sign-up">
            <button
              data-testid="btn-sign-up-hero"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#FF6B35] text-white font-bold text-base hover:bg-[#E04E1A] transition-all shadow-lg shadow-orange-200/60 hover:shadow-orange-300/60 hover:-translate-y-px"
            >
              Créer mon compte <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/sign-in">
            <button
              data-testid="btn-sign-in-hero"
              className="px-7 py-3.5 rounded-xl text-gray-700 font-semibold text-base border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              Se connecter
            </button>
          </Link>
        </div>
        <p className="text-xs text-gray-400">Aucune carte bancaire requise · Accès immédiat</p>
      </section>

      {/* ── Features ── */}
      <section className="bg-gray-50 border-t border-gray-100 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-14">
            Tout ce dont votre restaurant a besoin
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Bell,
                color: "#FF6B35",
                bg: "#FFF4EF",
                title: "Alarme sonore persistante",
                desc: "Son puissant dès qu'une commande arrive. L'alarme continue pendant 7 minutes si vous n'avez pas encore répondu — impossible de rater une commande.",
                points: ["Son haute fréquence (880Hz)", "Notification push même écran verrouillé", "Overlay plein écran"],
              },
              {
                icon: Layers,
                color: "#3B82F6",
                bg: "#EFF6FF",
                title: "Kanban temps réel",
                desc: "Visualisez vos commandes en trois colonnes claires : Nouvelles, En cuisine, Prêtes à partir. Tout se met à jour automatiquement toutes les 3 secondes.",
                points: ["Mise à jour automatique", "Accepter / Refuser en 1 clic", "Temps de préparation configurable"],
              },
              {
                icon: BarChart3,
                color: "#10B981",
                bg: "#ECFDF5",
                title: "Statistiques du jour",
                desc: "Chiffre d'affaires, nombre de commandes, délai moyen de préparation. Toutes les métriques importantes au premier coup d'œil.",
                points: ["Chiffre d'affaires en temps réel", "Délai moyen de préparation", "Historique complet des commandes"],
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-shadow">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: f.bg }}
                >
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3 leading-snug">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{f.desc}</p>
                <ul className="space-y-2">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-emerald-500 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Bottom ── */}
      <section className="bg-gray-900 py-20 px-6 text-center">
        <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
          Prêt à simplifier votre service ?
        </h2>
        <p className="text-gray-400 mb-8 text-lg font-light">
          Créez votre compte en moins de 2 minutes.
        </p>
        <Link href="/sign-up">
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#FF6B35] text-white font-bold text-base hover:bg-[#E04E1A] transition-all shadow-lg shadow-orange-900/30">
            Commencer maintenant <ArrowRight size={16} />
          </button>
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 border-t border-white/5 py-6 text-center">
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} Bridge Eats · Tous droits réservés
        </p>
      </footer>
    </div>
  );
}
