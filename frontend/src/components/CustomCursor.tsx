"use client";

import React, { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.closest('mesh'))) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      {/* The Central Sharp Core Dot */}
      <div 
        className="fixed w-1.5 h-1.5 bg-rose-500 rounded-full pointer-events-none z-[999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out hidden md:block"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      />
      {/* The Ambient Secondary Blur Halo Ring */}
      <div 
        className={`fixed rounded-full pointer-events-none z-[998] -translate-x-1/2 -translate-y-1/2 hidden md:block transition-all duration-300 ease-out ${
          hovered 
            ? 'w-10 h-10 bg-rose-500/20 border border-rose-500/40 scale-110 blur-none' 
            : 'w-6 h-6 bg-transparent border border-white/10 blur-[1px]'
        }`}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      />
    </>
  );
}