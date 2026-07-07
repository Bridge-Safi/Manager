import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Diamond } from "../useGameState";

const LANE_X = [-2, 0, 2];

/* Pièce d'or cyberpunk — bloom multicouches additif */
function GoldCoin({ x, z }: { x: number; z: number }) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = Date.now() * 0.005;
    const y = 1.0 + Math.sin(t) * 0.12;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.18;
      meshRef.current.position.y = y;
    }
    if (ringRef1.current) { ringRef1.current.rotation.z += 0.04; ringRef1.current.position.y = y; }
    if (ringRef2.current) { ringRef2.current.rotation.z -= 0.03; ringRef2.current.position.y = y; }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Pièce dorée brillante */}
      <mesh ref={meshRef} position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.07, 16]} />
        <meshBasicMaterial color="#ffd700" toneMapped={false} />
      </mesh>

      {/* Anneau orbital 1 — cyan */}
      <mesh ref={ringRef1} position={[0, 1.0, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.5, 0.58, 24, 1]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.7} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Anneau orbital 2 — magenta */}
      <mesh ref={ringRef2} position={[0, 1.0, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[0.62, 0.7, 24, 1]} />
        <meshBasicMaterial color="#ff1493" transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Diamonds({ diamonds }: { diamonds: Diamond[] }) {
  return (
    <>
      {diamonds.map((d) => (
        <GoldCoin key={d.id} x={LANE_X[d.lane + 1]} z={d.z} />
      ))}
    </>
  );
}
