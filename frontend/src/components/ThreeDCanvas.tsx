"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Center, Text3D, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { CodeNode } from "../services/api";

const INTRO_DURATION = 1.5; 
const TILT_MAX_RAD = THREE.MathUtils.degToRad(7); 
const TILT_DAMPING = 0.07; 
const START_Z = -14; 
const REST_Z = 0; 

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutExpo(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

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

  useFrame((state) => {
    if (!group.current) return;

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

    if (enableTilt && introDone.current && !reducedMotion) {
      const targetX = mouse.current.y * TILT_MAX_RAD; 
      const targetY = mouse.current.x * TILT_MAX_RAD; 

      currentTilt.current.x = THREE.MathUtils.lerp(currentTilt.current.x, targetX, TILT_DAMPING);
      currentTilt.current.y = THREE.MathUtils.lerp(currentTilt.current.y, targetY, TILT_DAMPING);

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

interface CodeStarProps {
  node: CodeNode;
  onSelect: (node: CodeNode) => void;
}

function CodeStar({ node, onSelect }: CodeStarProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      const scaleFactor = 1 + Math.sin(state.clock.getElapsedTime() * 2.5 + node.impact_score) * 0.04;
      meshRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  });

  const starColor = node.is_mastered ? "#f43f5e" : "#3b82f6";
  const starSize = Math.max(0.18, Math.min(node.impact_score * 0.08, 0.7));
  const fileName = node.file_path.split("/").pop() || "";

  return (
    <mesh
      ref={meshRef}
      position={node.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      onPointerOver={() => { document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "default"; }}
    >
      <sphereGeometry args={[starSize, 32, 32]} />
      <meshStandardMaterial
        color={starColor}
        emissive={starColor}
        emissiveIntensity={0.8}
        roughness={0.1}
        metalness={0.9}
      />

      <Html distanceFactor={12} position={[0, starSize + 0.3, 0]} center pointerEvents="none">
        <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 text-[10px] text-neutral-300 font-mono px-2 py-0.5 rounded shadow-xl whitespace-nowrap select-none">
          {fileName}
        </div>
      </Html>
    </mesh>
  );
}

function LightingRig() {
  return (
    <>
      <ambientLight intensity={0.12} color="#1a1a22" />
      <directionalLight position={[4, 5, 6]} intensity={1.3} color="#ffffff" />
      <pointLight position={[-6, 1, -3]} intensity={5} color="#5b7cff" distance={20} decay={2} />
      <pointLight position={[0, -4, -2]} intensity={2} color="#7b5bff" distance={15} decay={2} />
    </>
  );
}

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
    if (ref.current) ref.current.rotation.y += delta * 0.004;
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

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = aspect < 0.8 ? 55 : 38;
    cam.position.z = aspect < 0.8 ? 16 : 12;
    cam.updateProjectionMatrix();
  }, [size, camera]);
  return null;
}

interface ThreeDCanvasProps {
  nodes: CodeNode[];
  onNodeSelect: (node: CodeNode) => void;
  onIntroComplete?: () => void;
  enableTilt?: boolean;
  showStars?: boolean;
  className?: string;
}

export default function ThreeDCanvas({
  nodes,
  onNodeSelect,
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

  const lineGeometry = useMemo(() => {
    const points = nodes.map((n) => new THREE.Vector3(...n.position));
    if (points.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [nodes]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        className={className}
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 12], fov: 38, near: 0.1, far: 100 }}
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

        {nodes.map((node) => (
          <CodeStar key={node.id} node={node} onSelect={onNodeSelect} />
        ))}

        {lineGeometry && (
          <line>
            <primitive object={lineGeometry} attach="geometry" />
            <lineBasicMaterial color="#f43f5e" opacity={0.15} transparent linewidth={1} />
          </line>
        )}

        <OrbitControls enablePan={false} enableZoom={true} maxDistance={25} minDistance={4} />
        <Environment preset="city" environmentIntensity={0.15} />
      </Canvas>
    </div>
  );
}
