import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeAddress, SAFI_CENTER } from "./TrackingMap";

const TC = "#C14B2A";
const GREEN = "#2A7A48";
const GOLD = "#D4880C";

interface RouteMiniMapProps {
  pickupAddress: string;
  dropoffAddress: string;
  pickupColor?: string;
  dropoffColor?: string;
  height?: number;
}

const pickupMarkerIcon = (color: string) => L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50%;background:white;border:3px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:${color}"></div></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const dropoffMarkerIcon = (color: string) => L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

export function RouteMiniMap({
  pickupAddress,
  dropoffAddress,
  pickupColor = GOLD,
  dropoffColor = TC,
  height = 160,
}: RouteMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDistanceKm(null);
    setIsFallback(false);

    async function loadMap() {
      // Sequential — Nominatim rate limit is 1 req/s
      const pickup = await geocodeAddress(pickupAddress);
      await new Promise(r => setTimeout(r, 1100));
      const dropoff = await geocodeAddress(dropoffAddress);

      if (cancelled) return;

      // Detect fallback (both landed on Safi center)
      const pickupIsFallback =
        Math.abs(pickup.lat - SAFI_CENTER.lat) < 0.001 &&
        Math.abs(pickup.lng - SAFI_CENTER.lng) < 0.001;
      const dropoffIsFallback =
        Math.abs(dropoff.lat - SAFI_CENTER.lat) < 0.001 &&
        Math.abs(dropoff.lng - SAFI_CENTER.lng) < 0.001;
      if (pickupIsFallback && dropoffIsFallback) setIsFallback(true);

      // Haversine distance
      const R = 6371;
      const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
      const dLng = (dropoff.lng - pickup.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const d = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (!pickupIsFallback || !dropoffIsFallback) setDistanceKm(d);

      setLoading(false);

      // Build map on next tick so container is painted
      setTimeout(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const pickupLL = L.latLng(pickup.lat, pickup.lng);
        const dropoffLL = L.latLng(dropoff.lat, dropoff.lng);

        L.marker(pickupLL, { icon: pickupMarkerIcon(pickupColor) }).addTo(map);
        L.marker(dropoffLL, { icon: dropoffMarkerIcon(dropoffColor) }).addTo(map);

        if (!pickupIsFallback || !dropoffIsFallback) {
          L.polyline([pickupLL, dropoffLL], {
            color: dropoffColor,
            weight: 4,
            opacity: 0.75,
            dashArray: "8 6",
          }).addTo(map);
          map.fitBounds(L.latLngBounds([pickupLL, dropoffLL]), { padding: [28, 28], maxZoom: 15 });
        } else {
          map.setView(pickupLL, 13);
        }

        mapRef.current = map;
      }, 50);
    }

    loadMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupAddress, dropoffAddress]);

  if (loading) {
    return (
      <div
        className="w-full rounded-xl flex flex-col items-center justify-center gap-1.5"
        style={{ height, background: "#F5EFE4" }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${TC} transparent ${TC} ${TC}` }} />
        <p className="text-[11px] font-medium" style={{ color: "#9B7060" }}>Chargement de la carte…</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border"
        style={{ height, borderColor: "#E8DDD0", zIndex: 0 }}
      />

      {/* Distance badge */}
      {distanceKm != null && (
        <div
          className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md"
          style={{ background: "white", color: dropoffColor, border: `1px solid ${dropoffColor}40` }}
        >
          ↔ {distanceKm.toFixed(1)} km
        </div>
      )}

      {/* Fallback notice */}
      {isFallback && (
        <div
          className="absolute top-2 left-2 right-2 px-2 py-1 rounded-lg text-[10px] font-medium text-center"
          style={{ background: "rgba(255,255,255,0.9)", color: "#9B7060" }}
        >
          📍 Position approximative — adresses non géolocalisées
        </div>
      )}
    </div>
  );
}
