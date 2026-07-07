/* ──────────────────────────────────────────────────────────────────
   AUTHENTIFICATION VIA BRIDGE EATS — single sign-on
   ─────────────────────────────────────────────────────────────────
   Bridge Eats ouvre le jeu avec ces paramètres URL :
     ?phone=0764794856&gameId=BR-076479K&userId=clerk_xxx
       &token=xxx&saveUrl=https://...
   Le jeu :
     1. Lit les params, les valide, les persiste en localStorage
        et nettoie l'URL.
     2. Après chaque partie → POST à saveUrl + postMessage au parent.
     3. Persist tant que le joueur n'efface pas son storage.
   ────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "safi_runner_bridge_auth";
export const EVENT_NAME = "safi:bridge-auth";

export type BridgeAuth = {
  email: string;
  phone: string;
  /* Nouveaux champs Bridge Eats v2 */
  gameId?: string;    // BR-076479K — affiché dans le jeu
  userId?: string;    // ID Clerk du joueur
  token?: string;     // token de vérification
  saveUrl?: string;   // endpoint POST pour sauvegarder les 💎
  avatarUrl?: string; // URL photo de profil Bridge Eats
  displayName?: string; // Nom d'affichage Bridge Eats
  diamonds?: number;  // Total 💎 actuel dans le compte Bridge Eats
};

/* Format MA : +212XXXXXXXXX, 212XXXXXXXXX ou 0XXXXXXXXX (9-15 chiffres). */
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length < 9 || cleaned.length > 15) return null;
  return cleaned;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/* Lit les query params et persiste l'auth. Supporte l'ancien format
   (email + phone) et le nouveau (phone + gameId + token + saveUrl). */
export function consumeUrlAuth(): BridgeAuth | null {
  try {
    const url = new URL(window.location.href);

    const phoneRaw = (url.searchParams.get("phone") || "").trim();
    const phone = normalizePhone(phoneRaw);
    if (!phone) return null;

    const emailRaw = (url.searchParams.get("email") || "").trim().toLowerCase();
    const email = emailRaw && isValidEmail(emailRaw)
      ? emailRaw
      : `${phone}@bridge.local`;

    const gameId      = url.searchParams.get("gameId")      || undefined;
    const userId      = url.searchParams.get("userId")      || undefined;
    const token       = url.searchParams.get("token")       || undefined;
    const saveUrl     = url.searchParams.get("saveUrl")     || undefined;
    const avatarUrl   = url.searchParams.get("avatarUrl")   || undefined;
    const displayName = url.searchParams.get("displayName") || undefined;
    const diamondsRaw = url.searchParams.get("diamonds");
    const diamonds    = diamondsRaw !== null ? Math.max(0, parseInt(diamondsRaw, 10) || 0) : undefined;

    const auth: BridgeAuth = { email, phone, gameId, userId, token, saveUrl, avatarUrl, displayName, diamonds };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));

    /* Nettoie l'URL — on ne veut pas exposer le token dans l'historique. */
    ["email", "phone", "gameId", "userId", "token", "saveUrl", "avatarUrl", "displayName", "diamonds"].forEach(
      (p) => url.searchParams.delete(p)
    );
    window.history.replaceState({}, "", url.toString());

    window.dispatchEvent(new Event(EVENT_NAME));
    return auth;
  } catch {
    return null;
  }
}

/* Récupère l'auth en cours (URL > localStorage). */
export function getBridgeAuth(): BridgeAuth | null {
  try {
    const fromUrl = consumeUrlAuth();
    if (fromUrl) return fromUrl;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BridgeAuth>;
    if (!parsed?.phone) return null;
    const email = parsed.email ?? `${parsed.phone}@bridge.local`;
    return {
      email,
      phone:       parsed.phone,
      gameId:      parsed.gameId,
      userId:      parsed.userId,
      token:       parsed.token,
      saveUrl:     parsed.saveUrl,
      avatarUrl:   parsed.avatarUrl,
      displayName: parsed.displayName,
      diamonds:    parsed.diamonds,
    };
  } catch {
    return null;
  }
}

/* Saisie manuelle — le joueur tape son numéro directement dans le jeu. */
export function setBridgeAuthManual(phoneRaw: string, email?: string): BridgeAuth | null {
  const phone = normalizePhone(phoneRaw.trim());
  if (!phone) return null;
  const e = (email ?? "").trim().toLowerCase();
  const finalEmail = e && isValidEmail(e) ? e : `${phone}@bridge.local`;

  /* Préserver saveUrl/token existants si déjà stockés */
  let existing: Partial<BridgeAuth> = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) existing = JSON.parse(raw);
  } catch { /* ignore */ }

  const auth: BridgeAuth = {
    email:       finalEmail,
    phone,
    gameId:      existing.gameId,
    userId:      existing.userId,
    token:       existing.token,
    saveUrl:     existing.saveUrl,
    avatarUrl:   existing.avatarUrl,
    displayName: existing.displayName,
    diamonds:    existing.diamonds,
  };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT_NAME));
  return auth;
}

export function clearBridgeAuth(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch { /* ignore */ }
}

/* Permet à Bridge Eats parent d'envoyer l'auth via postMessage
   (utile quand le jeu est embarqué en iframe).
   Format v1 : { type: "bridge-auth", email, phone }
   Format v2 : { type: "bridge-auth", phone, gameId, userId, token, saveUrl } */
export function listenForParentAuth(onUpdate: (auth: BridgeAuth) => void): () => void {
  const handler = (e: MessageEvent) => {
    const d = e.data as {
      type?: string; email?: string; phone?: string;
      gameId?: string; userId?: string; token?: string; saveUrl?: string;
      avatarUrl?: string; displayName?: string; diamonds?: number;
    };
    if (d?.type !== "bridge-auth" || !d.phone) return;
    const phone = normalizePhone(d.phone);
    if (!phone) return;
    const email = d.email && isValidEmail(d.email)
      ? d.email.toLowerCase()
      : `${phone}@bridge.local`;
    const auth: BridgeAuth = {
      email, phone,
      gameId:      d.gameId,
      userId:      d.userId,
      token:       d.token,
      saveUrl:     d.saveUrl,
      avatarUrl:   d.avatarUrl,
      displayName: d.displayName,
      diamonds:    typeof d.diamonds === "number" ? Math.max(0, d.diamonds) : undefined,
    };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth)); } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVENT_NAME));
    onUpdate(auth);
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/* ── Envoi des 💎 vers Bridge Eats ────────────────────────────────
   Appelé après chaque game over.
   1. POST à saveUrl si disponible
   2. postMessage({ type:"safi-diamonds", diamonds }) au parent (iframe)
   Les deux sont tentés indépendamment (l'un n'empêche pas l'autre). */
export async function sendDiamondsToParent(diamonds: number): Promise<void> {
  if (diamonds <= 0) return;
  const auth = getBridgeAuth();

  /* 1. POST à saveUrl */
  if (auth?.saveUrl) {
    try {
      await fetch(auth.saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diamonds }),
      });
    } catch (err) {
      console.warn("sendDiamondsToParent POST failed:", err);
    }
  }

  /* 2. postMessage au parent (iframe ou opener) */
  const msg = { type: "safi-diamonds", diamonds, gameId: auth?.gameId };
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, "*");
    }
    if (window.opener) {
      (window.opener as Window).postMessage(msg, "*");
    }
  } catch { /* ignore */ }
}
