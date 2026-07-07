import { useState, useEffect, useCallback } from "react";
import { getBridgeAuth, listenForParentAuth, setBridgeAuthManual, clearBridgeAuth, EVENT_NAME, type BridgeAuth } from "../lib/bridgeAuth";
import { verifyActiveDevice } from "../lib/playerProfile";
import { useT } from "../lib/i18n";
import { LanguageSelector } from "../components/LanguageSelector";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const [auth, setAuth] = useState<BridgeAuth | null>(() => getBridgeAuth());
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [err, setErr] = useState(false);
  const [kicked, setKicked] = useState(false);

  /* Sync si Bridge Eats parent envoie un postMessage (iframe). */
  useEffect(() => {
    const sync = () => setAuth(getBridgeAuth());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    const off = listenForParentAuth((a) => setAuth(a));
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
      off();
    };
  }, []);

  /* Vérifie que cet appareil est toujours l'actif (one-device-at-a-time). */
  useEffect(() => {
    if (!auth?.phone) return;
    let cancelled = false;
    const check = async () => {
      const ok = await verifyActiveDevice();
      if (cancelled) return;
      if (!ok) { clearBridgeAuth(); setAuth(null); setKicked(true); }
    };
    check();
    const iv = setInterval(check, 30_000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true; clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [auth?.phone]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const a = setBridgeAuthManual(phone.trim(), email.trim() || undefined);
    if (!a) { setErr(true); return; }
    setErr(false); setKicked(false); setAuth(a);
  }, [phone, email]);

  if (auth) return <>{children}</>;

  /* Calcule un ID preview à partir des 6 premiers chiffres du téléphone */
  const previewId = phone.replace(/[^\d]/g, "").slice(0, 6);
  const showPreview = previewId.length >= 6;

  return (
    <div style={{
      width: "100vw", height: "100vh", minHeight: "100dvh" as never,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#00170a 0%,#000e06 60%,#001a0a 100%)",
      padding: 20, boxSizing: "border-box",
      fontFamily: "'Fredoka', sans-serif",
      position: "relative",
    }}>
      <style>{`
        @keyframes floatShark {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50%      { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 30px rgba(0,230,118,0.4), 0 8px 32px rgba(0,0,0,0.7); }
          50%      { box-shadow: 0 0 50px rgba(0,230,118,0.7), 0 8px 40px rgba(0,0,0,0.8); }
        }
      `}</style>

      <LanguageSelector position="topRight" />

      {/* Logo requin animé */}
      <div style={{
        width: 110, height: 110, borderRadius: "50%",
        background: "url(/assets/icon-192.png) center/cover",
        border: "3px solid rgba(0,230,118,0.6)",
        marginBottom: 16,
        animation: "floatShark 3s ease-in-out infinite",
        boxShadow: "0 0 40px rgba(0,230,118,0.35)",
      }} />

      {/* Titre */}
      <div style={{
        fontSize: 36, fontWeight: 900, letterSpacing: 3,
        fontFamily: "'Bangers', sans-serif",
        background: "linear-gradient(180deg,#fff 0%,#69f0ae 60%,#00e676 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: 4, textAlign: "center",
      }}>SAFI RUNNER</div>
      <div style={{
        fontSize: 12, color: "#69f0ae", fontWeight: 700,
        letterSpacing: 2, textTransform: "uppercase",
        marginBottom: 32, opacity: 0.8,
      }}>🦈 Bridge Eats Game</div>

      {/* Carte de connexion */}
      <div style={{
        width: "100%", maxWidth: 380,
        background: "rgba(0,30,15,0.85)",
        backdropFilter: "blur(14px)",
        border: "1.5px solid rgba(0,230,118,0.3)",
        borderRadius: 20, padding: "24px 22px",
      }}>
        {/* Bandeau "expulsé" */}
        {kicked && (
          <div style={{
            background: "linear-gradient(135deg,#ff8a65,#ff5722)",
            color: "#fff", borderRadius: 12,
            padding: "10px 14px", marginBottom: 16, fontSize: 12, lineHeight: 1.5,
          }}>
            ⚠️ <strong>{t("auth.kicked.title")}</strong><br />{t("auth.kicked.body")}
          </div>
        )}

        <div style={{
          fontSize: 13, color: "#a5d6a7", textAlign: "center",
          marginBottom: 20, lineHeight: 1.5,
        }}>{t("auth.login.subtitle")}</div>

        <form onSubmit={handleSubmit}>
          {/* Champ téléphone */}
          <label style={{
            fontSize: 10, color: "#69f0ae", fontWeight: 800,
            letterSpacing: 1.3, textTransform: "uppercase",
            display: "block", marginBottom: 6,
          }}>{t("auth.login.phoneLabel")}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErr(false); }}
            placeholder={t("auth.manual.phone")}
            autoComplete="tel"
            inputMode="tel"
            required
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(0,0,0,0.5)", color: "#fff",
              border: `1.5px solid ${err ? "#ef5350" : "rgba(0,230,118,0.35)"}`,
              borderRadius: 12, padding: "12px 14px", fontSize: 16,
              fontFamily: "inherit", outline: "none", marginBottom: 10,
              letterSpacing: 1,
            }}
          />

          {/* Aperçu ID joueur */}
          {showPreview && (
            <div style={{
              textAlign: "center", marginBottom: 10,
              fontSize: 12, color: "#69f0ae", fontWeight: 700,
            }}>
              🎮 {t("auth.login.idPreview")} : <span style={{ color: "#fff", fontFamily: "'Fredoka', monospace", letterSpacing: 1 }}>BR-{previewId.toUpperCase()}</span>
            </div>
          )}

          {/* Champ email (optionnel) */}
          {showEmail ? (
            <>
              <label style={{
                fontSize: 10, color: "#69f0ae", fontWeight: 800,
                letterSpacing: 1.3, textTransform: "uppercase",
                display: "block", marginBottom: 6,
              }}>{t("auth.login.emailLabel")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@bridge.ma"
                autoComplete="email"
                inputMode="email"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(0,0,0,0.5)", color: "#fff",
                  border: "1.5px solid rgba(0,230,118,0.35)",
                  borderRadius: 12, padding: "12px 14px", fontSize: 15,
                  fontFamily: "inherit", outline: "none", marginBottom: 10,
                }}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              style={{
                background: "transparent", border: "none",
                color: "#80cbc4", fontSize: 12, fontWeight: 700,
                textDecoration: "underline", cursor: "pointer",
                display: "block", margin: "0 auto 12px",
                fontFamily: "inherit",
              }}
            >{t("auth.login.addEmail")}</button>
          )}

          {err && (
            <div style={{ color: "#ef5350", fontSize: 12, textAlign: "center", marginBottom: 10, fontWeight: 700 }}>
              {t("auth.manual.error")}
            </div>
          )}

          <button
            type="submit"
            disabled={phone.trim().length < 8}
            style={{
              display: "block", width: "100%",
              background: phone.trim().length >= 8
                ? "linear-gradient(135deg,#00c853,#00e676,#00c853)"
                : "rgba(0,100,50,0.4)",
              color: phone.trim().length >= 8 ? "#003311" : "#4a7a5a",
              border: "none", borderRadius: 50,
              padding: "15px 24px", fontSize: 15, fontWeight: 900,
              cursor: phone.trim().length >= 8 ? "pointer" : "not-allowed",
              letterSpacing: 1.5, textTransform: "uppercase",
              fontFamily: "inherit",
              animation: phone.trim().length >= 8 ? "glow 2s ease-in-out infinite" : "none",
              transition: "all 0.3s",
            }}
          >
            ▶ {t("auth.manual.submit")}
          </button>
        </form>
      </div>

      {/* Note de bas de page */}
      <div style={{
        marginTop: 20, fontSize: 11, color: "#4a7a5a",
        textAlign: "center", maxWidth: 320, lineHeight: 1.5,
      }}>{t("auth.login.footer")}</div>
    </div>
  );
}
