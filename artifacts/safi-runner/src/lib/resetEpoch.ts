/* ─── Remise à zéro globale ──────────────────────────────────────
   Quand on incrémente RESET_EPOCH, TOUS les appareils ouvrant le jeu
   effacent automatiquement leur localStorage (auth Bridge Eats,
   identifiant d'appareil, nom du joueur, progression, etc.) au
   prochain chargement. Combiné avec un TRUNCATE de la table
   `profiles` côté Supabase, on repart de zéro pour tout le monde.
   ──────────────────────────────────────────────────────────────── */
const RESET_EPOCH = "2026-05-11-v3";
const EPOCH_KEY   = "safi_runner_reset_epoch";

export function applyResetEpoch(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const current = window.localStorage.getItem(EPOCH_KEY);
    if (current === RESET_EPOCH) return;

    /* Efface les clés "safi_*" SAUF bridge_auth (téléphone = identité du joueur).
       Sans ce numéro, le jeu ne peut plus retrouver le profil Supabase du joueur. */
    /* On garde aussi challenge_start pour ne pas remettre le chrono à zéro
       si le joueur a déjà lancé son défi de 3 jours. */
    const KEEP = new Set(["safi_runner_bridge_auth", "safi_runner_challenge_start"]);
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("safi_") && !KEEP.has(k)) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));

    /* Marque l'epoch courant pour ne plus jamais re-effacer cet appareil. */
    window.localStorage.setItem(EPOCH_KEY, RESET_EPOCH);

    if (typeof console !== "undefined") {
      console.info(`[safi-runner] Remise à zéro appliquée (${toRemove.length} clés effacées, epoch=${RESET_EPOCH})`);
    }
  } catch {
    /* ignore — quota, mode privé, etc. */
  }
}
