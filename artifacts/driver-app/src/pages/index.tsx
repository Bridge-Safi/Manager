import { Link } from "wouter";
import { UtensilsCrossed, Car, Bike, ChevronRight } from "lucide-react";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";

const TC = "#E85C30";
const GOLD = "#D4880C";
const GREEN = "#2A7A48";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";
const BORDER = "rgba(255,255,255,0.15)";

export default function RoleSelection() {
  const { t, lang, setLang } = useI18n();
  const langLabels: Record<string, string> = { fr: "FR", ar: "ع", en: "EN", tzm: "ⵣ" };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden" style={{ background: "#1A0A06" }}>

      {/* Gradient header with Moroccan star pattern */}
      <div
        className="relative w-full pt-14 pb-24 flex flex-col items-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #C14B2A 0%, #D4880C 100%)", borderRadius: "0 0 32px 32px" }}
      >
        {/* White star pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />

        {/* Language Switcher */}
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1 rounded-full p-1" style={{ background: "rgba(255,255,255,0.20)" }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code as Lang)}
                className="w-8 h-8 rounded-full text-[11px] font-bold transition-all"
                style={lang === l.code ? { background: "white", color: TC } : { color: "rgba(255,255,255,0.75)" }}
              >
                {langLabels[l.code]}
              </button>
            ))}
          </div>
        </div>

        {/* Logo & Title */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <img src="/bridge-logo.png" alt="Bridge" className="w-32 h-32 object-contain drop-shadow-2xl" />
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
              {t("app_name")}
            </h1>
            <p className="text-white/70 text-sm mt-1 font-medium tracking-wide">{t("app_subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div className="flex-1 relative z-10 flex flex-col justify-center px-5 py-8 max-w-md mx-auto w-full gap-4 -mt-4">

        {/* Livreur Card */}
        <Link href="/livreur" className="block group">
          <div
            className="relative overflow-hidden rounded-2xl transition-all duration-200 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: `1px solid ${BORDER}` }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ background: TC }} />
            <div className="relative p-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,92,48,0.15)" }}>
                <UtensilsCrossed className="w-7 h-7" style={{ color: TC }} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-black" style={{ color: BROWN }}>{t("role_livreur")}</h2>
                <p className="text-sm mt-0.5" style={{ color: BROWN_MID }}>{t("role_livreur_desc")}</p>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: TC }} />
            </div>
          </div>
        </Link>

        {/* Chauffeur Card */}
        <Link href="/chauffeur" className="block group">
          <div
            className="relative overflow-hidden rounded-2xl transition-all duration-200 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: `1px solid ${BORDER}` }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ background: GOLD }} />
            <div className="relative p-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,136,12,0.15)" }}>
                <Car className="w-7 h-7" style={{ color: GOLD }} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-black" style={{ color: BROWN }}>{t("role_chauffeur")}</h2>
                <p className="text-sm mt-0.5" style={{ color: BROWN_MID }}>{t("role_chauffeur_desc")}</p>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: GOLD }} />
            </div>
          </div>
        </Link>

        {/* Moto Chauffeur Card */}
        <Link href="/moto/login" className="block group">
          <div
            className="relative overflow-hidden rounded-2xl transition-all duration-200 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: `1px solid ${BORDER}` }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ background: GREEN }} />
            <div className="relative p-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(42,122,72,0.15)" }}>
                <Bike className="w-7 h-7" style={{ color: GREEN }} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-black" style={{ color: BROWN }}>Moto Chauffeur</h2>
                <p className="text-sm mt-0.5" style={{ color: BROWN_MID }}>Courses moto — Bridge Scooter</p>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: GREEN }} />
            </div>
          </div>
        </Link>

        {/* Zellige diamond decorative band */}
        <div className="mt-2 flex justify-center gap-3">
          {[TC, GOLD, GREEN, GOLD, TC].map((color, i) => (
            <div key={i} className="w-3 h-3 rotate-45 opacity-30" style={{ background: color }} />
          ))}
        </div>

      </div>
    </div>
  );
}
