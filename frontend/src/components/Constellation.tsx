"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CodeNode } from '../services/api';

interface ConstellationProps {
  nodes: CodeNode[];
  onNodeSelect: (node: CodeNode) => void;
}

// Individual Star Node Component
function CodeStar({ node, onSelect }: { node: CodeNode; onSelect: (node: CodeNode) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      const scaleFactor = 1 + Math.sin(state.clock.getElapsedTime() * 2 + node.impact_score) * 0.05;
      meshRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  });

  const starColor = node.is_mastered ? "#fbbf24" : "#3b82f6";
  const starSize = Math.max(0.2, Math.min(node.impact_score * 0.1, 0.8));

  return (
    <mesh 
      ref={meshRef} 
      position={node.position}
      onClick={(e) => {
        e.stopPropagation(); // Prevents clicking a star from triggering background clicks
        onSelect(node);
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <sphereGeometry args={[starSize, 16, 16]} />
      <meshStandardMaterial 
        color={starColor} 
        emissive={starColor}
        emissiveIntensity={0.6}
        roughness={0.2}
      />
    </mesh>
  );
}

// Main 3D Constellation Canvas
export default function Constellation({ nodes, onNodeSelect }: ConstellationProps) {
  const lineGeometry = useMemo(() => {
    const points = nodes.map(n => new THREE.Vector3(...n.position));
    if (points.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [nodes]);

  return (
    <div className="w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 pointer-events-none">
        <h3 className="text-sm font-semibold text-slate-200">3D Codebase Universe</h3>
        <p className="text-xs text-slate-400">Click a node to inspect its architecture | Drag to orbit</p>
      </div>

      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        
        {nodes.map((node) => (
          <CodeStar key={node.id} node={node} onSelect={onNodeSelect} />
        ))}

        {lineGeometry && (
          <line geometry={lineGeometry}>
            <lineBasicMaterial color="#4f46e5" opacity={0.4} transparent />
          </line>
        )}

        <OrbitControls enablePan={true} enableZoom={true} maxDistance={40} minDistance={5} />
      </Canvas>
    </div>
  );
}