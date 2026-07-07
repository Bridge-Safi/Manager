import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListOrdersQueryKey,
  getGetRecentOrdersQueryKey,
  getGetOrderStatsQueryKey,
} from "@workspace/api-client-react";

/**
 * Real-time order updates via Server-Sent Events.
 *
 * Three-layer reliability strategy:
 *
 * 1. SSE "new_order" event  — server pushes instantly when a webhook fires.
 *    React Query caches are invalidated → immediate UI refresh.
 *
 * 2. SSE "open" event (reconnect catch-up) — the production proxy cuts
 *    connections every ~5 min.  Every time EventSource (re)opens, we refetch
 *    immediately so we never miss an order that arrived during the gap.
 *
 * 3. visibilitychange — on iOS, JS is fully suspended when the phone switches
 *    apps or locks.  When the restaurateur returns to the app, we immediately
 *    refetch all orders without waiting for the next poll cycle.
 *
 * Polling (2 s, always-on) is the final safety net managed in AlarmContext.
 */
export function useOrdersSSE() {
  const qc = useQueryClient();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      qc.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
      qc.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    };

    const connect = () => {
      if (unmountedRef.current) return;

      const es = new EventSource("/api/orders/events");
      esRef.current = es;

      /* ── Reconnect catch-up ──────────────────────────────────────────────
         Fires every time the connection opens OR re-opens (after proxy cut).
         Immediately refetch so we pick up any orders that arrived during the
         reconnect gap — this is the main fix for the "missed event" problem. */
      es.onopen = () => {
        invalidateAll();
      };

      /* ── Real-time push ──────────────────────────────────────────────────
         Server emits this the instant a webhook creates an order. */
      es.addEventListener("new_order", () => {
        invalidateAll();
      });

      /* ── Error / server-close → reconnect in 500 ms ──────────────────── */
      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!unmountedRef.current) {
          reconnectTimer.current = setTimeout(connect, 500);
        }
      };
    };

    connect();

    /* ── visibilitychange: iOS safety net ────────────────────────────────
       When the restaurateur switches back to the app after it was
       backgrounded (screen lock, another app), refetch immediately. */
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        invalidateAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      esRef.current?.close();
      esRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [qc]);
}
