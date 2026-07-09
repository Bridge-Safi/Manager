import { useEffect, useRef, useCallback } from "react";

// URLs et clés configurées via variables d'environnement Vite (Replit Secrets)
const MANAGER_API_URL = (import.meta.env.VITE_MANAGER_API_URL as string | undefined)
  ?? "https://manager.safi-bridge.ma/api/livreur/sync";
const MANAGER_API_KEY = import.meta.env.VITE_MANAGER_API_KEY as string | undefined;
const SYNC_INTERVAL_MS = 20_000;

export interface ManagerSyncOptions {
  driverId: number;
  currentOrderId?: number | null;
  currentOrderStatus?: string | null;
  enabled?: boolean;
}

function getBridgeStatus(orderStatus?: string | null): string {
  if (!orderStatus) return "available";
  if (orderStatus === "in_progress") return "delivering";
  if (orderStatus === "pending") return "delivering";
  return "available";
}

function getOrderSyncStatus(orderStatus?: string | null): string | undefined {
  if (!orderStatus) return undefined;
  if (orderStatus === "pending") return "picked_up";
  if (orderStatus === "in_progress") return "picked_up";
  return undefined;
}

async function syncToManager(payload: {
  driverId: number;
  lat: number;
  lng: number;
  status: string;
  currentOrderId?: number;
  currentOrderStatus?: string;
}): Promise<void> {
  if (!MANAGER_API_KEY) return; // pas configuré, on skip silencieusement

  const body: Record<string, unknown> = {
    driverId: payload.driverId,
    lat: payload.lat,
    lng: payload.lng,
    status: payload.status,
  };
  if (payload.currentOrderId != null) body.currentOrderId = payload.currentOrderId;
  if (payload.currentOrderStatus != null) body.currentOrderStatus = payload.currentOrderStatus;

  await fetch(MANAGER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": MANAGER_API_KEY,
    },
    body: JSON.stringify(body),
  });
}

export function useManagerSync({
  driverId,
  currentOrderId,
  currentOrderStatus,
  enabled = true,
}: ManagerSyncOptions) {
  const latRef = useRef<number | null>(null);
  const lngRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doSync = useCallback(() => {
    if (!driverId || latRef.current === null || lngRef.current === null) return;
    const status = getBridgeStatus(currentOrderStatus);
    const orderSyncStatus = getOrderSyncStatus(currentOrderStatus);
    syncToManager({
      driverId,
      lat: latRef.current,
      lng: lngRef.current,
      status,
      currentOrderId: currentOrderId ?? undefined,
      currentOrderStatus: orderSyncStatus,
    }).catch(() => {});
  }, [driverId, currentOrderId, currentOrderStatus]);

  useEffect(() => {
    if (!enabled || !driverId || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latRef.current = pos.coords.latitude;
        lngRef.current = pos.coords.longitude;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, driverId]);

  useEffect(() => {
    if (!enabled || !driverId) return;

    doSync();
    intervalRef.current = setInterval(doSync, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, driverId, doSync]);
}
