/* ──────────────────────────────────────────────────────────────────
   Musique orientale marocaine PROCÉDURALE — Web Audio API
   Gamme Hijaz sur D (signature orientale : seconde mineure +
   tierce majeure) + drone tonique + percussions darbuka
   (DUM grave / tek aigu) sur rythme Maksum.

   Aucun fichier audio externe : tout est synthétisé en temps
   réel, donc 0 latence de chargement et boucle parfaite.
   ────────────────────────────────────────────────────────────── */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lookahead: number | null = null;
let stepIdx = 0;
let nextStepTime = 0;
let running = false;

/* Gamme Hijaz Kar sur D (D, Eb, F#, G, A, Bb, C, D octave) */
const HIJAZ_D = [
  146.83,  // D3 (drone bas)
  293.66,  // D4
  311.13,  // Eb4
  369.99,  // F#4
  392.00,  // G4
  440.00,  // A4
  466.16,  // Bb4
  523.25,  // C5
  587.33,  // D5
];

/* Pattern mélodique sur 32 pas de croche — boucle qui tourne sans
   se répéter trop évidemment grâce aux ornementations */
const MELODY: (number | null)[] = [
  3, null, 5, 4, 3, null, 2, 1,
  3, 4, 5, 6, 5, 4, 3, null,
  4, 5, 6, 7, 8, 7, 6, 5,
  4, 3, 2, 1, 2, 3, 1, null,
];

/* Rythme Maksum (4/4 typique du raï/châabi) — 16 pas, boucle ×2
   pour matcher les 32 pas mélodiques.
   D = DUM (basse), t = tek (claque aiguë), '' = silence  */
const DRUM_16: ("D" | "t" | "")[] = [
  "D", "",  "t", "",  "D", "D", "t", "",
  "",  "t", "",  "",  "D", "",  "t", "",
];

const STEP_DUR = 0.165; // ~91 BPM en croches → ambiance posée orientale

function makeNoiseBuffer(audioCtx: AudioContext, durationSec: number): AudioBuffer {
  const length = Math.floor(audioCtx.sampleRate * durationSec);
  const buf = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* DUM : son grave bombé style darbuka — sinus avec sweep down */
function dum(when: number) {
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(140, when);
  o.frequency.exponentialRampToValueAtTime(55, when + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.55, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  o.connect(g).connect(masterGain);
  o.start(when);
  o.stop(when + 0.24);
}

/* tek : claquement sec aigu — bruit blanc filtré bandpass haut */
function tek(when: number) {
  if (!ctx || !masterGain) return;
  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, 0.08);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 4500;
  bp.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.32, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
  noise.connect(bp).connect(g).connect(masterGain);
  noise.start(when);
  noise.stop(when + 0.09);
}

/* Note mélodique style oud/qanun — triangle + léger vibrato +
   touche de quart-de-ton ornemental aléatoire */
function pluck(freq: number, when: number, dur: number, vol = 0.16) {
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(freq, when);

  /* Vibrato subtil (LFO sur frequency) */
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = freq * 0.012;
  lfo.connect(lfoGain).connect(o.frequency);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  o.connect(g).connect(masterGain);
  lfo.start(when);
  o.start(when);
  o.stop(when + dur + 0.05);
  lfo.stop(when + dur + 0.05);
}

/* Drone tonique D2 — bourdon continu très grave style ney/oud */
function drone(when: number, dur: number) {
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = HIJAZ_D[0] / 2; // D2
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 320;
  lp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.06, when + 0.4);
  g.gain.setValueAtTime(0.06, when + dur - 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(lp).connect(g).connect(masterGain);
  o.start(when);
  o.stop(when + dur + 0.05);
}

function scheduleAhead() {
  if (!ctx || !running) return;
  const now = ctx.currentTime;
  const HORIZON = 0.45;

  while (nextStepTime < now + HORIZON) {
    const t = nextStepTime;
    const i32 = stepIdx % 32;

    /* Drone toutes les 32 pas (≈5,3 sec) */
    if (i32 === 0) drone(t, STEP_DUR * 32);

    /* Mélodie sur 32 pas */
    const m = MELODY[i32];
    if (m !== null) pluck(HIJAZ_D[m], t, STEP_DUR * 1.6, 0.15);

    /* Percussion sur 16 pas (boucle ×2) */
    const d = DRUM_16[i32 % 16];
    if (d === "D") dum(t);
    else if (d === "t") tek(t);

    nextStepTime += STEP_DUR;
    stepIdx++;
  }
}

export function startOrientalMusic(volume = 0.4) {
  if (running) return;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    } else {
      masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
    }
    nextStepTime = ctx.currentTime + 0.08;
    stepIdx = 0;
    running = true;
    lookahead = window.setInterval(scheduleAhead, 80);
  } catch (e) {
    console.warn("[oriental music] start failed", e);
  }
}

