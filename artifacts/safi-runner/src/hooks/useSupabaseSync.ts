import { useState, useEffect, useRef } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { ensureProfile, saveScore, getProfile, recordPlaySession } from "../lib/playerProfile";
import type { Profile } from "../lib/supabase";

const AUTOSAVE_INTERVAL = 10_000; // rafraîchit le profil toutes les 10s

export function useSupabaseSync(score: number, phase: string, playTime: number) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<"connecting" | "ok" | "error" | "offline">(
    isSupabaseConfigured ? "connecting" : "offline",
  );

  const refreshProfile = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const updated = await getProfile();
      if (updated) setProfile(updated);
    } catch { /* silencieux */ }
  };

  const lastSyncedScore = useRef(0);
  const initialized = useRef(false);
  const lastScore = useRef(score);
  const lastPlayTime = useRef(playTime);
  /* Pour gérer correctement la sauvegarde après "reprendre" suite à un
     game over : on enregistre le score/temps déjà sauvegardés pour ne
     compter QUE le delta à chaque mort (sinon double-comptage). */
  const savedScoreSoFar = useRef(0);
  const savedPlayTimeSoFar = useRef(0);

  /* Initialisation du profil au démarrage */
  useEffect(() => {
    if (!isSupabaseConfigured || initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const p = await ensureProfile();
        if (p) {
          setProfile(p);
          setStatus("ok");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("offline");
      }
    })();
  }, []);

  /* Suivi score + playTime en temps réel (sans re-render) */
  useEffect(() => { lastScore.current = score; }, [score]);
  useEffect(() => { lastPlayTime.current = playTime; }, [playTime]);

  /* Auto-refresh du profil toutes les 10s pendant le jeu */
  useEffect(() => {
    if (!isSupabaseConfigured || (phase !== "playing" && phase !== "checkpoint")) return;

    const interval = setInterval(async () => {
      if (lastScore.current === lastSyncedScore.current) return;
      lastSyncedScore.current = lastScore.current;

      try {
        const updated = await getProfile();
        if (updated) {
          setProfile(updated);
          setStatus("ok");
        }
      } catch {
        setStatus("offline");
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [phase]);

  /* Réinitialise les compteurs cumulés au démarrage d'une nouvelle
     partie (pas après une simple reprise post-mort). */
  useEffect(() => {
    if (phase === "start") {
      savedScoreSoFar.current = 0;
      savedPlayTimeSoFar.current = 0;
    }
  }, [phase]);

  /* Sauvegarde à chaque game over avec validation anti-triche.
     On ne sauvegarde QUE le DELTA depuis la dernière sauvegarde,
     car le joueur peut reprendre au même endroit (= même partie
     continuée) et on ne veut pas compter les 💎 deux fois. */
  useEffect(() => {
    if (!isSupabaseConfigured || phase !== "gameover") return;

    (async () => {
      const totalScore = lastScore.current;
      const totalPlayTime = lastPlayTime.current;

      /* DELTA depuis la dernière sauvegarde */
      const deltaScore = Math.max(0, totalScore - savedScoreSoFar.current);
      const deltaPlayTime = Math.max(0, totalPlayTime - savedPlayTimeSoFar.current);

      const diamondsToSave = Math.floor(deltaScore / 10);
      const sardines = Math.floor(deltaScore / 50);

      /* saveScore valide côté client avant d'écrire dans Supabase */
      await saveScore(diamondsToSave, sardines, deltaPlayTime);

      /* Enregistre uniquement le temps de jeu non-encore-comptabilisé */
      await recordPlaySession(deltaPlayTime);

      /* Synchronise les 💎 vers Bridge Eats (saveUrl + postMessage) */
      if (diamondsToSave > 0) {
        const { sendDiamondsToParent } = await import("../lib/bridgeAuth");
        sendDiamondsToParent(diamondsToSave).catch(() => { /* silencieux */ });
      }

      /* Met à jour les marqueurs cumulés pour la prochaine sauvegarde */
      savedScoreSoFar.current = totalScore;
      savedPlayTimeSoFar.current = totalPlayTime;

      const updated = await getProfile();
      if (updated) setProfile(updated);
    })();
  }, [phase]);

  return { profile, status, refreshProfile };
}
