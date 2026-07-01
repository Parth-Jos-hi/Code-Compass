"use client";

import React from 'react';

export default function FloatingAssets() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      
      {/* Top Center-Right Large Ambient Red Foliage/Lighting Glow */}
      <div className="absolute top-[-10%] right-[15%] w-[600px] h-[600px] bg-rose-950/15 rounded-full filter blur-[120px] mix-blend-screen animate-pulse duration-[8000ms]" />
      
      {/* Mid Left Indigo Soft Glow */}
      <div className="absolute top-[40%] left-[-5%] w-[400px] h-[400px] bg-indigo-950/10 rounded-full filter blur-[100px]" />

      {/* Luxury Grid Lines Ornament Layer */}
      <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Vertical Linear Strip Accent Line */}
      <div className="absolute top-0 right-[35%] w-[1px] h-full bg-gradient-to-b from-white/[0.05] via-transparent to-transparent" />
    </div>
  );
}