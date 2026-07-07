/* ─── Compte à rebours personnel 3 jours ──────────────────────────
   Chaque joueur a son propre défi personnel de 72h (3 jours × 3h/jour).
   La date de début est sauvegardée dans localStorage à la 1ère partie.
   Ce module gère uniquement le TEMPS CALENDAIRE écoulé ; le suivi du
   temps de jeu quotidien (3h/jour) est géré par recordPlaySession.
   ─────────────────────────────────────────────────────────────── */

export const CHALLENGE_KEY        = "safi_runner_challenge_start";
export const CHALLENGE_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 72h

/** Renvoie le timestamp (ms) du début du défi, ou null si pas encore lancé. */
export function getChallengeStartMs(): number | null {
  try {
    const v = localStorage.getItem(CHALLENGE_KEY);
    return v ? parseInt(v, 10) : null;
  } catch { return null; }
}

/** Lance le défi si pas encore commencé (à appeler au 1er clic "Jouer"). */
export function startChallengeIfNew(): void {
  try {
    if (!localStorage.getItem(CHALLENGE_KEY)) {
      localStorage.setItem(CHALLENGE_KEY, String(Date.now()));
    }
  } catch { /* pas de localStorage */ }
}

/** Secondes calendaires restantes dans la fenêtre de 72h.
 *  Retourne -1 si le défi n'a pas encore commencé.
 *  Retourne 0 si le défi est terminé (72h écoulées). */
export function getChallengeSecondsLeft(now = Date.now()): number {
  const start = getChallengeStartMs();
  if (start === null) return -1;
  const elapsed = now - start;
  return Math.max(0, Math.floor((CHALLENGE_DURATION_MS - elapsed) / 1000));
}

/** Retourne { day, dayLabel, daySeconds } pour chaque jour du défi.
 *  day 1 = Jour 1, etc. Indique quel jour le joueur est en train de vivre. */
export function getChallengeDay(now = Date.now()): number {
  const start = getChallengeStartMs();
  if (start === null) return 0;
  const elapsed = now - start;
  return Math.min(3, Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1);
}

/** Formate un nombre de secondes en "Xj Yh Zm Ws". */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const days  = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const mins  = Math.floor((totalSeconds % 3_600) / 60);
  const secs  = totalSeconds % 60;
  if (days > 0) return `${days}j ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** True si le défi a été lancé ET n'est pas encore terminé. */
export function isChallengeActive(now = Date.now()): boolean {
  return getChallengeSecondsLeft(now) > 0;
}

/** True si le défi est terminé (72h écoulées). */
export function isChallengeOver(now = Date.now()): boolean {
  const start = getChallengeStartMs();
  if (start === null) return false;
  return (now - start) >= CHALLENGE_DURATION_MS;
}
