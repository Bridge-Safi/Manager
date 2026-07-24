import { useEffect, useRef, useState, useCallback } from "react";
import type { ManagerNotification } from "@/components/ManagerNotificationAlert";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_INTERVAL_MS = 5000;

/**
 * Polls the API every 5s for a pending manager notification (warn/refuse/block/unblock).
 * Returns the notification and a dismiss callback.
 */
export function useDriverNotificationPoller(driverId: number) {
  const [notification, setNotification] = useState<ManagerNotification | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => setNotification(null), []);

  useEffect(() => {
    if (!driverId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/drivers/${driverId}/notification`);
        if (res.ok) {
          const data = await res.json() as ManagerNotification | null;
          if (data && data.type) {
            setNotification(data);
          }
        }
      } catch {
        // ignore network errors — server may be restarting
      }
    };

    poll(); // immediate first check
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [driverId]);

  return { notification, clear };
}
