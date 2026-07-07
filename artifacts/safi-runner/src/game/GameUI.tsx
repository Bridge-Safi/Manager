import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useMusic } from "../hooks/useMusic";
import { useDarkMode } from "../hooks/useDarkMode";
import type { GamePhase } from "./useGameState";
import {
  registerBridgePhone,
  markMenuClaimed,
  getMenuEligibility,
  shortfallDh,
  getTopPlayers,
  secondsUntilNextLeaderCycle,
  DIAMONDS_PER_MENU,
  DIAMONDS_PER_DIRHAM,
  REQUIRED_PLAY_DAYS,
  REQUIRED_SECONDS_PER_DAY,
  type MenuEligibility,
  type LeaderEntry,
} from "../lib/playerProfile";
import type { Profile } from "../lib/supabase";
import { useT, formatNum, t as tStatic } from "../lib/i18n";
import { ProfilePage } from "./ProfilePage";
import {
  startChallengeIfNew,
  getChallengeSecondsLeft,
  getChallengeDay,
  getChallengeStartMs,
  formatCountdown,
  isChallengeOver,
} from "../lib/challengeTimer";
import { navigateInApp } from "../lib/inAppNav";
import { getBridgeAuth } from "../lib/bridgeAuth";
import {
  useHappyHour,
  isAdminMode,
  exitAdminMode,
  activateHappyHour,
  stopHappyHour,
} from "../lib/happyHour";

/* ─── Configuration Bridge Eats ─────────────────────────────── */
export const BRIDGE_EATS_URL = "https://safi-bridge.ma";
export { DIAMONDS_PER_MENU };

/* Construit l'URL Bridge Eats avec les paramètres de complément 💎.
   Bridge Eats peut lire ces query params côté serveur pour afficher
   directement la page de paiement (action=topup_diamonds, missing, dh). */
function buildShortfallUrl(missing: number, dh: number): string {
  try {
    const u = new URL(BRIDGE_EATS_URL);
    u.searchParams.set("action", "topup_diamonds");
    u.searchParams.set("missing", String(missing));
    u.searchParams.set("dh", String(dh));
    u.searchParams.set("rate", `1dh_per_${DIAMONDS_PER_DIRHAM}`);
    return u.toString();
  } catch {
    return BRIDGE_EATS_URL;
  }
}

/* ─── Types ──────────────────────────────────────────────────── */
interface GameUIProps {
  phase: GamePhase;
  score: number;
  checkpointNumber: number;
  nextCheckpointAt: number;
  playTime: number;
  profile: Profile | null;
  boostMeter: number;
  boostActive: boolean;
  boostTimeLeft: number;
  difficultyLevel: 1 | 2 | 3;
  shieldActive: boolean;
  magnetActive: boolean;
  magnetTimeLeft: number;
  onStart: () => void;
  onRestart: () => void;
  onReturnToStart?: () => void;
  onChangeLane: (dir: 1 | -1) => void;
  onJump: () => void;
  onBoost: () => void;
  onRefreshProfile?: () => void;
}

/* ─── Bouton NFS Mobile — glass, glow néon, anti-double-tap ─── */
function NFSButton({ icon, onClick, glow, size = 76, accent = "#00f0ff" }: {
  icon: string; onClick: () => void; glow: string; size?: number; accent?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const lastFireRef = useRef(0);

  const handleDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastFireRef.current < 60) return;
    lastFireRef.current = now;
    setPressed(true);
    onClick();
  }, [onClick]);

  const handleUp = useCallback(() => setPressed(false), []);

  return (
    <button
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${accent}aa`,
        background: pressed
          ? `radial-gradient(circle at 50% 50%, ${glow}cc, rgba(10,10,30,0.85) 70%)`
          : `radial-gradient(circle at 50% 50%, rgba(10,10,30,0.6), rgba(10,10,30,0.85) 70%)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: accent, fontSize: size * 0.5, fontWeight: 900,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: pressed
          ? `inset 0 0 24px ${accent}88, 0 0 30px ${accent}aa, 0 0 50px ${glow}66`
          : `inset 0 0 12px ${accent}33, 0 0 18px ${accent}44, 0 4px 14px rgba(0,0,0,0.6)`,
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.08s ease, box-shadow 0.08s ease, background 0.1s",
        userSelect: "none", WebkitUserSelect: "none",
        touchAction: "manipulation",
        textShadow: `0 0 12px ${accent}, 0 0 24px ${glow}`,
        fontFamily: "'Bangers', sans-serif",
      }}
    >
      <span style={{ lineHeight: 1, marginTop: -2 }}>{icon}</span>
    </button>
  );
}

/* ─── WhatsApp Bridge Eats — modifiable ──────────────────────────
   Numéro WhatsApp Business à atteindre depuis le jeu (format international
   sans + ni espaces, conformément à wa.me). À remplacer par le vrai n°. */
export const BRIDGE_EATS_WHATSAPP = "212764794856";
const WA_PREFILL = encodeURIComponent(
  "Salam ! J'arrive depuis le jeu Safi Runner 🦈🎮"
);
export const WHATSAPP_URL = `https://wa.me/${BRIDGE_EATS_WHATSAPP}?text=${WA_PREFILL}`;

/* ─── Cluster de boutons flottants — visibles UNIQUEMENT en jeu ──
   Position : milieu-droit, au-dessus du canvas 3D mais en dessous
   des overlays (instructions, start, game-over, menu unlock).
   Volontairement masqués sur les écrans plein-contenu pour ne PAS
   recouvrir les boutons existants ("Démarrer", "Rejouer", etc.). */

