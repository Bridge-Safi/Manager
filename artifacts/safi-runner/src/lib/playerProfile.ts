import { supabase, isSupabaseConfigured, type Profile } from "./supabase";
import { getDeviceId, getHardwarePrefix } from "./deviceFingerprint";
import { getBridgeAuth } from "./bridgeAuth";

const PLAYER_NAME_KEY = "safi_runner_player_name";
const MAX_DIAMONDS_PER_SECOND = 2.0; // anti-cheat cap, > 6000/h = 1.67/s

/* ─── Classement à fenêtre glissante de 3 jours ────────────────
   Le TOP 7 se réinitialise tous les 3 jours. On utilise un ancrage
   fixe (1er janvier 2026) et des cycles strictement de 72h, pour
   que TOUS les joueurs partagent la même borne (peu importe leur
   fuseau horaire — calculé en UTC). */
const LEADER_CYCLE_DAYS = 3;
const LEADER_EPOCH_MS = Date.UTC(2026, 0, 1); // 2026-01-01 00:00 UTC
const DAY_MS = 24 * 60 * 60 * 1000;

/* Renvoie le 1er jour du cycle courant au format ISO YYYY-MM-DD. */
export function currentLeaderCycleStart(now: number = Date.now()): string {
  const elapsedDays = Math.floor((now - LEADER_EPOCH_MS) / DAY_MS);
  const cycleIndex = Math.floor(elapsedDays / LEADER_CYCLE_DAYS);
  const startMs = LEADER_EPOCH_MS + cycleIndex * LEADER_CYCLE_DAYS * DAY_MS;
  return new Date(startMs).toISOString().slice(0, 10); // YYYY-MM-DD
}

/* Renvoie le nb de SECONDES restantes avant la fin du cycle courant
   (= début du prochain cycle). Utilisé par l'UI pour afficher un
   compte à rebours "Réinitialisation dans Xj Yh". */
export function secondsUntilNextLeaderCycle(now: number = Date.now()): number {
  const elapsedDays = Math.floor((now - LEADER_EPOCH_MS) / DAY_MS);
  const cycleIndex = Math.floor(elapsedDays / LEADER_CYCLE_DAYS);
  const nextStartMs = LEADER_EPOCH_MS + (cycleIndex + 1) * LEADER_CYCLE_DAYS * DAY_MS;
  return Math.max(0, Math.floor((nextStartMs - now) / 1000));
}

/* ─── Programme Bridge — règles officielles (3 jours consécutifs) ─
   MATH OFFICIELLE :
     • Rythme : 6 000 💎 / heure de jeu
     • Base : 3 jours × 3h × 6 000 = 54 000 💎
     • Bonus : 3 jours × +2 000 💎 (1h supplémentaire) = 6 000 💎
     • TOTAL = 60 000 💎 → livraison 100% GRATUITE
     • Si le joueur ne fait PAS l'heure bonus, le jeu s'arrête net à 3h
       et il doit revenir le lendemain.
     • Pour la livraison 12 DH (2h) : même logique de complément payant
       — s'il manque des 💎 à la fin des 3 jours, le joueur paie la
       différence en DH (1 000 💎 = 5 DH).
   ─────────────────────────────────────────────────────────────── */
export const DIAMONDS_PER_MENU      = 60_000;         // objectif 60 000 💎 (3 jours)
export const REQUIRED_PLAY_DAYS     = 3;
export const REQUIRED_SECONDS_PER_DAY = 10_800;       // 3h / jour
export const TARGET_SECONDS_PER_DAY   = 10_800;       // 3h cible / jour
export const DAYS_BEFORE_CLAIM      = 4;              // J1 = 1ᵉʳ jour ; réclame au J4
export const TOTAL_REQUIRED_HOURS   = 9;              // 9h cumulées sur 3 jours (3h × 3)
export const DIAMONDS_PER_HOUR      = 6_000;          // rythme cible

