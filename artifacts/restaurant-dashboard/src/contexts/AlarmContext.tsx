import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useListOrders, useAcceptOrder, useRejectOrder } from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/formatters";
import { useOrdersSSE } from "@/hooks/useOrdersSSE";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface AlarmContextType {
  pendingOrders: Order[];
  isAlarmPlaying: boolean;
  testAlarm: () => void;
  acceptAllPending: () => Promise<void>;
  rejectAllPending: () => Promise<void>;
  acceptSingleOrder: (id: number) => Promise<void>;
  rejectSingleOrder: (id: number) => Promise<void>;
  requestNotificationPermission: () => void;
}

const AlarmContext = createContext<AlarmContextType | null>(null);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  /* Open SSE connection — invalidates caches instantly when a new order arrives */
  useOrdersSSE();

  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const alarmTimeoutRef = useRef<number | null>(null);
  const notifiedOrderIds = useRef<Set<number>>(new Set());

  // Poll pending orders every 2 seconds, even when the tab is in the background.
  // Cast needed because Orval-generated types don't expose refetchIntervalInBackground.
  const { data: pendingOrders = [] } = useListOrders(
    { status: "pending" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { refetchInterval: 2000, refetchIntervalInBackground: true } as any }
  );

  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();

  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const playBeep = useCallback(() => {
    if (!audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High piercing pitch
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.8, ctx.currentTime + 0.3);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }, []);

  const startAlarm = useCallback(() => {
    if (isAlarmPlaying) return;
    initAudio();
    setIsAlarmPlaying(true);
    
    // Play immediately, then set interval
    playBeep();
    intervalRef.current = window.setInterval(() => {
      playBeep();
    }, 500);

    // Auto-stop after 7 minutes
    alarmTimeoutRef.current = window.setTimeout(() => {
      stopAlarm();
    }, 7 * 60 * 1000);
  }, [initAudio, isAlarmPlaying, playBeep]);

  const stopAlarm = useCallback(() => {
    setIsAlarmPlaying(false);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (alarmTimeoutRef.current !== null) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }
  }, []);

  // Check for new orders to trigger notifications
  useEffect(() => {
    if (pendingOrders.length > 0) {
      let hasNewOrder = false;
      pendingOrders.forEach(order => {
        if (!notifiedOrderIds.current.has(order.id)) {
          hasNewOrder = true;
          notifiedOrderIds.current.add(order.id);
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`🚨 ${t.alarmTitle(1)}`, {
              body: `#${order.orderNumber} · ${formatCurrency(order.totalAmount)} · ${order.platform}`,
              icon: "/notification-icon.svg",
              badge: "/notification-icon.svg",
              requireInteraction: true,
            } as NotificationOptions);
          }
        }
      });
      
      if (hasNewOrder) {
        startAlarm();
      } else if (!isAlarmPlaying && pendingOrders.length > 0) {
        // Fallback: if there are pending orders but alarm stopped (e.g. timeout), maybe we should restart it or just rely on state.
        // We will keep it playing as long as pendingOrders > 0 and not timed out.
        startAlarm();
      }
    } else {
      stopAlarm();
    }
  }, [pendingOrders, startAlarm, stopAlarm, isAlarmPlaying]);

  const testAlarm = useCallback(() => {
    initAudio();
    playBeep();
    toast({
      title: "Test de l'alarme",
      description: "Vous devriez entendre un bip.",
    });
  }, [initAudio, playBeep]);

  const acceptAllPending = async () => {
    try {
      await Promise.all(pendingOrders.map(o => acceptOrder.mutateAsync({ id: o.id, data: {} })));
      toast({ title: "Commandes acceptées", description: "Toutes les commandes en attente ont été acceptées." });
      stopAlarm();
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible d'accepter toutes les commandes.", variant: "destructive" });
    }
  };

  const rejectAllPending = async () => {
    try {
      await Promise.all(pendingOrders.map(o => rejectOrder.mutateAsync({ id: o.id, data: { reason: "Refusé en masse" } })));
      toast({ title: "Commandes refusées", description: "Toutes les commandes en attente ont été refusées." });
      stopAlarm();
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de refuser toutes les commandes.", variant: "destructive" });
    }
  };

  const acceptSingleOrder = async (id: number) => {
    try {
      await acceptOrder.mutateAsync({ id, data: {} });
      toast({ title: "Commande acceptée" });
    } catch (e) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const rejectSingleOrder = async (id: number) => {
    try {
      await rejectOrder.mutateAsync({ id, data: { reason: "Refusé par le restaurant" } });
      toast({ title: "Commande refusée" });
    } catch (e) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  return (
    <AlarmContext.Provider value={{
      pendingOrders,
      isAlarmPlaying,
      testAlarm,
      acceptAllPending,
      rejectAllPending,
      acceptSingleOrder,
      rejectSingleOrder,
      requestNotificationPermission
    }}>
      {children}
      {isAlarmPlaying && pendingOrders.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 animate-pulse-overlay backdrop-blur-sm">
          <div className="bg-card p-8 border-4 border-destructive rounded-lg shadow-2xl max-w-xl w-full text-center space-y-6">
            <h2 className="text-4xl font-bold text-destructive flex items-center justify-center gap-4">
              <span className="animate-pulse">🔔</span>
              {t.alarmTitle(pendingOrders.length)}
            </h2>
            <p className="text-xl text-muted-foreground">{t.alarmSubtitle}</p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                size="lg"
                variant="destructive"
                className="text-xl h-16 font-bold"
                onClick={rejectAllPending}
                disabled={rejectOrder.isPending}
              >
                {t.alarmRejectAll}
              </Button>
              <Button
                size="lg"
                className="text-xl h-16 font-bold bg-green-600 hover:bg-green-700 text-white"
                onClick={acceptAllPending}
                disabled={acceptOrder.isPending}
              >
                {t.alarmAcceptAll}
              </Button>
            </div>
            {pendingOrders.length === 1 && (
              <div className="mt-8 text-left bg-muted p-4 rounded-md">
                <p className="font-bold text-lg">#{pendingOrders[0].orderNumber} · {pendingOrders[0].platform}</p>
                <p className="text-xl font-mono mt-2">{formatCurrency(pendingOrders[0].totalAmount)}</p>
                <ul className="mt-2 text-sm space-y-1">
                  {pendingOrders[0].items.slice(0, 3).map((item, i) => (
                    <li key={i}>{(item as { quantity: number; name: string }).quantity}x {(item as { quantity: number; name: string }).name}</li>
                  ))}
                  {pendingOrders[0].items.length > 3 && (
                    <li>{t.alarmAndMore(pendingOrders[0].items.length - 3)}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm must be used within AlarmProvider");
  return ctx;
}
