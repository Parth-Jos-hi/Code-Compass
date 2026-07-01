"use client";

import React from 'react';
import { toggleNodeMastery, CodeNode } from '../services/api';

interface DynamicSidebarProps {
  selectedNode: CodeNode | null;
  liveNodes: CodeNode[];
  setLiveNodes: React.Dispatch<React.SetStateAction<CodeNode[]>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<CodeNode | null>>;
}

export default function DynamicSidebar({ selectedNode, liveNodes, setLiveNodes, setSelectedNode }: DynamicSidebarProps) {
  const handleToggle = async () => {
    if (!selectedNode) return;
    try {
      // 1. Fire patch request directly to FastAPI endpoint
      const result = await toggleNodeMastery(selectedNode.id);
      
      // 2. Synchronize main parent hook state variables
      const updatedNodes = liveNodes.map(n => {
        if (n.id === selectedNode.id) {
          return { ...n, is_mastered: result.is_mastered };
        }
        return n;
      });
      setLiveNodes(updatedNodes);
      
      // 3. Update the active view context properties locally
      setSelectedNode({ ...selectedNode, is_mastered: result.is_mastered });
    } catch (err: any) {
      alert("Pipeline synchronization failure: " + err.message);
    }
  };

  return (
    <div className="w-full h-[580px]">
      {selectedNode ? (
        <div className="bg-[#050505] border border-neutral-900 rounded-2xl p-5 h-full flex flex-col justify-between shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="space-y-6 overflow-y-auto no-scrollbar">
            
            {/* Meta tags section */}
            <div>
              <span className="text-[9px] font-black tracking-widest text-rose-500 uppercase bg-rose-950/20 border border-rose-900/30 px-2 py-1 rounded">
                {selectedNode.language}
              </span>
              <h4 className="text-sm font-mono font-bold text-white mt-3 break-all bg-neutral-950 p-3 rounded-xl border border-neutral-900">
                {selectedNode.file_path.split('/').pop()}
              </h4>
              <p className="text-[10px] font-mono text-neutral-500 mt-2 break-all px-1">{selectedNode.file_path}</p>
            </div>

            {/* Metrics Configuration Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0c0c0c] p-3 rounded-xl border border-neutral-900">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Impact Scale</span>
                <span className="text-xl font-black text-white font-mono">{selectedNode.impact_score}</span>
              </div>
              <div className="bg-[#0c0c0c] p-3 rounded-xl border border-neutral-900">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Core State</span>
                <span className={`text-xs font-black block mt-1 uppercase ${selectedNode.is_mastered ? "text-rose-500" : "text-blue-500"}`}>
                  {selectedNode.is_mastered ? "Mastered" : "Exploring"}
                </span>
              </div>
            </div>

            {/* Architecture Details Text Box */}
            <div className="space-y-2 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900/60">
              <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Structural Context Rules</h5>
              <p className="text-xs text-neutral-400 leading-relaxed">
                This file node has an structural density value of <span className="text-rose-400 font-bold font-mono">{selectedNode.impact_score}</span>. It is projected uniformly onto the dimensional canvas sphere coordinates via the local vector mapping database.
              </p>
            </div>
          </div>

          {/* Action Trigger Block */}
          <div className="space-y-2 pt-4 border-t border-neutral-900">
            <button
              onClick={handleToggle}
              className={`w-full text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg cursor-pointer ${
                selectedNode.is_mastered 
                  ? "bg-neutral-900 hover:bg-neutral-800 border border-neutral-800" 
                  : "coral-glow-btn"
              }`}
            >
              {selectedNode.is_mastered ? "Revert to Exploring Status" : "Mark Module as Mastered"}
            </button>
            <button 
              onClick={() => setSelectedNode(null)}
              className="w-full bg-transparent hover:bg-neutral-950 text-neutral-500 hover:text-neutral-300 font-semibold text-xs py-2 rounded-xl transition-colors cursor-pointer"
            >
              Close Inspector
            </button>
          </div>

        </div>
      ) : (
        <div className="bg-[#030303] border border-dashed border-neutral-900 rounded-2xl p-6 h-full flex items-center justify-center text-center text-neutral-600 text-xs italic">
          Select a code star node inside the interactive celestial map to process localized tracking details...
        </div>
      )}
    </div>
  );
}