/* Bonus livraison gratuite : 1h DE PLUS chaque jour (= 4h/jour)
   → +2 000 💎 / jour bonus, soit 6 000 💎 cumulés sur 3 jours
   → 54 000 (base) + 6 000 (bonus) = 60 000 💎 = livraison 100% offerte. */
export const BONUS_EXTRA_SECONDS    = 3_600;          // 1h en plus / jour
export const BONUS_DIAMONDS         = 2_000;          // bonus / jour
export const BONUS_TRIGGER_SECONDS  = REQUIRED_SECONDS_PER_DAY + BONUS_EXTRA_SECONDS; // 4h

/* Complément payant : 10 000 💎 manquants = 5 DH (arrondi au palier sup.). */
export const DIAMONDS_PER_PACK     = 10_000;
export const DH_PER_PACK           = 5;
/* 1 DH = 2 000 💎. */
export const DIAMONDS_PER_DIRHAM   = DIAMONDS_PER_PACK / DH_PER_PACK;

/* Convertit un nombre de 💎 manquants en DH à payer.
   Tarif : par paliers de 10 000 💎 = 5 DH (arrondi au palier supérieur). */
export function shortfallDh(missingDiamonds: number): number {
  if (missingDiamonds <= 0) return 0;
  return Math.ceil(missingDiamonds / DIAMONDS_PER_PACK) * DH_PER_PACK;
}

/* ─── Types ──────────────────────────────────────────────────── */
export type PlayDay = { date: string; playSeconds: number };

/* Raison de blocage exprimée comme clé i18n + paramètres,
   localisée par l'UI via t(). */
export type BlockerInfo =
  | { key: "blocker.diamonds"; n: number }
  | { key: "blocker.days" | "blocker.daysPlural"; n: number }
  | { key: "blocker.wait" | "blocker.waitPlural"; n: number };

export type MenuEligibility = {
  qualifyingDays: number;          // nb de jours avec ≥ 3h
  daysSinceFirstPlay: number;      // nb de jours calendaires depuis le 1ᵉʳ jour
  todaySecondsRemaining: number;   // temps restant à jouer aujourd'hui pour valider la journée
  diamondsCollected: number;
  menusEarned: number;
  menusClaimed: number;
  menusAvailable: number;
  eligible: boolean;               // peut réclamer un menu MAINTENANT
  blocker: BlockerInfo | null;     // raison du blocage (à afficher via t())
};

export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) ?? "Joueur Anonyme";
}

/* ─── Auth ──────────────────────────────────────────────────── */
async function getOrCreateAuthUser(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) return sessionData.session.user.id;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) { console.warn("signInAnonymously error:", error.message); return null; }
    return data.user?.id ?? null;
  } catch (err) {
    console.error("getOrCreateAuthUser:", err);
    return null;
  }
}

/* ─── Lookup canonique d'un profil ─────────────────────────────────
   PRIORITÉ : bridge_phone > device_fingerprint > hardware_prefix.
   C'est le téléphone Bridge Eats qui suit le joueur d'un appareil à
   l'autre. L'empreinte appareil n'est qu'un fallback (et un marqueur
   "appareil actif" — voir claimDeviceForProfile). */
async function findByBridgePhone(phone: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("bridge_phone", phone)
      .maybeSingle();
    if (error) return null;
    return data as Profile | null;
  } catch {
    return null;
  }
}

