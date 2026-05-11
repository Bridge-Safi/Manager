import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

type SSEEvent =
  | "order:created"
  | "order:updated"
  | "delivery:created"
  | "delivery:updated"
  | "driver:updated"
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

      const handlers: Partial<Record<SSEEvent, () => void>> = {
        "order:created": invalidateAll,
        "order:updated": invalidateOrders,
        "delivery:created": invalidateAll,
        "delivery:updated": invalidateOrders,
        "driver:updated": invalidateDrivers,
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