/* ─── Boutons flottants DROITE — 5 boutons en colonne (top-right) ─── */
function FloatingActionsRight({ avatarSrc, onShowProfile, onReturnToStart }: {
  avatarSrc: string;
  onShowProfile: () => void;
  onReturnToStart?: () => void;
}) {
  const { enabled: musicOn, toggle: toggleMusic } = useMusic();
  const [dark, toggleDark] = useDarkMode();

  const baseBtn: React.CSSProperties = {
    width: 48, height: 48, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, cursor: "pointer",
    boxShadow: "0 4px 18px rgba(0,0,0,0.55)",
    transition: "transform 0.15s, box-shadow 0.15s",
    backdropFilter: "blur(10px)",
    flexShrink: 0,
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 108,
        right: "max(10px, env(safe-area-inset-right, 10px))",
        display: "flex", flexDirection: "column", gap: 8,
        zIndex: 30,
        pointerEvents: "auto",
      }}
    >
      {/* 🎵 Son */}
      <button
        onClick={toggleMusic}
        title={musicOn ? "Couper la musique" : "Activer la musique"}
        style={{ ...baseBtn, background: musicOn ? "linear-gradient(135deg,#c2185b,#e91e63)" : "rgba(30,30,50,0.8)", color: "#fff", border: "none" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <span aria-hidden>{musicOn ? "🎵" : "🔇"}</span>
      </button>
      {/* 🌙 Mode nuit */}
      <button
        onClick={toggleDark}
        title={dark ? "Mode jour" : "Mode nuit"}
        style={{ ...baseBtn, background: dark ? "linear-gradient(135deg,#1a237e,#283593)" : "linear-gradient(135deg,#37474f,#546e7a)", color: "#fff", border: "none" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <span aria-hidden>🌙</span>
      </button>
      {/* 💬 WhatsApp */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp Bridge Eats"
        style={{ ...baseBtn, background: "linear-gradient(135deg,#1b5e20,#2e7d32)", color: "#fff", textDecoration: "none" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <span aria-hidden>💬</span>
      </a>
      {/* ← Retour menu */}
      <button
        onClick={onReturnToStart}
        title="Retour au menu"
        style={{ ...baseBtn, background: "linear-gradient(135deg,#004d40,#00695c)", color: "#80cbc4", border: "none" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <span aria-hidden style={{ fontSize: 20, fontWeight: 900 }}>←</span>
      </button>
      {/* 👤 Profil avatar */}
      <button
        onClick={onShowProfile}
        title="Mon profil"
        style={{
          ...baseBtn,
          background: `url(${avatarSrc}) center/cover, #0a1f14`,
          border: "2.5px solid #00e676",
          padding: 0,
          overflow: "hidden",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        {!avatarSrc && <span aria-hidden>👤</span>}
      </button>
    </div>
  );
}

/* ─── Bouton Bridge Eats ─────────────────────────────────────── */
function BridgeEatsButton({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDark = variant === "dark";
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: isDark
          ? "linear-gradient(135deg,#1b5e20,#2e7d32)"
          : "linear-gradient(135deg,rgba(0,0,0,0.6),rgba(20,20,40,0.8))",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#fff",
        borderRadius: 30,
        padding: "10px 20px",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: 0.5,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        transition: "transform 0.1s",
        textDecoration: "none",
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      <span>🛵🚕🌹🚬</span>
    </a>
  );
}

/* ─── Helpers d'affichage ────────────────────────────────────── */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return tStatic("bridge.timeRemaining.done");
  const m = Math.ceil(seconds / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return tStatic("bridge.timeRemaining.hours", {
      h,
      rest: rest > 0 ? String(rest).padStart(2, "0") : "",
    });
  }
  return tStatic("bridge.timeRemaining.minutes", { m });
}

/* ─── Carte progression Bridge complète (3 critères visibles) ─ */
function EngagementCard({ eligibility, compact = false }: {
  eligibility: MenuEligibility; compact?: boolean;
}) {
  const { t } = useT();
  const {
    qualifyingDays, daysSinceFirstPlay, todaySecondsRemaining,
    diamondsCollected, menusAvailable,
  } = eligibility;

  const diamondPct = Math.min(100, ((diamondsCollected % DIAMONDS_PER_MENU) / DIAMONDS_PER_MENU) * 100);
  const dayPct     = Math.min(100, (qualifyingDays / REQUIRED_PLAY_DAYS) * 100);

  /* Si menu déjà disponible : look vert glorieux */
  if (menusAvailable > 0) {
    return (
      <div style={{
        background: "linear-gradient(135deg,rgba(0,80,0,0.85),rgba(0,140,0,0.7))",
        border: "1.5px solid #4caf50",
        borderRadius: compact ? 14 : 18,
        padding: compact ? "10px 14px" : "14px 18px",
        boxShadow: "0 0 24px #4caf5066",
      }}>
        <div style={{ color: "#fff", fontSize: compact ? 12 : 14, fontWeight: 800, marginBottom: 4 }}>
          {t(menusAvailable > 1 ? "bridge.menusReadyPlural" : "bridge.menusReady", { n: menusAvailable })}
        </div>
        <div style={{ color: "#c8e6c9", fontSize: compact ? 10 : 12 }}>
          {t("bridge.claimHint")}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg,rgba(0,30,15,0.88),rgba(0,60,30,0.85))",
      backdropFilter: "blur(10px)",
      border: "1.5px solid rgba(0,230,118,0.45)",
      borderRadius: compact ? 12 : 16,
      padding: compact ? "8px 12px" : "12px 16px",
      minWidth: compact ? 200 : 0,
      boxShadow: "0 4px 20px rgba(0,200,80,0.25), 0 0 0 1px rgba(0,230,118,0.15) inset",
    }}>
      <div style={{ color: "#00e676", fontSize: compact ? 10 : 12, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 }}>
        {t("bridge.programTitle")}
      </div>

      {/* Critère 1 : Diamants */}
      <div style={{ marginBottom: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: compact ? 9 : 11, marginBottom: 3 }}>
          <span style={{ color: "#fff" }}>{t("bridge.diamonds")}</span>
          <span style={{ color: "#ffd54f", fontWeight: 700 }} dir="ltr">
            {formatNum(diamondsCollected)} / {formatNum(DIAMONDS_PER_MENU)}
          </span>
        </div>
        <div style={{ height: compact ? 5 : 6, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${diamondPct}%`,
            background: "linear-gradient(90deg,#00c853,#00e676,#69f0ae)",
            transition: "width 0.5s",
            boxShadow: "0 0 10px rgba(0,230,118,0.6)",
          }} />
        </div>
      </div>

      {/* Critère 2 : Jours consécutifs (3h) */}
      <div style={{ marginBottom: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: compact ? 9 : 11, marginBottom: 3 }}>
          <span style={{ color: "#fff" }}>{t("bridge.activeDays")}</span>
          <span style={{ color: "#69f0ae", fontWeight: 700 }} dir="ltr">{qualifyingDays} / {REQUIRED_PLAY_DAYS}</span>
        </div>
        <div style={{ height: compact ? 5 : 6, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${dayPct}%`,
            background: "linear-gradient(90deg,#1b5e20,#4caf50,#a5d6a7)",
            transition: "width 0.5s",
          }} />
        </div>
      </div>

      {/* Critère 3 : aujourd'hui */}
      <div style={{
        fontSize: compact ? 9 : 11, color: "#a5d6a7",
        background: "rgba(0,0,0,0.35)", borderRadius: 6,
        padding: "4px 8px", textAlign: "center", marginTop: 6,
        border: "1px solid rgba(0,230,118,0.15)",
      }}>
        {t("bridge.todayLabel", { time: formatTimeRemaining(todaySecondsRemaining) })}
        {daysSinceFirstPlay > 0 && (
          <span style={{ color: "#888", marginInlineStart: 6 }}>· {t("bridge.dayBadge", { n: daysSinceFirstPlay })}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Jauge NITRO (orange→rouge, pulse au max, flash en cours) ─── */
function NitroMeter({ meter, active, timeLeft }: { meter: number; active: boolean; timeLeft: number }) {
  const { t } = useT();
  const ready = meter >= 100 && !active;
  return (
    <div style={{
      position: "absolute", bottom: 130, left: 16,
      width: 280, maxWidth: "55vw",
      pointerEvents: "none", zIndex: 30,
      fontFamily: "'Fredoka', sans-serif",
      animation: !active && !ready ? "nitroFloat 1.6s ease-in-out infinite" : "none",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12, fontWeight: 800, letterSpacing: 1.8, marginBottom: 5,
        color: active ? "#fff" : ready ? "#ffeb3b" : "#ffb74d",
        textShadow: active
          ? "0 0 12px #ff1744, 0 0 24px #ff5252"
          : ready ? "0 0 10px #ffeb3b" : "0 0 6px rgba(0,0,0,0.8)",
      }}>
        <span>🔥 NITRO</span>
        <span>{active ? `${timeLeft.toFixed(1)}s` : ready ? t("nitro.ready") : `${Math.floor(meter)}%`}</span>
      </div>
      <div style={{
        height: 14, borderRadius: 10, overflow: "hidden",
        background: "rgba(0,0,0,0.7)",
        border: `2px solid ${active ? "#ff1744" : ready ? "#ffeb3b" : "rgba(255,140,0,0.55)"}`,
        boxShadow: active
          ? "0 0 28px #ff1744, 0 0 50px #ff5252, inset 0 0 12px #ff8a80"
          : ready ? "0 0 22px #ffeb3b, inset 0 0 8px #fff176"
                  : "0 0 14px rgba(255,140,0,0.45), inset 0 0 6px rgba(0,0,0,0.6)",
        animation: active ? "nitroFlash 0.18s linear infinite" : ready ? "nitroPulse 0.7s ease-in-out infinite" : "none",
      }}>
        <div style={{
          height: "100%",
          width: active ? "100%" : `${meter}%`,
          background: active
            ? "linear-gradient(90deg,#fff176,#ff1744,#fff176)"
            : "linear-gradient(90deg,#ff9800,#ffb74d,#ff5722,#ff9800)",
          borderRadius: 8,
          transition: active ? "none" : "width 0.25s ease-out",
          backgroundSize: active ? "200% 100%" : "300% 100%",
          animation: active
            ? "nitroSlide 0.5s linear infinite"
            : !ready ? "nitroFill 1.4s linear infinite" : "none",
        }} />
      </div>
      <style>{`
        @keyframes nitroPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes nitroFlash { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.5)} }
        @keyframes nitroSlide { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes nitroFill { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }
        @keyframes nitroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
      `}</style>
    </div>
  );
}

/* ─── Bouton NITRO — flamme orange/rouge, pulsation quand prêt ─── */
function NitroButton({ ready, active, onBoost }: { ready: boolean; active: boolean; onBoost: () => void }) {
  const [pressed, setPressed] = useState(false);
  const lastFireRef = useRef(0);
  const handleDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (!ready || active) return;
    const now = Date.now();
    if (now - lastFireRef.current < 60) return;
    lastFireRef.current = now;
    setPressed(true);
    onBoost();
  }, [ready, active, onBoost]);
  const handleUp = useCallback(() => setPressed(false), []);
  const accent = active ? "#fff176" : ready ? "#ff1744" : "#666";
  const glow   = active ? "#ff5252" : ready ? "#ff8a80" : "#333";
  return (
    <button
      onPointerDown={handleDown} onPointerUp={handleUp}
      onPointerCancel={handleUp} onPointerLeave={handleUp}
      onContextMenu={(e) => e.preventDefault()}
      disabled={!ready || active}
      style={{
        width: 64, height: 64, borderRadius: "50%",
        border: `2px solid ${accent}`,
        background: pressed
          ? `radial-gradient(circle at 50% 50%, ${glow}cc, rgba(40,0,0,0.85) 70%)`
          : `radial-gradient(circle at 50% 50%, rgba(40,0,0,0.7), rgba(20,0,0,0.9) 70%)`,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        color: accent, fontSize: 30, fontWeight: 900,
        cursor: ready && !active ? "pointer" : "not-allowed",
        opacity: ready || active ? 1 : 0.45,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active
          ? `0 0 32px ${glow}, 0 0 60px ${accent}, inset 0 0 16px ${accent}aa`
          : ready ? `0 0 24px ${glow}, 0 0 12px ${accent}88, inset 0 0 10px ${accent}55`
          : `inset 0 0 8px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.6)`,
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.08s ease, opacity 0.2s",
        userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation",
        textShadow: ready ? `0 0 10px ${accent}, 0 0 20px ${glow}` : "none",
        animation: ready && !active ? "nitroBtnPulse 0.7s ease-in-out infinite" : "none",
      }}
    >
      <span style={{ lineHeight: 1, marginTop: -2 }}>🔥</span>
      <style>{`@keyframes nitroBtnPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
    </button>
  );
}

/* ─── HUD en jeu ─────────────────────────────────────────────── */
function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const cfg = [
    { label: "DÉBUTANT", bg: "linear-gradient(135deg,#1b5e20,#43a047)", glow: "rgba(67,160,71,0.6)" },
    { label: "NORMAL",   bg: "linear-gradient(135deg,#e65100,#ff8f00)", glow: "rgba(255,143,0,0.6)" },
    { label: "HARD",     bg: "linear-gradient(135deg,#b71c1c,#f44336)", glow: "rgba(244,67,54,0.7)" },
  ][level - 1];
  return (
    <div style={{
      background: cfg.bg,
      borderRadius: 10, padding: "3px 9px",
      fontSize: 9, fontWeight: 900, letterSpacing: 1.2,
      color: "#fff", textTransform: "uppercase" as const,
      fontFamily: "'Bangers', sans-serif",
      boxShadow: `0 2px 10px ${cfg.glow}`,
      marginTop: 4,
    }}>
      N{level} {cfg.label}
    </div>
  );
}

function HUD({ score, checkpointNumber, playTime, nextCheckpointAt, eligibility, boostMeter, boostActive, boostTimeLeft, difficultyLevel, shieldActive, magnetActive, magnetTimeLeft }: {
  score: number; checkpointNumber: number; playTime: number;
  nextCheckpointAt: number; eligibility: MenuEligibility;
  boostMeter: number; boostActive: boolean; boostTimeLeft: number;
  difficultyLevel: 1 | 2 | 3;
  shieldActive: boolean; magnetActive: boolean; magnetTimeLeft: number;
}) {
  const { t } = useT();
  const timeToNext = Math.max(0, Math.ceil(nextCheckpointAt - playTime));
  const progress = Math.min(1, (40 - timeToNext) / 40);
  const sessionDiamonds = Math.floor(score / 10);
  /* Total = max(Bridge Eats, Supabase) + session live en cours */
  const bridgeAuth = getBridgeAuth();
  const baseDiamonds = Math.max(bridgeAuth?.diamonds ?? 0, eligibility.diamondsCollected ?? 0);
  const totalDiamonds = baseDiamonds + sessionDiamonds;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none" }}>

      {/* ── Barre HUD compacte ── */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 6, padding: "8px 10px 6px",
      }}>

        {/* 💎 Diamants (gros) */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,20,50,0.88)",
          backdropFilter: "blur(8px)",
          border: "2px solid rgba(100,180,255,0.55)",
          borderRadius: 14, padding: "6px 13px",
          boxShadow: "0 2px 16px rgba(0,80,200,0.45)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 24 }}>💎</span>
          <div>
            <div style={{
              color: "#fff", fontSize: 26, fontWeight: 900, lineHeight: 1,
              fontFamily: "'Bangers', sans-serif", letterSpacing: 1.5,
              textShadow: "0 0 14px #4fc3f7",
            }} dir="ltr">{formatNum(totalDiamonds)}</div>
            {sessionDiamonds > 0 && (
              <div style={{ color: "#80deea", fontSize: 10, fontWeight: 700, lineHeight: 1, fontFamily: "'Fredoka', sans-serif" }} dir="ltr">
                +{formatNum(sessionDiamonds)}
              </div>
            )}
          </div>
        </div>

        {/* Checkpoint barre — prend l'espace restant */}
        <div style={{
          flex: 1,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,140,0,0.3)",
          borderRadius: 10, padding: "5px 10px",
        }}>
          <div style={{ color: "#ffa726", fontSize: 9, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4 }}>
            {t("hud.nextStop", { s: timeToNext })}
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress * 100}%`,
              background: "linear-gradient(90deg,#ff6f00,#ffd54f)",
              borderRadius: 4, transition: "width 0.4s", boxShadow: "0 0 6px #ff8f00",
            }} />
          </div>
        </div>

        {/* Score + niveau */}
        <div style={{
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(100,220,80,0.3)",
          borderRadius: 10, padding: "5px 10px", textAlign: "center",
          flexShrink: 0,
        }}>
          <div style={{ color: "#a5d6a7", fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Fredoka', sans-serif" }}>{t("hud.score")}</div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, lineHeight: 1.1, textShadow: "0 0 10px #66bb6a", fontFamily: "'Bangers', sans-serif", letterSpacing: 1 }}>{score}</div>
          <LevelBadge level={difficultyLevel} />
        </div>
      </div>

      {/* ── Compte à rebours défi 3 jours ── */}
      {(() => {
        const secs = getChallengeSecondsLeft();
        if (secs <= 0) return null;
        const cd = formatCountdown(secs);
        return (
          <div style={{
            display: "flex", justifyContent: "center",
            marginTop: 2, marginBottom: 2,
          }}>
            <div style={{
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,160,0,0.45)",
              borderRadius: 10, padding: "3px 12px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 12 }}>⏳</span>
              <span style={{ color: "#ffd54f", fontSize: 11, fontWeight: 800, fontFamily: "'Bangers', sans-serif", letterSpacing: 1 }}>
                {cd}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Power-ups actifs — sous la barre, centrés */}
      {(shieldActive || magnetActive) && (
        <div style={{
          display: "flex", justifyContent: "center", gap: 6,
          paddingBottom: 4,
          pointerEvents: "none",
        }}>
          {shieldActive && (
            <div style={{
              background: "rgba(2,136,209,0.85)",
              border: "1.5px solid #4fc3f7",
              borderRadius: 10, padding: "3px 10px",
              display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 0 14px rgba(79,195,247,0.6)",
              backdropFilter: "blur(8px)",
            }}>
              <span style={{ fontSize: 14 }}>🛡️</span>
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 800, fontFamily: "'Bangers', sans-serif", letterSpacing: 1 }}>BOUCLIER</span>
            </div>
          )}
          {magnetActive && (
            <div style={{
              background: "rgba(130,119,23,0.85)",
              border: "1.5px solid #ffee58",
              borderRadius: 10, padding: "3px 10px",
              display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 0 14px rgba(255,238,88,0.6)",
              backdropFilter: "blur(8px)",
            }}>
              <span style={{ fontSize: 14 }}>🧲</span>
              <span style={{ color: "#fff9c4", fontSize: 10, fontWeight: 800, fontFamily: "'Bangers', sans-serif", letterSpacing: 1 }}>
                AIMANT {Math.ceil(magnetTimeLeft)}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Voile rouge clignotant pendant le boost */}
      {boostActive && (
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(255,23,68,0.18) 100%)",
          animation: "boostVignette 0.18s linear infinite",
          mixBlendMode: "screen",
        }}>
          <style>{`@keyframes boostVignette{0%,100%{opacity:0.9}50%{opacity:1}}`}</style>
        </div>
      )}
    </div>
  );
}

/* ─── Zone SWIPE invisible plein écran — gestes NFS Mobile ─── */
function SwipeArea({ onChangeLane, onJump }: {
  onChangeLane: (dir: 1 | -1) => void; onJump: () => void;
}) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const firedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    firedRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current || firedRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx > 35 && adx > ady * 1.2) {
      firedRef.current = true;
      onChangeLane(dx > 0 ? 1 : -1);
    } else if (-dy > 35 && ady > adx * 1.2) {
      firedRef.current = true;
      onJump();
    }
  }, [onChangeLane, onJump]);

  const handlePointerUp = useCallback(() => { startRef.current = null; }, []);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute", top: 80, bottom: 130,
        left: 0, right: 0, zIndex: 10,
        touchAction: "none", pointerEvents: "auto",
      }}
    />
  );
}


/* ─── Contrôles NFS Mobile : boutons glass + swipe ─────────── */
function TouchControls({ onChangeLane, onJump, onBoost, boostReady, boostActive }: {
  onChangeLane: (dir: 1 | -1) => void; onJump: () => void; onBoost: () => void;
  boostReady: boolean; boostActive: boolean;
}) {
  return (
    <>
      <SwipeArea onChangeLane={onChangeLane} onJump={onJump} />
      <div dir="ltr" style={{
        position: "absolute", bottom: 22, left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: 32, padding: "0 24px", pointerEvents: "none", zIndex: 20,
      }}>
        <div style={{ pointerEvents: "auto" }}>
          <NFSButton icon="▲" glow="#ffd700" accent="#ffd700" size={88} onClick={onJump} />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <NitroButton ready={boostReady} active={boostActive} onBoost={onBoost} />
        </div>
      </div>
    </>
  );
}

/* ─── Overlay réclamation menu (téléphone Bridge) ─────────────
   Affiche soit :
     - "Pas encore éligible" + critères restants
     - "Réclame ton menu" + champ tél + bouton
   ─────────────────────────────────────────────────────────────── */
function MenuUnlockOverlay({ eligibility, onClose }: {
  eligibility: MenuEligibility; onClose: () => void;
}) {
  const { t } = useT();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "done">("phone");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const canClaim = eligibility.eligible;

  /* Les codes d'erreur retournés par playerProfile sont des clés i18n
     ("claim.phone.invalid", "claim.error.generic", ...). On essaie de
     les traduire ; si ce n'est pas une clé connue, on garde le texte tel quel. */
  const localizeErr = (raw?: string): string => {
    if (!raw) return t("claim.error.generic");
    const translated = t(raw);
    return translated === raw && !raw.includes(".") ? raw : translated;
  };

  const handleClaim = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setErrMsg(t("claim.phone.empty"));
      return;
    }
    setLoading(true); setErrMsg("");
    const reg = await registerBridgePhone(trimmed);
    if (!reg.success) {
      setLoading(false);
      setErrMsg(localizeErr(reg.error));
      return;
    }
    /* Téléphone OK → on consomme un menu */
    const claim = await markMenuClaimed();
    setLoading(false);
    if (!claim.success) {
      setErrMsg(localizeErr(claim.error));
      return;
    }
    setStep("done");
  };

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: canClaim
        ? "radial-gradient(ellipse at center,rgba(0,70,0,0.97) 0%,rgba(0,20,0,0.99) 100%)"
        : "radial-gradient(ellipse at center,rgba(40,20,0,0.97) 0%,rgba(15,5,0,0.99) 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 200, pointerEvents: "auto",
      animation: "fadeIn 0.4s ease",
      overflowY: "auto",
      padding: "20px 0",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        .phone-input::placeholder{color:#aaa}
      `}</style>

      <div style={{ textAlign: "center", padding: "0 28px", maxWidth: 420, width: "100%" }}>
        {canClaim ? (
          <>
            <div style={{ fontSize: 80, marginBottom: 8, animation: "bounce 1.2s infinite" }}>🎉</div>
            <div style={{
              fontSize: 32, fontWeight: 900, color: "#fff",
              textShadow: "0 0 30px #4caf50",
              letterSpacing: 2, marginBottom: 6, lineHeight: 1.1,
              whiteSpace: "pre-line",
            }}>
              {t("claim.unlocked.title")}
            </div>
            <div style={{ color: "#a5d6a7", fontSize: 13, marginBottom: 18 }}>
              {t(eligibility.qualifyingDays > 1 ? "claim.unlocked.body" : "claim.unlocked.daySingular", {
                days: eligibility.qualifyingDays,
                diamonds: formatNum(eligibility.diamondsCollected),
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 70, marginBottom: 8 }}>⏳</div>
            <div style={{
              fontSize: 26, fontWeight: 900, color: "#ffa726",
              textShadow: "0 0 28px #ff6f00",
              letterSpacing: 1.5, marginBottom: 6, lineHeight: 1.15,
            }}>
              {t("claim.notReady.title")}
            </div>
            <div style={{ color: "#ffcc80", fontSize: 13, marginBottom: 18 }}>
              {eligibility.blocker ? t(eligibility.blocker.key, { n: formatNum(eligibility.blocker.n) }) : ""}
            </div>
            <div style={{ marginBottom: 18 }}>
              <EngagementCard eligibility={eligibility} />
            </div>

            {/* Complément payant : 1 DH = 1 000 💎 manquants.
                Visible uniquement quand le blocage vient des 💎. */}
            {eligibility.blocker?.key === "blocker.diamonds" && (() => {
              const miss = eligibility.blocker.n;
              const dh = shortfallDh(miss);
              if (dh <= 0) return null;
              return (
                <div style={{
                  background: "linear-gradient(135deg,rgba(76,175,80,0.18),rgba(56,142,60,0.28))",
                  border: "1.5px solid rgba(102,187,106,0.6)",
                  borderRadius: 16, padding: "14px 16px",
                  marginBottom: 18, textAlign: "start",
                  boxShadow: "0 0 24px rgba(76,175,80,0.25)",
                }}>
                  <div style={{ color: "#a5d6a7", fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
                    {t("shortfall.title")}
                  </div>
                  <div style={{ color: "#e0f2e0", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                    {t("shortfall.body", { miss: formatNum(miss), dh: formatNum(dh) })}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateInApp(buildShortfallUrl(miss, dh), "bridge-eats")}
                    style={{
                      display: "block", textAlign: "center", width: "100%",
                      background: "linear-gradient(135deg,#2e7d32,#66bb6a)",
                      color: "#fff", border: "none", borderRadius: 50,
                      padding: "13px 18px", fontSize: 15, fontWeight: 900,
                      letterSpacing: 1, cursor: "pointer",
                      boxShadow: "0 0 24px rgba(76,175,80,0.55)",
                      marginBottom: 8,
                    }}
                  >
                    {t("shortfall.cta", { dh: formatNum(dh) })}
                  </button>
                  <div style={{ color: "#aaa", fontSize: 10, lineHeight: 1.5 }}>
                    {t("shortfall.help")}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {step === "phone" && canClaim && (
          <>
            <div style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(76,175,80,0.4)",
              borderRadius: 14, padding: "14px 16px", marginBottom: 18, textAlign: "left",
            }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {t("claim.phone.label")}
              </div>
              <div style={{ color: "#aaa", fontSize: 11, lineHeight: 1.6 }}>
                {t("claim.phone.help")}
              </div>
            </div>

            <input
              className="phone-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phone}
              onChange={e => { setPhone(e.target.value); setErrMsg(""); }}
              placeholder={t("claim.phone.placeholder")}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                border: errMsg ? "2px solid #f44336" : "2px solid rgba(76,175,80,0.5)",
                background: "rgba(0,0,0,0.6)", color: "#fff",
                fontSize: 15, marginBottom: 8, boxSizing: "border-box",
                outline: "none", letterSpacing: 1,
              }}
              onKeyDown={e => { if (e.key === "Enter") handleClaim(); }}
            />

            {errMsg && (
              <div style={{ color: "#ef9a9a", fontSize: 12, marginBottom: 10 }}>{errMsg}</div>
            )}

            <button
              onClick={handleClaim}
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#555" : "linear-gradient(135deg,#2e7d32,#66bb6a)",
                color: "#fff", border: "none", borderRadius: 50,
                padding: "16px", fontSize: 17, fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: 1, marginBottom: 12,
                boxShadow: loading ? "none" : "0 0 30px #4caf5077",
              }}
            >
              {loading ? t("claim.button.checking") : t("claim.button.claim")}
            </button>

            <button onClick={onClose} style={{
              background: "transparent", color: "#888",
              border: "none", fontSize: 12, cursor: "pointer",
            }}>
              {t("claim.button.continue")}
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <div style={{
              background: "rgba(0,0,0,0.45)", border: "1px solid #4caf50",
              borderRadius: 14, padding: "16px", marginBottom: 22,
            }}>
              <div style={{ color: "#4caf50", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {t("claim.done.title")}
              </div>
              <div style={{ color: "#ccc", fontSize: 12 }}>
                {t("claim.done.body")}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateInApp(BRIDGE_EATS_URL, "bridge-eats")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#2e7d32,#66bb6a)",
                color: "#fff", borderRadius: 50,
                padding: "18px 44px", fontSize: 18, fontWeight: 900,
                textDecoration: "none", letterSpacing: 2,
                boxShadow: "0 0 40px #4caf5088",
                marginBottom: 14,
              }}
            >
              {t("claim.done.cta")}
            </button>
            <br />
            <button onClick={onClose} style={{
              background: "transparent", color: "#888",
              border: "none", fontSize: 12, cursor: "pointer",
            }}>
              {t("claim.button.continue")}
            </button>
          </>
        )}

        {!canClaim && (
          <button onClick={onClose} style={{
            marginTop: 6,
            background: "linear-gradient(135deg,#1565c0,#42a5f5)",
            color: "#fff", border: "none", borderRadius: 50,
            padding: "14px 36px", fontSize: 15, fontWeight: 800,
            cursor: "pointer", letterSpacing: 1,
            boxShadow: "0 0 24px #1565c088",
          }}>
            {t("claim.button.continuePlay")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Écran d'instructions (1ère fois) ──────────────────────── */
function InstructionsScreen({ onStart }: { onStart: () => void }) {
  const { t } = useT();
  const handlePlay = () => {
    localStorage.setItem("safi_runner_saw_instructions", "1");
    onStart();
  };
  const rows: { icon: string; labelKey: string; descKey: string }[] = [
    { icon: "◀ ▶", labelKey: "instr.row.lanes.label",     descKey: "instr.row.lanes.desc" },
    { icon: "▲",   labelKey: "instr.row.jump.label",      descKey: "instr.row.jump.desc" },
    { icon: "🎮",  labelKey: "instr.row.gamepad.label",   descKey: "instr.row.gamepad.desc" },
    { icon: "💎",  labelKey: "instr.row.diamonds.label",  descKey: "instr.row.diamonds.desc" },
    { icon: "🚧",  labelKey: "instr.row.obstacles.label", descKey: "instr.row.obstacles.desc" },
  ];
  /* Règles officielles — 4 catégories (mêmes clés que l'écran d'accueil) */
  const ruleCats: { icon: string; titleKey: string; lines: string[] }[] = [
    { icon: "⏱️", titleKey: "rules.duration.title",  lines: ["rules.duration.l1",  "rules.duration.l2",  "rules.duration.l3"] },
    { icon: "💎", titleKey: "rules.collect.title",   lines: ["rules.collect.l1",   "rules.collect.l2",   "rules.collect.l3"] },
    { icon: "🐝", titleKey: "rules.shortfall.title", lines: ["rules.shortfall.l1", "rules.shortfall.l2", "rules.shortfall.l3", "rules.shortfall.l4"] },
    { icon: "🏃", titleKey: "rules.bonus.title",     lines: ["rules.bonus.l1",     "rules.bonus.l2",     "rules.bonus.l3"] },
  ];
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50, pointerEvents: "auto",
      background: "rgba(0,5,20,0.97)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch" as never,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 20px 32px",
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 4, textAlign: "center" }}>
          {t("instr.title")}
        </div>
        <div style={{ fontSize: 12, color: "#90caf9", marginBottom: 20, letterSpacing: 2 }}>{t("instr.subtitle")}</div>

        <div style={{ width: "100%", maxWidth: 420, marginBottom: 16 }}>
          {rows.map((c, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, alignItems: "center",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "12px 16px", marginBottom: 10,
            }}>
              <div style={{ fontSize: 24, minWidth: 40, textAlign: "center" }}>{c.icon}</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{t(c.labelKey)}</div>
                <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{t(c.descKey)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Règles officielles — 4 catégories (DURÉE / DIAMANTS / MANQUANTS / BONUS) */}
        <div style={{ width: "100%", maxWidth: 420, marginBottom: 16 }}>
          <div style={{
            color: "#ffa726", fontWeight: 800, fontSize: 14, marginBottom: 10,
            textAlign: "center", letterSpacing: 1,
          }}>
            {t("instr.howTitle")}
          </div>
          {ruleCats.map((cat) => (
            <div key={cat.titleKey} style={{
              background: "rgba(255,140,0,0.10)", border: "1px solid rgba(255,140,0,0.30)",
              borderRadius: 14, padding: "10px 14px", marginBottom: 8,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                color: "#ffa726", fontWeight: 800, fontSize: 12, letterSpacing: 1.2,
                textTransform: "uppercase", marginBottom: 7,
              }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <span>{t(cat.titleKey)}</span>
              </div>
              {cat.lines.map((lk) => (
                <div key={lk} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  color: "#e0e0e0", fontSize: 12, marginBottom: 4, lineHeight: 1.45,
                }}>
                  <div style={{
                    flexShrink: 0, width: 5, height: 5, borderRadius: "50%",
                    background: "#ffd54f", marginTop: 6,
                  }} />
                  <div style={{ flex: 1 }}>{t(lk)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          width: "100%", maxWidth: 420,
          background: "rgba(100,180,255,0.08)", border: "1px solid rgba(100,180,255,0.25)",
          borderRadius: 12, padding: "8px 14px", marginBottom: 14,
          color: "#90caf9", fontSize: 11, textAlign: "center", letterSpacing: 0.4,
        }}>
          {t("instr.responsive")}
        </div>

        <button
          onClick={handlePlay}
          style={{
            background: "linear-gradient(135deg,#1565c0,#42a5f5)",
            color: "#fff", border: "none", borderRadius: 50,
            padding: "16px 52px", fontSize: 20, fontWeight: 900,
            cursor: "pointer", letterSpacing: 3, width: "100%", maxWidth: 340,
            boxShadow: "0 0 30px #1565c088",
          }}
        >
          {t("instr.launch")}
        </button>
      </div>
    </div>
  );
}

/* ─── Écran de démarrage — thème "Bridge Shark" vert ─────────── */
/* ─── Couleurs des paliers du classement TOP 7 ──────────────────
   Pyramide de prestige inspirée du podium olympique :
     #1            → OR (champion)
     #2, #3        → ARGENT (vice-champions)
     #4, #5, #6    → BRONZE (élite)
     #7            → AZUR (qualifié) */
function rankTier(rank: number): { bg: string; border: string; text: string; badge: string; label: string } {
  if (rank === 1) return {
    bg: "linear-gradient(135deg,rgba(80,55,0,0.95),rgba(50,32,0,0.92))",
    border: "rgba(255,215,0,0.85)",
    text: "#ffd700",
    badge: "linear-gradient(135deg,#ffd700,#ffeb3b,#ffb300)",
    label: "#3d2c00",
  };
  if (rank === 2 || rank === 3) return {
    bg: "linear-gradient(135deg,rgba(60,60,70,0.92),rgba(35,35,42,0.88))",
    border: "rgba(200,200,210,0.7)",
    text: "#e0e0e0",
    badge: "linear-gradient(135deg,#bdbdbd,#eeeeee,#9e9e9e)",
    label: "#2a2a2a",
  };
  if (rank >= 4 && rank <= 6) return {
    bg: "linear-gradient(135deg,rgba(80,40,15,0.92),rgba(50,25,8,0.88))",
    border: "rgba(205,127,50,0.7)",
    text: "#ff9966",
    badge: "linear-gradient(135deg,#cd7f32,#e8a05b,#a0522d)",
    label: "#3a1d08",
  };
  /* #7 — azur "qualifié" */
  return {
    bg: "linear-gradient(135deg,rgba(0,40,70,0.9),rgba(0,25,45,0.85))",
    border: "rgba(100,180,255,0.55)",
    text: "#90caf9",
    badge: "linear-gradient(135deg,#42a5f5,#90caf9,#1e88e5)",
    label: "#0d2a4a",
  };
}

/* ─── Carte CLASSEMENT TOP 7 (cycle 3 jours) ──────────────────── */
function LeaderboardCard() {
  const { t } = useT();
  const [entries, setEntries] = useState<LeaderEntry[] | null>(null);
  const [secLeft, setSecLeft] = useState(secondsUntilNextLeaderCycle());

  useEffect(() => {
    let cancel = false;
    (async () => {
      const top = await getTopPlayers(7);
      if (!cancel) setEntries(top);
    })();
    /* Rafraîchit le compte à rebours toutes les minutes */
    const tick = setInterval(() => setSecLeft(secondsUntilNextLeaderCycle()), 60_000);
    return () => { cancel = true; clearInterval(tick); };
  }, []);

  /* Formate le compte à rebours en "Xj Yh" si > 24h, sinon "Yh Zmin" */
  const days = Math.floor(secLeft / 86400);
  const hours = Math.floor((secLeft % 86400) / 3600);
  const mins = Math.floor((secLeft % 3600) / 60);
  const countdown = days > 0
    ? t("leader.resetIn", { d: String(days), h: String(hours) })
    : t("leader.resetSoon", { h: String(hours), m: String(mins) });

  return (
    <div style={{
      width: "100%",
      background: "linear-gradient(135deg,rgba(0,25,12,0.94),rgba(0,15,8,0.9))",
      border: "1.5px solid rgba(0,230,118,0.35)",
      borderRadius: 16,
      padding: "12px 12px 14px",
      marginTop: 8, marginBottom: 16,
      boxShadow: "0 6px 24px rgba(0,80,40,0.35)",
    }}>
      <div style={{
        fontSize: 13, color: "#00e676", fontWeight: 800, letterSpacing: 1.5,
        marginBottom: 4, textTransform: "uppercase", textAlign: "center",
      }}>
        {t("leader.title")}
      </div>

      {/* Sous-titre explicatif + compte à rebours du cycle */}
      <div style={{
        fontSize: 9.5, color: "#9ec9b3", textAlign: "center",
        letterSpacing: 0.3, lineHeight: 1.4, marginBottom: 8,
        padding: "0 6px",
      }}>
        {t("leader.subtitle")}
      </div>
      <div style={{
        fontSize: 10, color: "#ffd54f", textAlign: "center",
        fontWeight: 800, letterSpacing: 0.8,
        background: "rgba(255,193,7,0.08)",
        border: "1px solid rgba(255,193,7,0.25)",
        borderRadius: 8, padding: "4px 8px", marginBottom: 10,
      }} dir="ltr">
        ⏳ {countdown}
      </div>

      {entries === null && (
        <div style={{
          fontSize: 11, color: "#9ec9b3", textAlign: "center", padding: "10px 0",
          letterSpacing: 0.5,
        }}>···</div>
      )}

      {entries && entries.length === 0 && (
        <div style={{
          fontSize: 11, color: "#9ec9b3", textAlign: "center", padding: "10px 0",
        }}>
          {t("leader.empty")}
        </div>
      )}

      {entries && entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {entries.map((e) => {
            const tier = rankTier(e.rank);
            return (
              <div
                key={e.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: tier.bg,
                  border: `1px solid ${tier.border}`,
                  borderRadius: 10,
                  padding: "7px 10px",
                  boxShadow: e.rank === 1
                    ? "0 0 14px rgba(255,215,0,0.35)"
                    : "0 2px 8px rgba(0,0,0,0.35)",
                }}
              >
                {/* Badge numéro de rang */}
                <div style={{
                  flexShrink: 0,
                  width: 24, height: 24, borderRadius: "50%",
                  background: tier.badge,
                  color: tier.label,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 12,
                  fontFamily: "'Fredoka','Segoe UI',sans-serif",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset",
                }} dir="ltr">
                  {e.rank === 1 ? "👑" : e.rank}
                </div>

                {/* Photo de profil du joueur (ou avatar initiales coloré) */}
                {e.avatarUrl && e.avatarUrl.length > 0 ? (
                  <div style={{
                    flexShrink: 0,
                    width: 26, height: 26, borderRadius: "50%",
                    background: `url(${e.avatarUrl}) center/cover, #0d1f12`,
                    border: "1.5px solid rgba(0,230,118,0.55)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  }} />
                ) : (
                  <div style={{
                    flexShrink: 0,
                    width: 26, height: 26, borderRadius: "50%",
                    background: (() => {
                      const colors = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#6d4c41","#039be5","#43a047"];
                      let h = 0; for (let ci = 0; ci < e.name.length; ci++) h = (h * 31 + e.name.charCodeAt(ci)) & 0xffff;
                      return colors[h % colors.length];
                    })(),
                    border: "1.5px solid rgba(255,255,255,0.45)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 900, fontSize: 10,
                    fontFamily: "'Fredoka','Segoe UI',sans-serif",
                    letterSpacing: 0,
                  }}>
                    {e.name.replace(/^BR-/,"").slice(0,2).toUpperCase()}
                  </div>
                )}

                {/* Nom du joueur */}
                <div style={{
                  flex: 1, minWidth: 0,
                  fontSize: 12, color: tier.text,
                  fontWeight: 800, letterSpacing: 0.5,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  fontFamily: "'Fredoka','Segoe UI',sans-serif",
                }} dir="ltr">
                  {e.name}
                </div>

                {/* Diamants collectés */}
                <div style={{
                  flexShrink: 0,
                  fontSize: 12, color: tier.text,
                  fontWeight: 900, letterSpacing: 0.5,
                  fontFamily: "'Fredoka','Segoe UI',sans-serif",
                }} dir="ltr">
                  {formatNum(e.diamonds)} 💎
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StartScreen({ onStart, eligibility, profile, onClaim, onShowProfile }: {
  onStart: () => void; eligibility: MenuEligibility; profile: Profile | null; onClaim: () => void; onShowProfile: () => void;
}) {
  const bridgeAuth = getBridgeAuth();
  const avatarSrc = (bridgeAuth?.avatarUrl && bridgeAuth.avatarUrl.length > 0)
    ? bridgeAuth.avatarUrl
    : (profile?.avatar_url && profile.avatar_url.length > 0)
      ? profile.avatar_url
      : "/assets/player-avatar.jpeg";
  /* 💎 : max(Bridge Eats, Supabase) */
  const displayDiamonds = Math.max(bridgeAuth?.diamonds ?? 0, eligibility.diamondsCollected ?? 0);
  const { t } = useT();
  const hasMenu = eligibility.menusAvailable > 0;
  const diamondPct = Math.min(100, ((displayDiamonds % DIAMONDS_PER_MENU) / DIAMONDS_PER_MENU) * 100);

  /* ── Compte à rebours du défi personnel 3 jours ── */
  const [challengeSecsLeft, setChallengeSecsLeft] = useState(() => getChallengeSecondsLeft());
  const challengeStarted = useMemo(() => getChallengeStartMs() !== null, [challengeSecsLeft]);
  const challengeOver    = useMemo(() => isChallengeOver(), [challengeSecsLeft]);
  /* Jours RESTANTS (3→2→1), dérivés du temps restant pour un vrai compte à rebours */
  const daysLeft = challengeStarted && !challengeOver
    ? Math.max(1, Math.ceil(challengeSecsLeft / 86_400))
    : 0;
  useEffect(() => {
    const id = setInterval(() => setChallengeSecsLeft(getChallengeSecondsLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const handlePlay = useCallback(() => {
    startChallengeIfNew();          /* démarre le chrono perso au 1er clic */
    /* Forcer la mise à jour immédiate du compteur */
    setChallengeSecsLeft(getChallengeSecondsLeft());
    onStart();
  }, [onStart]);

  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "auto",
      background: "#000",
    }}>
      {/* Voile sombre */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "transparent",
      }} />

      {/* ── Mini profil top-left — à côté du sélecteur de langue ── */}
      <button
        onClick={onShowProfile}
        style={{
          position: "absolute", top: 14, left: 14, zIndex: 100,
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(0,230,118,0.35)",
          borderRadius: 20, padding: "6px 12px",
          cursor: "pointer", color: "inherit", font: "inherit",
          boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: `url(${avatarSrc}) center/cover`,
          border: "1.5px solid #00e676",
        }} />
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Fredoka', monospace", letterSpacing: 0.5 }} dir="ltr">
          BR-{(eligibility.diamondsCollected.toString(36).toUpperCase() + "XXXXXX").slice(0, 6)}
        </span>
        <span style={{ color: "#ffd54f", fontSize: 12, fontWeight: 700 }} dir="ltr">
          {formatNum(displayDiamonds)} 💎
        </span>
      </button>

      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch" as never,
        display: "flex", flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{ flex: 1, minHeight: 130 }} />

        <div style={{ width: "100%", maxWidth: 500, padding: "0 20px 32px", textAlign: "center" }}>

          {/* Titre SAFI RUNNER — typographie épurée avec dégradé vert */}
          <div style={{
            fontFamily: "'Fredoka','Segoe UI',sans-serif",
            fontSize: "clamp(26px,6.5vw,38px)",
            fontWeight: 800,
            letterSpacing: 4,
            lineHeight: 1.1,
            marginBottom: 4,
            background: "linear-gradient(180deg,#ffffff 0%,#a5f5c5 55%,#00e676 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 2px 0 rgba(0,80,40,0.6)) drop-shadow(0 0 18px rgba(0,230,118,0.35))",
            textTransform: "uppercase",
          }}>
            {t("start.title")}
          </div>

          {/* Sous-titre minimaliste */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 10, color: "#9ec9b3", marginBottom: 18, letterSpacing: 2.5,
            fontWeight: 600, textTransform: "uppercase",
          }}>
            <span style={{ display: "inline-block", width: 18, height: 1, background: "linear-gradient(90deg,transparent,#69f0ae)" }} />
            <span>{t("start.subtitle")}</span>
            <span style={{ display: "inline-block", width: 18, height: 1, background: "linear-gradient(90deg,#69f0ae,transparent)" }} />
          </div>

          {/* Compte à rebours DÉFI 3 jours — pleine largeur */}
          <div style={{ marginBottom: 12 }}>
            <div style={{
              background: challengeOver
                ? "linear-gradient(135deg,rgba(80,0,0,0.92),rgba(50,0,0,0.88))"
                : challengeStarted
                  ? "linear-gradient(135deg,rgba(0,25,50,0.92),rgba(0,15,35,0.88))"
                  : "linear-gradient(135deg,rgba(40,30,0,0.9),rgba(25,18,0,0.85))",
              border: challengeOver
                ? "1px solid rgba(255,80,80,0.4)"
                : challengeStarted
                  ? "1px solid rgba(100,200,255,0.4)"
                  : "1px solid rgba(255,193,7,0.3)",
              borderRadius: 14, padding: "10px 12px",
              boxShadow: challengeStarted && !challengeOver
                ? "0 4px 16px rgba(0,80,160,0.3)"
                : "0 4px 16px rgba(80,60,0,0.3)",
            }}>
              {challengeOver ? (
                <>
                  <div style={{ fontSize: 9, color: "#ff5252", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>⏱ DÉFI</div>
                  <div style={{ fontSize: 12, color: "#ff8a80", fontWeight: 800 }}>Terminé</div>
                </>
              ) : challengeStarted ? (
                <>
                  <div style={{ fontSize: 9, color: "#64b5f6", letterSpacing: 1.5, fontWeight: 700, marginBottom: 2 }}>
                    ⏳ {daysLeft} JOUR{daysLeft > 1 ? "S" : ""} RESTANT{daysLeft > 1 ? "S" : ""} / 3
                  </div>
                  <div style={{ fontSize: 15, color: "#fff", fontWeight: 900, fontFamily: "'Fredoka', monospace", letterSpacing: 1 }} dir="ltr">
                    {formatCountdown(challengeSecsLeft)}
                  </div>
                  <div style={{ fontSize: 9, color: "#90caf9", marginTop: 2, opacity: 0.8 }}>dans ton défi</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 9, color: "#ffd54f", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>⏱ DÉFI</div>
                  <div style={{ fontSize: 12, color: "#fff", fontWeight: 800, lineHeight: 1.3 }}>
                    3 jours · 3h/jour
                  </div>
                  <div style={{ fontSize: 9, color: "#ffd54f", marginTop: 2, opacity: 0.75 }}>lance ta 1ère partie ▶</div>
                </>
              )}
            </div>
          </div>

          {/* Carte MES DIAMANTS / OBJECTIF */}
          <div style={{
            background: "linear-gradient(135deg,rgba(0,40,20,0.92),rgba(0,25,12,0.88))",
            border: "1.5px solid rgba(0,230,118,0.4)", borderRadius: 16,
            padding: "12px 14px", marginBottom: 12,
            boxShadow: "0 6px 24px rgba(0,100,50,0.35), 0 0 0 1px rgba(0,230,118,0.1) inset",
            textAlign: "start",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 9, color: "#69f0ae", letterSpacing: 1.5, fontWeight: 700 }}>{t("bridge.myDiamonds").toUpperCase()}</div>
                <div style={{ fontSize: 24, color: "#ffd54f", fontWeight: 900, lineHeight: 1, textShadow: "0 0 12px rgba(255,213,79,0.5)" }} dir="ltr">
                  {formatNum(displayDiamonds)} 💎
                </div>
              </div>
              <div style={{ textAlign: "end" }}>
                <div style={{ fontSize: 9, color: "#69f0ae", letterSpacing: 1.5, fontWeight: 700 }}>{t("bridge.objective").toUpperCase()}</div>
                <div style={{ fontSize: 18, color: "#a5d6a7", fontWeight: 900, lineHeight: 1.2 }} dir="ltr">
                  {formatNum(DIAMONDS_PER_MENU)} 💎
                </div>
              </div>
            </div>
            <div style={{ height: 8, background: "rgba(0,0,0,0.4)", borderRadius: 6, overflow: "hidden", marginBottom: 4 }}>
              <div style={{
                height: "100%", width: `${diamondPct}%`,
                background: "linear-gradient(90deg,#00c853,#00e676,#69f0ae)",
                transition: "width 0.6s",
                boxShadow: "0 0 12px rgba(0,230,118,0.7)",
              }} />
            </div>
            <div style={{ fontSize: 10, color: "#a5d6a7", textAlign: "center", letterSpacing: 1 }}>
              {Math.round(diamondPct)}% · {t("bridge.progress").toUpperCase()}
            </div>
          </div>

          {/* Bouton Réclamer si menu disponible */}
          {hasMenu && (
            <button onClick={onClaim} style={{
              background: "linear-gradient(135deg,#1b5e20,#388e3c,#1b5e20)",
              color: "#fff", border: "2px solid #66bb6a", borderRadius: 50,
              padding: "12px 30px", fontSize: 15, fontWeight: 900,
              cursor: "pointer", letterSpacing: 1.5, marginBottom: 12,
              boxShadow: "0 0 30px rgba(76,175,80,0.6)",
              width: "100%", maxWidth: 340,
            }}>
              {t("claim.button.claim")}
            </button>
          )}

          {/* GROS BOUTON JOUER MAINTENANT (style Bridge Shark) */}
          <button
            onClick={handlePlay}
            style={{
              background: "linear-gradient(135deg,#00c853 0%,#00e676 50%,#00c853 100%)",
              color: "#003311", border: "none", borderRadius: 50,
              padding: "16px 32px", fontSize: "clamp(16px,4.5vw,20px)", fontWeight: 900,
              cursor: "pointer", letterSpacing: 2, textTransform: "uppercase",
              boxShadow: "0 0 36px rgba(0,230,118,0.65), 0 8px 24px rgba(0,80,40,0.6)",
              animation: "pulse 2s infinite", transition: "transform 0.1s",
              width: "100%", maxWidth: 340, marginBottom: 16,
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {t("bridge.playNow")}
          </button>

          {/* Classement TOP 7 — placé HAUT pour visibilité immédiate */}
          <LeaderboardCard />

          {/* Section "COMMENT GAGNER ?" — règles officielles en 4 catégories */}
          <div style={{ textAlign: "start", marginBottom: 12 }}>
            <div style={{
              fontSize: 13, color: "#00e676", fontWeight: 800, letterSpacing: 1.5,
              marginBottom: 10, textTransform: "uppercase", textAlign: "center",
            }}>
              {t("bridge.howTitle")}
            </div>
            {[
              { icon: "⏱️", titleKey: "rules.duration.title",  lines: ["rules.duration.l1",  "rules.duration.l2",  "rules.duration.l3"] },
              { icon: "💎", titleKey: "rules.collect.title",   lines: ["rules.collect.l1",   "rules.collect.l2",   "rules.collect.l3"] },
              { icon: "🐝", titleKey: "rules.shortfall.title", lines: ["rules.shortfall.l1", "rules.shortfall.l2", "rules.shortfall.l3", "rules.shortfall.l4"] },
              { icon: "🏃", titleKey: "rules.bonus.title",     lines: ["rules.bonus.l1",     "rules.bonus.l2",     "rules.bonus.l3"] },
            ].map((cat) => (
              <div key={cat.titleKey} style={{
                background: "linear-gradient(135deg,rgba(0,30,15,0.92),rgba(0,20,10,0.88))",
                border: "1px solid rgba(0,230,118,0.25)", borderRadius: 14,
                padding: "10px 12px", marginBottom: 8,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 12, color: "#00e676", fontWeight: 800, letterSpacing: 1.2,
                  marginBottom: 8, textTransform: "uppercase",
                }}>
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span>{t(cat.titleKey)}</span>
                </div>
                {cat.lines.map((lk) => (
                  <div key={lk} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    fontSize: 11, color: "#e0f2e7", marginBottom: 5, lineHeight: 1.45,
                  }}>
                    <div style={{
                      flexShrink: 0, width: 5, height: 5, borderRadius: "50%",
                      background: "#ffd54f", marginTop: 6,
                    }} />
                    <div style={{ flex: 1 }}>{t(lk)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── MON PROFIL — juste au-dessus du bouton Bridge/WhatsApp ── */}
          <button
            onClick={onShowProfile}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", background: "linear-gradient(135deg,rgba(0,40,20,0.92),rgba(0,25,12,0.88))",
              border: "1.5px solid rgba(0,230,118,0.35)", borderRadius: 16,
              padding: "12px 14px", marginBottom: 10,
              boxShadow: "0 4px 18px rgba(0,80,40,0.3)",
              cursor: "pointer", color: "inherit", font: "inherit", textAlign: "start",
            }}
          >
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0, width: 48, height: 48 }}>
              <div style={{
                position: "absolute", inset: -3, borderRadius: "50%",
                background: "conic-gradient(from 0deg,#00e676,#00c853,#69f0ae,#00e676)",
                animation: "spin 6s linear infinite", opacity: 0.85,
              }} />
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: `url(${avatarSrc}) center/cover`,
                border: "2px solid #000e06",
              }} />
            </div>
            {/* Texte */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#69f0ae", letterSpacing: 1.5, fontWeight: 700, marginBottom: 2 }}>
                {t("profile.button")}
              </div>
              <div style={{ fontSize: 15, color: "#fff", fontWeight: 900, letterSpacing: 1, fontFamily: "'Fredoka', monospace" }} dir="ltr">
                BR-{(eligibility.diamondsCollected.toString(36).toUpperCase() + "XXXXXX").slice(0, 6)}
              </div>
              <div style={{ fontSize: 11, color: "#ffd54f", fontWeight: 700, marginTop: 1 }} dir="ltr">
                {formatNum(displayDiamonds)} 💎
              </div>
            </div>
          </button>

          {/* ── Bouton Bridge Eats (WhatsApp) ── */}
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
            <BridgeEatsButton />
          </div>

          {/* Contrôles (footer discret) */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, color: "#666", fontSize: 10, marginBottom: 12 }}>
            <span>{t("start.controls.lanes")}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{t("start.controls.jump")}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{t("start.controls.touch")}</span>
          </div>

          {/* Espace tampon pour ne pas que le sélecteur de langue
              (en bas-droite) chevauche le dernier élément. */}
          <div style={{ height: 56 }} />
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Écran Game Over ────────────────────────────────────────── */
function GameOverScreen({ score, checkpointNumber, eligibility, onRestart, onClaim }: {
  score: number; checkpointNumber: number; eligibility: MenuEligibility;
  onRestart: () => void; onClaim: () => void;
}) {
  const { t } = useT();
  const sessionDiamonds = Math.floor(score / 10);
  const sardines = Math.floor(score / 50);
  const hasMenu = eligibility.menusAvailable > 0;

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#000",
      pointerEvents: "auto",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "transparent",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch" as never,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "20px 0",
      }}>
        <div style={{ position: "relative", textAlign: "center", padding: "0 24px", width: "100%", maxWidth: 440 }}>

          <div style={{ marginBottom: 18 }}>
            <BridgeEatsButton variant="dark" />
          </div>

          <div style={{
            fontSize: 52, fontWeight: 900, color: "#ef5350",
            textShadow: "0 0 40px #b71c1c, 0 4px 16px rgba(0,0,0,0.9)",
            letterSpacing: 3, lineHeight: 1, marginBottom: 4,
          }}>
            {t("over.title")}
          </div>
          <div style={{ color: "#ff8a80", fontSize: 13, marginBottom: 20, opacity: 0.8 }}>
            {t("over.subtitle")}
          </div>

          {/* Cartes stats */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" }}>
            {[
              { icon: "💎", label: t("over.stat.session"),  value: sessionDiamonds,    color: "#42a5f5" },
              { icon: "🏆", label: t("over.stat.score"),    value: score,              color: "#ffd740" },
              { icon: "🍽️", label: t("over.stat.stops"),    value: checkpointNumber,   color: "#66bb6a" },
              { icon: "🐟", label: t("over.stat.sardines"), value: sardines,           color: "#80cbc4" },
            ].map((stat, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)",
                border: `1px solid ${stat.color}40`, borderRadius: 14,
                padding: "10px 8px", minWidth: 68,
              }}>
                <div style={{ fontSize: 20, marginBottom: 3 }}>{stat.icon}</div>
                <div style={{ color: stat.color, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ color: "#888", fontSize: 9, marginTop: 3, letterSpacing: 0.5 }}>{stat.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Carte engagement Bridge */}
          <div style={{ marginBottom: 18 }}>
            <EngagementCard eligibility={eligibility} />
          </div>

          {hasMenu && (
            <button onClick={onClaim} style={{
              background: "linear-gradient(135deg,#2e7d32,#66bb6a)",
              color: "#fff", border: "none", borderRadius: 50,
              padding: "14px 32px", fontSize: 15, fontWeight: 900,
              cursor: "pointer", letterSpacing: 1.5, marginBottom: 14,
              boxShadow: "0 0 30px #4caf5088",
            }}>
              {t("claim.button.claim")}
            </button>
          )}
          <br />

          <button
            onClick={onRestart}
            style={{
              background: "linear-gradient(135deg,#b71c1c,#ef5350)",
              color: "#fff", border: "none", borderRadius: 50,
              padding: "16px 50px", fontSize: 18, fontWeight: 900,
              cursor: "pointer", letterSpacing: 2, textTransform: "uppercase",
              boxShadow: "0 0 28px #b71c1c88, 0 6px 24px rgba(0,0,0,0.6)",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {t("over.restart")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bannière Happy Hour ×2 ─────────────────────────────────── */
function HappyHourBanner() {
  const { t } = useT();
  const hh = useHappyHour();
  if (!hh.active) return null;
  const m = String(Math.floor(hh.secondsLeft / 60)).padStart(2, "0");
  const s = String(hh.secondsLeft % 60).padStart(2, "0");
  return (
    <div style={{
      position: "absolute", top: 76, left: "50%", transform: "translateX(-50%)",
      zIndex: 30, pointerEvents: "none",
      background: "linear-gradient(135deg,#ff6f00,#ffd54f)",
      color: "#1a0a00", fontWeight: 900,
      fontFamily: "'Fredoka','Segoe UI',sans-serif",
      letterSpacing: 1, fontSize: 13,
      padding: "8px 18px", borderRadius: 999,
      boxShadow: "0 6px 22px rgba(255,140,0,0.6), 0 0 0 2px rgba(255,255,255,0.15) inset",
      animation: "happyPulse 1.2s ease-in-out infinite",
      whiteSpace: "nowrap",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span>{t("happy.banner")}</span>
      <span style={{
        background: "rgba(0,0,0,0.25)", color: "#fff",
        padding: "2px 10px", borderRadius: 999, fontSize: 12,
      }} dir="ltr">{t("happy.timeLeft", { m, s })}</span>
      <style>{`
        @keyframes happyPulse {
          0%,100% { box-shadow: 0 6px 22px rgba(255,140,0,0.6), 0 0 0 2px rgba(255,255,255,0.15) inset; }
          50%     { box-shadow: 0 6px 32px rgba(255,200,80,0.9), 0 0 0 2px rgba(255,255,255,0.3) inset; }
        }
      `}</style>
    </div>
  );
}

/* ─── Panneau admin (URL ?admin=1) ───────────────────────────── */
function AdminPanel() {
  const { t } = useT();
  const hh = useHappyHour();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [duration, setDuration] = useState(60);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAdminMode()) return null;

  const handleActivate = async () => {
    setBusy(true); setMsg(null);
    const r = await activateHappyHour(duration, secret);
    setBusy(false);
    if (!r.ok) {
      setMsg(r.error === "invalid_secret" ? t("admin.invalid") : r.error);
      return;
    }
    const time = new Date(r.until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMsg(t("admin.activated", { time }));
  };
  const handleStop = async () => {
    setBusy(true); setMsg(null);
    const r = await stopHappyHour(secret);
    setBusy(false);
    if (!r.ok) { setMsg(r.error === "invalid_secret" ? t("admin.invalid") : (r.error ?? "")); return; }
    setMsg(t("admin.stopped"));
  };

  return (
    <>
      {/* Bouton flottant en bas à gauche */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "absolute", bottom: 14, left: 14, zIndex: 40,
          width: 44, height: 44, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg,#37474f,#263238)",
          color: "#fff", fontSize: 20, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
        }}
        aria-label={t("admin.title")}
      >🛠️</button>

      {open && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.8)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "#1c2730", color: "#fff",
            borderRadius: 16, padding: 22, width: "100%", maxWidth: 360,
            border: "1px solid rgba(255,255,255,0.1)",
            fontFamily: "'Fredoka','Segoe UI',sans-serif",
          }}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 14 }}>
              {t("admin.title")}
            </div>

            {hh.active && (
              <div style={{
                background: "rgba(255,140,0,0.15)", color: "#ffb74d",
                padding: "8px 12px", borderRadius: 10, fontSize: 12,
                marginBottom: 12, fontWeight: 700,
              }}>
                {t("happy.banner")} · {Math.floor(hh.secondsLeft / 60)} min
              </div>
            )}

            <label style={{ fontSize: 12, opacity: 0.8 }}>{t("admin.secret")}</label>
            <input
              type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
              style={{
                width: "100%", marginTop: 4, marginBottom: 14,
                padding: "10px 12px", borderRadius: 10, border: "1px solid #455a64",
                background: "#0f1620", color: "#fff", fontSize: 14,
                boxSizing: "border-box",
              }}
            />

            <label style={{ fontSize: 12, opacity: 0.8 }}>{t("admin.duration")}</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 14 }}>
              {[30, 60, 120, 240].map((m) => (
                <button key={m} onClick={() => setDuration(m)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: duration === m ? "#00c853" : "#37474f",
                  color: duration === m ? "#003311" : "#fff",
                  border: "none", cursor: "pointer",
                }}>{t("admin.minutes", { n: m })}</button>
              ))}
            </div>

            <button onClick={handleActivate} disabled={busy || !secret}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, fontWeight: 900,
                background: "linear-gradient(135deg,#ff6f00,#ffa726)", color: "#1a0a00",
                border: "none", fontSize: 14, cursor: busy ? "wait" : "pointer",
                opacity: busy || !secret ? 0.6 : 1, marginBottom: 8,
              }}>{t("admin.activate")}</button>

            {hh.active && (
              <button onClick={handleStop} disabled={busy || !secret}
                style={{
                  width: "100%", padding: "10px", borderRadius: 10, fontWeight: 700,
                  background: "transparent", color: "#ff8a80",
                  border: "1px solid #ff8a80", fontSize: 13, cursor: "pointer",
                  marginBottom: 8,
                }}>{t("admin.stop")}</button>
            )}

            {msg && (
              <div style={{
                fontSize: 12, padding: "8px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.06)", color: "#b0bec5",
                marginBottom: 8, textAlign: "center",
              }}>{msg}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={() => setOpen(false)} style={{
                flex: 1, padding: "10px", borderRadius: 10, fontWeight: 700,
                background: "#37474f", color: "#fff", border: "none", cursor: "pointer",
              }}>{t("admin.close")}</button>
              <button onClick={() => { exitAdminMode(); window.location.search = ""; }} style={{
                flex: 1, padding: "10px", borderRadius: 10, fontWeight: 700,
                background: "transparent", color: "#90a4ae", border: "1px solid #455a64",
                cursor: "pointer", fontSize: 12,
              }}>Logout admin</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Export principal ───────────────────────────────────────── */
export function GameUI({
  phase, score, checkpointNumber, nextCheckpointAt, playTime,
  profile, boostMeter, boostActive, boostTimeLeft,
  difficultyLevel, shieldActive, magnetActive, magnetTimeLeft,
  onStart, onRestart, onReturnToStart, onChangeLane, onJump, onBoost, onRefreshProfile,
}: GameUIProps) {
  const [showReward, setShowReward] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  /* Éligibilité = profile + diamants estimés de la session en cours */
  const sessionDiamonds = Math.floor(score / 10);
  const profileForCalc: Profile | null = profile
    ? { ...profile, diamonds_collected: (profile.diamonds_collected ?? 0) + sessionDiamonds }
    : null;
  const eligibility = getMenuEligibility(profileForCalc);

  /* Détection du PASSAGE de menusEarned :
     on N'INTERROMPT PAS la partie en cours — on attend le game over
     pour proposer la réclamation. */
  const prevMenusEarnedRef = useRef(eligibility.menusEarned);
  useEffect(() => {
    if (
      eligibility.menusEarned > prevMenusEarnedRef.current &&
      (phase === "gameover" || phase === "checkpoint")
    ) {
      setShowReward(true);
    }
    prevMenusEarnedRef.current = eligibility.menusEarned;
  }, [eligibility.menusEarned, phase]);

  const handleStart = () => {
    const saw = localStorage.getItem("safi_runner_saw_instructions");
    if (!saw) setShowInstructions(true);
    else onStart();
  };

  const handleInstructionsDone = () => {
    setShowInstructions(false);
    onStart();
  };

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "'Segoe UI','Arial',sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse {
          0%,100%{box-shadow:0 0 30px #1565c088,0 6px 24px rgba(0,0,0,0.6)}
          50%{box-shadow:0 0 50px #42a5f5cc,0 8px 32px rgba(0,0,0,0.7)}
        }
      `}</style>

      {/* Boutons flottants droite — uniquement pendant le jeu */}
      {phase === "playing" && !showReward && !showInstructions && (
        <>
          <FloatingActionsRight
            avatarSrc={(() => {
              const ba = getBridgeAuth();
              return (ba?.avatarUrl && ba.avatarUrl.length > 0)
                ? ba.avatarUrl
                : (profile?.avatar_url && profile.avatar_url.length > 0)
                  ? profile.avatar_url
                  : "/assets/player-avatar.jpeg";
            })()}
            onShowProfile={() => setShowProfile(true)}
            onReturnToStart={onReturnToStart}
          />
        </>
      )}

      {showReward && (
        <MenuUnlockOverlay
          eligibility={eligibility}
          onClose={() => setShowReward(false)}
        />
      )}

      {showInstructions && (
        <InstructionsScreen onStart={handleInstructionsDone} />
      )}

      {phase === "start" && !showReward && !showInstructions && !showProfile && (
        <StartScreen
          onStart={handleStart}
          eligibility={eligibility}
          profile={profile}
          onClaim={() => setShowReward(true)}
          onShowProfile={() => setShowProfile(true)}
        />
      )}

      {showProfile && (
        <ProfilePage
          profile={profile}
          eligibility={eligibility}
          onClose={() => {
            setShowProfile(false);
            onRefreshProfile?.();
          }}
        />
      )}

      {phase === "gameover" && !showReward && (
        <GameOverScreen
          score={score}
          checkpointNumber={checkpointNumber}
          eligibility={eligibility}
          onRestart={onRestart}
          onClaim={() => setShowReward(true)}
        />
      )}

      {(phase === "start" || phase === "playing") && !showReward && !showInstructions && !showProfile && (
        <HappyHourBanner />
      )}

      <AdminPanel />

      {phase === "playing" && !showReward && (
        <>
          <HUD
            score={score}
            checkpointNumber={checkpointNumber}
            playTime={playTime}
            nextCheckpointAt={nextCheckpointAt}
            eligibility={eligibility}
            boostMeter={boostMeter}
            boostActive={boostActive}
            boostTimeLeft={boostTimeLeft}
            difficultyLevel={difficultyLevel}
            shieldActive={shieldActive}
            magnetActive={magnetActive}
            magnetTimeLeft={magnetTimeLeft}
          />
          <div className="touch-only">
            <TouchControls
              onChangeLane={onChangeLane}
              onJump={onJump}
              onBoost={onBoost}
              boostReady={boostMeter >= 100 && !boostActive}
              boostActive={boostActive}
            />
          </div>
          <NitroMeter meter={boostMeter} active={boostActive} timeLeft={boostTimeLeft} />
          <style>{`
            @media (hover: hover) and (pointer: fine) {
              .touch-only { display: none !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
