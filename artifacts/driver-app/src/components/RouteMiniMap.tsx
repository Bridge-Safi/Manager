import React from "react";
export function RouteMiniMap({ pickup, delivery }: { pickup?: string; delivery?: string }) {
  return (
    <div className="w-full h-32 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-400">
      📍 {pickup} → {delivery}
    </div>
  );
}