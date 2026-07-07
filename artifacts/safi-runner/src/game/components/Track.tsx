import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ROAD_LENGTH = 200;
const ROAD_WIDTH  = 8;

interface TrackProps {
  speed: number;
}

/* ─────────────────────────────────────────────────────────────
   SOL — fond noir profond, parfaitement plat
   ───────────────────────────────────────────────────────────── */
function VoidFloor() {
  return (
    <mesh position={[0, -0.05, -ROAD_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[120, ROAD_LENGTH + 50]} />
      <meshBasicMaterial color="#05000f" toneMapped={false} />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────
   LIGNES VERTICALES CYAN — perspective de fuite (statiques)
   Comme les vertical lines du p5.js — bandes alignées sur Z
   ───────────────────────────────────────────────────────────── */
function PerspectiveLines() {
  /* Lignes parallèles à la direction de course, espacées régulièrement */
  const xPositions = useMemo(() => {
    /* Lignes principales sur les bords de chaque voie */
    return [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  }, []);

  return (
    <>
      {xPositions.map((x, i) => {
        /* Bordures externes plus brillantes */
        const isEdge = Math.abs(x) === 4;
        const isLane = Math.abs(x) === 1; // séparateurs de voies
        return (
          <group key={i}>
            {/* Ligne solide */}
            <mesh position={[x, 0.005, -ROAD_LENGTH / 2]}>
              <boxGeometry args={[isEdge ? 0.12 : isLane ? 0.08 : 0.04, 0.01, ROAD_LENGTH]} />
              <meshBasicMaterial color="#00f0ff" toneMapped={false} />
            </mesh>
            {/* Halo additif fin */}
            <mesh position={[x, 0.004, -ROAD_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[isEdge ? 0.4 : 0.25, ROAD_LENGTH]} />
              <meshBasicMaterial
                color="#00ffff"
                transparent
                opacity={isEdge ? 0.5 : 0.3}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   LIGNES HORIZONTALES MAGENTA — scrollent vers la caméra
   Comme les horizontal moving lines du p5.js
   ───────────────────────────────────────────────────────────── */
function ScrollingGrid({ speed }: { speed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const SPACING = 4; // distance entre 2 lignes magenta
  const COUNT = Math.floor(ROAD_LENGTH / SPACING);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.z += speed * delta;
    if (groupRef.current.position.z >= SPACING) {
      groupRef.current.position.z -= SPACING;
    }
  });

  /* Lignes étendues bien au-delà de la route pour effet "infini" */
  const lines = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      arr.push(-ROAD_LENGTH + i * SPACING);
    }
    return arr;
  }, [COUNT]);

  return (
    <group ref={groupRef}>
      {lines.map((z) => (
        <group key={z}>
          {/* Ligne solide magenta */}
          <mesh position={[0, 0.006, z]}>
            <boxGeometry args={[60, 0.012, 0.08]} />
            <meshBasicMaterial color="#ff00ff" toneMapped={false} />
          </mesh>
          {/* Halo additif */}
          <mesh position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[60, 0.3]} />
            <meshBasicMaterial
              color="#ff00ff"
              transparent
              opacity={0.45}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   SOLEIL SYNTHWAVE — disque dégradé à l'horizon (statique)
   ───────────────────────────────────────────────────────────── */
function SynthwaveSun() {
  return (
    <group position={[0, 8, -ROAD_LENGTH + 10]}>
      {/* Disque principal magenta-orange */}
      <mesh>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#ff1493" transparent opacity={0.85} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Coeur orange */}
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[8, 32]} />
        <meshBasicMaterial color="#ff6b00" transparent opacity={0.7} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Halo extérieur diffus */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[20, 32]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Bandes horizontales noires sur le soleil (signature retrowave) */}
      {[-7, -4, -1, 2, 5].map((y, i) => (
        <mesh key={i} position={[0, y * 0.5, 0.2]}>
          <planeGeometry args={[24, 0.4]} />
          <meshBasicMaterial color="#05000f" transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   TRACK PRINCIPAL
   ───────────────────────────────────────────────────────────── */
export function Track({ speed }: TrackProps) {
  return (
    <>
      <VoidFloor />
      <PerspectiveLines />
      <ScrollingGrid speed={speed} />
      <SynthwaveSun />
    </>
  );
}
