"use client";

import React from 'react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-md border-b border-white/[0.03] px-8 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Minimal Lowercase Identity Logo */}
        <div className="text-xl font-black text-white tracking-tighter select-none">
          void-Scout<span className="text-rose-500">.</span>
        </div>
        
      </div>
    </nav>
  );
}