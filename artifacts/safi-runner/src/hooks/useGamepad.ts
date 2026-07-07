import { useEffect, useRef, useState } from "react";

type Opts = {
  enabled: boolean;
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
};

const DEADZONE = 0.5;

export function useGamepad(opts: Opts): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const prev = useRef({ left: false, right: false, jump: false });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshConnected = () => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      setConnected(pads.some((p) => p && p.connected));
    };

    const onConnect = () => refreshConnected();
    const onDisconnect = () => refreshConnected();

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    refreshConnected();

    const onVisibilityChange = () => {
      prev.current = { left: false, right: false, jump: false };
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const o = optsRef.current;
      const tabActive =
        typeof document === "undefined" ||
        (document.visibilityState === "visible" &&
          (typeof document.hasFocus !== "function" || document.hasFocus()));
      if (!o.enabled || !tabActive) {
        prev.current = { left: false, right: false, jump: false };
        return;
      }
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const pad = pads.find((p) => p && p.connected);
      if (!pad) return;

      const ax = pad.axes[0] ?? 0;
      const dpadLeft = !!pad.buttons[14]?.pressed;
      const dpadRight = !!pad.buttons[15]?.pressed;
      const dpadUp = !!pad.buttons[12]?.pressed;
      const cross = !!pad.buttons[0]?.pressed;
      const square = !!pad.buttons[2]?.pressed;
      const triangle = !!pad.buttons[3]?.pressed;
      const l1 = !!pad.buttons[4]?.pressed;
      const r1 = !!pad.buttons[5]?.pressed;

      const left = ax < -DEADZONE || dpadLeft || l1;
      const right = ax > DEADZONE || dpadRight || r1;
      const jump = cross || square || triangle || dpadUp;

      if (left && !prev.current.left) o.onLeft();
      if (right && !prev.current.right) o.onRight();
      if (jump && !prev.current.jump) o.onJump();

      prev.current = { left, right, jump };
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(raf);
    };
  }, []);

  return { connected };
}
