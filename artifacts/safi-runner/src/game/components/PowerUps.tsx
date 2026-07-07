import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PowerUp } from "../useGameState";

const LANE_X = [-2, 0, 2];

/* ── Bouclier — sphère bleue pulsante ─── */
function ShieldItem({ x, z }: { x: number; z: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = Date.now() * 0.003;
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.06;
      groupRef.current.position.y = 1.1 + Math.sin(t) * 0.15;
    }
    if (innerRef.current) {
      const s = 1 + Math.sin(t * 2) * 0.08;
      innerRef.current.scale.setScalar(s);
    }
    if (ring1Ref.current) ring1Ref.current.rotation.x += 0.05;
    if (ring2Ref.current) ring2Ref.current.rotation.z += 0.04;
  });

  return (
    <group ref={groupRef} position={[x, 1.1, z]}>
      {/* Sphère intérieure bleue */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshBasicMaterial color="#4fc3f7" transparent opacity={0.85} toneMapped={false} />
      </mesh>

      {/* Étoile dorée centrale */}
      <mesh rotation={[0, 0, 0]}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color="#fff176" toneMapped={false} />
      </mesh>

      {/* Anneaux orbitaux */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[0.4, 0.48, 20, 1]} />
        <meshBasicMaterial color="#29b6f6" transparent opacity={0.75} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.44, 0.52, 20, 1]} />
        <meshBasicMaterial color="#81d4fa" transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Halo externe */}
      <mesh>
        <sphereGeometry args={[0.52, 10, 10]} />
        <meshBasicMaterial color="#0288d1" transparent opacity={0.12} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ── Aimant — forme en U verte magnétique ─── */
function MagnetItem({ x, z }: { x: number; z: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const glow1Ref = useRef<THREE.Mesh>(null);
  const glow2Ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = Date.now() * 0.004;
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.08;
      groupRef.current.position.y = 1.1 + Math.sin(t) * 0.15;
    }
    if (glow1Ref.current) glow1Ref.current.rotation.z += 0.06;
    if (glow2Ref.current) glow2Ref.current.rotation.z -= 0.04;
  });

  return (
    <group ref={groupRef} position={[x, 1.1, z]}>
      {/* Corps principal — torus = aimant stylisé */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.1, 8, 16, Math.PI]} />
        <meshBasicMaterial color="#ffeb3b" toneMapped={false} />
      </mesh>

      {/* Pôle gauche (vert) */}
      <mesh position={[-0.24, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.25, 8]} />
        <meshBasicMaterial color="#66bb6a" toneMapped={false} />
      </mesh>

      {/* Pôle droit (rouge) */}
      <mesh position={[0.24, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.25, 8]} />
        <meshBasicMaterial color="#ef5350" toneMapped={false} />
      </mesh>

      {/* Anneaux lumineux */}
      <mesh ref={glow1Ref}>
        <ringGeometry args={[0.42, 0.52, 20, 1]} />
        <meshBasicMaterial color="#ffee58" transparent opacity={0.7} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={glow2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[0.48, 0.56, 20, 1]} />
        <meshBasicMaterial color="#76ff03" transparent opacity={0.5} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Halo externe jaune */}
      <mesh>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshBasicMaterial color="#ffd600" transparent opacity={0.10} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function PowerUps({ powerUps }: { powerUps: PowerUp[] }) {
  return (
    <>
      {powerUps.map((p) =>
        p.type === "shield"
          ? <ShieldItem key={p.id} x={LANE_X[p.lane + 1]} z={p.z} />
          : <MagnetItem key={p.id} x={LANE_X[p.lane + 1]} z={p.z} />,
      )}
    </>
  );
}
