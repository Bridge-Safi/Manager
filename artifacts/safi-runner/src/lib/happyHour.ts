/* ─────────────────────────────────────────────────────────────
   Happy Hour ×2 : multiplicateur global de diamants temporaire.
   - Lecture publique via RPC `get_happy_hour` (poll toutes les 30 s)
   - Activation via RPC `set_happy_hour(minutes, secret)`
   - Le multiplicateur courant est exposé en lecture synchrone
     (`getCurrentMultiplier`) pour la boucle de jeu, et via un hook
     React `useHappyHour` pour l'UI.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface HappyHourState {
  active: boolean;
  until: string | null;     // ISO timestamp
  secondsLeft: number;
  multiplier: number;       // 1 ou 2
}

const IDLE: HappyHourState = { active: false, until: null, secondsLeft: 0, multiplier: 1 };

let current: HappyHourState = IDLE;
const listeners = new Set<(s: HappyHourState) => void>();

function emit() {
  for (const l of listeners) l(current);
}

/* Lecture synchrone pour la boucle de jeu (useGameState). */
export function getCurrentMultiplier(): number {
  if (!current.active) return 1;
  // Sécurité : si le timer local est passé, on retombe à 1 jusqu'au prochain poll.
  if (current.until && new Date(current.until).getTime() <= Date.now()) return 1;
  return current.multiplier;
}

/* Poll Supabase et met à jour l'état partagé. */
export async function refreshHappyHour(): Promise<HappyHourState> {
  if (!isSupabaseConfigured) return IDLE;
  try {
    const { data, error } = await supabase.rpc("get_happy_hour");
    if (error || !data) return current;
    const next: HappyHourState = {
      active: !!data.active,
      until: data.until ?? null,
      secondsLeft: Number(data.secondsLeft ?? 0),
      multiplier: Number(data.multiplier ?? 1),
    };
    current = next;
    emit();
    return next;
  } catch {
    return current;
  }
}

/* Hook React : poll au montage + tick local 1 s pour le compteur. */
export function useHappyHour(): HappyHourState {
  const [state, setState] = useState<HappyHourState>(current);

  useEffect(() => {
    listeners.add(setState);
    void refreshHappyHour();
    const poll = window.setInterval(() => void refreshHappyHour(), 30_000);
    const tick = window.setInterval(() => {
      if (!current.active || !current.until) return;
      const ms = new Date(current.until).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(ms / 1000));
      const next: HappyHourState = secs > 0
        ? { ...current, secondsLeft: secs }
        : IDLE;
      current = next;
      emit();
    }, 1_000);
    return () => {
      listeners.delete(setState);
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, []);

  return state;
}

/* ─── Admin ─────────────────────────────────────────────────── */

export function isAdminMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("admin") === "1") {
    try { localStorage.setItem("safi_admin", "1"); } catch {}
    return true;
  }
  try { return localStorage.getItem("safi_admin") === "1"; } catch { return false; }
}

export function exitAdminMode() {
  try { localStorage.removeItem("safi_admin"); } catch {}
}

export async function activateHappyHour(
  minutes: number,
  secret: string,
): Promise<{ ok: true; until: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "supabase_not_configured" };
  const { data, error } = await supabase.rpc("set_happy_hour", {
    p_minutes: minutes,
    p_secret: secret,
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? "unknown" };
  await refreshHappyHour();
  return { ok: true, until: data.until };
}

export async function stopHappyHour(
  secret: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "supabase_not_configured" };
  const { data, error } = await supabase.rpc("stop_happy_hour", { p_secret: secret });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error };
  await refreshHappyHour();
  return { ok: true };
}
