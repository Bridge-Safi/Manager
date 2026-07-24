import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListDeliveriesQueryKey, getGetDeliveryStatsQueryKey, getGetDelivererQueryKey } from "@workspace/api-client-react";
import { startContinuousAlarm } from "@/lib/alarm";
import type { ManagerNotification } from "@/components/ManagerNotificationAlert";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Ouvre une connexion SSE vers /api/events et déclenche l'alarme + rafraîchit
 * les queries dès qu'une commande est assignée à ce livreur par le manager.
 *
 * Retourne aussi la dernière notification manager reçue (warn / refuse / block).
 */
export function useOrderSSE(livreurId: number, onForceLogout?: () => void) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  // Track known assigned order IDs to avoid double-alarming
  const knownAssignedRef = useRef<Set<number>>(new Set());
  const onForceLogoutRef = useRef(onForceLogout);
  onForceLogoutRef.current = onForceLogout;

  const [managerNotification, setManagerNotification] = useState<ManagerNotification | null>(null);
  const clearManagerNotification = useCallback(() => setManagerNotification(null), []);

  useEffect(() => {
    if (!livreurId) return;

    const url = `${BASE}/api/events?role=livreur&driverId=${livreurId}`;
    const es = new EventSource(url);
    esRef.current = es;

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDeliveryStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDelivererQueryKey(livreurId) });
    };

    es.addEventListener("order:updated", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as {
          id?: number;
          status?: string;
          driverId?: number | null;
        };

        // Rafraîchir si cette commande concerne ce livreur
        if (data.driverId === livreurId) {
          invalidateAll();

          // Jouer l'alarme seulement quand une nouvelle commande vient d'être assignée
          if (
            (data.status === "assigned" || data.status === "pending") &&
            data.id &&
            !knownAssignedRef.current.has(data.id)
          ) {
            knownAssignedRef.current.add(data.id);
            startContinuousAlarm();
            // Arrêter l'alarme après 30s si le livreur n'interagit pas
            setTimeout(() => {
              import("@/lib/alarm").then(({ isAlarmRunning, stopContinuousAlarm }) => {
                if (isAlarmRunning()) stopContinuousAlarm();
              });
            }, 30_000);
          }
        }
      } catch {
        // ignore malformed events
      }
    });

    // Notification ciblée du manager (avertissement / refus / blocage)
    es.addEventListener("driver:notification", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as ManagerNotification;
        setManagerNotification(data);
      } catch {
        // ignore malformed events
      }
    });

    // Le livreur a été supprimé par le manager — déconnexion forcée immédiate
    es.addEventListener("driver:deleted", () => {
      es.close();
      esRef.current = null;
      onForceLogoutRef.current?.();
    });

    // Rafraîchir aussi lors d'une mise à jour générale des livraisons
    es.addEventListener("order:created", () => invalidateAll());

    es.onerror = () => {
      // EventSource reconnecte automatiquement — pas besoin de gérer manuellement
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [livreurId, queryClient]);

  return { managerNotification, clearManagerNotification };
}
