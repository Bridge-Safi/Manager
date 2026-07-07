import { useEffect, useState, useCallback } from "react";
import {
  startOrientalMusic,
  stopOrientalMusic,
} from "../lib/orientalMusic";

const STORAGE_KEY = "safi_runner_music_on";

function readInitial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true; // par défaut : musique activée
}

/* Hook global Musique — persisté en localStorage et synchronisé entre
   tous les composants via l'événement custom "safi:music".
   Le démarrage RÉEL de l'AudioContext nécessite un user-gesture ; il
   est déclenché ailleurs (au premier clic "Jouer") via startMusic(). */
export function useMusic(): {
  enabled: boolean;
  toggle: () => void;
  startIfEnabled: () => void;
  stop: () => void;
} {
  const [enabled, setEnabled] = useState<boolean>(readInitial);

  useEffect(() => {
    const onSync = () => setEnabled(readInitial());
    window.addEventListener("storage", onSync);
    window.addEventListener("safi:music", onSync as EventListener);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("safi:music", onSync as EventListener);
    };
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event("safi:music"));
      if (next) startOrientalMusic(0.35);
      else stopOrientalMusic();
      return next;
    });
  }, []);

  const startIfEnabled = useCallback(() => {
    if (readInitial()) startOrientalMusic(0.35);
  }, []);

  const stop = useCallback(() => {
    stopOrientalMusic();
  }, []);

  return { enabled, toggle, startIfEnabled, stop };
}
