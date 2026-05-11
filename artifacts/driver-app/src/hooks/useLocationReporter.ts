import { useEffect, useRef } from "react";

const BASE = import.meta.env.BASE_URL;

interface LastPosition {
  lat: number;
  lng: number;
  ts: number;
}

export function useLocationReporter(delivererId: number | null | undefined) {
  const lastSentRef = useRef<LastPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!delivererId || !navigator.geolocation) return;

    const sendPosition = (lat: number, lng: number) => {
      const now = Date.now();
      const last = lastSentRef.current;
      const timeSinceLast = last ? now - last.ts : Infinity;
      const distMoved = last
        ? Math.abs(lat - last.lat) * 111 + Math.abs(lng - last.lng) * 111
        : Infinity;
      if (timeSinceLast < 30000 && distMoved < 0.05) return;
      lastSentRef.current = { lat, lng, ts: now };
      fetch(`${BASE}api/deliverers/${delivererId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng })
      }).catch(() => {});
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [delivererId]);
}
