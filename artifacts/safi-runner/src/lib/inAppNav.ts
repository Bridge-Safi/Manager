/* ──────────────────────────────────────────────────────────────────
   NAVIGATION "DANS LA MÊME APPLI" — plus jamais de nouvel onglet
   ─────────────────────────────────────────────────────────────────
   Bridge Eats embarque ce jeu (iframe ou redirection même-onglet) au
   sein de son propre conteneur. Quand l'utilisateur clique sur un
   bouton qui doit le ramener vers Bridge Eats (ou un autre jeu de la
   plateforme), on NE doit PAS ouvrir un nouvel onglet : on reste dans
   la même application.

   Stratégie :
     - Si le jeu est en iframe (`window.parent !== window`) → on envoie
       un postMessage au parent qui gère lui-même la navigation
       (changer la source de l'iframe, ou router son SPA).
     - Sinon → on remplace l'URL courante (même-onglet) avec
       `window.location.href = url`.

   À utiliser pour TOUS les boutons "Bridge Eats", "Bridge Tabac",
   "Bridge Fleurs", "Réclamer mon menu", complément 💎, etc.
   Pour les liens VRAIMENT externes (WhatsApp, FB, YT, IG, TikTok →
   réseaux sociaux mandatory pour la pub), on garde le comportement
   classique car ce ne sont pas des jeux/apps Bridge.
   ────────────────────────────────────────────────────────────── */

export function isEmbeddedInIframe(): boolean {
  try {
    return window.parent !== window && window.top !== window;
  } catch {
    /* Cross-origin throws → on est dans une iframe d'origine différente. */
    return true;
  }
}

/* Navigation interne vers une autre page de la plateforme Bridge.
   Reste TOUJOURS dans la même appli (pas de nouvel onglet). */
export function navigateInApp(url: string, kind: "bridge-eats" | "bridge-game" | "other" = "bridge-eats"): void {
  if (isEmbeddedInIframe()) {
    /* L'iframe parent (Bridge Eats SPA) écoute ces messages pour
       gérer la navigation interne sans nouvel onglet. */
    try {
      window.parent.postMessage({ type: "bridge-nav", url, kind }, "*");
      return;
    } catch {
      /* Fallback même-onglet si postMessage échoue */
    }
  }
  /* Mode standalone : on remplace l'URL courante (même onglet). */
  try {
    window.location.href = url;
  } catch {
    /* dernier recours */
    window.location.assign(url);
  }
}
