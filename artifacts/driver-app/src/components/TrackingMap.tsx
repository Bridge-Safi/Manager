import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TC = "#C14B2A";
const GREEN = "#2A7A48";

interface TrackingMapProps {
  delivererLat: number;
  delivererLng: number;
  delivererName: string;
  delivererPhotoUrl?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  destinationLabel?: string;
}

function makeDelivererIcon(photoUrl?: string | null, name?: string): L.DivIcon {
  const initial = (name?.charAt(0) ?? "?").toUpperCase();
  const inner = photoUrl
    ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:18px;background:${TC};border-radius:50%">${initial}</div>`;

  return L.divIcon({
    className: "deliverer-marker",
    html: `
      <div style="position:relative;width:48px;height:48px">
        <div style="position:absolute;inset:-6px;border-radius:50%;background:${TC};opacity:0.25;animation:pulse 2s infinite"></div>
        <div style="position:relative;width:48px;height:48px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);overflow:hidden;background:white">
          ${inner}
        </div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.4 }
          70% { transform: scale(1.6); opacity: 0 }
          100% { transform: scale(1.6); opacity: 0 }
        }
      </style>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

const destinationIcon = L.divIcon({
  className: "destination-marker",
  html: `
    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:${GREEN};transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
      <div style="transform:rotate(45deg);color:white;font-size:18px">🏠</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export function TrackingMap({
  delivererLat,
  delivererLng,
  delivererName,
  delivererPhotoUrl,
  destinationLat,
  destinationLng,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const delivererMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const trailPointsRef = useRef<L.LatLng[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [delivererLat, delivererLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      delivererMarkerRef.current = null;
      destMarkerRef.current = null;
      lineRef.current = null;
      trailRef.current = null;
      trailPointsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update deliverer marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const latlng = L.latLng(delivererLat, delivererLng);
    const icon = makeDelivererIcon(delivererPhotoUrl, delivererName);

    if (!delivererMarkerRef.current) {
      delivererMarkerRef.current = L.marker(latlng, { icon }).addTo(map);
    } else {
      delivererMarkerRef.current.setLatLng(latlng);
      delivererMarkerRef.current.setIcon(icon);
    }

    // Trail history (last 30 positions)
    const last = trailPointsRef.current[trailPointsRef.current.length - 1];
    if (!last || last.lat !== latlng.lat || last.lng !== latlng.lng) {
      trailPointsRef.current.push(latlng);
      if (trailPointsRef.current.length > 30) trailPointsRef.current.shift();

      if (trailRef.current) trailRef.current.remove();
      if (trailPointsRef.current.length >= 2) {
        trailRef.current = L.polyline(trailPointsRef.current, {
          color: TC,
          weight: 3,
          opacity: 0.5,
          dashArray: "6 6",
        }).addTo(map);
      }
    }
  }, [delivererLat, delivererLng, delivererPhotoUrl, delivererName]);

  // Update destination marker + line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destinationLat != null && destinationLng != null) {
      const dest = L.latLng(destinationLat, destinationLng);
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker(dest, { icon: destinationIcon }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng(dest);
      }

      // Line from deliverer to destination
      const line = [L.latLng(delivererLat, delivererLng), dest];
      if (lineRef.current) lineRef.current.remove();
      lineRef.current = L.polyline(line, {
        color: GREEN,
        weight: 4,
        opacity: 0.7,
      }).addTo(map);

      // Fit to show both
      map.fitBounds(L.latLngBounds(line), { padding: [60, 60], maxZoom: 16 });
    } else {
      map.setView([delivererLat, delivererLng], 15);
    }
  }, [delivererLat, delivererLng, destinationLat, destinationLng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-72 rounded-2xl overflow-hidden border"
      style={{ borderColor: "#E8DDD0", zIndex: 0 }}
    />
  );
}

// Centre de Safi — fallback si adresse introuvable
export const SAFI_CENTER = { lat: 32.2994, lng: -9.2372 };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Geocode via le backend (Google Maps si clé dispo, sinon Nominatim, sinon Safi centre)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  try {
    const url = `${BASE}/api/geocode?address=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    if (!res.ok) return SAFI_CENTER;
    const data = await res.json() as { lat: number; lng: number };
    return { lat: data.lat, lng: data.lng };
  } catch {
    return SAFI_CENTER;
  }
}
