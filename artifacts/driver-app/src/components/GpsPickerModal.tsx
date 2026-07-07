import { MapPin, X, Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const TC = "#C14B2A";
const GREEN = "#2A7A48";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";

interface GpsPickerModalProps {
  address: string;
  label: string;
  onClose: () => void;
}

interface GpsOption {
  id: string;
  name: string;
  color: string;
  bg: string;
  logo: string;
}

const GPS_OPTIONS: GpsOption[] = [
  { id: "apple",  name: "Apple Plans",  color: "#555",      bg: "#F0F0F0", logo: "🧭" },
  { id: "google", name: "Google Maps",  color: "#1A73E8",   bg: "#EAF1FB", logo: "🗺" },
  { id: "waze",   name: "Waze",         color: "#05C7F2",   bg: "#E0F9FD", logo: "🚗" },
];

// Detect iOS (iPhone, iPad, iPod) — used to pick native URL schemes
const isIOS = typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * Build a navigation URL for a given GPS app.
 * On iOS:  use native schemes (maps://, comgooglemaps://, waze://)
 *          → the OS intercepts them before the PWA webview can navigate away
 * On other: use HTTPS web URLs that open in the browser
 */
function buildNavUrl(id: string, encoded: string): string {
  if (isIOS) {
    if (id === "apple")  return `maps://?daddr=${encoded}&dirflg=d`;
    if (id === "google") return `comgooglemaps://?daddr=${encoded}&directionsmode=driving`;
    if (id === "waze")   return `waze://?q=${encoded}&navigate=yes`;
  }
  if (id === "apple")  return `https://maps.apple.com/?daddr=${encoded}&dirflg=d`;
  if (id === "google") return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  if (id === "waze")   return `https://waze.com/ul?q=${encoded}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

export function GpsPickerModal({ address, label, onClose }: GpsPickerModalProps) {
  const { t } = useI18n();
  const encoded = encodeURIComponent(address + ", Safi, Maroc");

  const handleOpen = (opt: GpsOption) => {
    // 1. Close modal first so wouter navigates to the delivery page
    onClose();

    // 2. Open GPS after a tiny delay so the navigation state settles
    //    On iOS: native schemes (maps://, comgooglemaps://, waze://) are intercepted
    //    by the OS at the system level → the GPS app opens, PWA stays on screen
    //    On Android/desktop: opens in browser tab
    const url = buildNavUrl(opt.id, encoded);
    setTimeout(() => {
      window.location.href = url;
    }, 80);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(44,24,16,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden border animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        style={{ background: "white", borderColor: TC + "40" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zellige stripe */}
        <div
          className="h-1 w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg,${TC} 0,${TC} 20px,#D4880C 20px,#D4880C 40px,${GREEN} 40px,${GREEN} 60px,#D4880C 60px,#D4880C 80px)`,
          }}
        />

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#FDEEE9" }}
            >
              <Navigation className="h-5 w-5" style={{ color: TC }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: TC }}>
                {t("gps_choose")}
              </p>
              <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: BROWN_MID }}>
                {label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: SAND }}
          >
            <X className="h-4 w-4" style={{ color: BROWN_LIGHT }} />
          </button>
        </div>

        {/* Address chip */}
        <div className="px-5 pb-3">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
            style={{ background: SAND, borderColor: BORDER }}
          >
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: TC }} />
            <span className="text-sm font-medium truncate" style={{ color: BROWN }}>
              {address}
            </span>
          </div>
        </div>

        {/* GPS buttons */}
        <div className="px-5 pb-6 space-y-3">
          {GPS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleOpen(opt)}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all active:scale-[0.98]"
              style={{ background: opt.bg, borderColor: opt.color + "30" }}
            >
              <span className="text-2xl leading-none flex-shrink-0">{opt.logo}</span>
              <span className="font-bold text-base" style={{ color: BROWN }}>
                {opt.name}
              </span>
              <span className="ml-auto text-xs font-semibold" style={{ color: opt.color }}>
                Ouvrir →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
