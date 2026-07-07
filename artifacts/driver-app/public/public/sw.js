const CACHE_NAME = 'bridge-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Bridge', body: event.data ? event.data.text() : 'Nouvelle commande' };
  }

  const isUrgent = data.urgent === true;
  const title = data.title || '🔔 Bridge — Nouvelle commande';
  const options = {
    body: data.body || 'Vous avez 7 minutes pour accepter.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: isUrgent
      ? [500, 100, 500, 100, 500, 100, 800, 200, 800, 200, 800]
      : [400, 150, 400, 150, 400, 150, 800],
    tag: 'bridge-dispatch',
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || '/livreur',
      timestamp: Date.now(),
      urgent: isUrgent,
    },
    actions: [
      { action: 'accept', title: '✅ Voir' },
      { action: 'dismiss', title: '✕ Ignorer' },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'BRIDGE_ALARM', urgent: isUrgent, data });
        });
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/livreur';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'BRIDGE_NAVIGATE', url });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
