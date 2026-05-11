let audioCtx: AudioContext | null = null;
let continuousTimerId: ReturnType<typeof setTimeout> | null = null;
let isContinuousRunning = false;

function getAudioCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playBeep(ctx: AudioContext, startTime: number, freq: number, duration: number, gain: number) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  gainNode.gain.setValueAtTime(gain, startTime + duration - 0.05);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playOneAlarmCycle(ctx: AudioContext): number {
  const now = ctx.currentTime;
  const beeps = [
    { freq: 1200, dur: 0.12, gap: 0.08 },
    { freq: 1200, dur: 0.12, gap: 0.08 },
    { freq: 1200, dur: 0.12, gap: 0.22 },
    { freq: 900, dur: 0.25, gap: 0.1 },
    { freq: 900, dur: 0.35, gap: 0 }
  ];
  let t = now + 0.03;
  for (const b of beeps) {
    playBeep(ctx, t, b.freq, b.dur, 0.75);
    t += b.dur + b.gap;
  }
  return t - now;
}

export function isAlarmRunning(): boolean {
  return isContinuousRunning;
}

export function startContinuousAlarm(): () => void {
  if (isContinuousRunning) {
    stopContinuousAlarm();
  }
  isContinuousRunning = true;
  function loop() {
    if (!isContinuousRunning) return;
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const cycleDuration = playOneAlarmCycle(ctx);
      const repeatAfterMs = Math.ceil(cycleDuration * 1e3) + 900;
      continuousTimerId = setTimeout(loop, repeatAfterMs);
    } catch {
      continuousTimerId = setTimeout(loop, 2e3);
    }
  }
  loop();
  return stopContinuousAlarm;
}

export function stopContinuousAlarm() {
  isContinuousRunning = false;
  if (continuousTimerId !== null) {
    clearTimeout(continuousTimerId);
    continuousTimerId = null;
  }
}

export function playAlarm(urgent = false) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    if (urgent) {
      const pattern = [
        { freq: 880, dur: 0.15, gap: 0.08 },
        { freq: 1046, dur: 0.15, gap: 0.08 },
        { freq: 880, dur: 0.15, gap: 0.08 },
        { freq: 1046, dur: 0.25, gap: 0.25 },
        { freq: 880, dur: 0.15, gap: 0.08 },
        { freq: 1046, dur: 0.15, gap: 0.08 },
        { freq: 880, dur: 0.15, gap: 0.08 },
        { freq: 1046, dur: 0.4, gap: 0 }
      ];
      let t = now + 0.05;
      for (const p of pattern) {
        playBeep(ctx, t, p.freq, p.dur, 0.6);
        t += p.dur + p.gap;
      }
    } else {
      playBeep(ctx, now + 0.05, 880, 0.2, 0.5);
      playBeep(ctx, now + 0.35, 880, 0.2, 0.5);
      playBeep(ctx, now + 0.65, 1046, 0.35, 0.5);
    }
  } catch {
  }
}

export function unlockAudio() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
  } catch {
  }
}
