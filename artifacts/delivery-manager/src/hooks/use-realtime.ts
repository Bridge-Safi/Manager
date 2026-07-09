import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [880, 1100, 880, 1100];
    let time = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
      gain.gain.linearRampToValueAtTime(0, time + 0.12);
      osc.start(time);
      osc.stop(time + 0.15);
      time += i % 2 === 0 ? 0.18 : 0.28;
    });
  } catch {
    // audio not available
  }
}

function showBrowserNotification(customerName: string, address: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification("🛵 Nouvelle commande !", {
      body: `${customerName} — ${address}`,
      icon: "/favicon.ico",
      tag: "new-order",
    });
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification("🛵 Nouvelle commande !", {
          body: `${customerName} — ${address}`,
          icon: "/favicon.ico",
          tag: "new-order",
        });
      }
    });
  }
}

type SSEEvent =
  | "order:created"
  | "order:updated"
  | "delivery:created"
  | "delivery:updated"
  | "driver:updated"
  | "player:created"
  | "player:updated"
  | "player:deleted"
  | "player:online"
  | "ping"
  | "connected";

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;
    let retryDelay = 1000;

    function connect() {
      const es = new EventSource("/api/events?role=manager");
      esRef.current = es;

      const invalidateAll = () => {
        queryClient.invalidateQueries();
      };

      const invalidateOrders = () => {
        queryClient.invalidateQueries({ queryKey: ["listOrders"] });
        queryClient.invalidateQueries({ queryKey: ["getDashboardSummary"] });
      };

      const invalidateDrivers = () => {
        queryClient.invalidateQueries({ queryKey: ["listDrivers"] });
        queryClient.invalidateQueries({ queryKey: ["getDashboardSummary"] });
      };

      const invalidatePlayers = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/players"] });
        queryClient.invalidateQueries({ queryKey: ["/api/players/leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/players/online"] });
        queryClient.invalidateQueries({ queryKey: ["/api/players/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/players/payment-summary"] });
      };

      const handlers: Partial<Record<SSEEvent, (e: MessageEvent) => void>> = {
        "order:created": (e: MessageEvent) => {
          invalidateAll();
          playAlertSound();
          try {
            const data = JSON.parse(e.data ?? "{}");
            showBrowserNotification(
              data.customerName ?? "Nouveau client",
              data.deliveryAddress ?? "Adresse inconnue"
            );
          } catch {
            showBrowserNotification("Nouvelle commande !", "");
          }
        },
        "order:updated": invalidateOrders,
        "delivery:created": invalidateAll,
        "delivery:updated": invalidateOrders,
        "driver:updated": invalidateDrivers,
        "player:created": invalidatePlayers,
        "player:updated": invalidatePlayers,
        "player:deleted": invalidatePlayers,
        "player:online": invalidatePlayers,
      };

      for (const [event, handler] of Object.entries(handlers)) {
        es.addEventListener(event, handler!);
      }

      es.onopen = () => {
        retryDelay = 1000;
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [queryClient]);
}
