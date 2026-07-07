import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Obstacle } from "../useGameState";

const LANE_X = [-2, 0, 2];

/* ─────────────────────────────────────────────────────────────
   CHAMPIGNON GÉANT — obstacle principal
   Chapeau rouge à pois blancs, pied crème
   ───────────────────────────────────────────────────────────── */
function Champignon({ x, z }: { x: number; z: number }) {
  const capRef  = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = Date.now() * 0.002;
    if (capRef.current) {
      capRef.current.position.y = 1.35 + Math.sin(t * 1.2) * 0.04;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.14 + Math.sin(t * 0.8) * 0.06;
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Halo violet magique au sol */}
      <mesh ref={glowRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial color="#9b59b6" transparent opacity={0.14} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* Pied du champignon — cylindre crème */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.28, 0.38, 1.0, 14]} />
        <meshBasicMaterial color="#f0e6c8" toneMapped={false} />
      </mesh>

      {/* Anneau (voile partiel) sur le pied */}
      <mesh position={[0, 0.72, 0]}>
        <torusGeometry args={[0.32, 0.045, 8, 18]} />
        <meshBasicMaterial color="#d5c9a1" toneMapped={false} />
      </mesh>

      {/* Chapeau principal — sphère rouge aplatie */}
      <mesh ref={capRef} position={[0, 1.35, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.95, 20, 14]} />
        <meshBasicMaterial color="#e74c3c" toneMapped={false} />
      </mesh>

      {/* Bord inférieur du chapeau */}
      <mesh position={[0, 1.08, 0]}>
        <torusGeometry args={[0.92, 0.07, 8, 22]} />
        <meshBasicMaterial color="#c0392b" toneMapped={false} />
      </mesh>

      {/* Pois blancs sur le chapeau */}
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshBasicMaterial color="#fdfefe" toneMapped={false} />
      </mesh>
      <mesh position={[0.5, 1.6, 0.35]}>
        <sphereGeometry args={[0.10, 10, 10]} />
        <meshBasicMaterial color="#fdfefe" toneMapped={false} />
      </mesh>
      <mesh position={[-0.5, 1.58, 0.28]}>
        <sphereGeometry args={[0.10, 10, 10]} />
        <meshBasicMaterial color="#fdfefe" toneMapped={false} />
      </mesh>
      <mesh position={[0.4, 1.58, -0.42]}>
        <sphereGeometry args={[0.10, 10, 10]} />
        <meshBasicMaterial color="#fdfefe" toneMapped={false} />
      </mesh>
      <mesh position={[-0.42, 1.56, -0.38]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshBasicMaterial color="#fdfefe" toneMapped={false} />
      </mesh>
      <mesh position={[0.06, 1.42, 0.88]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshBasicMaterial color="#fdfefe" toneMapped={false} />
      </mesh>

      {/* Halo rouge sur le chapeau */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[1.05, 10, 10]} />
        <meshBasicMaterial color="#ff1744" transparent opacity={0.06} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Obstacles({ obstacles }: { obstacles: Obstacle[] }) {
  return (
    <>
      {obstacles.map((o) => {
        const x = LANE_X[o.lane + 1];
        return <Champignon key={o.id} x={x} z={o.z} />;
      })}
    </>
  );
}