async function findByDevice(): Promise<Profile | null> {
  /* 1. Si Bridge auth dispo → lookup par téléphone (cross-device). */
  const auth = getBridgeAuth();
  if (auth?.phone) {
    const byPhone = await findByBridgePhone(auth.phone);
    if (byPhone) return byPhone;
  }
  /* 2. Fallback : empreinte appareil uniquement par device_fingerprint
     (localStorage). On n'utilise PLUS hardware_prefix seul pour éviter
     qu'un autre utilisateur sur le même téléphone hérite du profil. */
  try {
    const deviceId = getDeviceId();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("device_fingerprint", deviceId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data as Profile | null;
  } catch {
    return null;
  }
}

/* Marque CE téléphone comme l'appareil actif du profil. Tout appareil
   précédemment connecté avec le même bridge_phone verra son
   device_fingerprint ne plus matcher → verifyActiveDevice() le
   déconnectera à la prochaine vérification. */
async function claimDeviceForProfile(profileId: string): Promise<void> {
  try {
    await supabase
      .from("profiles")
      .update({
        device_fingerprint: getDeviceId(),
        hardware_prefix: getHardwarePrefix(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
  } catch (err) {
    console.warn("claimDeviceForProfile:", err);
  }
}

/* Vérifie que CE téléphone est toujours l'appareil actif du profil.
   Si le joueur s'est connecté ailleurs avec le même n°, le
   device_fingerprint serveur ne matche plus → on retourne false et
   l'AuthGate forcera une déconnexion locale.
   Retourne `true` si pas de bridge_phone (rien à protéger), ou si
   Supabase répond mal (on ne kick pas en cas de doute). */
export async function verifyActiveDevice(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const auth = getBridgeAuth();
  if (!auth?.phone) return true;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("device_fingerprint")
      .eq("bridge_phone", auth.phone)
      .maybeSingle();
    if (error || !data) return true;
    const serverFp = (data as { device_fingerprint?: string }).device_fingerprint;
    if (!serverFp) return true;
    return serverFp === getDeviceId();
  } catch {
    return true;
  }
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch { return null; }
}

export async function ensureProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const userId = await getOrCreateAuthUser();
    if (!userId) return null;

    const auth = getBridgeAuth();
    const deviceId = getDeviceId();
    const hwPrefix = getHardwarePrefix();

    /* 1. Si Bridge auth dispo → on cherche d'abord par téléphone.
       C'est le cas typique de connexion sur un nouvel appareil :
       le profil avec tous les 💎 existe déjà côté serveur. */
    if (auth?.phone) {
      const byPhone = await findByBridgePhone(auth.phone);
      if (byPhone) {
        /* Si CE téléphone n'est pas l'appareil actif → on le revendique.
           Les autres appareils seront déconnectés par verifyActiveDevice. */
        if (byPhone.device_fingerprint !== deviceId) {
          await claimDeviceForProfile(byPhone.id);
          return { ...byPhone, device_fingerprint: deviceId, hardware_prefix: hwPrefix };
        }
        return byPhone;
      }
    }

    /* 2. Sinon, on cherche par empreinte appareil (cas anonyme). */
    const byDevice = await findByDevice();
    if (byDevice) {
      /* PROTECTION MULTI-UTILISATEUR : si ce profil appartient à un
         autre numéro Bridge Eats, on ne le rend PAS au nouvel utilisateur.
         On laisse tomber et on crée un nouveau profil plus bas.
         Cela évite que deux comptes partagent le même téléphone physique
         et héritent des 💎 de l'autre. */
      if (
        auth?.phone &&
        byDevice.bridge_phone &&
        (byDevice as Profile & { bridge_phone?: string }).bridge_phone !== auth.phone
      ) {
        /* Profil d'un autre utilisateur Bridge — on ignore complètement. */
      } else {
        /* Le joueur vient juste de se connecter avec Bridge auth →
           on attache son téléphone au profil de l'appareil. */
        if (auth?.phone && !byDevice.bridge_phone) {
          try {
            await supabase
              .from("profiles")
              .update({
                bridge_phone: auth.phone,
                player_email: auth.email,
                updated_at: new Date().toISOString(),
              })
              .eq("id", byDevice.id);
            return { ...byDevice, bridge_phone: auth.phone, player_email: auth.email };
          } catch { /* colonnes absentes ou conflit unicité — on garde le profil */ }
        }
        return byDevice;
      }
    }

    /* 3. Aucun profil existant → on en crée un et on y attache
       directement le téléphone Bridge si dispo. */
    const { data: existing, error: fetchErr } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (fetchErr && fetchErr.code !== "PGRST116") {
      console.error("ensureProfile fetch:", fetchErr);
      return null;
    }
    if (existing) return existing as Profile;

    const insertData: Record<string, unknown> = {
      id: userId,
      username: getPlayerName(),
      sardines_points: 0,
      diamonds_collected: 0,
    };
    try {
      const testCol = await supabase.from("profiles").select("device_fingerprint").limit(1);
      if (!testCol.error) {
        insertData.device_fingerprint = deviceId;
        insertData.hardware_prefix = hwPrefix;
      }
    } catch { /* colonnes absentes */ }
    if (auth?.phone) {
      insertData.bridge_phone = auth.phone;
      insertData.player_email = auth.email;
    }

    const { data: created, error: insertErr } = await supabase
      .from("profiles").insert(insertData).select().single();
    if (insertErr) { console.error("ensureProfile insert:", insertErr); return null; }
    return created as Profile;
  } catch (err) {
    console.error("ensureProfile exception:", err);
    return null;
  }
}

/* ─── Helpers date ──────────────────────────────────────────── */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO + "T00:00:00");
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

