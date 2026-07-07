import { useState, useRef, useEffect } from "react";
import { LANGS, useT, type Lang } from "../lib/i18n";

interface Props {
  position?: "topRight" | "topLeft" | "bottomRight" | "bottomLeft" | "belowScore";
}

export function LanguageSelector({ position = "bottomRight" }: Props) {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  /* La position détermine aussi le SENS d'ouverture du menu :
     - top* : le menu descend (top: 56)
     - bottom* : le menu MONTE (bottom: 56) pour ne pas dépasser de l'écran */
  const isBelowScore = position === "belowScore";
  const isBottom = !isBelowScore && position.startsWith("bottom");
  const isRight = isBelowScore || position.endsWith("Right");

  const pos: React.CSSProperties = isBelowScore
    ? { position: "absolute", top: 66, right: 14, zIndex: 100 }
    : isBottom
    ? isRight
      ? { position: "absolute", bottom: 14, right: 14, zIndex: 100 }
      : { position: "absolute", bottom: 14, left: 14, zIndex: 100 }
    : isRight
      ? { position: "absolute", top: 14, right: 14, zIndex: 40 }
      : { position: "absolute", top: 14, left: 14, zIndex: 100 };

  return (
    <div ref={ref} style={{ ...pos, pointerEvents: "auto" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("lang.label")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 20,
          padding: "6px 12px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: 0.5,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        <span style={{ textTransform: "uppercase" }}>{current.code}</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            ...(isBottom ? { bottom: 48 } : { top: 48 }),
            ...(isRight ? { right: 0 } : { left: 0 }),
            background: "rgba(10,15,30,0.96)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 14,
            padding: 6,
            minWidth: 160,
            boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            zIndex: 9999,
          }}
        >
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code as Lang);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? "rgba(66,165,245,0.25)" : "transparent",
                  color: active ? "#90caf9" : "#e0e0e0",
                  fontSize: 14,
                  fontWeight: active ? 800 : 600,
                  textAlign: l.dir === "rtl" ? "right" : "left",
                  cursor: "pointer",
                  fontFamily: "'Segoe UI', sans-serif",
                  direction: l.dir,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 18 }}>{l.flag}</span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {active && <span style={{ color: "#4caf50", fontSize: 14 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
