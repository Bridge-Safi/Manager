import { useRef, useState, useCallback } from "react";
import { getCurrentMultiplier } from "../lib/happyHour";

export type GamePhase = "start" | "playing" | "checkpoint" | "gameover";

export interface Obstacle {
  id: number;
  lane: number;
  z: number;
}

export interface Diamond {
  id: number;
  lane: number;
  z: number;
}

export interface PowerUp {
  id: number;
  lane: number;
  z: number;
  type: "shield" | "magnet";
}

export interface GameState {
  phase: GamePhase;
  lane: number;
  score: number;
  isJumping: boolean;
  jumpVelocity: number;
  playerY: number;
  obstacles: Obstacle[];
  diamonds: Diamond[];
  powerUps: PowerUp[];
  speed: number;
  distance: number;
  playTime: number;
  checkpointNumber: number;
  nextCheckpointAt: number;
  boostMeter: number;
  boostActive: boolean;
  boostTimeLeft: number;
  difficultyLevel: 1 | 2 | 3;
  shieldActive: boolean;
  magnetActive: boolean;
  magnetTimeLeft: number;
}

/* ── Checkpoints ───────────────────────────────────────────── */
const CHECKPOINT_INTERVAL = 40;

/* ── Niveaux de difficulté progressive ─────────────────────
   Niveau 1 DÉBUTANT  : 0-20 min   (0-1200s)
   Niveau 2 NORMAL    : 20-60 min  (1200-3600s)
   Niveau 3 HARD      : 60+ min    (3600s+)
   ─────────────────────────────────────────────────────────── */
const LEVEL_2_TIME = 1200;  // 20 min
const LEVEL_3_TIME = 3600;  // 60 min

/* Vitesse de départ et plafonds par niveau */
const SPEED_START   = 8;
const SPEED_CAP     = [18, 24, 30] as const;   // plafond par niveau (1,2,3)

/* Taux d'obstacles maximum par niveau */
const OBS_RATE_START = 0.6;
const OBS_RATE_CAP   = [1.6, 2.4, 3.2] as const;

/* Double / triple obstacles — déblocages temporels */
const DOUBLE_OBS_START_TIME  = 30;
const DOUBLE_OBS_MAX_CHANCE  = 0.45;
const TRIPLE_OBS_START_TIME  = 60;
const TRIPLE_OBS_MAX_CHANCE  = 0.15;

/* Pièces */
const DIAMOND_RATE_MIN = 1.4;
const DIAMOND_RATE_MAX = 0.7;
const CLUSTER_CHANCE   = 0.35;

/* Nitro */
const BOOST_PER_DIAMOND = 6;
const BOOST_DURATION    = 3.0;
const BOOST_SPEED_MULT  = 1.85;
const BOOST_SCORE_MULT  = 2;

/* Power-ups */
const POWERUP_SPAWN_RATE = 0.028;   // chance/s d'apparition d'un power-up
const MAGNET_DURATION    = 5.0;     // secondes d'aimant
const MAGNET_RANGE_Z     = 1.4;     // capture diamants dans ce rayon Z (toutes voies)

/* Helper */
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

function getDifficultyLevel(playTime: number): 1 | 2 | 3 {
  if (playTime >= LEVEL_3_TIME) return 3;
  if (playTime >= LEVEL_2_TIME) return 2;
  return 1;
}

/* Vitesse cible en fonction du temps de jeu — progression par paliers */
function getTargetSpeed(playTime: number): number {
  if (playTime < LEVEL_2_TIME) {
    const t = playTime / LEVEL_2_TIME;
    return lerp(SPEED_START, SPEED_CAP[0], t * t);
  }
  if (playTime < LEVEL_3_TIME) {
    const t = (playTime - LEVEL_2_TIME) / (LEVEL_3_TIME - LEVEL_2_TIME);
    return lerp(SPEED_CAP[0], SPEED_CAP[1], t);
  }
  const t = Math.min(1, (playTime - LEVEL_3_TIME) / 1800);
  return lerp(SPEED_CAP[1], SPEED_CAP[2], t);
}

