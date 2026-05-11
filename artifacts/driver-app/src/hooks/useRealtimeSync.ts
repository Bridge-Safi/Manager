import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeSync(driverId: number) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!driverId) return;

    let retryTimeout: ReturnType<typeof setTimeout>;
    let retryDelay = 1000;

    function connect() {
      const es = new EventSource(`/api/events?role=driver&driverId=${driverId}`);
      esRef.current = es;

      const refetchPending = () => {
        queryClient.invalidateQueries({ queryKey: ["getMyPendingDispatch"] });
        queryClient.invalidateQueries({ queryKey: ["getMyPendingRide"] });
      };

      const refetchAll = () => {
        queryClient.invalidateQueries();
      };

      es.addEventListener("order:updated", refetchPending);
      es.addEventListener("delivery:created", refetchPending);
      es.addEventListener("delivery:updated", refetchPending);
      es.addEventListener("driver:updated", refetchAll);

      es.onopen = () => {
        retryDelay = 1000;
        refetchPending();
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
  }, [driverId, queryClient]);
}
