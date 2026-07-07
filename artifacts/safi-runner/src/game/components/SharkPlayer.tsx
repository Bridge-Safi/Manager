import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

const LANE_X = [-2, 0, 2];

interface SharkPlayerProps {
  lane: number;
  playerY: number;
  isJumping: boolean;
}

export function SharkPlayer({ lane, playerY, isJumping }: SharkPlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spriteRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  /* Charge les 3 frames d'animation : course1, course2, saut */
  const [texRun1, texRun2, texJump] = useLoader(THREE.TextureLoader, [
    `${import.meta.env.BASE_URL}shark-warrior-run1.png`,
    `${import.meta.env.BASE_URL}shark-warrior-run2.png`,
    `${import.meta.env.BASE_URL}shark-warrior-jump.png`,
  ]);

  for (const t of [texRun1, texRun2, texJump]) {
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    // @ts-ignore
    t.colorSpace = THREE.SRGBColorSpace ?? t.colorSpace;
  }

  const targetX = LANE_X[lane + 1];

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    /* Glissement latéral fluide */
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x, targetX, Math.min(1, delta * 14)
    );
    groupRef.current.position.y = playerY;

    /* Inclinaison vers la voie cible (effet drift NFS) */
    const xDiff = targetX - groupRef.current.position.x;
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z, -xDiff * 0.08, Math.min(1, delta * 10)
    );

    if (!spriteRef.current || !matRef.current) return;

    if (isJumping) {
      /* Frame saut */
      matRef.current.map = texJump;
      matRef.current.needsUpdate = true;
      spriteRef.current.position.y = 1.05;
      spriteRef.current.rotation.x = 0;
      spriteRef.current.rotation.z = 0;
    } else {
      /* Cycle de course alternée (~6 fps) — uniquement les jambes, pas de danse */
      const t = Date.now() * 0.001;
      const cycle = Math.floor(t * 6) % 2;
      matRef.current.map = cycle === 0 ? texRun1 : texRun2;
      matRef.current.needsUpdate = true;

      /* Léger bobbing vertical seulement (sensation de pas) — pas de roulis */
      spriteRef.current.position.y = 1.05 + Math.abs(Math.sin(t * 12)) * 0.04;
      spriteRef.current.rotation.x = 0;
      spriteRef.current.rotation.z = 0;
    }

    /* Anneau orbital qui tourne au sol */
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 3;
    }
  });

  /* Sprite plus petit — taille réaliste de coureur */
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1.5, 2.0), []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Le Shark Warrior — vue de dos en course */}
      <mesh ref={spriteRef} position={[0, 1.05, 0]} geometry={planeGeo}>
        <meshBasicMaterial
          ref={matRef}
          map={texRun1}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Anneau orbital cyan AU SOL — plus petit */}
      <mesh ref={ringRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 6, 1]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.85} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* Halo sol discret */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 16]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.22} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* Ombre sous le joueur — suit la position Y */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.max(0.2, 0.45 - playerY * 0.08), 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={Math.max(0.2, 0.55 - playerY * 0.15)} />
      </mesh>
    </group>
  );
}
