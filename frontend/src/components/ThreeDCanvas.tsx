"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Text3D, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const INTRO_DURATION = 1.5; // seconds
const TILT_MAX_RAD = THREE.MathUtils.degToRad(7); // max tilt angle
const TILT_DAMPING = 0.07; // lerp factor per frame (0-1, lower = heavier)
const START_Z = -14; // wordmark starts deep in the void
const REST_Z = 0; // resting position

/** Cubic ease-out — fast start, soft settle. Reads as "arriving with momentum". */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Exponential ease-in-out — slow build, fast middle, soft landing. */
function easeInOutExpo(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

/* ------------------------------------------------------------------ */
/*  Wordmark mesh                                                      */
/* ------------------------------------------------------------------ */

interface WordmarkProps {
  enableTilt: boolean;
  reducedMotion: boolean;
  onIntroComplete?: () => void;
}

function Wordmark({ enableTilt, reducedMotion, onIntroComplete }: WordmarkProps) {
  const group = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const currentTilt = useRef({ x: 0, y: 0 });
  const introStart = useRef<number | null>(null);
  const introDone = useRef(false);

  // Track normalized mouse position (-1 to 1) at the window level.
  useEffect(() => {
    if (!enableTilt) return;
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const handleLeave = () => {
      mouse.current.x = 0;
      mouse.current.y = 0;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, [enableTilt]);

  useFrame((state, delta) => {
    if (!group.current) return;

    // ---- Startup acceleration (Z translation + fade) ----
    if (!introDone.current) {
      if (introStart.current === null) introStart.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - introStart.current;

      if (reducedMotion) {
        group.current.position.z = REST_Z;
        introDone.current = true;
        onIntroComplete?.();
      } else {
        const t = Math.min(elapsed / INTRO_DURATION, 1);
        const eased = easeInOutExpo(t);
        group.current.position.z = THREE.MathUtils.lerp(START_Z, REST_Z, eased);

        // subtle fade-in on materials
        const opacity = THREE.MathUtils.clamp(easeOutCubic(t) * 1.2, 0, 1);
        group.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshPhysicalMaterial;
            if (mat && "opacity" in mat) {
              mat.transparent = true;
              mat.opacity = opacity;
            }
          }
        });

        if (t >= 1) {
          introDone.current = true;
          onIntroComplete?.();
        }
      }
    }

    // ---- Mouse tilt (damped, only once intro has settled) ----
    if (enableTilt && introDone.current && !reducedMotion) {
      const targetX = mouse.current.y * TILT_MAX_RAD; // vertical mouse -> tilt around X
      const targetY = mouse.current.x * TILT_MAX_RAD; // horizontal mouse -> tilt around Y

      currentTilt.current.x = THREE.MathUtils.lerp(
        currentTilt.current.x,
        targetX,
        TILT_DAMPING
      );
      currentTilt.current.y = THREE.MathUtils.lerp(
        currentTilt.current.y,
        targetY,
        TILT_DAMPING
      );

      group.current.rotation.x = currentTilt.current.x;
      group.current.rotation.y = currentTilt.current.y;
    }
  });

  return (
    <group ref={group} position={[0, 0, START_Z]}>
      <Center>
        <Text3D
          font="/fonts/inter-bold.json"
          size={1.4}
          height={0.28}
          bevelEnabled
          bevelThickness={0.025}
          bevelSize={0.018}
          bevelSegments={4}
          curveSegments={6}
        >
          VOIDSCOUT
          <meshPhysicalMaterial
            color="#0c0c10"
            metalness={0.75}
            roughness={0.32}
            clearcoat={0.6}
            clearcoatRoughness={0.25}
            reflectivity={0.6}
          />
        </Text3D>
      </Center>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Rim / edge lighting rig — sparse, intentional, premium-dark        */
/* ------------------------------------------------------------------ */

function LightingRig() {
  return (
    <>
      {/* near-black ambient fill so the extrusion doesn't go pure black */}
      <ambientLight intensity={0.12} color="#1a1a22" />

      {/* key light — soft, slightly warm, from upper-front */}
      <directionalLight
        position={[4, 5, 6]}
        intensity={1.1}
        color="#ffffff"
      />

      {/* cool rim light — defines the bevel edges, reinforces "void" branding */}
      <pointLight position={[-6, 1, -3]} intensity={6} color="#5b7cff" distance={20} decay={2} />

      {/* secondary low rim for the underside, very subtle violet */}
      <pointLight position={[0, -4, -2]} intensity={2.5} color="#7b5bff" distance={15} decay={2} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Optional faint background starfield (kept extremely sparse)        */
/* ------------------------------------------------------------------ */

function StarField({ count = 350 }: { count?: number }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = -10 - Math.random() * 40;
    }
    return positions;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.004; // near-imperceptible drift
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#aab4ff" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Camera responsiveness — keeps the wordmark well-framed on resize   */
/* ------------------------------------------------------------------ */

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = aspect < 0.8 ? 55 : 38; // widen FOV on narrow/mobile viewports
    cam.position.z = aspect < 0.8 ? 9 : 7;
    cam.updateProjectionMatrix();
  }, [size, camera]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */

interface ThreeDCanvasProps {
  /** Called once the startup acceleration animation has settled. */
  onIntroComplete?: () => void;
  /** Enable/disable the persistent mouse-tilt interaction (default true). */
  enableTilt?: boolean;
  /** Show the faint ambient starfield (default true). */
  showStars?: boolean;
  className?: string;
}

export default function ThreeDCanvas({
  onIntroComplete,
  enableTilt = true,
  showStars = true,
  className,
}: ThreeDCanvasProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    setDpr([1, Math.min(window.devicePixelRatio, 2)]);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Canvas
      className={className}
      dpr={dpr}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 7], fov: 38, near: 0.1, far: 100 }}
      style={{
        background: "radial-gradient(circle at 50% 40%, #0a0a0f 0%, #050505 70%)",
      }}
    >
      <ResponsiveCamera />
      <LightingRig />
      {showStars && <StarField />}
      <Wordmark
        enableTilt={enableTilt}
        reducedMotion={reducedMotion}
        onIntroComplete={onIntroComplete}
      />
      <Environment preset="city" environmentIntensity={0.15} />
    </Canvas>
  );
}
