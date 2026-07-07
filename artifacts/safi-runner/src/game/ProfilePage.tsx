import { useEffect, useRef, useState } from "react";
import { useT } from "../lib/i18n";
import type { Profile } from "../lib/supabase";
import { getMyRank, updateUsername, updateAvatar, registerBridgePhone, type MenuEligibility } from "../lib/playerProfile";
import { getBridgeAuth, setBridgeAuthManual } from "../lib/bridgeAuth";

interface Props {
  profile: Profile | null;
  eligibility: MenuEligibility;
  onClose: () => void;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.floor(n)));
}

/* ID joueur — priorité : gameId Bridge Eats > 6 chiffres du tel > UUID */
function buildPlayerId(gameId: string | undefined, phone: string | null | undefined, id: string | undefined): string {
  if (gameId) return gameId;
  if (phone) {
    const digits = phone.replace(/[^\d]/g, "").slice(0, 6);
    if (digits.length >= 6) return `BR-${digits}`;
  }
  const code = (id ?? "XXXXXX").toString().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `BR-${code}`;
}

export function ProfilePage({ profile, eligibility, onClose }: Props) {
  const { t } = useT();
  const [name, setName] = useState(profile?.username ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url ?? null);
  const [photoFlash, setPhotoFlash] = useState<"saved" | "tooLarge" | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Liaison numéro de téléphone + gameId Bridge Eats ── */
  const bridgeAuth = getBridgeAuth();
  const linkedPhone = (profile as (Profile & { bridge_phone?: string }) | null)?.bridge_phone
    ?? bridgeAuth?.phone ?? null;
  const gameId = bridgeAuth?.gameId;
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneState, setPhoneState] = useState<"idle"|"saving"|"ok"|"err">("idle");


  useEffect(() => {
    setName(profile?.username ?? "");
    setAvatar(profile?.avatar_url ?? null);
  }, [profile?.username, profile?.avatar_url]);

  const compressToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 256;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("image"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("reader"));
    reader.readAsDataURL(file);
  });

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressToDataUrl(file);
      if (dataUrl.length > 200_000) {
        setPhotoFlash("tooLarge");
        setTimeout(() => setPhotoFlash(null), 2400);
        return;
      }
      const updated = await updateAvatar(dataUrl);
      if (updated) {
        setAvatar(dataUrl);
        setPhotoFlash("saved");
        setTimeout(() => setPhotoFlash(null), 1800);
      }
    } catch {
      setPhotoFlash("tooLarge");
      setTimeout(() => setPhotoFlash(null), 2400);
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    let cancel = false;
    const periodDiamonds = (profile as (Profile & { period_diamonds?: number }) | null)?.period_diamonds ?? 0;
    (async () => {
      const r = await getMyRank(periodDiamonds);
      if (!cancel) setRank(r);
    })();
    return () => { cancel = true; };
  }, [profile]);

  const handleSavePhone = async () => {
    const trimmed = phoneInput.trim();
    const auth = setBridgeAuthManual(trimmed);
    if (!auth) { setPhoneState("err"); return; }
    setPhoneState("saving");
    await registerBridgePhone(trimmed);
    setPhoneState("ok");
    setTimeout(() => { setPhoneOpen(false); setPhoneState("idle"); }, 1500);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const updated = await updateUsername(name);
    setSaving(false);
    if (updated) {
      setSavedFlash(true);
      setEditingName(false);
      setTimeout(() => setSavedFlash(false), 1800);
    }
  };

  const periodDiamonds = (profile as (Profile & { period_diamonds?: number }) | null)?.period_diamonds ?? 0;
  /* 💎 : max(Bridge Eats, Supabase) pour ne jamais afficher moins que réel */
  const totalDiamonds = Math.max(bridgeAuth?.diamonds ?? 0, profile?.diamonds_collected ?? 0);
  /* Priorité avatar : Bridge Eats profile pic > photo uploadée > défaut */
  const avatarSrc = (bridgeAuth?.avatarUrl && bridgeAuth.avatarUrl.length > 0)
    ? bridgeAuth.avatarUrl
    : (avatar && avatar.length > 0 ? avatar : "/assets/player-avatar.jpeg");
  const playerId = buildPlayerId(gameId, linkedPhone, profile?.id);
  const displayName = profile?.username ?? playerId;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 90,
      background: "linear-gradient(180deg,#00170a 0%,#000e06 100%)",
      overflowY: "auto", overflowX: "hidden",
      WebkitOverflowScrolling: "touch" as never,
      pointerEvents: "auto",
      fontFamily: "'Segoe UI','Arial',sans-serif",
    }}>
      <style>{`
        @keyframes spinProf { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes popIn { from{transform:scale(0.85);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes shimmer {
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
      `}</style>

      {/* ── HERO HEADER — avatar grand format en haut ── */}
      <div style={{
        position: "relative",
        width: "100%",
        background: "linear-gradient(180deg,#003d1a 0%,#001f0d 60%,#00170a 100%)",
        paddingTop: 56, paddingBottom: 24,
        textAlign: "center",
        borderBottom: "1px solid rgba(0,230,118,0.18)",
        flexShrink: 0,
      }}>
        {/* Bouton × en haut à droite dans le hero */}
        <button onClick={onClose} style={{
          position: "fixed", top: 12, right: 12, zIndex: 9999,
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(0,0,0,0.7)", color: "#a5d6a7",
          border: "1.5px solid rgba(0,230,118,0.4)",
          fontSize: 22, fontWeight: 700,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)",
        }}>×</button>

        {/* Avatar large cliquable */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        <div
          onClick={handlePickPhoto}
          title={t("profile.changePhoto")}
          style={{ position: "relative", width: 130, height: 130, margin: "0 auto 10px", cursor: "pointer" }}
        >
          <div style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            background: "conic-gradient(from 0deg,#00e676,#00c853,#69f0ae,#00e676)",
            animation: "spinProf 5s linear infinite",
          }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            backgroundImage: `url(${avatarSrc})`,
            backgroundSize: "cover", backgroundPosition: "center",
            border: "3px solid #001a0a",
            boxShadow: "0 0 32px rgba(0,230,118,0.6)",
          }} />
          <div style={{
            position: "absolute", bottom: 4, right: 4,
            width: 32, height: 32, borderRadius: "50%",
            background: "#00c853", border: "2px solid #001a0a",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
          }}>📷</div>
          {uploadingPhoto && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(0,0,0,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>⏳</div>
          )}
        </div>

        {/* Flash photo */}
        {photoFlash === "saved" && (
          <div style={{ fontSize: 12, color: "#00e676", fontWeight: 700, marginBottom: 4 }}>
            {t("profile.photoSaved")}
          </div>
        )}
        {photoFlash === "tooLarge" && (
          <div style={{ fontSize: 12, color: "#ff8a80", fontWeight: 700, marginBottom: 4 }}>
            {t("profile.photoTooLarge")}
          </div>
        )}

        {/* Label "Bridge Game" comme sur photo 2 */}
        <div style={{
          display: "inline-block",
          background: "rgba(0,200,83,0.15)",
          border: "1px solid rgba(0,230,118,0.3)",
          color: "#69f0ae", fontSize: 11, fontWeight: 800,
          letterSpacing: 1.2, padding: "3px 12px", borderRadius: 999,
          marginBottom: 8, textTransform: "uppercase",
        }}>🦈 SAFI RUNNER</div>

        {/* ID joueur */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 26, color: "#fff", fontWeight: 900, letterSpacing: 2,
            fontFamily: "'Fredoka', monospace",
            textShadow: "0 0 16px rgba(0,230,118,0.4)",
            marginBottom: 6,
          }} dir="ltr">{playerId}</div>

          {/* Liaison numéro — intégrée sous l'ID */}
          {!linkedPhone && !phoneOpen && (
            <button
              onClick={() => setPhoneOpen(true)}
              style={{
                background: "rgba(0,230,118,0.12)",
                border: "1px solid rgba(0,230,118,0.4)",
                color: "#69f0ae", borderRadius: 999,
                padding: "5px 14px", fontSize: 11, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
              }}
            >📱 Lier mon numéro Bridge Eats</button>
          )}

          {linkedPhone && (
            <div style={{ fontSize: 11, color: "#69f0ae", opacity: 0.7 }}>
              📱 {linkedPhone} <span
                onClick={() => { setPhoneInput(linkedPhone); setPhoneOpen(true); }}
                style={{ cursor: "pointer", textDecoration: "underline", marginLeft: 6 }}
              >modifier</span>
            </div>
          )}

          {phoneOpen && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => { setPhoneInput(e.target.value); setPhoneState("idle"); }}
                placeholder="Ex : 0612345678"
                inputMode="tel"
                autoFocus
                style={{
                  width: 160, background: "rgba(0,0,0,0.5)", color: "#fff",
                  border: `1px solid ${phoneState === "err" ? "#ef5350" : "rgba(0,230,118,0.4)"}`,
                  borderRadius: 10, padding: "8px 10px", fontSize: 14,
                  fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={handleSavePhone}
                disabled={phoneInput.trim().length < 8 || phoneState === "saving"}
                style={{
                  background: "linear-gradient(135deg,#00c853,#00e676)",
                  color: "#003311", border: "none", borderRadius: 10,
                  padding: "8px 14px", fontSize: 13, fontWeight: 900,
                  cursor: "pointer", opacity: phoneInput.trim().length < 8 ? 0.5 : 1,
                }}
              >
                {phoneState === "saving" ? "⏳" : phoneState === "ok" ? "✓" : "OK"}
              </button>
              <button
                onClick={() => { setPhoneOpen(false); setPhoneState("idle"); }}
                style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#888", borderRadius: 10, padding: "8px 10px",
                  fontSize: 13, cursor: "pointer",
                }}
              >✕</button>
            </div>
          )}
          {phoneState === "err" && phoneOpen && (
            <div style={{ fontSize: 11, color: "#ef5350", marginTop: 4 }}>
              Numéro invalide — ex : 0612345678
            </div>
          )}
        </div>

      </div>{/* fin hero */}

      {/* ── CONTENU SCROLLABLE sous le hero ── */}
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 20px 80px", textAlign: "center" }}>

        {/* ── Badge diamants (comme le badge doré de Bridge Eats) ── */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg,#f9a825,#ffd54f,#f9a825)",
          backgroundSize: "200% auto",
          animation: "shimmer 3s linear infinite",
          color: "#1a0a00", fontWeight: 900,
          fontFamily: "'Bangers', sans-serif",
          fontSize: 22, letterSpacing: 1,
          padding: "10px 24px", borderRadius: 999,
          boxShadow: "0 6px 22px rgba(249,168,37,0.45)",
          marginBottom: 28,
        }}>
          <span style={{ fontSize: 26 }}>💎</span>
          <span dir="ltr">{formatNum(totalDiamonds)}</span>
          <span style={{ fontSize: 13, fontFamily: "'Segoe UI',sans-serif", fontWeight: 800 }}>
            {t("hud.diamonds")}
          </span>
        </div>

        {/* ── Infos rapides : cycle + rang ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <InfoPill
            label={t("profile.cycleDiamonds")}
            value={`${formatNum(periodDiamonds)} 💎`}
            accent="#90caf9"
          />
          <InfoPill
            label={t("profile.rank")}
            value={rank ? `#${rank}` : t("profile.rankNone")}
            accent="#69f0ae"
          />
        </div>

        {/* ── Nom d'affichage ── */}
        <div style={{
          background: "rgba(0,40,20,0.9)",
          border: "1.5px solid rgba(0,230,118,0.22)",
          borderRadius: 16, padding: "14px 16px",
          marginBottom: 14, textAlign: "left",
        }}>
          <div style={{
            fontSize: 10, color: "#69f0ae", fontWeight: 700,
            letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8,
          }}>{t("profile.usernameLabel")}</div>

          {editingName ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                autoFocus
                placeholder={t("profile.usernamePlaceholder")}
                style={{
                  flex: 1, background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(0,230,118,0.3)", borderRadius: 10,
                  padding: "9px 12px", color: "#fff", fontSize: 14, fontWeight: 700,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || name.trim() === (profile?.username ?? "")}
                style={{
                  background: savedFlash
                    ? "linear-gradient(135deg,#00c853,#00e676)"
                    : "linear-gradient(135deg,rgba(0,200,83,0.9),rgba(0,230,118,0.9))",
                  color: "#003311", border: "none", borderRadius: 10,
                  padding: "9px 14px", fontSize: 12, fontWeight: 900,
                  cursor: "pointer", whiteSpace: "nowrap",
                  opacity: (saving || !name.trim() || name.trim() === (profile?.username ?? "")) ? 0.55 : 1,
                }}
              >
                {savedFlash ? "✓" : t("profile.usernameSave")}
              </button>
            </div>
          ) : (
            <div
              onClick={() => setEditingName(true)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>
                {displayName}
              </span>
              <span style={{ fontSize: 12, color: "#69f0ae", fontWeight: 700 }}>✏️</span>
            </div>
          )}
        </div>

        {/* ── Engagement Bridge ── */}
        <div style={{
          background: "rgba(0,40,20,0.9)",
          border: "1.5px solid rgba(0,230,118,0.22)",
          borderRadius: 16, padding: "14px 16px",
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 10, color: "#69f0ae", fontWeight: 700,
            letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10,
            textAlign: "left",
          }}>{t("profile.engagementTitle")}</div>
          <Row label={t("profile.streak")} value={`${eligibility.qualifyingDays} / 3`} />
          <Row label={t("profile.menusEarned")} value={String(eligibility.menusEarned)} />
          <Row label={t("profile.menusClaimed")} value={String(eligibility.menusClaimed)} />
        </div>

        {/* ── Retirer photo (secondaire, discret) ── */}
        {avatar && avatar.length > 0 && (
          <button
            onClick={async () => {
              setUploadingPhoto(true);
              const ok = await updateAvatar(null);
              if (ok) setAvatar(null);
              setUploadingPhoto(false);
            }}
            disabled={uploadingPhoto}
            style={{
              background: "transparent", color: "#5e7a6c",
              border: "1px solid rgba(0,230,118,0.12)", borderRadius: 10,
              padding: "8px 18px", fontSize: 12, cursor: "pointer",
              fontFamily: "'Segoe UI', sans-serif",
            }}
          >{t("profile.removePhoto")}</button>
        )}

      </div>
    </div>
  );
}

/* ── Sous-composants ── */
function InfoPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      flex: 1,
      background: "rgba(0,40,20,0.9)",
      border: `1.5px solid ${accent}33`,
      borderRadius: 14, padding: "10px 10px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: "#fff", fontWeight: 900, fontFamily: "'Bangers', sans-serif", letterSpacing: 0.5 }} dir="ltr">
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px dashed rgba(0,230,118,0.1)",
    }}>
      <span style={{ fontSize: 11, color: "#9ec9b3", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 800 }} dir="ltr">{value}</span>
    </div>
  );
}
