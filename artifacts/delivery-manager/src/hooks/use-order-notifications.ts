import { useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    const beeps = [
      { freq: 880, start: 0, end: 0.12 },
      { freq: 1100, start: 0.15, end: 0.27 },
      { freq: 880, start: 0.3, end: 0.42 },
    ];

    for (const { freq, start, end } of beeps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.4, now + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + end);
      osc.start(now + start);
      osc.stop(now + end + 0.05);
    }
  } catch {
  }
}

type NewOrderPayload = {
  id: number;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  totalAmount: number;
};

export function useOrderNotifications() {
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((order: NewOrderPayload) => {
    if (bannerRef.current) {
      bannerRef.current.remove();
      bannerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const banner = document.createElement("div");
    banner.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      background: linear-gradient(135deg, #ff5a1f, #ff8c00);
      color: white;
      padding: 16px 24px;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(255,90,31,0.5), 0 0 0 2px rgba(255,255,255,0.2);
      font-family: Inter, sans-serif;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1);
      max-width: 480px;
      cursor: pointer;
    `;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-80px); opacity: 0; }
        to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0);    opacity: 1; }
        to   { transform: translateX(-50%) translateY(-80px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    banner.innerHTML = `
      <span style="font-size:28px">🛵</span>
      <div>
        <div style="font-size:12px;opacity:0.85;letter-spacing:0.05em;text-transform:uppercase">Nouvelle commande • ${order.orderNumber}</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px">${order.customerName}</div>
        <div style="font-size:13px;opacity:0.9;margin-top:2px">📍 ${order.deliveryAddress} — <strong>${order.totalAmount} MAD</strong></div>
      </div>
      <span style="margin-left:auto;font-size:20px;opacity:0.7">✕</span>
    `;

    banner.onclick = () => {
      banner.style.animation = "slideUp 0.3s ease forwards";
      setTimeout(() => banner.remove(), 300);
      window.location.href = "/orders";
    };

    document.body.appendChild(banner);
    bannerRef.current = banner;

    timeoutRef.current = setTimeout(() => {
      if (banner.parentNode) {
        banner.style.animation = "slideUp 0.3s ease forwards";
        setTimeout(() => banner.remove(), 300);
      }
    }, 8000);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/events?role=manager-notif");

    es.addEventListener("order:created", (e: MessageEvent) => {
      const order = JSON.parse(e.data) as NewOrderPayload;
      playNotificationSound();
      showBanner(order);
      toast({
        title: `🛵 Nouvelle commande — ${order.orderNumber}`,
        description: `${order.customerName} • ${order.deliveryAddress} • ${order.totalAmount} MAD`,
        duration: 6000,
      });
    });

    return () => {
      es.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (bannerRef.current) bannerRef.current.remove();
    };
  }, [showBanner]);
}
