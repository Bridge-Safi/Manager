import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n();

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-sand-100 rounded-full p-1 border border-sand-300">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code as Lang)}
            className={cn(
              "w-7 h-7 rounded-full text-[11px] font-bold transition-all",
              lang === l.code
                ? "bg-terracotta text-white shadow-sm"
                : "text-brown-mid hover:bg-sand-200"
            )}
            title={l.label}
          >
            {l.native}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code as Lang)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
            lang === l.code
              ? "bg-terracotta text-white border-terracotta shadow-sm"
              : "bg-white text-brown-mid border-sand-300 hover:border-terracotta hover:text-terracotta"
          )}
          title={l.label}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
