import { useEffect, useRef, useCallback } from "react";

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [880, 1100, 880, 1100];
    let time = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
      gain.gain.linearRampToValueAtTime(0, time + 0.12);
      osc.start(time);
      osc.stop(time + 0.15);
      time += i % 2 === 0 ? 0.18 : 0.28;
    });
  } catch {
    // audio not available
  }
}

export function useNewOrderAlert(pendingCount: number | undefined) {
  const prevCountRef = useRef<number | undefined>(undefined);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (pendingCount === undefined) return;

    // Don't alert on first load
    if (!initializedRef.current) {
      prevCountRef.current = pendingCount;
      initializedRef.current = true;
      return;
    }

    const prev = prevCountRef.current ?? 0;
    if (pendingCount > prev) {
      playAlertSound();
    }
    prevCountRef.current = pendingCount;
  }, [pendingCount]);
}