/* Taux d'obstacles en fonction du temps */
function getObstacleRate(playTime: number): number {
  const lvl = getDifficultyLevel(playTime);
  const cap = OBS_RATE_CAP[lvl - 1];
  const dt15 = Math.max(0, (playTime - 15) / (LEVEL_2_TIME));
  return lerp(OBS_RATE_START, cap, dt15 * dt15);
}

export function useGameState() {
  const idRef = useRef(0);
  const lastDiamondLane = useRef<number | null>(null);
  const clusterCount = useRef(0);

  const initialState = (): GameState => ({
    phase: "start",
    lane: 0,
    score: 0,
    isJumping: false,
    jumpVelocity: 0,
    playerY: 0,
    obstacles: [],
    diamonds: [],
    powerUps: [],
    speed: SPEED_START,
    distance: 0,
    playTime: 0,
    checkpointNumber: 0,
    nextCheckpointAt: CHECKPOINT_INTERVAL,
    boostMeter: 0,
    boostActive: false,
    boostTimeLeft: 0,
    difficultyLevel: 1,
    shieldActive: false,
    magnetActive: false,
    magnetTimeLeft: 0,
  });

  const [state, setState] = useState<GameState>(initialState);

  const startGame = useCallback(() => {
    idRef.current = 0;
    lastDiamondLane.current = null;
    clusterCount.current = 0;

    const preObstacles: Obstacle[] = [];
    const preDiamonds: Diamond[] = [];

    [-95, -150].forEach((z) => {
      const lane = Math.floor(Math.random() * 3) - 1;
      preObstacles.push({ id: idRef.current++, lane, z });
    });

    [-12, -22, -32, -42, -55, -68, -82, -100, -120, -140, -165].forEach((z) => {
      const lane = Math.floor(Math.random() * 3) - 1;
      preDiamonds.push({ id: idRef.current++, lane, z });
      if (Math.random() < 0.5) {
        preDiamonds.push({ id: idRef.current++, lane, z: z - 5 });
      }
    });

    setState({ ...initialState(), phase: "playing", obstacles: preObstacles, diamonds: preDiamonds });
  }, []);

  const resumeGame = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "playing",
      obstacles: [],
      diamonds: [],
      powerUps: [],
      isJumping: false,
      jumpVelocity: 0,
      playerY: 0,
      boostActive: false,
      boostTimeLeft: 0,
      nextCheckpointAt: s.playTime + CHECKPOINT_INTERVAL,
    }));
  }, []);

  const changeLane = useCallback((dir: 1 | -1) => {
    setState((s) => {
      if (s.phase !== "playing") return s;
      const newLane = Math.max(-1, Math.min(1, s.lane + dir));
      return { ...s, lane: newLane };
    });
  }, []);

  const jump = useCallback(() => {
    setState((s) => {
      if (s.phase !== "playing" || s.isJumping) return s;
      return { ...s, isJumping: true, jumpVelocity: 13 };
    });
  }, []);

  const activateBoost = useCallback((): boolean => {
    let triggered = false;
    setState((s) => {
      if (s.phase !== "playing") return s;
      if (s.boostActive) return s;
      if (s.boostMeter < 100) return s;
      triggered = true;
      return { ...s, boostActive: true, boostTimeLeft: BOOST_DURATION, boostMeter: 0 };
    });
    return triggered;
  }, []);

  /* ── Glissade (swipe haut→bas) : dash de vitesse 2.5s + bonus score ── */
  const slide = useCallback(() => {
    setState((s) => {
      if (s.phase !== "playing") return s;
      return {
        ...s,
        boostActive: true,
        boostTimeLeft: 2.5,
        score: s.score + 30,
      };
    });
  }, []);

  /* ── Grand saut (swipe bas→haut) : saut avec vélocité x1.8 ── */
  const bigJump = useCallback(() => {
    setState((s) => {
      if (s.phase !== "playing") return s;
      return { ...s, isJumping: true, jumpVelocity: 23, playerY: Math.max(s.playerY, 0) };
    });
  }, []);

  const tick = useCallback((dt: number) => {
    setState((s) => {
      if (s.phase !== "playing") return s;

      const GRAVITY  = 32;
      const LANE_X   = [-2, 0, 2];
      const SPAWN_Z  = -65;
      const DESPAWN_Z = 8;
      const PLAYER_Z  = 0;

      let phase: GamePhase = s.phase;
      let {
        score, isJumping, jumpVelocity, playerY,
        obstacles, diamonds, powerUps, speed, distance,
        playTime, checkpointNumber, nextCheckpointAt,
        boostMeter, boostActive, boostTimeLeft,
        shieldActive, magnetActive, magnetTimeLeft,
      } = s;

      playTime += dt;
      const difficultyLevel = getDifficultyLevel(playTime);

      /* ── Boost ──────────────────────────────────────────────── */
      if (boostActive) {
        boostTimeLeft -= dt;
        if (boostTimeLeft <= 0) { boostActive = false; boostTimeLeft = 0; }
      }

      /* ── Aimant (Magnet) ────────────────────────────────────── */
      if (magnetActive) {
        magnetTimeLeft -= dt;
        if (magnetTimeLeft <= 0) { magnetActive = false; magnetTimeLeft = 0; }
      }

      /* ── Vitesse — progression par niveaux ──────────────────── */
      speed = getTargetSpeed(playTime);
      if (boostActive) speed *= BOOST_SPEED_MULT;
      distance += dt * speed;

      const obstacleRate = getObstacleRate(playTime);
      const diamondRate  = lerp(DIAMOND_RATE_MIN, DIAMOND_RATE_MAX, playTime / LEVEL_3_TIME);

      const doubleChance = playTime < DOUBLE_OBS_START_TIME
        ? 0
        : lerp(0, DOUBLE_OBS_MAX_CHANCE, (playTime - DOUBLE_OBS_START_TIME) / 60);
      const tripleChance = playTime < TRIPLE_OBS_START_TIME
        ? 0
        : lerp(0, TRIPLE_OBS_MAX_CHANCE, (playTime - TRIPLE_OBS_START_TIME) / 60);

      /* ── Checkpoint ─────────────────────────────────────────── */
      if (playTime >= nextCheckpointAt) {
        return {
          ...s,
          phase: "checkpoint",
          playTime,
          difficultyLevel,
          checkpointNumber: checkpointNumber + 1,
          speed: 0,
          isJumping: false,
          jumpVelocity: 0,
          playerY: 0,
          boostActive: false,
          boostTimeLeft: 0,
        };
      }

      /* ── Saut ───────────────────────────────────────────────── */
      if (isJumping) {
        jumpVelocity -= GRAVITY * dt;
        playerY += jumpVelocity * dt;
        if (playerY <= 0) { playerY = 0; isJumping = false; jumpVelocity = 0; }
      }

      /* ── Déplacement obstacles & diamants ───────────────────── */
      obstacles = obstacles
        .map((o) => ({ ...o, z: o.z + speed * dt }))
        .filter((o) => o.z < DESPAWN_Z);

      diamonds = diamonds
        .map((d) => ({ ...d, z: d.z + speed * dt }))
        .filter((d) => d.z < DESPAWN_Z);

      powerUps = powerUps
        .map((p) => ({ ...p, z: p.z + speed * dt }))
        .filter((p) => p.z < DESPAWN_Z);

      /* ── Spawn obstacles ────────────────────────────────────── */
      if (Math.random() < dt * obstacleRate) {
        const lane = Math.floor(Math.random() * 3) - 1;
        obstacles.push({ id: idRef.current++, lane, z: SPAWN_Z });

        if (Math.random() < doubleChance) {
          let lane2: number;
          do { lane2 = Math.floor(Math.random() * 3) - 1; } while (lane2 === lane);
          obstacles.push({ id: idRef.current++, lane: lane2, z: SPAWN_Z - 4 });

          if (Math.random() < tripleChance) {
            const lane3 = [-1, 0, 1].find((l) => l !== lane && l !== lane2)!;
            obstacles.push({ id: idRef.current++, lane: lane3, z: SPAWN_Z - 8 });
          }
        }
      }

      /* ── Spawn diamants ─────────────────────────────────────── */
      if (Math.random() < dt * diamondRate) {
        const lane = Math.floor(Math.random() * 3) - 1;
        diamonds.push({ id: idRef.current++, lane, z: SPAWN_Z });

        if (Math.random() < CLUSTER_CHANCE) {
          diamonds.push({ id: idRef.current++, lane, z: SPAWN_Z - 5 });
          if (Math.random() < 0.15) {
            diamonds.push({ id: idRef.current++, lane, z: SPAWN_Z - 10 });
          }
        }
      }

      /* ── Spawn power-ups ────────────────────────────────────── */
      if (Math.random() < dt * POWERUP_SPAWN_RATE) {
        const puLane = Math.floor(Math.random() * 3) - 1;
        const puType: "shield" | "magnet" = Math.random() < 0.5 ? "shield" : "magnet";
        powerUps.push({ id: idRef.current++, lane: puLane, z: SPAWN_Z - 10, type: puType });
      }

      /* ── Collisions obstacles ───────────────────────────────── */
      const playerX = LANE_X[s.lane + 1];
      const COLL_XR = 0.7;
      const COLL_ZR = 1.4;

      if (!boostActive) {
        for (const o of obstacles) {
          const ox = LANE_X[o.lane + 1];
          const dx = Math.abs(playerX - ox);
          const dz = Math.abs(PLAYER_Z - o.z);
          if (dx < COLL_XR && dz < COLL_ZR && playerY < 1.5) {
            if (shieldActive) {
              shieldActive = false;  // bouclier absorbe le choc
              obstacles = obstacles.filter((ob) => ob.id !== o.id);
              score += 25;           // bonus d'absorption
            } else {
              phase = "gameover";
            }
            break;
          }
        }
      } else {
        const survivors: Obstacle[] = [];
        for (const o of obstacles) {
          const ox = LANE_X[o.lane + 1];
          const dx = Math.abs(playerX - ox);
          const dz = Math.abs(PLAYER_Z - o.z);
          if (!(dx < COLL_XR + 0.3 && dz < COLL_ZR && playerY < 1.5)) {
            survivors.push(o);
          } else {
            score += 5;
          }
        }
        obstacles = survivors;
      }

      /* ── Collecte diamants ──────────────────────────────────── */
      const newDiamonds: Diamond[] = [];
      const happyMult    = getCurrentMultiplier();
      const diamondPoints = (boostActive ? 10 * BOOST_SCORE_MULT : 10) * happyMult;

      for (const d of diamonds) {
        const ddx = Math.abs(playerX - LANE_X[d.lane + 1]);
        const ddz = Math.abs(PLAYER_Z - d.z);
        /* Aimant : capture TOUS les diamants proches quelle que soit la voie */
        const magnetCapture = magnetActive && ddz < MAGNET_RANGE_Z;
        const directCapture = ddx < 1.0 && ddz < 1.2;

        if (directCapture || magnetCapture) {
          score += diamondPoints;
          if (!boostActive) {
            boostMeter = Math.min(100, boostMeter + BOOST_PER_DIAMOND);
          }
        } else {
          newDiamonds.push(d);
        }
      }

      /* ── Collecte power-ups ─────────────────────────────────── */
      const newPowerUps: PowerUp[] = [];
      for (const p of powerUps) {
        const pdx = Math.abs(playerX - LANE_X[p.lane + 1]);
        const pdz = Math.abs(PLAYER_Z - p.z);
        if (pdx < 1.0 && pdz < 1.2) {
          if (p.type === "shield") {
            shieldActive = true;
          } else {
            magnetActive    = true;
            magnetTimeLeft  = MAGNET_DURATION;
          }
        } else {
          newPowerUps.push(p);
        }
      }

      return {
        ...s,
        phase,
        score,
        isJumping,
        jumpVelocity,
        playerY,
        obstacles,
        diamonds: newDiamonds,
        powerUps: newPowerUps,
        speed,
        distance,
        playTime,
        checkpointNumber,
        nextCheckpointAt,
        boostMeter,
        boostActive,
        boostTimeLeft,
        difficultyLevel,
        shieldActive,
        magnetActive,
        magnetTimeLeft,
      };
    });
  }, []);

  const returnToStart = useCallback(() => {
    setState((s) => ({ ...initialState(), checkpointNumber: s.checkpointNumber }));
  }, []);

  return { state, startGame, resumeGame, returnToStart, changeLane, jump, slide, bigJump, tick, activateBoost };
}