export function stopOrientalMusic() {
  running = false;
  if (lookahead !== null) {
    clearInterval(lookahead);
    lookahead = null;
  }
  if (masterGain && ctx) {
    /* Fade out progressif pour éviter le clic */
    masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
  }
}

export function setOrientalMusicVolume(v: number) {
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
  }
}

/* ──────────────────────────────────────────────────────────────────
   EFFETS SONORES "tonal" — chaque action déclenche une note ou un
   petit motif dans la GAMME HIJAZ pour rester en harmonie avec la
   musique de fond. SFX silencieux si l'AudioContext n'est pas encore
   démarré (= musique OFF) → cohérence totale avec le toggle musique.
   ────────────────────────────────────────────────────────────── */

/* Joue une note brève (sinus + triangle) à une fréquence donnée. */
function tone(
  freq: number,
  when: number,
  dur: number,
  vol = 0.18,
  type: OscillatorType = "triangle",
) {
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(masterGain);
  o.start(when);
  o.stop(when + dur + 0.04);
}

/* Glissando (sweep) entre deux fréquences */
function sweep(
  fromFreq: number,
  toFreq: number,
  when: number,
  dur: number,
  vol = 0.2,
  type: OscillatorType = "triangle",
) {
  if (!ctx || !masterGain) return;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(fromFreq, when);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(masterGain);
  o.start(when);
  o.stop(when + dur + 0.04);
}

/* SAUT — arpège ascendant rapide D5 → A5 → D6 (motif mawwâl montant) */
export function sfxJump() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  tone(587.33, t0,        0.08, 0.18); // D5
  tone(880.00, t0 + 0.05, 0.10, 0.18); // A5
  tone(1174.66, t0 + 0.10, 0.14, 0.16); // D6
}

/* DIAMANT — tintement cristallin (D6 + F#6 superposés, court) */
export function sfxDiamond() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  tone(1174.66, t0,        0.18, 0.14, "sine");     // D6
  tone(1479.98, t0 + 0.015, 0.22, 0.10, "triangle"); // F#6
}

/* CHANGEMENT DE VOIE — petit "tek" tonal sur la quinte (A4) */
export function sfxLane() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  tone(440, t0, 0.06, 0.12, "sine");
  tone(880, t0 + 0.01, 0.05, 0.08, "triangle");
}

/* CHECKPOINT — petite fanfare montante D F# A D (Hijaz arpégé) */
export function sfxCheckpoint() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  tone(587.33, t0,        0.18, 0.20); // D5
  tone(739.99, t0 + 0.10, 0.18, 0.20); // F#5
  tone(880.00, t0 + 0.20, 0.18, 0.20); // A5
  tone(1174.66, t0 + 0.30, 0.32, 0.22); // D6
}

/* NITRO BOOST — whoosh ascendant + harmonique aiguë (sensation de turbo) */
export function sfxNitro() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  sweep(180, 1400, t0,        0.55, 0.22, "sawtooth"); // souffle
  sweep(440, 1760, t0 + 0.05, 0.45, 0.14, "square");   // harmonique aiguë
  tone(2349.32, t0 + 0.08, 0.35, 0.10, "triangle");    // D7 brillant
}

/* NITRO READY — petit "ding" cristallin quand la jauge est pleine */
export function sfxNitroReady() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  tone(1318.51, t0,        0.10, 0.16, "triangle"); // E6
  tone(1975.53, t0 + 0.06, 0.18, 0.14, "sine");     // B6
}

/* CRASH / GAME OVER — descente dissonante Bb → Eb → low D (sweep grave) */
export function sfxCrash() {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime;
  /* Note dissonante haute (Bb5) qui chute */
  sweep(932.33, 73.42, t0, 0.55, 0.28, "sawtooth"); // Bb5 → D2
  /* Boum grave en superposition */
  if (ctx && masterGain) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t0);
    o.frequency.exponentialRampToValueAtTime(40, t0 + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    o.connect(g).connect(masterGain);
    o.start(t0);
    o.stop(t0 + 0.55);
  }
}
