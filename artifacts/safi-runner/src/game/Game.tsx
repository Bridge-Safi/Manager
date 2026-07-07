import { useRef, useCallback, useEffect, Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useGameState } from "./useGameState";

/* ── ErrorBoundary — isole les crashs WebGL/R3F du reste de l'appli ── */
class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError?: (err: Error) => void },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CanvasErrorBoundary]", error, info);
    this.props.onError?.(error);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "#0a0822", color: "#fff", padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Erreur de rendu 3D
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 24, maxWidth: 340 }}>
            WebGL non disponible ou ressources insuffisantes.<br />
            Essaie de recharger la page ou libère des onglets.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px", borderRadius: 30,
              background: "linear-gradient(135deg,#1565c0,#42a5f5)",
              color: "#fff", border: "none", fontWeight: 700,
              fontSize: 15, cursor: "pointer",
            }}
          >
            🔄 Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { SharkPlayer } from "./components/SharkPlayer";
import { Track } from "./components/Track";
import { Obstacles } from "./components/Obstacles";
import { Diamonds } from "./components/Diamonds";
import { PowerUps } from "./components/PowerUps";
import { Scene } from "./components/Scene";
import { GameUI } from "./GameUI";
import { CheckpointUI } from "./CheckpointUI";
import { LanguageSelector } from "../components/LanguageSelector";
import { useSupabaseSync } from "../hooks/useSupabaseSync";
import { useGamepad } from "../hooks/useGamepad";
import { useT } from "../lib/i18n";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMusic } from "../hooks/useMusic";
import { sfxJump, sfxLane, sfxDiamond, sfxCheckpoint, sfxCrash, sfxNitro, sfxNitroReady } from "../lib/orientalMusic";

enum Controls {
  left = "left",
  right = "right",
  jump = "jump",
  boost = "boost",
}

const keyMap = [
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
  { name: Controls.jump, keys: ["Space", "ArrowUp", "KeyW"] },
  { name: Controls.boost, keys: ["ShiftLeft", "ShiftRight", "KeyB"] },
];

function FollowCamera({ playerLane, playerY }: { playerLane: number; playerY: number }) {
  const { camera } = useThree();
  const LANE_X = [-2, 0, 2];
  const targetX = LANE_X[playerLane + 1];

  useFrame((_, delta) => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 8);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 3.8 + playerY * 0.5, delta * 8);
    camera.position.z = 7;
    camera.lookAt(camera.position.x, playerY + 0.5, -6);
  });

  return null;
}

function GameLoop({
  tick, changeLane, jump, boost, phase,
}: {
  tick: (dt: number) => void;
  changeLane: (dir: 1 | -1) => void;
  jump: () => void;
  boost: () => void;
  phase: string;
}) {
  const [, getState] = useKeyboardControls<Controls>();
  const prevLeft = useRef(false);
  const prevRight = useRef(false);
  const prevJump = useRef(false);
  const prevBoost = useRef(false);

  useFrame((_, delta) => {
    const controls = getState();
    const dt = Math.min(delta, 0.05);

    if (phase === "playing") {
      tick(dt);

      if (controls.left && !prevLeft.current) changeLane(-1);
      if (controls.right && !prevRight.current) changeLane(1);
      if (controls.jump && !prevJump.current) jump();
      if (controls.boost && !prevBoost.current) boost();
    }

    prevLeft.current = controls.left;
    prevRight.current = controls.right;
    prevJump.current = controls.jump;
    prevBoost.current = controls.boost;
  });

  return null;
}

function CyberLighting() {
  return (
    <>
      {/* Ambiance nuit cyberpunk — bleu nuit */}
      <ambientLight intensity={0.4} color="#3a2a6a" />

      {/* Lumière magenta venant de la droite */}
      <directionalLight position={[8, 6, 4]} intensity={0.4} color="#ff1493" />

      {/* Lumière cyan venant de la gauche */}
      <directionalLight position={[-8, 6, 4]} intensity={0.4} color="#00bcd4" />

      {/* Lumière chaude orange au loin (horizon coucher de soleil) */}
      <directionalLight position={[0, 3, -30]} intensity={0.3} color="#ff6b00" />
    </>
  );
}

