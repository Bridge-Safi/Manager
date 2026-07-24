import { useEffect, useState } from "react";
import { AlertTriangle, Ban, CheckCircle, X, XCircle } from "lucide-react";
import { useTheme } from "@/lib/theme";

export type ManagerNotification = {
  type: "warn" | "refuse" | "block" | "unblock";
  title: string;
  message: string;
};

interface Props {
  notification: ManagerNotification | null;
  onDismiss: () => void;
}

const CONFIG = {
  warn: {
    icon: AlertTriangle,
    color: "#D4880C",
    bg: "rgba(212,136,12,0.15)",
    border: "rgba(212,136,12,0.4)",
  },
  refuse: {
    icon: XCircle,
    color: "#E85C30",
    bg: "rgba(232,92,48,0.15)",
    border: "rgba(232,92,48,0.4)",
  },
  block: {
    icon: Ban,
    color: "#E53E3E",
    bg: "rgba(229,62,62,0.15)",
    border: "rgba(229,62,62,0.4)",
  },
  unblock: {
    icon: CheckCircle,
    color: "#2A7A48",
    bg: "rgba(42,122,72,0.15)",
    border: "rgba(42,122,72,0.4)",
  },
};

export function ManagerNotificationAlert({ notification, onDismiss }: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
    }
  }, [notification]);

  if (!notification || !visible) return null;

  const cfg = CONFIG[notification.type];
  const Icon = cfg.icon;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl relative"
        style={{
          background: colors.bgCard,
          borderColor: cfg.border,
          boxShadow: `0 0 40px ${cfg.color}33`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
          style={{ color: colors.textLight }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <Icon className="h-6 w-6" style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: cfg.color }}>
              Message du Manager
            </p>
            <h2 className="text-base font-bold leading-tight" style={{ color: colors.text }}>
              {notification.title}
            </h2>
          </div>
        </div>

        {/* Message */}
        <div
          className="rounded-xl p-4 mb-5 text-sm leading-relaxed"
          style={{ background: cfg.bg, color: colors.textMid, border: `1px solid ${cfg.border}` }}
        >
          {notification.message}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleDismiss}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
          style={{ background: cfg.color, color: "#fff" }}
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}
