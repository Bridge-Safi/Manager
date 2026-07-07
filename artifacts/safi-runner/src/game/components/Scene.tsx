import { useMemo } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   CIEL SYNTHWAVE — dégradé violet sombre vers magenta horizon
   ───────────────────────────────────────────────────────────── */
function SynthwaveSky() {
  return (
    <>
      {/* Fond noir profond très loin */}
      <mesh position={[0, 30, -240]}>
        <planeGeometry args={[600, 200]} />
        <meshBasicMaterial color="#02000a" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Bande violet profond */}
      <mesh position={[0, 18, -239]}>
        <planeGeometry args={[600, 60]} />
        <meshBasicMaterial color="#1a0033" transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Bande magenta vers l'horizon */}
      <mesh position={[0, 6, -238]}>
        <planeGeometry args={[600, 30]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.35} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Bande cyan tout en bas (reflet) */}
      <mesh position={[0, -2, -237]}>
        <planeGeometry args={[600, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   ÉTOILES — petits points blancs dispersés dans le ciel
   ───────────────────────────────────────────────────────────── */
function Stars() {
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 250; i++) {
      const x = (Math.random() - 0.5) * 400;
      const y = 8 + Math.random() * 30;
      const z = -120 - Math.random() * 100;
      arr.push([x, y, z]);
    }
    return arr;
  }, []);

  return (
    <>
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06 + Math.random() * 0.1, 4, 4]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

export function Scene() {
  return (
    <>
      <SynthwaveSky />
      <Stars />
    </>
  );
}