/* ─── Sauvegarde du score (anti-triche) ─────────────────────── */
export async function saveScore(
  diamondsSession: number,
  sardinesSession: number,
  playTimeSeconds: number,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  let targetId: string | null = null;
  const byDevice = await findByDevice();
  if (byDevice) {
    targetId = byDevice.id;
  } else {
    targetId = await getCurrentUserId();
  }
  if (!targetId) return;

  const maxAllowed = Math.ceil(playTimeSeconds * MAX_DIAMONDS_PER_SECOND);
  const validatedDiamonds = Math.min(Math.max(0, Math.floor(diamondsSession)), maxAllowed);
  const validatedSardines = Math.max(0, Math.floor(sardinesSession));

  try {
    const { data: current } = await supabase
      .from("profiles").select("diamonds_collected, sardines_points, period_diamonds, period_start").eq("id", targetId).single();
    const existing = current as (Profile & { period_diamonds?: number; period_start?: string }) | null;

    /* ── Fenêtre glissante : RESET si on entre dans un nouveau cycle ── */
    const cycleStart = currentLeaderCycleStart();
    const inSameCycle = existing?.period_start === cycleStart;
    const periodBaseline = inSameCycle ? (existing?.period_diamonds ?? 0) : 0;

    const updates: Record<string, unknown> = {
      diamonds_collected: (existing?.diamonds_collected ?? 0) + validatedDiamonds,
      sardines_points:    (existing?.sardines_points ?? 0)    + validatedSardines,
      period_diamonds:    periodBaseline + validatedDiamonds,
      period_start:       cycleStart,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").update(updates).eq("id", targetId);
    /* 42703 = colonne manquante → la migration SQL n'a pas été passée.
       On retente sans les colonnes period_* pour rester fonctionnel. */
    if (error && error.code === "42703") {
      delete updates.period_diamonds;
      delete updates.period_start;
      await supabase.from("profiles").update(updates).eq("id", targetId);
    }
  } catch (err) {
    console.error("saveScore:", err);
  }
}

/* ─── Enregistre la session du jour (suivi engagement) ─────────
   Appelle la RPC Postgres `add_play_session` qui fait :
   - append/increment ATOMIQUE dans play_days (anti-race)
   - utilise CURRENT_DATE côté SERVEUR (anti triche horloge)
   - initialise first_play_date si absent
   - plafonne à 4h par session
   Échec silencieux si la fonction n'existe pas encore en base.
   ─────────────────────────────────────────────────────────────── */
export async function recordPlaySession(playTimeSeconds: number): Promise<void> {
  if (!isSupabaseConfigured || playTimeSeconds < 1) return;

  let targetId: string | null = null;
  const byDevice = await findByDevice();
  if (byDevice) targetId = byDevice.id;
  else targetId = await getCurrentUserId();
  if (!targetId) return;

  try {
    const { error } = await supabase.rpc("add_play_session", {
      p_id: targetId,
      p_seconds: Math.floor(playTimeSeconds),
    });
    /* 42883 = function does not exist, 42703 = column missing → on ignore */
    if (error && error.code !== "42883" && error.code !== "42703") {
      console.error("recordPlaySession rpc:", error);
    }
  } catch (err) {
    console.error("recordPlaySession:", err);
  }
}

/* ─── Plus longue série de jours consécutifs qualifiants (≥ 3h)
   Utilisée par l'UI pour afficher la progression "X / 5".
   La validation finale stricte est faite côté SERVEUR dans claim_menu.
   ─────────────────────────────────────────────────────────────── */
export function longestQualifyingStreak(playDays: PlayDay[]): number {
  const dates = playDays
    .filter((d) => d.playSeconds >= REQUIRED_SECONDS_PER_DAY)
    .map((d) => d.date)
    .sort();
  if (dates.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

/* ─── Calcule l'éligibilité au menu gratuit ────────────────────
   Pure function : ne touche pas la base, marche sur le Profile passé.
   ─────────────────────────────────────────────────────────────── */
export function getMenuEligibility(profile: Profile | null): MenuEligibility {
  /* On prend le MAX entre diamonds_collected (cumulatif) et period_diamonds
     (cycle en cours) pour corriger les cas où l'une des colonnes est à 0
     suite à un bug de synchronisation antérieur. */
  const diamondsCollected = Math.max(
    profile?.diamonds_collected ?? 0,
    profile?.period_diamonds ?? 0,
  );
  const menusClaimed      = profile?.menus_claimed ?? 0;
  const menusEarnedRaw    = Math.floor(diamondsCollected / DIAMONDS_PER_MENU);
  const menusAvailable    = Math.max(0, menusEarnedRaw - menusClaimed);

  const playDays: PlayDay[] = Array.isArray(profile?.play_days) ? profile!.play_days! : [];
  /* La règle "5 jours CONSÉCUTIFS" est appliquée côté serveur (claim_menu RPC).
     Côté client on calcule la plus longue série actuelle pour l'UI. */
  const qualifyingDays = longestQualifyingStreak(playDays);

  const today = todayISO();
  const todayEntry = playDays.find((d) => d.date === today);
  const todaySecondsRemaining = Math.max(
    0,
    REQUIRED_SECONDS_PER_DAY - (todayEntry?.playSeconds ?? 0)
  );

  const firstPlayDate = profile?.first_play_date ?? today;
  const daysSinceFirstPlay = daysBetween(firstPlayDate, today) + 1; // J1 = 1

  /* Conditions cumulatives pour réclamer */
  let eligible = true;
  let blocker: BlockerInfo | null = null;

  if (menusAvailable < 1) {
    eligible = false;
    const left = DIAMONDS_PER_MENU - (diamondsCollected % DIAMONDS_PER_MENU);
    blocker = { key: "blocker.diamonds", n: left };
  } else if (qualifyingDays < REQUIRED_PLAY_DAYS) {
    eligible = false;
    const missing = REQUIRED_PLAY_DAYS - qualifyingDays;
    blocker = { key: missing > 1 ? "blocker.daysPlural" : "blocker.days", n: missing };
  } else if (daysSinceFirstPlay < DAYS_BEFORE_CLAIM) {
    eligible = false;
    const wait = DAYS_BEFORE_CLAIM - daysSinceFirstPlay;
    blocker = { key: wait > 1 ? "blocker.waitPlural" : "blocker.wait", n: wait };
  }

  return {
    qualifyingDays,
    daysSinceFirstPlay,
    todaySecondsRemaining,
    diamondsCollected,
    menusEarned: menusEarnedRaw,
    menusClaimed,
    menusAvailable,
    eligible,
    blocker,
  };
}

/* ─── Enregistre le n° de tél Bridge (identifiant unique joueur) ─ */
export async function registerBridgePhone(rawPhone: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: "Hors-ligne" };

  /* Normalisation : on garde uniquement chiffres et +.
     Format MA accepté : +212XXXXXXXXX ou 0XXXXXXXXX.
     Codes d'erreur localisés par l'UI via t(). */
  const normalized = rawPhone.replace(/[^\d+]/g, "");
  if (normalized.length < 9 || normalized.length > 15) {
    return { success: false, error: "claim.phone.invalid" };
  }

  const byDevice = await findByDevice();
  const targetId = byDevice?.id ?? await getCurrentUserId();
  if (!targetId) return { success: false, error: "claim.error.generic" };

  try {
    /* Vérifier unicité du téléphone */
    const { data: exists } = await supabase
      .from("profiles").select("id").eq("bridge_phone", normalized).maybeSingle();
    if (exists && (exists as { id: string }).id !== targetId) {
      return { success: false, error: "claim.phone.taken" };
    }

    const { error } = await supabase
      .from("profiles").update({ bridge_phone: normalized }).eq("id", targetId);

    if (error) {
      if (error.code === "42703") return { success: true }; // colonne pas encore créée
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("registerBridgePhone:", err);
    return { success: false, error: "claim.error.generic" };
  }
}

/* ─── Réclame un menu (anti-double-claim, validation serveur) ────
   Appelle la RPC `claim_menu` qui :
   - re-vérifie les 3 conditions côté SERVEUR (avec CURRENT_DATE)
   - incrémente menus_claimed atomiquement
   - retourne TRUE si succès, FALSE si non éligible.
   Si la RPC n'existe pas encore (DB pas migrée), on accepte (fallback).
   ─────────────────────────────────────────────────────────────── */
export async function markMenuClaimed(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: "claim.error.generic" };

  const byDevice = await findByDevice();
  const targetId = byDevice?.id ?? await getCurrentUserId();
  if (!targetId) return { success: false, error: "claim.error.generic" };

  try {
    const { data, error } = await supabase.rpc("claim_menu", { p_id: targetId });
    if (error) {
      /* 42883 = function not yet created → on accepte en fallback */
      if (error.code === "42883" || error.code === "42703") return { success: true };
      return { success: false, error: error.message };
    }
    if (data === false) {
      return { success: false, error: "claim.error.notMet" };
    }
    return { success: true };
  } catch (err) {
    console.error("markMenuClaimed:", err);
    return { success: false, error: "claim.error.generic" };
  }
}

/* ─── Classement TOP joueurs (fenêtre glissante 3 jours) ────────
   Renvoie les `limit` meilleurs joueurs CE CYCLE-CI :
   - Filtre `period_start = cycle courant` (= les autres sont d'un
     ancien cycle, donc ignorés — leur compteur sera reset à leur
     prochaine partie).
   - Trie par `period_diamonds DESC`.
   - Anonymise : "BR-XYZ123" si pas de username.
   FALLBACK : si la migration SQL n'est pas passée (period_* absents),
   on retombe sur le classement cumulatif `diamonds_collected`. */
export type LeaderEntry = {
  id: string;
  rank: number;          // 1-based
  name: string;          // affichage : username ou code BR-XXXXXX
  diamonds: number;      // 💎 GAGNÉS dans le cycle courant
  avatarUrl?: string | null; // photo de profil (data URL ou https://...)
};

function entriesFromRows(rows: Array<{ id: string; username?: string | null; diamonds: number; avatar_url?: string | null }>): LeaderEntry[] {
  return rows.map((p, i) => {
    const code = (p.id ?? "XXXXXX").toString().replace(/-/g, "").slice(0, 6).toUpperCase();
    const fallback = `BR-${code}`;
    const name = (p.username && p.username.trim().length > 0) ? p.username : fallback;
    return { id: p.id, rank: i + 1, name, diamonds: Number(p.diamonds) || 0, avatarUrl: p.avatar_url ?? null };
  });
}

export async function getTopPlayers(limit = 7): Promise<LeaderEntry[]> {
  if (!isSupabaseConfigured) return [];
  const cycleStart = currentLeaderCycleStart();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,avatar_url,period_diamonds")
      .eq("period_start", cycleStart)
      .gt("period_diamonds", 0)
      .order("period_diamonds", { ascending: false })
      .limit(limit);

    /* 42703 = colonnes period_* OU avatar_url absentes → fallback cumulatif */
    if (error && error.code === "42703") {
      const { data: fb } = await supabase
        .from("profiles")
        .select("id,username,diamonds_collected")
        .order("diamonds_collected", { ascending: false })
        .limit(limit);
      if (!fb) return [];
      return entriesFromRows(fb.map((p) => ({ id: p.id, username: p.username, diamonds: p.diamonds_collected })));
    }
    if (error || !data) return [];

    return entriesFromRows(data.map((p) => ({ id: p.id, username: p.username, avatar_url: p.avatar_url, diamonds: p.period_diamonds })));
  } catch {
    return [];
  }
}

/* ─── Met à jour la photo de profil du joueur courant ───────────
   `dataUrl` : "data:image/jpeg;base64,..." (≤ ~80 KB recommandé)
   ou une URL externe (https://...). Vide → réinitialise.
   Renvoie le profil mis à jour, ou null en cas d'erreur. */
export async function updateAvatar(dataUrl: string | null): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const byDevice = await findByDevice();
  const targetId = byDevice?.id ?? await getCurrentUserId();
  if (!targetId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: dataUrl, updated_at: new Date().toISOString() })
      .eq("id", targetId)
      .select()
      .single();
    if (error) return null;
    return data as Profile;
  } catch { return null; }
}