function GameScene({ state, tick, changeLane, jump, boost }: ReturnType<typeof useGameState> & { boost: () => void }) {
  const trackSpeed = state.phase === "playing" ? state.speed : 0;

  return (
    <>
      <FollowCamera playerLane={state.lane} playerY={state.playerY} />
      <GameLoop tick={tick} changeLane={changeLane} jump={jump} boost={boost} phase={state.phase} />

      <CyberLighting />

      {/* Brouillard cyberpunk dense — purple/magenta atmosphérique */}
      <fog attach="fog" args={["#1a0828", 25, 90]} />

      {/* Sol nuit très sombre */}
      <mesh position={[0, -0.12, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 200]} />
        <meshBasicMaterial color="#050410" toneMapped={false} />
      </mesh>

      <Scene />
      <Track speed={trackSpeed} />
      <Obstacles obstacles={state.phase !== "start" ? state.obstacles : []} />
      <Diamonds diamonds={state.phase !== "start" ? state.diamonds : []} />
      <PowerUps powerUps={state.phase !== "start" ? state.powerUps : []} />
      <SharkPlayer lane={state.lane} playerY={state.playerY} isJumping={state.isJumping} />
    </>
  );
}

export function Game() {
  const gameState = useGameState();
  const { state, startGame, resumeGame, returnToStart, changeLane, jump, slide, bigJump, tick, activateBoost } = gameState;
  const { t } = useT();
  const [dark] = useDarkMode();
  const { startIfEnabled: startMusic, stop: stopMusic } = useMusic();

  /* Démarre la musique orientale dès que la partie commence (ce clic
     est le user-gesture exigé par les navigateurs pour activer
     l'AudioContext). Coupe quand la partie se termine. */
  const handleStart = useCallback(() => {
    startMusic();
    startGame();
  }, [startMusic, startGame]);

  /* Après un game over : on reprend EXACTEMENT au même endroit, en
     gardant score, playTime, checkpointNumber, etc. La musique est
     déjà active (pas besoin de la relancer). */
  const handleResumeAfterDeath = useCallback(() => {
    resumeGame();
  }, [resumeGame]);

  /* ── SFX tonals (gamme Hijaz) — chaque action son distinct ── */
  const jumpWithSfx = useCallback(() => {
    sfxJump();
    jump();
  }, [jump]);

  const changeLaneWithSfx = useCallback((dir: 1 | -1) => {
    sfxLane();
    changeLane(dir);
  }, [changeLane]);

  /* Boost : ne joue le whoosh que si la jauge était pleine et que
     l'activation a vraiment réussi (sinon clic sans effet = silence). */
  const boostWithSfx = useCallback(() => {
    if (activateBoost()) sfxNitro();
  }, [activateBoost]);

  /* Petit "ding" cristallin dès que la jauge atteint 100% */
  const prevBoostReady = useRef(false);
  useEffect(() => {
    const ready = state.boostMeter >= 100 && !state.boostActive;
    if (ready && !prevBoostReady.current && state.phase === "playing") {
      sfxNitroReady();
    }
    prevBoostReady.current = ready;
  }, [state.boostMeter, state.boostActive, state.phase]);

  /* Diamant ramassé → tintement cristallin (détecté via score++) */
  const prevScore = useRef(0);
  useEffect(() => {
    if (state.score > prevScore.current && state.phase === "playing") {
      sfxDiamond();
    }
    prevScore.current = state.score;
  }, [state.score, state.phase]);

  /* Transitions de phase → fanfare checkpoint / crash gameover */
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (prevPhase.current !== state.phase) {
      if (state.phase === "checkpoint") sfxCheckpoint();
      else if (state.phase === "gameover") sfxCrash();
    }
    prevPhase.current = state.phase;
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "gameover") return;
    /* Laisse le crash sfx jouer (~0.6s) avant de couper la musique */
    const timer = setTimeout(() => stopMusic(), 700);
    return () => clearTimeout(timer);
  }, [state.phase, stopMusic]);

  useEffect(() => {
    return () => { stopMusic(); };
  }, [stopMusic]);

  const { profile, status, refreshProfile } = useSupabaseSync(state.score, state.phase, state.playTime);

  /* Manette PS4/PS5 (Web Gamepad API). Inputs déclenchés en bord montant
     uniquement, et seulement quand la partie est en cours. */
  const { connected: gamepadConnected } = useGamepad({
    enabled: state.phase === "playing",
    onLeft: () => changeLaneWithSfx(-1),
    onRight: () => changeLaneWithSfx(1),
    onJump: jumpWithSfx,
  });

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      minHeight: "100dvh" as never,
      position: "relative",
      background: "#000",
      overflow: "hidden",
    }}>
      {/* Voile sombre global appliqué au-dessus du canvas 3D quand le
          mode sombre est activé. Sous les UIs (HUD, overlays) pour ne
          pas affecter leur lisibilité. */}
      {dark && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "rgba(0,0,0,0.45)",
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }} />
      )}
      <CanvasErrorBoundary>
        <KeyboardControls map={keyMap}>
          <Canvas
            flat
            camera={{ fov: 68, near: 0.1, far: 200, position: [0, 3.8, 7] }}
            style={{ width: "100%", height: "100%" }}
            dpr={[1, 1.5]}
            gl={{ antialias: false, alpha: false, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false }}
          >
            <GameScene state={state} tick={tick} changeLane={changeLaneWithSfx} jump={jumpWithSfx} boost={boostWithSfx} startGame={startGame} resumeGame={resumeGame} activateBoost={activateBoost} />
          </Canvas>
        </KeyboardControls>
      </CanvasErrorBoundary>

      {/* HUD + Contrôles tactiles */}
      <GameUI
        phase={state.phase}
        score={state.score}
        checkpointNumber={state.checkpointNumber}
        nextCheckpointAt={state.nextCheckpointAt}
        playTime={state.playTime}
        profile={profile}
        boostMeter={state.boostMeter}
        boostActive={state.boostActive}
        boostTimeLeft={state.boostTimeLeft}
        difficultyLevel={state.difficultyLevel}
        shieldActive={state.shieldActive}
        magnetActive={state.magnetActive}
        magnetTimeLeft={state.magnetTimeLeft}
        onStart={handleStart}
        onRestart={handleResumeAfterDeath}
        onReturnToStart={returnToStart}
        onChangeLane={changeLaneWithSfx}
        onJump={jumpWithSfx}
        onBoost={boostWithSfx}
        onRefreshProfile={refreshProfile}
      />

      {/* Overlay checkpoint */}
      {state.phase === "checkpoint" && (
        <CheckpointUI
          checkpointNumber={state.checkpointNumber}
          score={state.score}
          difficultyLevel={state.difficultyLevel}
          onResume={resumeGame}
        />
      )}

      {/* Sélecteur de langue : pendant le jeu → juste sous le score (haut-droite),
          sinon (accueil/checkpoint/gameover) → bas-droite. */}
      <LanguageSelector position={state.phase === "playing" ? "belowScore" : "topRight"} />

      {/* Indicateur manette connectée (discret, en bas à droite) */}
      {gamepadConnected && (
        <div style={{
          position: "absolute", bottom: 12, right: 12, zIndex: 60,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(76,175,80,0.5)",
          color: "#a5d6a7",
          borderRadius: 20, padding: "6px 12px",
          fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
          boxShadow: "0 0 16px rgba(76,175,80,0.35)",
          pointerEvents: "none",
        }}>
          {t("gamepad.connected")}
        </div>
      )}

    </div>
  );
}
