import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "safi_runner_dark_mode";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch {
    /* ignore */
  }
  return false;
}

/* Hook global Dark Mode — persisté en localStorage et synchronisé
   entre tous les composants via l'événement custom "safi:dark". */
export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(readInitial);

  useEffect(() => {
    const onStorage = () => setDark(readInitial());
    window.addEventListener("storage", onStorage);
    window.addEventListener("safi:dark", onStorage as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("safi:dark", onStorage as EventListener);
    };
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event("safi:dark"));
      return next;
    });
  }, []);

  return [dark, toggle];
}
