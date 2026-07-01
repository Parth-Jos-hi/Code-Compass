"use client";

import React from 'react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-md border-b border-white/[0.03] px-8 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Minimal Lowercase Identity Logo */}
        <div className="text-xl font-black text-white tracking-tighter select-none">
          invader<span className="text-rose-500">.</span>
        </div>

        {/* Clean Center Navigation Anchors */}
        <div className="hidden md:flex items-center gap-8 text-[11px] font-semibold text-neutral-400 tracking-wider uppercase">
          <a href="#" className="hover:text-white transition-colors">Law</a>
          <a href="#" className="hover:text-white transition-colors">Progrades</a>
          <a href="#" className="hover:text-white transition-colors">Ristuls</a>
          <a href="#" className="hover:text-white transition-colors">Adults</a>
          <a href="#" className="hover:text-white transition-colors text-white">Coner</a>
        </div>

        {/* CTA Actions */}
        <div className="flex items-center gap-4">
          <button className="text-[11px] font-bold text-neutral-400 uppercase hover:text-white transition-colors cursor-pointer">
            Contact
          </button>
          <button className="text-[11px] font-bold bg-white text-black px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors cursor-pointer">
            Platform
          </button>
        </div>
        
      </div>
    </nav>
  );
}