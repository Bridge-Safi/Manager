/* =========================================================
   Bridge Safi — Service Worker
   Reçoit les notifications push et les affiche au livreur,
   même si le téléphone est verrouillé ou l'app fermée.
   ========================================================= */

const CACHE_NAME = "bridge-sw-v1";

// ── Installation ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Push ──────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Bridge Safi", body: event.data.text() };
  }

  const title = data.title || "Bridge Safi";
  const options = {
    body: data.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || "bridge-notification",
    renotify: true,
    requireInteraction: data.urgent === true,  // reste visible jusqu'à action si urgent
    vibrate: data.urgent ? [300, 100, 300, 100, 300] : [200, 100, 200],
    data: {
      url: data.url || "/livreur",
      urgent: data.urgent || false,
    },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      // Joue l'alarme dans les onglets ouverts
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({ type: "BRIDGE_ALARM", urgent: data.urgent === true });
      }
    })()
  );
});

// ── Clic sur la notification ──────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/livreur";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });

      // Si un onglet Bridge est déjà ouvert → le mettre au premier plan et naviguer
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          client.postMessage({ type: "BRIDGE_NAVIGATE", url: targetUrl });
          return;
        }
      }

      // Sinon → ouvrir un nouvel onglet
      await clients.openWindow(self.location.origin + targetUrl);
    })()
  );
});
