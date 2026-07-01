"use client";

import React from 'react';
import { IndexResponse } from '../services/api';

interface MediaFrameProps {
  scanResult: IndexResponse | null;
}

export default function MediaFrame({ scanResult }: MediaFrameProps) {
  return (
    <div className="relative w-full max-w-md h-[450px] group">
      
      {/* Background Decorative Frame Layer Offset */}
      <div className="absolute top-8 left-8 -right-4 -bottom-4 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl border border-neutral-800 shadow-2xl z-0 transition-transform duration-700 group-hover:translate-x-2 group-hover:translate-y-2" />

      {/* Primary Overlapping Display Container */}
      <div className="absolute inset-0 bg-[#0c0c0c] rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden z-10 premium-border-glow flex flex-col justify-between p-6">
        
        {/* Dynamic Dark Accent Backdrop Overlay Tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-0" />

        {/* Card Content Elements */}
        <div className="relative z-10 flex justify-between items-start">
          <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800/80">
            <span className="text-[10px] tracking-wider text-rose-500 uppercase font-black">Status Node</span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
        </div>

        {/* Core Layout Readouts */}
        <div className="relative z-10 space-y-4">
          {scanResult ? (
            <div className="space-y-2 animate-in fade-in duration-300">
              <span className="text-[9px] font-mono tracking-widest text-neutral-500 block uppercase">Operational Metrics</span>
              <h4 className="text-2xl font-black text-white tracking-tight">{scanResult.repository_indexed}</h4>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-900">
                <div>
                  <span className="text-[9px] text-neutral-500 block">Nodes Scanned</span>
                  <span className="text-sm font-bold text-white font-mono">{scanResult.total_files_mapped}</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-500 block">Vector Slices</span>
                  <span className="text-sm font-bold text-rose-400 font-mono">{scanResult.total_vector_chunks_stored}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[9px] font-mono tracking-widest text-neutral-500 block uppercase">Scout Monitor</span>
              <h4 className="text-2xl font-black text-white/40 tracking-tight">System Idle</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Provide a local project pathway location on the command matrix module to ingest architectural configurations.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-neutral-900/60">
            <span className="text-xs font-semibold text-neutral-400">Shown Menk Engine</span>
            <span className="w-6 h-6 rounded-full border border-neutral-800 flex items-center justify-center text-[10px] text-neutral-400">→</span>
          </div>
        </div>

        {/* Absolute Decorative Vector Box Component Mock Positioned to the Right Side */}
        <div className="absolute right-4 top-12 bottom-12 w-24 bg-gradient-to-b from-rose-950/20 to-indigo-950/20 border border-white/[0.02] rounded-full blur-sm pointer-events-none z-0" />
      </div>
    </div>
  );
}