/* ─── Met à jour le username (nom d'affichage) du joueur courant ─
   Utilisé par la page Profil. Limite à 24 caractères, trim.
   Renvoie le profil mis à jour, ou null en cas d'erreur. */
export async function updateUsername(newName: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const clean = newName.trim().slice(0, 24);
  if (!clean) return null;
  const byDevice = await findByDevice();
  const targetId = byDevice?.id ?? await getCurrentUserId();
  if (!targetId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ username: clean, updated_at: new Date().toISOString() })
      .eq("id", targetId)
      .select()
      .single();
    if (error) return null;
    /* miroir local pour les classements anonymes éventuels */
    try { localStorage.setItem(PLAYER_NAME_KEY, clean); } catch { /* ignore */ }
    return data as Profile;
  } catch { return null; }
}

/* ─── Position dans le classement TOP 7 du cycle courant ────────
   Renvoie le rang (1-based) si le joueur est dans le top du cycle,
   sinon null. Pour la page Profil. */
export async function getMyRank(myPeriodDiamonds: number): Promise<number | null> {
  if (!isSupabaseConfigured) return null;
  if (myPeriodDiamonds <= 0) return null;
  const cycleStart = currentLeaderCycleStart();
  try {
    /* Compte combien de joueurs ont STRICTEMENT plus de diamants que moi
       dans le cycle courant. Mon rang = ce compte + 1. */
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("period_start", cycleStart)
      .gt("period_diamonds", myPeriodDiamonds);
    if (error || count === null) return null;
    return count + 1;
  } catch { return null; }
}

export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const byDevice = await findByDevice();
  if (byDevice) return byDevice;
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles").select("*").eq("id", userId).single();
    if (error) return null;
    return data as Profile;
  } catch { return null; }
}
